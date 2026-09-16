import {NextResponse} from 'next/server';
import {l6Store} from '@/lib/l6-store.mjs';
import {readSettings,effectiveRssSources} from '@/lib/settings.mjs';
import {collectRss,rssConfig} from '@/lib/rss-feed.mjs';
import {feedClient} from '@/lib/feed-supabase.mjs';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
import {readArticle} from '@/lib/article-reader.mjs';
export const dynamic='force-dynamic';
const fail=(e:unknown)=>NextResponse.json({error:e instanceof ContentError?e.message:'Feed讀取未完成；沒有以本地資料替代'},{status:e instanceof ContentError?e.status:503,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){try{assertLocalRequest(request);const client=feedClient(token(request));const id=await client.workspace();const [feed,articles,settings]=await Promise.all([client.read(id,'rss'),client.articles(id),readSettings(await l6Store(token(request)!))]);return NextResponse.json({...feed,items:feed.items.map(i=>({...i,article:articles.find((a:any)=>a.post_id===i.post_id)?.article||null})),rssSources:effectiveRssSources(settings).filter((s:any)=>s.enabled)},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(request:Request){try{assertLocalRequest(request);const body=await request.json();const client=feedClient(token(request));const id=await client.workspace();
 if(body.action==='read-article'){const feed=await client.read(id,'rss');const source=feed.items.find(i=>i.post_id===body.postId);if(!source)throw new ContentError('文章不在目前workspace RSS Feed',404);const saved=(await client.articles(id)).find((a:any)=>a.post_id===source.post_id);const article=saved?.article||await client.saveArticle(id,source.post_id,await readArticle(source.post_url,(await readSettings(await l6Store(token(request)!))).rssSources));return NextResponse.json({postId:source.post_id,article,persistence:'supabase'});}
 if(body.action!=='fetch-rss')throw new ContentError('請選擇RSS來源抓取');const settings=await readSettings(await l6Store(token(request)!));const sources=effectiveRssSources(settings).filter((s:any)=>s.enabled);return NextResponse.json({...await client.syncRss(await collectRss(body.sourceId,id,sources)),rssSources:sources},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
