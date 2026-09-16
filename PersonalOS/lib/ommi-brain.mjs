import {createHash} from 'node:crypto';
import {ContentError} from './content-engine.mjs';

export const OMMI_BRAIN_SOURCE_ID='system:ommi-brain';
export const OMMI_BRAIN_PLATFORMS=['X','Instagram','Threads','LinkedIn','Newsletter'];
export const OMMI_BRAIN_LANGUAGES=['English','Traditional Chinese (Hong Kong)','Traditional Chinese (Taiwan)','Cantonese (Hong Kong)'];

const strip=text=>String(text||'').replace(/^---\n[\s\S]*?\n---\n/,'').trim();
const short=(value,max)=>String(value||'').trim().slice(0,max);

export function defaultBrainProfile(brand){
 const voice=strip(brand.documents?.voice?.text);
 const colors=[...new Set(String(brand.documents?.look?.text||'').match(/#[a-fA-F0-9]{6}\b/g)||[])];
 const enabled=new Set(brand.outputPlatforms||['Threads','Newsletter']);
 return {
  version:1,
  name:short(brand.owner||'My Ommi',80),
  tone:'請設定自己的品牌語氣',
  styleNotes:voice.slice(0,4000),
  interests:[],
  platforms:OMMI_BRAIN_PLATFORMS.map(id=>({id,enabled:enabled.has(id),language:id==='X'||id==='LinkedIn'?'English':'Traditional Chinese (Hong Kong)',bodyLinks:'handles',commentLinks:id==='Instagram'||id==='LinkedIn'||id==='Newsletter'?'on':'off'})),
  look:{primaryColor:colors[0]||'#08080C',accentColor:colors[1]||'#7C5CFF',fontHeading:'Noto Sans HK',fontBody:'Noto Sans HK',watermark:'',assetIds:(brand.assets||[]).slice(0,6).map(a=>a.id)},
  source:'company-vault',
  updatedAt:null,
 };
}

export function validateBrainProfile(input){
 if(!input||typeof input!=='object')throw new ContentError('Ommi Brain設定格式無效');
 const name=short(input.name,80),tone=short(input.tone,240),styleNotes=short(input.styleNotes,8000);
 if(!name||!tone||!styleNotes)throw new ContentError('Writing Identity需要名稱、Tone及Style Notes');
 const interests=[...new Set((Array.isArray(input.interests)?input.interests:[]).map(v=>short(v,60)).filter(Boolean))].slice(0,24);
 const incoming=Array.isArray(input.platforms)?input.platforms:[];
 const platforms=OMMI_BRAIN_PLATFORMS.map(id=>{
  const row=incoming.find(p=>p?.id===id)||{};
  const language=OMMI_BRAIN_LANGUAGES.includes(row.language)?row.language:'Traditional Chinese (Hong Kong)';
  return {id,enabled:row.enabled===true,language,bodyLinks:row.bodyLinks==='url'?'url':'handles',commentLinks:row.commentLinks==='on'?'on':'off'};
 });
 if(!platforms.some(p=>p.enabled))throw new ContentError('至少開啟一個輸出平台');
 const look=input.look&&typeof input.look==='object'?input.look:{};
 const color=value=>/^#[a-fA-F0-9]{6}$/.test(value)?value.toUpperCase():'#7C5CFF';
 return {version:1,name,tone,styleNotes,interests,platforms,look:{primaryColor:color(look.primaryColor),accentColor:color(look.accentColor),fontHeading:short(look.fontHeading,100)||'Noto Sans HK',fontBody:short(look.fontBody,100)||'Noto Sans HK',watermark:short(look.watermark,100),assetIds:[...new Set((Array.isArray(look.assetIds)?look.assetIds:[]).map(v=>short(v,100)).filter(Boolean))].slice(0,6)},source:input.source==='supabase'?'supabase':'company-vault',updatedAt:typeof input.updatedAt==='string'?input.updatedAt:null};
}

export function brainRevision(vaultRevision,profile){const checked=validateBrainProfile(profile);const {source:_,updatedAt:__,...semantic}=checked;return createHash('sha256').update(String(vaultRevision)+'\n'+JSON.stringify(semantic)).digest('hex').slice(0,12);}

export function runtimeBrain(brand,saved){
 const profile=validateBrainProfile(saved?.profile||defaultBrainProfile(brand));
 return {...brand,revision:brainRevision(brand.revision,profile),vaultRevision:brand.revision,brainProfile:profile,companyVaultProfile:validateBrainProfile(defaultBrainProfile(brand)),persistence:saved?{mode:'supabase',workspaceId:saved.workspaceId,verified:true,updatedAt:saved.updatedAt}:{mode:'company-vault-default',verified:false}};
}
