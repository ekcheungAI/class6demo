import {studentBudget} from './student-budget.mjs';
import {mkdir,open,readFile,rename,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {ContentError,rootDir} from './content-engine.mjs';

const BASE='https://toapis.com/v1';
export const IMAGE_RESERVATION_CREDITS=20;
export async function imageBudget({dir=rootDir()}={}){const ledger=await readLedger(dir);const limitCredits=Math.min(ledger.limitCredits,studentBudget());return {limitCredits,spentCredits:ledger.spentCredits,remainingCredits:Math.max(0,limitCredits-ledger.spentCredits),reservationCredits:IMAGE_RESERVATION_CREDITS,uncertain:ledger.uncertain};}
export const IMAGE_MODEL='gpt-image-2.5-flare';
export const IMAGE_FALLBACKS=['gpt-image-2.5-flare-vip','gpt-image-2.5-flare-official','gpt-image-2.5-sunburst','gpt-image-2.5-sunburst-vip','gpt-image-2.5-sunburst-official'];
export const IMAGE_RATIOS=['1:1','4:5','16:9','9:16'];
const TASK_RE=/^[A-Za-z0-9_-]{8,180}$/;
const REQUEST_RE=/^[0-9a-f-]{36}$/;

const taskFile=(dir,id)=>path.join(dir,`image-task-${id}.json`);
const ledgerFile=dir=>path.join(dir,'_toapi-budget.json');
const safeText=(value,max)=>String(value||'').replace(/\s+/g,' ').trim().slice(0,max);

export function imageRequest({text,visualDirection='',ratio='1:1',brain,model=IMAGE_MODEL}){
 if(![IMAGE_MODEL,...IMAGE_FALLBACKS].includes(model))throw new ContentError('只接受課堂Image2.5模型');
 if(!IMAGE_RATIOS.includes(ratio))throw new ContentError('圖片比例不受支援');
 const topic=safeText(text,2400);if(topic.length<10)throw new ContentError('先提供至少10個字嘅內容或觀點');
 const visual=safeText(visualDirection,800);
 const look=brain?.brainProfile?.look||{};
 const tone=safeText(brain?.brainProfile?.tone,240);
 const interests=(brain?.brainProfile?.interests||[]).map(v=>safeText(v,60)).filter(Boolean).slice(0,8);
 const prompt=[
  'Create one polished social media image for the content below.',
  `CONTENT: ${topic}`,
  visual?`VISUAL DIRECTION: ${visual}`:'VISUAL DIRECTION: choose one clear visual idea from the content.',
  `BRAND: primary ${look.primaryColor||'#08080C'}, accent ${look.accentColor||'#7C5CFF'}, headline font style ${look.fontHeading||'bold sans-serif'}, body font style ${look.fontBody||'clean sans-serif'}, tone ${tone||'clear and direct'}.`,
  interests.length?`BRAND TOPICS: ${interests.join(', ')}.`:'',
  look.watermark?`Add a subtle bottom-right watermark reading exactly: ${safeText(look.watermark,100)}.`:'Do not add a logo or watermark.',
  `COMPOSITION: ${ratio} aspect ratio, one dominant subject, strong hierarchy, generous negative space, feed-ready crop.`,
  'TEXT RULE: render no paragraph text. At most one short headline derived faithfully from the supplied content. Do not invent facts, statistics, logos, UI screenshots, or extra claims.',
  'STYLE REFERENCES: none attached in this version; use only the saved textual Brand Kit above.'
 ].filter(Boolean).join('\n');
 return {model,prompt,size:ratio,resolution:'1K',metadata:{resolution:'1K'},n:1,response_format:'url'};
}

export function resultUrl(data){
 const first=(Array.isArray(data?.result?.data)?data.result.data:Array.isArray(data?.data)?data.data:[])[0];
 const value=typeof first?.url==='string'?first.url:'';
 if(!value)return null;
 const url=new URL(value,BASE);if(url.protocol!=='https:')throw new ContentError('圖片結果網址格式不安全');return url.href;
}

async function atomic(file,value){const temp=file+'.tmp';await writeFile(temp,JSON.stringify(value,null,2),{mode:0o600});await rename(temp,file);}
async function balance(key,fetcher){const r=await fetcher(BASE+'/balance',{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok||d.success!==true||!Number.isFinite(d.used_credits)||d.credits_per_usd!==200)throw new ContentError('未能核對ToAPI credits，未提交圖片');return d.used_credits;}
async function readLedger(dir){try{return JSON.parse(await readFile(ledgerFile(dir),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return {limitCredits:studentBudget(),spentCredits:0,uncertain:false,attempts:[]};}}

export async function submitImage({requestId,workspaceId,body},{dir=rootDir(),key=process.env.TOAPI_API_KEY,fetcher=fetch}={}){
 if(!key)throw new ContentError('未配置ToAPI key');if(!REQUEST_RE.test(requestId))throw new ContentError('圖片請求識別碼無效');
 await mkdir(dir,{recursive:true,mode:0o700});let lock;try{lock=await open(path.join(dir,'_toapi.lock'),'wx',0o600);}catch{throw new ContentError('另一個ToAPI工作正在進行，請稍後再試',409);}
 try{
  const ledger=await readLedger(dir);if(ledger.uncertain||ledger.spentCredits+IMAGE_RESERVATION_CREDITS>Math.min(ledger.limitCredits,studentBudget()))throw new ContentError('ToAPI預算未確認或不足，停止新圖片請求');
  if(ledger.attempts.some(a=>a.id===requestId))throw new ContentError('此圖片請求已提交，不會重複扣費',409);
  const before=await balance(key,fetcher);ledger.uncertain=true;ledger.attempts.push({id:requestId,type:'image',model:IMAGE_MODEL,reservedCredits:IMAGE_RESERVATION_CREDITS,balanceBefore:before,at:new Date().toISOString()});await atomic(ledgerFile(dir),ledger);
  const response=await fetcher(BASE+'/images/generations',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(45000)});
  const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{throw new ContentError('ToAPI圖片提交回應不是JSON；預算保持待核對');}
  if(!response.ok)throw new ContentError('ToAPI圖片提交失敗；預算保持待核對');
  const taskId=typeof data.id==='string'?data.id:typeof data.task_id==='string'?data.task_id:'';if(!TASK_RE.test(taskId))throw new ContentError('ToAPI未回傳有效圖片task ID；預算保持待核對');
  const task={requestId,taskId,workspaceId,body,status:data.status||'queued',progress:data.progress||0,submittedAt:new Date().toISOString(),provider:'toapis',providerSubmit:data};await atomic(taskFile(dir,taskId),task);
  Object.assign(ledger.attempts.at(-1),{taskId});await atomic(ledgerFile(dir),ledger);return task;
 }finally{await lock.close();await unlink(path.join(dir,'_toapi.lock'));}
}

export async function readImageTask(taskId,{dir=rootDir()}={}){if(!TASK_RE.test(taskId))throw new ContentError('圖片task ID無效');try{return JSON.parse(await readFile(taskFile(dir,taskId),'utf8'));}catch(e){if(e.code==='ENOENT')throw new ContentError('找不到圖片task',404);throw e;}}

export async function pollImage(taskId,{dir=rootDir(),key=process.env.TOAPI_API_KEY,fetcher=fetch}={}){
 if(!key)throw new ContentError('未配置ToAPI key');const saved=await readImageTask(taskId,{dir});if(['completed','failed','provider-failed','provider-completed'].includes(saved.status))return saved;
 const response=await fetcher(BASE+'/images/generations/'+encodeURIComponent(taskId),{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw new ContentError('圖片task狀態暫時未能讀取',502);
 const url=resultUrl(data);const status=data.status==='completed'&&url?'provider-completed':data.status==='failed'?'provider-failed':data.status||'in_progress';const next={...saved,status,progress:Number(data.progress)||0,providerPoll:data,...(url?{providerUrl:url}:{})};await atomic(taskFile(dir,taskId),next);return next;
}

export async function finishImageTask(taskId,patch,{dir=rootDir(),key=process.env.TOAPI_API_KEY,fetcher=fetch}={}){
 const saved=await readImageTask(taskId,{dir});const next={...saved,...patch};
 if(!['completed','failed'].includes(next.status))throw new ContentError('圖片task尚未完成');
 const ledger=await readLedger(dir);const attempt=ledger.attempts.find(a=>a.taskId===taskId);if(attempt&&!Number.isFinite(attempt.observedCreditsDelta)){
  const after=await balance(key,fetcher);const delta=after-attempt.balanceBefore;if(delta<0)throw new ContentError('ToAPI credits回報不一致，需核對');attempt.observedCreditsDelta=delta;attempt.balanceAfter=after;attempt.finishedAt=new Date().toISOString();ledger.spentCredits+=delta;ledger.uncertain=false;await atomic(ledgerFile(dir),ledger);next.observedCredits=delta;
 }
 await atomic(taskFile(dir,taskId),next);return next;
}
