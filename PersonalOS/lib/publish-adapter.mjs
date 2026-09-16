// Publish adapter — contracts/publish-adapter.md made real.
// It receives one *approved* card, sends it once, verifies once, and reports
// honestly: published / unknown / failed. It never approves, never schedules,
// never retries, and never prints a token.
//
// Threads:   POST /{user}/threads → creation_id (submitted_id)
//            POST /{user}/threads_publish → media id (published_id)
//            GET  /{published_id}?fields=id,permalink → public_url
// Upload-Post (checked against docs.upload-post.com/openapi.json, 2026-09-16):
//            POST /api/upload_text | /api/upload_photos (multipart: user, platform[], title, photos[])
//            → sync: results{platform:{url,post_id}} | async: request_id → GET /api/uploadposts/status?request_id=
import {ContentError} from './content-engine.mjs';
import {approvalValid,idempotencyKey} from './cards.mjs';

const THREADS=()=>(process.env.THREADS_BASE||'https://graph.threads.net').replace(/\/+$/,'');
const UPLOAD=()=>(process.env.UPLOAD_POST_BASE||'https://api.upload-post.com').replace(/\/+$/,'');
const j=async(r)=>{try{return await r.json();}catch{return null;}};
const t=(ms)=>AbortSignal.timeout(ms);

async function threadsPost(path,form,token){
 const body=new URLSearchParams({...form,access_token:token});
 const r=await fetch(`${THREADS()}/v1.0/${path}`,{method:'POST',body,signal:t(30000)});
 return {ok:r.ok,status:r.status,body:await j(r)};
}
export async function verifyThreads(publishedId,token){
 const r=await fetch(`${THREADS()}/v1.0/${encodeURIComponent(publishedId)}?fields=id,permalink,timestamp&access_token=${encodeURIComponent(token)}`,{signal:t(20000),cache:'no-store'});
 const b=await j(r);
 return r.ok&&b?.permalink?{found:true,public_url:b.permalink,timestamp:b.timestamp||null}:{found:false,error:b?.error?.message||('HTTP '+r.status)};
}
async function uploadPostSend(card,{key,profile}){
 const fd=new FormData();fd.append('user',profile);fd.append('platform[]',card.platform);
 const hasImage=(card.attachments||[]).some(a=>a.kind==='image');
 let path='/api/upload_text';
 if(hasImage){path='/api/upload_photos';for(const a of card.attachments)if(a.kind==='image')fd.append('photos[]',a.url);fd.append('title',card.content);}
 else fd.append('title',card.content);
 const r=await fetch(UPLOAD()+path,{method:'POST',headers:{Authorization:'Apikey '+key},body:fd,signal:t(60000)});
 return {ok:r.ok,status:r.status,body:await j(r)};
}
export async function verifyUploadPost(submittedId,key){
 const r=await fetch(`${UPLOAD()}/api/uploadposts/status?request_id=${encodeURIComponent(submittedId)}`,{headers:{Authorization:'Apikey '+key},signal:t(20000),cache:'no-store'});
 const b=await j(r);if(!r.ok)return {found:false,error:b?.error||('HTTP '+r.status)};
 const results=Array.isArray(b?.results)?b.results:Object.entries(b?.results||{}).map(([platform,v])=>({platform,...v}));
 const done=results.find(x=>x.success&&(x.url||x.post_url||x.post_id));
 return done?{found:true,public_url:done.url||done.post_url||null,published_id:done.post_id||done.publish_id||null,status:b.status}:{found:false,status:b?.status||'unknown',error:results.find(x=>x.success===false)?.message||results.find(x=>x.error)?.error||null};
}

/**
 * Publish exactly one card. `ledger` is the set of idempotency keys already
 * sent for this workspace (persisted by the caller). Returns the updated card
 * plus a `result` the UI can show verbatim.
 */
