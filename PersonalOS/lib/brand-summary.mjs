import {createHash} from 'node:crypto';
import {ContentError} from './content-engine.mjs';
export function brandSummary(brand,skill){
 const documents=Object.fromEntries(['company','voice','look'].map(k=>[k,{source:brand.documents?.[k]?.source||k,text:brand.documents?.[k]?.text||''}]));
 const summary={owner:brand.owner,status:'configured',documents,skill,outputPlatforms:brand.outputPlatforms||['Threads','Instagram'],assets:[],samples:[],missing:[],websites:brand.websites||[]};
 if(!summary.owner||Object.values(documents).some(v=>!v.text))throw new ContentError('品牌摘要缺少公司、語氣或Look');
 if(Buffer.byteLength(JSON.stringify(summary),'utf8')>16000)throw new ContentError('品牌資料超過16KB，請先由Codex整理保留核心規則及來源的摘要，再保存；不會自動截斷');
 return {...summary,revision:createHash('sha256').update(JSON.stringify(summary)).digest('hex').slice(0,16)};
}
