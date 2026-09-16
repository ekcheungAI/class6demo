import {NextResponse} from 'next/server';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
import {l6Store} from '@/lib/l6-store.mjs';
import {cloudRuntime} from '@/lib/cloud-runtime.mjs';
import {loadBrand} from '@/lib/brand-context.mjs';
import {runtimeBrain} from '@/lib/ommi-brain.mjs';
import {compose} from '@/lib/composer.mjs';
import {TODAY_SOURCE_ID} from '@/lib/research.mjs';
export const dynamic='force-dynamic';export const maxDuration=120;
function fail(e:unknown){console.error('[composer]',e);return NextResponse.json({error:e instanceof ContentError?e.message:'排版未完成；冇自動重試'},{status:e instanceof ContentError?e.status:503});}
export async function GET(request:Request){try{assertLocalRequest(request);const auth=token(request)!;const store=await l6Store(auth);
 const today=(await store.get(TODAY_SOURCE_ID))?.metadata||null;const feed=await store.client.read(store.workspace,'rss').catch(()=>({items:[]}));
 const rewrites=await store.list('rewrite:',{limit:5});const social=await store.client.inspirationPosts(store.workspace).catch(()=>[]);
 return NextResponse.json({today,feed:feed.items.slice(0,20).map((i:any)=>({post_id:i.post_id,title:String(i.caption||'').split('\n')[0].slice(0,120),url:i.post_url})),social:social.slice(0,30).map((p:any)=>({post_id:p.post_id,platform:p.platform,account:p.account,title:String(p.caption||'').split('\n')[0].slice(0,100),url:p.post_url})),rewrites:rewrites.map((r:any)=>r.metadata),modelReady:!!process.env.TOAPI_API_KEY&&process.env.STUDENT_TEACHER_PREVIEW==='1'},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(request:Request){try{assertLocalRequest(request);if(process.env.STUDENT_TEACHER_PREVIEW!=='1')throw new ContentError('此版本尚未開放生成',403);
 const body=await request.json();const auth=token(request)!;const store=await l6Store(auth);const runtime=await cloudRuntime(auth);
 const saved=await runtime.brand();const brain=runtimeBrain(saved||await loadBrand(),await runtime.client.ommiBrain(runtime.workspace));
 const result=await compose({store,runtime,brain,requestId:body.requestId,platforms:body.platforms,pick:body.source});
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
