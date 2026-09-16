import {NextResponse} from 'next/server';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
import {l6Store} from '@/lib/l6-store.mjs';
import {readSettings,writeSettings} from '@/lib/settings.mjs';
import {fetchAccountPosts,mapSocial,validateAccounts} from '@/lib/social-inspiration.mjs';
export const dynamic='force-dynamic';export const maxDuration=90;
function fail(e:unknown){console.error('[social]',e);return NextResponse.json({error:e instanceof ContentError?e.message:'社交帳戶抓取未完成；冇自動重試'},{status:e instanceof ContentError?e.status:503});}
// GET → followed accounts + whether TikHub is configured
// POST {action:'fetch', accountId} → one billed run for one account; posts land in Inspiration
export async function GET(request:Request){try{assertLocalRequest(request);const store=await l6Store(token(request)!);const s=await readSettings(store);
 const runs=await store.list('social:',{limit:20});
 return NextResponse.json({accounts:s.socialAccounts,tikhub:!!process.env.TIKHUB_API_KEY,runs:runs.map((r:any)=>({run_id:r.run_id,...r.metadata,created_at:r.created_at,status:r.status}))},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(request:Request){try{assertLocalRequest(request);const store=await l6Store(token(request)!);const body=await request.json();const s=await readSettings(store);
 if(body.action!=='fetch')throw new ContentError('未開放此操作');
 const account=validateAccounts(s.socialAccounts).find(a=>a.id===body.accountId&&a.enabled);if(!account)throw new ContentError('先喺 Settings 加呢個帳戶（並開住）',404);
 const log:any[]=[];const result=await fetchAccountPosts(account,{key:process.env.TIKHUB_API_KEY,log});
 if(!result.posts.length)return NextResponse.json({ok:true,saved:0,log,note:'no_new_sources：讀到帳戶但冇可用帖（可能私人帳戶或全部冇文字）'},{headers:{'Cache-Control':'no-store'}});
 const mapped=mapSocial(result,store.workspace);
 // same three tables the Inspiration workspace reads; upsert so a re-fetch never duplicates
 await store.rest('sources?on_conflict=workspace_id,source_id','POST',mapped.sources,'resolution=merge-duplicates,return=minimal');
 await store.rest('runs?on_conflict=workspace_id,run_id','POST',[mapped.run],'resolution=merge-duplicates,return=minimal');
 await store.rest('posts?on_conflict=workspace_id,post_id','POST',mapped.posts,'resolution=merge-duplicates,return=minimal');
 const back=await store.client.inspirationPosts(store.workspace);const missing=mapped.posts.filter((p:any)=>!back.some((b:any)=>b.post_id===p.post_id));
 if(missing.length)throw new ContentError('保存後讀返少咗 '+missing.length+' 篇，唔當成功',409);
 await store.put(mapped.run.run_id.replace('social:','social:'),{provider:'tikhub',platform:account.platform,status:'collected',metadata:{...mapped.run.metadata,account:account.handle,saved:mapped.posts.length,log,fetched_at:result.fetched_at}});
 return NextResponse.json({ok:true,saved:mapped.posts.length,source:result.source,log,posts:result.posts.map(p=>({post_id:p.post_id,caption:p.caption.slice(0,80),post_url:p.post_url,published_at:p.published_at}))},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