export async function publishCard(card,{workspaceId,accountId,ledger,env=process.env,cap}){
 const key=idempotencyKey(workspaceId,card.card_id,card.content_hash);
 // Gate 1: the signature still matches this account + content + attachments
 if(card.publish_status!=='approved')return {result:{status:'refused',reason:'not_approved',note:'卡唔係 approved（'+card.publish_status+'）'},card};
 if(!approvalValid(card,accountId))return {result:{status:'refused',reason:'approval_stale',note:'批準對唔上（內容、附件或帳戶改咗）— 重新 dry-run 再批'},card};
 // Gate 2: daily cap
 if(cap&&cap.used>=cap.limit)return {result:{status:'refused',reason:'daily_cap',note:`今日已出 ${cap.used}／${cap.limit}，唔發`},card};
 // Gate 3: one card, once
 if(ledger.has(key))return {result:{status:'skipped',reason:'duplicate',note:'duplicate, skipped — 同一張卡同一版本已經送過'},card};
 if(card.publish_route==='none')return {result:{status:'refused',reason:'archive_only',note:'newsletter 只存檔，冇發布動作'},card};
 if(card.publish_route==='unset')return {result:{status:'refused',reason:'route_unset',note:'未揀路線'},card};

 const stamp=new Date().toISOString();
 if(card.publish_route==='threads_direct'){
  const token=env.THREADS_USER_ACCESS_TOKEN,userId=env.THREADS_USER_ID;
  if(!token||!userId)return {result:{status:'refused',reason:'no_credentials',note:'THREADS_USER_ACCESS_TOKEN／THREADS_USER_ID 未設'},card};
  const image=(card.attachments||[]).find(a=>a.kind==='image');
  ledger.add(key);
  const c=await threadsPost(`${userId}/threads`,{media_type:image?'IMAGE':'TEXT',text:card.content,...(image?{image_url:image.url}:{})},token);
  if(!c.ok){const msg=c.body?.error?.message||('HTTP '+c.status);return {result:{status:'failed',stage:'container',http:c.status,error:msg,note:/scope|permission/i.test(msg)?'有 token ≠ 有權限：threads_content_publish 係另一個 scope':/expire|session/i.test(msg)?'token 過咗期':'容器建立失敗'},card:{...card,events:[...card.events,{at:stamp,action:'publish_failed',note:msg}]}};}
  const submitted_id=String(c.body.id);
  const p=await threadsPost(`${userId}/threads_publish`,{creation_id:submitted_id},token);
  if(!p.ok){const msg=p.body?.error?.message||('HTTP '+p.status);return {result:{status:'unknown',stage:'publish',submitted_id,error:msg,note:'容器已建立但發布回覆唔係 200 — 唔好再發，先查'},card:{...card,publish_status:'unknown',submitted_id,idempotency_key:key,events:[...card.events,{at:stamp,action:'submitted',note:'publish '+msg}]}};}
  const published_id=String(p.body.id);
  const v=await verifyThreads(published_id,token);
  if(!v.found)return {result:{status:'unknown',submitted_id,published_id,note:'verify 查唔到，唔再發；撳「再查一次」'},card:{...card,publish_status:'unknown',submitted_id,published_id,idempotency_key:key,events:[...card.events,{at:stamp,action:'submitted'},{at:stamp,action:'verify_unknown',note:v.error}]}};
  return {result:{status:'published',submitted_id,published_id,public_url:v.public_url},card:{...card,publish_status:'published',submitted_id,published_id,public_url:v.public_url,verified_at:new Date().toISOString(),idempotency_key:key,events:[...card.events,{at:stamp,action:'submitted'},{at:stamp,action:'published'}]}};
 }
 if(card.publish_route==='upload_post'){
  const apiKey=env.UPLOAD_POST_API_KEY;
  if(!apiKey)return {result:{status:'refused',reason:'no_credentials',note:'UPLOAD_POST_API_KEY 未設'},card};
  if(!accountId)return {result:{status:'refused',reason:'no_profile',note:'未揀 Upload-Post profile（Connections 頁）'},card};
  if(card.platform==='instagram'&&!(card.attachments||[]).some(a=>a.kind==='image'))return {result:{status:'refused',reason:'instagram_requires_media',note:'Instagram 一定要有圖'},card};
  ledger.add(key);
  const r=await uploadPostSend(card,{key:apiKey,profile:accountId});
  if(!r.ok){const msg=r.body?.error||r.body?.message||('HTTP '+r.status);return {result:{status:'failed',stage:'submit',http:r.status,error:String(msg).slice(0,200)},card:{...card,events:[...card.events,{at:stamp,action:'publish_failed',note:String(msg).slice(0,120)}]}};}
  const sync=r.body?.results&&!Array.isArray(r.body.results)?r.body.results[card.platform]:null;
  const submitted_id=String(r.body?.request_id||r.body?.job_id||(sync?'sync:'+(sync.post_id||sync.publish_id||Date.now()):''));
  if(sync&&sync.success&&(sync.url||sync.post_id)){
   return {result:{status:'published',submitted_id,published_id:sync.post_id||sync.publish_id||null,public_url:sync.url||null,per_platform:[{platform:card.platform,published_id:sync.post_id||null,public_url:sync.url||null}]},card:{...card,publish_status:'published',submitted_id,published_id:sync.post_id||sync.publish_id||null,public_url:sync.url||null,verified_at:new Date().toISOString(),idempotency_key:key,events:[...card.events,{at:stamp,action:'submitted'},{at:stamp,action:'published'}]}};
  }
  if(!submitted_id)return {result:{status:'unknown',note:'Upload-Post 回咗 200 但冇 request_id 亦冇 url — 標 UNKNOWN，唔再發',raw:Object.keys(r.body||{})},card:{...card,publish_status:'unknown',idempotency_key:key,events:[...card.events,{at:stamp,action:'submitted',note:'no id'}]}};
  const v=await verifyUploadPost(submitted_id,apiKey);
  if(!v.found)return {result:{status:'unknown',submitted_id,note:'已收到（'+(v.status||'pending')+'），verify 未見 url；唔再發，稍後「再查一次」'},card:{...card,publish_status:'unknown',submitted_id,idempotency_key:key,events:[...card.events,{at:stamp,action:'submitted'},{at:stamp,action:'verify_unknown',note:v.status||v.error||''}]}};
  return {result:{status:'published',submitted_id,published_id:v.published_id,public_url:v.public_url},card:{...card,publish_status:'published',submitted_id,published_id:v.published_id,public_url:v.public_url,verified_at:new Date().toISOString(),idempotency_key:key,events:[...card.events,{at:stamp,action:'submitted'},{at:stamp,action:'published'}]}};
 }
 return {result:{status:'refused',reason:'route_unknown'},card};
}

