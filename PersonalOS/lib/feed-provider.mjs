import {mkdir,readFile,writeFile,open,access,rename} from 'node:fs/promises';
import path from 'node:path';
import {ContentError,rootDir} from './content-engine.mjs';
export const endpoint='/api/v1/reddit/app/fetch_news_feed';
export function normalizeNews(raw){
 if(raw?.code!==200||!raw.data||raw.data.errors?.length)throw new ContentError('TikHub未回傳成功資料');
 const found=new Map();let inspected=0;
 function walk(v){if(!v||typeof v!=='object'||inspected++>50000)return;
 if(v.adPayload)return;
 if(v.__typename==='CellGroup'&&typeof v.groupId==='string'&&/^t3_[a-z0-9]+$/.test(v.groupId)&&Array.isArray(v.cells)){
  const meta=v.cells.find(c=>c.__typename==='MetadataCell')||{};
  const titleCell=v.cells.find(c=>c.__typename==='TitleWithThumbnailCell');
  const title=titleCell?.titleCell?.title||v.cells.find(c=>c.__typename==='TitleCell')?.title;
  const metrics=v.cells.find(c=>c.__typename==='ActionCell')||{};
  const thumb=titleCell?.thumbnail?.media;
  const preview=titleCell?.previewTextCell?.text;
  const link=meta.mediaPath;const external=typeof link==='string'&&/^https:\/\//.test(link)?link:null;
  if(typeof title==='string'&&title.trim())found.set(v.groupId,{post_id:'reddit:'+v.groupId,platform:'reddit',account:meta.detailsString||meta.authorName||'Reddit',title,caption:[title,typeof preview==='string'?preview:''].filter(Boolean).join('\n\n'),post_url:'https://www.reddit.com/comments/'+v.groupId.slice(3),article_url:external,score:!metrics.isScoreHidden&&typeof metrics.score==='number'?metrics.score:null,comments:typeof metrics.commentCount==='number'?metrics.commentCount:null,created_at:meta.createdAt||null,provider:'tikhub',content_depth:preview?'title-and-preview':'title-only',image_url:!thumb?.isObfuscated&&typeof thumb?.path==='string'&&/^https:\/\//.test(thumb.path)?thumb.path:null});
  return;
 }

 if(v.__typename==='SubredditPost'&&typeof v.id==='string'&&typeof v.postTitle==='string'){
 const permalink=typeof v.permalink==='string'?v.permalink:'';const url=permalink.startsWith('/')?'https://www.reddit.com'+permalink:permalink;
 if(/^https:\/\/(www\.)?reddit\.com\//.test(url)&&!v.isNsfw&&!v.removedByCategory){found.set(v.id,{post_id:'reddit:'+v.id,platform:'reddit',account:v.subreddit?.name||v.authorInfo?.name||'Reddit',title:v.postTitle,caption:[v.postTitle,v.content?.markdown||v.content?.preview||''].filter(Boolean).join('\n\n'),post_url:url,score:typeof v.score==='number'?v.score:null,comments:typeof v.commentCount==='number'?v.commentCount:null,created_at:v.createdAt||null,provider:'tikhub'});}
 }
 for(const x of Object.values(v))if(typeof x==='object')walk(x);
 }walk(raw.data);
 if(!found.size&&Array.isArray(raw.data.newsV3?.elements?.edges)&&raw.data.newsV3.elements.edges.every(e=>e.node?.adPayload))return [];
 if(!found.size)throw new ContentError('已保存原始回應，但未確認帖子結構；停止解析，不重抓');
 return [...found.values()].slice(0,30);
}
const folder=()=>path.join(rootDir(),'feed');
export async function readFeed(){let attempted=false;try{await access(path.join(folder(),'first-attempt.json'));attempted=true;}catch{}try{return {...JSON.parse(await readFile(path.join(folder(),'latest.json'),'utf8')),attempted};}catch(e){if(e.code==='ENOENT')return {items:[],mode:attempted?'needs-review':'not-fetched',attempted};throw e;}}
export async function reprocessFirst(){
 const raw=JSON.parse(await readFile(path.join(folder(),'first-raw.json'),'utf8'));
 const attempt=JSON.parse(await readFile(path.join(folder(),'first-attempt.json'),'utf8'));
 const items=normalizeNews(raw);const edges=raw.data.newsV3?.elements?.edges;
 const result={items,mode:'tikhub-live-snapshot',endpoint,fetchedAt:attempt.at,requestId:raw.request_id||null,scope:'Reddit news; first page only; not an AI-only newsroom',writesToSupabase:0,returnedGroups:Array.isArray(edges)?edges.length:null,adsSkipped:Array.isArray(edges)?edges.filter(e=>e.node?.adPayload).length:null,cost:{budgetUsd:0.5,requests:1,estimatedUsd:0.001,actualBilledUsd:null}};
 const tmp=path.join(folder(),'latest.tmp');await writeFile(tmp,JSON.stringify(result,null,2),{mode:0o600});await rename(tmp,path.join(folder(),'latest.json'));return result;
}
export async function fetchNewsOnce(){
 if(process.env.TIKHUB_FEED_APPROVED!=='1')throw new ContentError('首次來源及TikHub付費範圍仍待確認；未發出請求',403);
 if(!process.env.TIKHUB_API_KEY)throw new ContentError('未配置TIKHUB_API_KEY');
 await mkdir(folder(),{recursive:true});let marker;
 try{marker=await open(path.join(folder(),'first-attempt.json'),'wx',0o600);}catch{throw new ContentError('首批請求已使用或未完成；請讀取保存結果，不會自動重試',409);}
 const at=new Date().toISOString();await marker.writeFile(JSON.stringify({at,endpoint,maxRequests:1}));await marker.close();
 let response;try{response=await fetch('https://api.tikhub.io'+endpoint+'?language=en-US&subtopic_ids=all&need_format=false',{headers:{Authorization:'Bearer '+process.env.TIKHUB_API_KEY},redirect:'error',signal:AbortSignal.timeout(30000)});}catch{throw new ContentError('TikHub連線未完成；可能已扣費，沒有重試');}
 const text=await response.text();await writeFile(path.join(folder(),'first-raw.json'),text,{mode:0o600});
 if(!response.ok)throw new ContentError('TikHub HTTP失敗；原始回應已保存，不重試');
 let raw;try{raw=JSON.parse(text);}catch{throw new ContentError('TikHub回應不是JSON；原始資料已保存');}
 return reprocessFirst();
}
