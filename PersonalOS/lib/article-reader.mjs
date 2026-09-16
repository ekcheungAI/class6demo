import {Readability} from '@mozilla/readability';
import {parseHTML} from 'linkedom';
import {ContentError} from './content-engine.mjs';
import {rssConfig} from './rss-feed.mjs';
export function validateArticleUrl(value){
 const url=new URL(value);const host=url.hostname.replace(/^www\./,'');
 const allowed=rssConfig.sources.some(s=>new URL(s.url).hostname.replace(/^www\./,'')===host);
 if(url.protocol!=='https:'||url.username||url.password||url.port||!allowed)throw new ContentError('此文章網域尚未在RSS來源清單，請先核對來源');
 return url.href;
}
export function extractArticle(html,url){
 const {document}=parseHTML(html);
 const image=document.querySelector('meta[property="og:image"]')?.getAttribute('content')||null;
 const paywall=document.querySelector('[itemprop="isAccessibleForFree"][content="false"]');
 if(paywall||/"isAccessibleForFree"\s*:\s*(false|"false")/i.test(html))throw new ContentError('來源標示付費內容，只保留RSS預覽');
 document.querySelectorAll('script,style,nav,footer,header,aside,form,button').forEach(n=>n.remove());
 const parsed=new Readability(document,{charThreshold:300}).parse();
 const text=(parsed?.textContent||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n[ \t]*\n[ \t]*\n/g,'\n\n').trim();
 if(text.length<300||/^(Just a moment|Access denied|Enable JavaScript)/i.test(text))throw new ContentError('未取得足夠文章正文；保留RSS預覽');
 return {title:parsed.title||'',text:text.slice(0,120000),excerpt:(parsed.excerpt||text.slice(0,300)).slice(0,600),byline:parsed.byline||null,image_url:image&&/^https:\/\//.test(image)?image:null,url,extracted_at:new Date().toISOString(),method:'direct-html-readability',status:'extracted',truncated:text.length>120000,character_count:text.length,completeness:'public-page-extraction-not-guaranteed'};
}
export async function readArticle(value){
 const url=validateArticleUrl(value);
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'text/html','User-Agent':'HeyOmmi-Student/1.0'},cache:'no-store'});
 if(!r.ok)throw new ContentError('原文網站未提供可讀內容（HTTP '+r.status+'）',502);
 if(!(r.headers.get('content-type')||'').includes('text/html'))throw new ContentError('目前只支援公開HTML文章');
 const reader=r.body.getReader();let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>3_000_000)throw new ContentError('原文頁面超過3MB，未繼續讀取');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
 return extractArticle(Buffer.concat(chunks).toString('utf8'),url);
}
