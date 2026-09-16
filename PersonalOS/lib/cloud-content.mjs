import {ContentError,prepareRequest,validateOutputs} from './content-engine.mjs';
import {requestBody} from './toapi.mjs';
import {runtimeBrain} from './ommi-brain.mjs';
export async function createCloudContent(runtime,body,{fetcher=fetch,key=process.env.TOAPI_API_KEY}={}){
 let job;
 if(body.action==='recover'){job=await runtime.job(body.requestId);}
 else {
  if(!key)throw new ContentError('未配置ToAPI key');
  const hasSource=Boolean(body.postId||body.sourceRequestId||body.sourceRequestIds?.length);
  if(typeof body.text!=='string'||body.text.trim().length<(hasSource?1:10)||body.text.length>16000)throw new ContentError(hasSource?'請提供1至16000字元創作方向':'請提供10至16000字元內容');
  const snapshot=await runtime.requireBrand();const brand=runtimeBrain(snapshot,await runtime.client.ommiBrain(runtime.workspace));
  let source={post_id:'input:'+body.requestId,workspace_id:runtime.workspace,url:'',original:body.text,content_depth:'user-provided-text',mode:'provided-source'};
  const ids=body.sourceRequestIds|| (body.sourceRequestId?[body.sourceRequestId]:[]);if(!Array.isArray(ids)||ids.length>5)throw new ContentError('來源連結數量無效');
  if(ids.length){const links=[];for(const id of ids){const linked=await runtime.job(id);if(linked.kind!=='source'||linked.state!=='completed'||!linked.source?.text)throw new ContentError('連結正文尚未讀取及保存');links.push(linked);}source={...source,post_id:'url:'+links[0].id,url:links[0].source.url,original:links.map(l=>'Source: '+l.source.url+'\n'+l.source.text).join('\n\n'),content_depth:'retrieved-source-text'};}
  else if(body.postId){const [feed,social,articles]=await Promise.all([runtime.client.read(runtime.workspace,'rss'),runtime.client.inspirationPosts(runtime.workspace),runtime.client.articles(runtime.workspace)]);const found=[...feed.items,...social].find(v=>v.post_id===body.postId);if(!found)throw new ContentError('來源不屬於目前workspace',404);const article=articles.find(v=>v.post_id===body.postId)?.article;source={...source,post_id:found.post_id,url:found.post_url,original:article?.text||found.caption,content_depth:article?'extracted-public-article':found.content_depth};}
  else if(/^https?:\/\/\S+$/.test(body.text.trim()))throw new ContentError('請先讀取連結正文，再改寫');
  const record=prepareRequest({input:body.text,platforms:body.platforms,brand:{revision:brand.revision},source},brand,snapshot.skill);
  record.id=body.requestId;const payload=requestBody(record);
  const claimed=await runtime.claim(body.requestId,'text',{record,provider:'toapis',model:'deepseek-v4-flash'});job=claimed.job;
  if(claimed.claimed){
   try{const response=await fetcher('https://toapis.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(90000),redirect:'error'});
    const raw=await response.json();job=await runtime.update(job,'generated',{response:raw,providerHttpStatus:response.status});
   }catch{try{job=await runtime.update(job,'unknown',{error:'模型請求或回應保存未完成，請先核對；不自動重新付費'});}catch{}throw new ContentError('生成狀態待核對；保留request ID，不重新生成',502);}
  }
 }
 if(job.kind!=='text')throw new ContentError('請求類型不符');
 if(job.state==='completed')return job.record;
 if(!job.response)throw new ContentError('請求仍在處理或狀態未知；沒有重新付費',409);
 const provider=job.payload.provider||'minimax';const label=provider==='toapis'?'ToAPI':'MiniMax';
 if(job.providerHttpStatus>=400){const message=job.providerHttpStatus===401?label+'認證被拒（401），請更新有效API設定後再建立新請求':label+'回報HTTP '+job.providerHttpStatus+'；原回應已保存，未重新生成';if(job.state!=='failed')job=await runtime.update(job,'failed',{error:message});const error=new ContentError(message,502);error.terminal=true;throw error;}
 if(job.response.choices?.[0]?.finish_reason!=='stop')throw new ContentError('供應商未完成輸出；原回應已保存在雲端',502);
 let parsed;try{parsed=JSON.parse(job.response.choices[0].message.content);}catch{throw new ContentError('模型JSON無效，原回應已保存；勿重新付費',422);}
 const outputs=validateOutputs(parsed.outputs,job.payload.record.brief.platforms);
 const record={...job.payload.record,version:1,status:'draft',provenance:'provider-live',model:job.response.model||(provider==='toapis'?'deepseek-v4-flash':'MiniMax-M3'),usage:job.response.usage||null,cost:{provider,amount:null,unit:provider==='toapis'?'ToAPI credits (unsettled)':'provider billing'},revisions:[{version:1,status:'draft',createdAt:new Date().toISOString(),outputs,review:null}]};
 const saved=await runtime.client.saveContentDraft(record);await runtime.update(job,'completed',{record:saved});return saved;
}
