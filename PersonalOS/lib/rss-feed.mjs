import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {parseFeedXml} from './rss-parser.mjs';
import {ContentError} from './content-engine.mjs';
export const rssConfig=JSON.parse(await readFile(new URL('../config/rss-sources.json',import.meta.url),'utf8'));
export function mapRss(entries,source,workspace,fetchedAt,runId){
 const sourceId='rss:'+source.id;
 const posts=entries.map(e=>{const postId='rss:'+createHash('sha256').update(source.id+'\n'+e.guid).digest('hex').slice(0,32);const caption=[e.title,e.summary].filter(Boolean).join('\n\n').slice(0,12000);return {workspace_id:workspace,post_id:postId,source_id:sourceId,platform:'rss',account:source.name,caption,post_url:e.url,published_at:e.publishedAt,fetched_at:fetchedAt,run_id:runId,content_type:'news_link',metadata:{feed_origin:'rss',feed:{post_id:postId,title:e.title,caption,post_url:e.url,account:source.name,provider:'rss',template:source.template,content_depth:e.summary?'rss-summary':'title-only',image_url:e.imageUrl}}};});
 return {sources:[{workspace_id:workspace,source_id:sourceId,platform:'rss',account:source.name,profile_url:source.url,fetched_at:fetchedAt,collection_reason:'Original HeyOmmi RSS course preset',metadata:{feed_origin:'rss',template:source.template}}],run:{workspace_id:workspace,run_id:runId,provider:'rss',platform:'rss',requested_count:3,collected_count:posts.length,request_count:1,estimated_cost_usd:0,fetched_at:fetchedAt,status:'collected',metadata:{feed_origin:'rss',source_id:sourceId}},posts};
}
export async function collectRss(sourceId,workspace){
 const source=rssConfig.sources.find(s=>s.id===sourceId);if(!source)throw new ContentError('請選擇已核對RSS預設');
 const r=await fetch(source.url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/rss+xml, application/atom+xml, application/xml, text/xml','User-Agent':'HeyOmmi-Student/1.0'},cache:'no-store'});
 if(!r.ok)throw new ContentError('RSS來源暫時未能讀取（HTTP '+r.status+'）',502);
 const reader=r.body.getReader();let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw new ContentError('RSS超過2MB，停止讀取');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
 const xml=Buffer.concat(chunks).toString('utf8');if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new ContentError('RSS包含不支援的XML宣告');
 const {entries}=parseFeedXml(xml,source.url,3);if(!entries.length)throw new ContentError('RSS未有可用文章，未報成功');
 return mapRss(entries,source,workspace,new Date().toISOString(),'rss:'+randomUUID());
}
