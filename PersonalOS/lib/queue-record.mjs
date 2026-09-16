import {ContentError,validateOutputs} from './content-engine.mjs';
export function updateQueueRecord(record,input,now=Date.now()){
 if(record.version!==input.expectedVersion)throw new ContentError('內容已更新，請重新讀取後再修改',409);
 const current=record.revisions.at(-1)?.outputs||[];
 if(!current.some(o=>o.platform===input.platform))throw new ContentError('找不到此平台草稿');
 const queue={...record.queue};let outputs=current;
 if(input.action==='queueEdit'){
  outputs=current.map(o=>o.platform===input.platform?{...o,title:input.title,body:input.body}:o);
  outputs=validateOutputs(outputs,record.brief.platforms);queue[input.platform]={status:'draft',scheduledAt:null};
 }else if(input.action==='attachImage'){
  if(!input.verifiedImage?.storagePath)throw new ContentError('圖片未驗證');
  queue[input.platform]={status:'draft',scheduledAt:null};
 }else if(input.action==='schedule'){
  const when=Date.parse(input.scheduledAt);
  if(typeof input.scheduledAt!=='string'||!Number.isFinite(when)||when<=now)throw new ContentError('請選未來日期及時間');
  try{new Intl.DateTimeFormat('en',{timeZone:input.timeZone}).format();}catch{throw new ContentError('時區無效');}
  if(typeof input.timeZone!=='string'||input.timeZone.length>100)throw new ContentError('請提供時區');
  queue[input.platform]={status:'scheduled',scheduledAt:new Date(when).toISOString(),timeZone:input.timeZone,publishingEnabled:false};
 }else if(input.action==='unschedule')queue[input.platform]={status:'draft',scheduledAt:null};
 else throw new ContentError('未開放發布操作',403);
 const version=record.version+1;
 return {...record,queue,version,...(input.action==='attachImage'?{images:{...record.images,[input.platform]:input.verifiedImage}}:{}),status:input.action==='queueEdit'?'human_edit':record.status,revisions:[...record.revisions,{version,status:input.action==='queueEdit'?'human_edit':record.status,createdAt:new Date(now).toISOString(),outputs,review:null}],queueEvents:[...(record.queueEvents||[]),{action:input.action,platform:input.platform,at:new Date(now).toISOString()}]};
}
