// Lesson 6 settings live in one runs row (`system:settings`). Everything here
// is meant to be changed from the UI and re-read on every execution — that is
// the whole point of Act 6: "會變嘅嘢存 DB，唔變嘅嘢先寫死".
import {ContentError} from './content-engine.mjs';
import {rssConfig} from './rss-feed.mjs';
import {validateAccounts} from './social-inspiration.mjs';

export const SETTINGS_ID='system:settings';
export const MAX_VOICE_RULES=3;

export function defaultSettings(){
 return {
  version:1,
  voiceRules:[],            // [{id,rule,scope,notScope,example,counterExample}] ≤3
  rssSources:[],            // student-added feeds [{id,name,url,enabled}]; config defaults stay
  disabledDefaultSources:[],// ids from config/rss-sources.json the student switched off
  dailyPostCap:1,
  killSwitch:false,
  autopilotEnabled:false,
  uploadPostProfile:'',       // chosen Upload-Post profile (username) for upload_post cards
  socialAccounts:[],          // Optional Step 18: followed accounts [{id,platform,handle,enabled}] ≤10
  updatedAt:null,
 };
}

const short=(v,max)=>String(v??'').trim().slice(0,max);
export function validateSettings(input){
 if(!input||typeof input!=='object')throw new ContentError('設定格式無效');
 const rules=(Array.isArray(input.voiceRules)?input.voiceRules:[]).map((r,i)=>({id:short(r?.id,20)||'R'+(i+1),rule:short(r?.rule,200),scope:short(r?.scope,120),notScope:short(r?.notScope,120),example:short(r?.example,240),counterExample:short(r?.counterExample,240)})).filter(r=>r.rule);
 if(rules.length>MAX_VOICE_RULES)throw new ContentError('voice rules 最多三條');
 const seen=new Set();
 const sources=(Array.isArray(input.rssSources)?input.rssSources:[]).map(s=>{
  const url=short(s?.url,500);let parsed;try{parsed=new URL(url);}catch{throw new ContentError('RSS 網址無效：'+url.slice(0,60));}
  if(parsed.protocol!=='https:'&&parsed.protocol!=='http:')throw new ContentError('RSS 只接受 http/https');
  const id=short(s?.id,60)||'custom-'+Buffer.from(url).toString('base64url').slice(0,12).toLowerCase();
  if(seen.has(id))throw new ContentError('RSS 來源重複：'+id);seen.add(id);
  return {id,name:short(s?.name,80)||parsed.hostname,url,enabled:s?.enabled!==false,template:'custom'};
 });
 if(sources.length>20)throw new ContentError('自訂 RSS 來源最多 20 個');
 const cap=Number(input.dailyPostCap);
 if(!Number.isInteger(cap)||cap<0||cap>10)throw new ContentError('每日上限要係 0–10 嘅整數');
 const disabled=[...new Set((Array.isArray(input.disabledDefaultSources)?input.disabledDefaultSources:[]).map(v=>short(v,60)).filter(Boolean))];
 return {version:1,voiceRules:rules,rssSources:sources,disabledDefaultSources:disabled,dailyPostCap:cap,killSwitch:input.killSwitch===true,autopilotEnabled:input.autopilotEnabled===true,uploadPostProfile:short(input.uploadPostProfile,80),socialAccounts:validateAccounts(input.socialAccounts),updatedAt:new Date().toISOString()};
}

/** Always read fresh — never cache across requests. Missing row = defaults. */
export async function readSettings(store){
 const row=await store.get(SETTINGS_ID);
 if(!row?.metadata?.version)return defaultSettings();
 try{return {...defaultSettings(),...validateSettings(row.metadata),updatedAt:row.metadata.updatedAt||null};}catch{return defaultSettings();}
}
export async function writeSettings(store,input){
 const value=validateSettings(input);
 await store.put(SETTINGS_ID,{provider:'personalos',platform:'settings',status:'active',metadata:value});
 return value;
}

/** Config defaults + student additions, minus what the student switched off. */
export function effectiveRssSources(settings){
 const off=new Set(settings.disabledDefaultSources||[]);
 const defaults=rssConfig.sources.map(s=>({...s,origin:'default',enabled:!off.has(s.id)}));
 const custom=(settings.rssSources||[]).map(s=>({...s,origin:'settings'}));
 return [...defaults,...custom];
}

/** Voice rules as one prompt block; empty when the student has not written any. */
export function voiceRulesPrompt(settings){
 if(!settings.voiceRules?.length)return '';
 return '我把聲（三條規則，只改講法，唔改事實）：\n'+settings.voiceRules.map(r=>`${r.id}：${r.rule}${r.scope?`（適用：${r.scope}`:''}${r.notScope?`；唔適用：${r.notScope}`:''}${r.scope||r.notScope?'）':''}${r.example?` 正例：「${r.example}」`:''}${r.counterExample?` 反例：「${r.counterExample}」`:''}`).join('\n');
}
