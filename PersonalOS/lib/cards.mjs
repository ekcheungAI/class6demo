// Composer cards, approval and the publish state machine — straight from
// contracts/composer-state-machine.md and contracts/publish-approval.md.
// Pure functions only; storage is lib/l6-store.mjs, providers are
// lib/publish-adapter.mjs.
import {createHash,randomUUID} from 'node:crypto';
import {ContentError} from './content-engine.mjs';

export const CARD_PREFIX='card:';
export const PLATFORMS=['threads','instagram','newsletter'];
export const ROUTES={threads:['threads_direct','upload_post'],instagram:['upload_post'],newsletter:['none']};
export const STATES=['draft','approved','scheduled','submitted','published','unknown'];

const sha=(s)=>createHash('sha256').update(s).digest('hex');
export const contentHash=(platform,content)=>sha(platform+'\n'+content).slice(0,12);
export const approvalHash=(accountId,hash,attachmentIds=[])=>sha(String(accountId)+hash+attachmentIds.join(','));
export const idempotencyKey=(workspaceId,cardId,hash)=>sha(workspaceId+cardId+hash);

export function newCard({sourceId,platform,content,title='',recordId=null,model=null}){
 const p=String(platform||'').toLowerCase();
 if(!PLATFORMS.includes(p))throw new ContentError('未知平台：'+platform);
 const body=String(content||'').trim();if(!body)throw new ContentError('卡冇內容');
 if(p==='threads'&&Array.from(body).length>500)throw new ContentError('Threads 最多 500 字元');
 return {
  card_id:randomUUID(),source_id:String(sourceId||'unknown'),platform:p,title:String(title||'').slice(0,200),content:body,
  content_hash:contentHash(p,body),attachment_ids:[],attachments:[],publish_status:'draft',approval_hash:'',approved_at:null,
  provider:p==='newsletter'?'none':'',publish_route:p==='newsletter'?'none':'unset',
  scheduled_at:null,time_zone:null,submitted_id:null,published_id:null,public_url:null,verified_at:null,
  record_id:recordId,model,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),events:[{at:new Date().toISOString(),action:'composed'}],
 };
}

function touch(card,action,extra={}){return {...card,...extra,updated_at:new Date().toISOString(),events:[...(card.events||[]),{at:new Date().toISOString(),action,...(extra.note?{note:extra.note}:{})}].slice(-40)};}

/** Any content/attachment/route change drops the card back to draft and clears the signature. */
export function invalidate(card,action,extra={}){
 return touch(card,action,{...extra,publish_status:'draft',approval_hash:'',approved_at:null,scheduled_at:null,time_zone:null});
}

export function editContent(card,content,title){
 if(['submitted','published','unknown'].includes(card.publish_status))throw new ContentError('已送出嘅卡唔可以再改；請開新卡');
 const body=String(content||'').trim();if(!body)throw new ContentError('卡冇內容');
 if(card.platform==='threads'&&Array.from(body).length>500)throw new ContentError('Threads 最多 500 字元');
 const hash=contentHash(card.platform,body);
 if(hash===card.content_hash&&String(title??card.title)===card.title)throw new ContentError('內容未有改動');
 const previous=card.content_hash;
 return invalidate(card,'edited',{content:body,title:String(title??card.title).slice(0,200),content_hash:hash,previous_hash:previous,note:`hash ${previous} → ${hash}；舊批準失效`});
}

export function setRoute(card,route){
 if(!ROUTES[card.platform].includes(route))throw new ContentError(`${card.platform} 唔可以行 ${route}`);
 if(route===card.publish_route)return card;
 return invalidate(card,'route',{publish_route:route,provider:route,note:'改路線 = 改版本，舊批準失效'});
}