/** Re-verify an UNKNOWN card. Never resends. */
export async function verifyCard(card,{env=process.env}){
 if(card.publish_status!=='unknown')throw new ContentError('只有 unknown 卡需要再查');
 const stamp=new Date().toISOString();
 if(card.publish_route==='threads_direct'){
  if(!card.published_id)return {result:{status:'unknown',note:'冇 published_id 可以查：容器有 id 但發布未確認。人手去 Threads 望一眼；唔好再發'},card};
  const v=await verifyThreads(card.published_id,env.THREADS_USER_ACCESS_TOKEN||'');
  if(!v.found)return {result:{status:'unknown',note:'再查仍然查唔到（'+(v.error||'')+'）'},card:{...card,events:[...card.events,{at:stamp,action:'verify_unknown',note:v.error}]}};
  return {result:{status:'published',public_url:v.public_url},card:{...card,publish_status:'published',public_url:v.public_url,verified_at:stamp,events:[...card.events,{at:stamp,action:'published'}]}};
 }
 if(card.publish_route==='upload_post'){
  if(!card.submitted_id)return {result:{status:'unknown',note:'冇 submitted_id 可以查'},card};
  const v=await verifyUploadPost(card.submitted_id,env.UPLOAD_POST_API_KEY||'');
  if(!v.found)return {result:{status:'unknown',note:'再查：'+(v.status||v.error||'仍未有 url')},card:{...card,events:[...card.events,{at:stamp,action:'verify_unknown',note:v.status||v.error||''}]}};
  return {result:{status:'published',public_url:v.public_url,published_id:v.published_id},card:{...card,publish_status:'published',published_id:v.published_id,public_url:v.public_url,verified_at:stamp,events:[...card.events,{at:stamp,action:'published'}]}};
 }
 return {result:{status:'unknown',note:'路線未知'},card};
}
