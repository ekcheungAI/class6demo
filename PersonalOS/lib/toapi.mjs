import {studentBudget} from './student-budget.mjs';
import {readFile,writeFile,mkdir,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {ContentError,rootDir,changeContent} from './content-engine.mjs';
const base='https://toapis.com/v1';
export function requestBody(record){
 const messages=[{role:'system',content:record.request.system},{role:'user',content:JSON.stringify(record.request.user)}];
 if(Buffer.byteLength(JSON.stringify(messages))>24000)throw new ContentError('首次測試輸入最多24KB');
 return {model:'deepseek-v4-flash',messages,max_tokens:4096,response_format:{type:'json_object'},stream:false};
}
export async function generateRecord(id,version,{dir=rootDir(),key=process.env.TOAPI_API_KEY,fetcher=fetch}={}){
 if(!key)throw new ContentError('未配置ToAPI key');
 if(!/^[0-9a-f-]{36}$/.test(id))throw new ContentError('記錄ID無效');
 await mkdir(dir,{recursive:true});const lock=path.join(dir,'_toapi.lock');let handle;
 try{handle=await open(lock,'wx');}catch{throw new ContentError('另一個模型測試進行中，或需檢查未完成測試',409);}
 const ledgerPath=path.join(dir,'_toapi-budget.json');let ledger;
 try{
 try{ledger=JSON.parse(await readFile(ledgerPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;ledger={limitCredits:studentBudget(),spentCredits:0,uncertain:false,attempts:[]};}
 if(ledger.uncertain||ledger.spentCredits+20>Math.min(ledger.limitCredits,studentBudget()))throw new ContentError('預算不足或上次扣費未核對；停止新呼叫');
 if(ledger.attempts.some(a=>a.id===id))throw new ContentError('此請求已嘗試過，不自動重試');
 const r=JSON.parse(await readFile(path.join(dir,id+'.json'),'utf8'));
 if(r.status!=='awaiting_output'||r.version!==version)throw new ContentError('請求狀態已改，請重讀',409);
 const body=requestBody(r);
 async function getBalance(){const res=await fetcher(base+'/balance',{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(15000)});const d=await res.json();if(!res.ok||d.success!==true||!Number.isFinite(d.used_credits)||d.credits_per_usd!==200)throw new ContentError('無法核對credits，未發出生成請求');return d.used_credits;}
 const before=await getBalance();
 ledger.uncertain=true;ledger.attempts.push({id,at:new Date().toISOString(),reservedCredits:20,balanceBefore:before,model:body.model});await writeFile(ledgerPath,JSON.stringify(ledger,null,2),{mode:0o600});
 const res=await fetcher(base+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(90000)});
 if(!res.ok)throw new ContentError('ToAPI請求失敗；未自動重試，需先核對扣費');
 const data=await res.json();
 // Store the successful provider response before parsing so failed parsing never loses billed work.
 await writeFile(path.join(dir,id+'.response.json'),JSON.stringify(data,null,2),{mode:0o600});
 const after=await getBalance();const delta=after-before;if(delta<0)throw new ContentError('用量回報不一致，需核對');
 ledger.spentCredits+=delta;ledger.uncertain=false;Object.assign(ledger.attempts.at(-1),{observedCreditsDelta:delta,requestId:data.id});await writeFile(ledgerPath,JSON.stringify(ledger,null,2),{mode:0o600});
 if(data.choices?.[0]?.finish_reason!=='stop')throw new ContentError('輸出未正常完成，回應已保存；沒有自動重試');
 let parsed;try{parsed=JSON.parse(data.choices[0].message.content);}catch{throw new ContentError('回應不是有效JSON；原始回應已保存，沒有自動重試');}
 return changeContent(id,{action:'generated',expectedVersion:version,outputs:parsed.outputs,model:data.model,usage:data.usage||null,cost:{unit:'ToAPI credits',observedTokenBalanceDelta:delta,attribution:'token balance difference; shared-key concurrent traffic may contribute'},requestId:data.id},dir);
 }catch(e){if(e instanceof ContentError)throw e;throw new ContentError('模型測試未完成；已停止，不會自動重試');}
 finally{await handle.close();await unlink(lock);}
}