export function attach(card,attachment){
 if(!attachment?.id||!(attachment?.url||attachment?.storagePath))throw new ContentError('附件要有 id 同 url（或 Storage 路徑）');
 const ids=[...new Set([...(card.attachment_ids||[]),String(attachment.id)])];
 return invalidate(card,'attached',{attachment_ids:ids,attachments:[...(card.attachments||[]).filter(a=>a.id!==attachment.id),{id:String(attachment.id),url:String(attachment.url||''),storagePath:attachment.storagePath?String(attachment.storagePath):null,kind:attachment.kind||'image',mode:attachment.mode||'LIVE'}],note:'附件變咗，要再批'});
}

/** The dry-run pack: what the student signs. Nothing here calls a network. */
export function dryRun(card,{accountId,workspaceId}){
 const problems=[];
 if(card.publish_route==='unset')problems.push('未揀 publish_route（threads_direct／upload_post）');
 if(card.platform==='instagram'&&!(card.attachment_ids||[]).length)problems.push('Instagram 一定要有圖，冇圖唔可以離開 draft');
 if(card.platform==='threads'&&Array.from(card.content).length>500)problems.push('Threads 超過 500 字元');
 if(!accountId&&card.publish_route!=='none')problems.push('未讀到目標帳戶身份（Connections 頁）');
 return {
  card_id:card.card_id,platform:card.platform,publish_route:card.publish_route,
  target_account:accountId||null,full_text:card.content,content_hash:card.content_hash,
  attachments:card.attachments||[],attachment_ids:card.attachment_ids||[],
  idempotency_key:workspaceId?idempotencyKey(workspaceId,card.card_id,card.content_hash):null,
  approval_hash_preview:approvalHash(accountId||'',card.content_hash,card.attachment_ids||[]),
  what_happens_after:card.publish_route==='none'?'唔會出街（newsletter 只存檔）':card.publish_route==='threads_direct'?'建立容器 → 發布 → 讀 permalink；三個 ID 分開記':'送一次去 Upload-Post → 每個平台各攞一組 published_id／public_url',
  problems,ok:problems.length===0,
  note:'預演唔係批準。你未按「批準」之前，機器一個字都唔會出。',
 };
}

export function approve(card,{accountId}){
 if(card.publish_status!=='draft')throw new ContentError('只有 draft 卡可以批準（而家係 '+card.publish_status+'）');
 const pack=dryRun(card,{accountId});
 if(!pack.ok)throw new ContentError('未過 dry-run：'+pack.problems.join('；'));
 return touch(card,'approved',{publish_status:'approved',approval_hash:approvalHash(accountId,card.content_hash,card.attachment_ids||[]),approved_account:accountId,approved_at:new Date().toISOString()});
}

/** True only when the signature still matches account + content + attachments. */
export function approvalValid(card,accountId){
 return !!card.approval_hash&&card.approval_hash===approvalHash(accountId,card.content_hash,card.attachment_ids||[]);
}

export function schedule(card,{scheduledAt,timeZone},now=Date.now()){
 if(!['draft','approved'].includes(card.publish_status))throw new ContentError('只有 draft／approved 卡可以排期');
 const when=Date.parse(scheduledAt);if(!Number.isFinite(when)||when<=now)throw new ContentError('請選未來日期及時間');
 try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{throw new ContentError('時區無效');}
 return touch(card,'scheduled',{publish_status:'scheduled',was_approved:card.publish_status==='approved',scheduled_at:new Date(when).toISOString(),time_zone:timeZone});
}
export function unschedule(card){
 if(card.publish_status!=='scheduled')throw new ContentError('呢張卡唔喺 scheduled');
 return touch(card,'unscheduled',{publish_status:card.was_approved&&card.approval_hash?'approved':'draft',scheduled_at:null,time_zone:null});
}

/** Column mapping from contracts/queue-columns.md. */
export function column(card){
 const s=card.publish_status;
 if(s==='published')return 'published';
 if(['scheduled','submitted','unknown'].includes(s))return 'scheduled';
 return 'draft';
}
