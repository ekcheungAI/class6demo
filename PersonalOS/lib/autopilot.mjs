// Act 6 · 邊個做、喺邊做、幾時停。The runner is a Vercel function (or the
// student clicking「Run once now」); credentials stay in server env; the cap
// and kill switch are the two ways to stop; the runs log is the evidence.
import {randomUUID} from 'node:crypto';
import {readSettings} from './settings.mjs';
import {CARD_PREFIX} from './cards.mjs';
import {publishCard} from './publish-adapter.mjs';

export const LEDGER_ID='system:publish-ledger';
export const RUN_PREFIX='autorun:';

export async function publishLedger(store){
 const row=await store.get(LEDGER_ID);const keys=new Set(row?.metadata?.keys||[]);
 return {keys,save:()=>store.put(LEDGER_ID,{provider:'personalos',platform:'publish',status:'ledger',metadata:{keys:[...keys].slice(-500),updatedAt:new Date().toISOString()}})};
}
export async function countPublishedToday(store){
 const rows=await store.list(CARD_PREFIX,{limit:300});const today=new Date().toISOString().slice(0,10);
 return rows.map(r=>r.metadata).filter(c=>c.publish_status==='published'&&String(c.verified_at||'').slice(0,10)===today).length;
}
export async function logRun(store,{trigger,cards=/** @type {any[]} */([]),settings,stopped=/** @type {string|null} */(null)}){
 const run={id:randomUUID(),started_at:new Date().toISOString(),trigger,stopped,cards_published:cards.filter(c=>c.status==='published').length,cards_unknown:cards.filter(c=>c.status==='unknown').length,cards_skipped:cards.filter(c=>['skipped','refused'].includes(c.status)).length,daily_post_cap:settings?.dailyPostCap??null,kill_switch:settings?.killSwitch??null,log:cards.map(c=>({card_id:c.card_id,platform:c.platform,route:c.route,status:c.status,reason:c.reason||c.note||null,submitted_id:c.submitted_id||null,published_id:c.published_id||null,public_url:c.public_url||null}))};
 if(stopped)run.log.unshift({message:stopped});
 await store.put(RUN_PREFIX+run.id,{provider:'personalos-autopilot',platform:'runner',status:stopped?'stopped':'completed',metadata:run});
 return run;
}

/**
 * One run: due (scheduled_at ≤ now) cards whose approval is still valid, up to
 * the daily cap. Missing settings = off. Kill switch = first log line, then nothing.
 */
export async function runOnce(store,{trigger='manual',accountFor,sign=/** @type {null|((p:string)=>Promise<string>)} */(null),now=Date.now()}){
 const settings=await readSettings(store);
 if(settings.killSwitch)return logRun(store,{trigger,settings,stopped:'stopped by kill switch'});
 if(trigger==='cron'&&!settings.autopilotEnabled)return logRun(store,{trigger,settings,stopped:'autopilot disabled (autopilot_enabled=false)'});
 const rows=await store.list(CARD_PREFIX,{limit:300});const ledger=await publishLedger(store);
 let used=await countPublishedToday(store);const results=[];
 const due=rows.map(r=>r.metadata).filter(c=>c.publish_status==='scheduled'&&c.scheduled_at&&Date.parse(c.scheduled_at)<=now).sort((a,b)=>String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
 for(const scheduled of due){
  const account=accountFor(scheduled,settings);
  // scheduled ≠ approved: the runner only publishes cards whose signature still holds
  if(!scheduled.was_approved||!scheduled.approval_hash){results.push({card_id:scheduled.card_id,platform:scheduled.platform,route:scheduled.publish_route,status:'refused',reason:'not_approved',note:'scheduled 但未批準：runner 唔會發'});continue;}
  const asApproved={...scheduled,publish_status:'approved'};
  const {result,card}=await publishCard(asApproved,{workspaceId:store.workspace,accountId:account,ledger:ledger.keys,cap:{used,limit:settings.dailyPostCap},sign});
  if(result.status==='published')used++;
  const saved=result.status==='refused'||result.status==='skipped'?scheduled:card; // refused stays scheduled, untouched
  if(saved!==scheduled)await store.put(CARD_PREFIX+card.card_id,{provider:'composer',platform:card.platform,status:card.publish_status,metadata:card});
  results.push({card_id:scheduled.card_id,platform:scheduled.platform,route:scheduled.publish_route,...result});
 }
 await ledger.save();
 return logRun(store,{trigger,cards:results,settings});
}
