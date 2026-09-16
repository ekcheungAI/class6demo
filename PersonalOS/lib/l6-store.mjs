// Lesson 6 storage: one thin layer over the existing `runs` table so nothing
// new needs a migration. Every Lesson 6 object (settings, research runs,
// composer cards, autopilot runs) is one row keyed by a prefixed run_id and
// lives entirely in `metadata`. RLS on `runs` already scopes rows to the
// workspace owner, so the student's own token is the only credential used.
import {connectionConfig} from './read-only.mjs';
import {feedClient} from './feed-supabase.mjs';
import {ContentError} from './content-engine.mjs';

export async function l6Store(token,{config=connectionConfig(),fetcher=fetch}={}){
 const client=feedClient(token,{config,fetcher});
 const workspace=await client.workspace();
 const headers={apikey:config.key,Authorization:'Bearer '+token,'Content-Type':'application/json'};
 async function rest(path,method='GET',body,prefer){
  let response;
  try{response=await fetcher(config.url+'/rest/v1/'+path,{method,headers:{...headers,...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(20000)});}
  catch{throw new ContentError('Supabase 連線未完成',502);}
  if(!response.ok){let detail='';try{detail=(await response.json())?.message||'';}catch{}throw new ContentError(response.status===401?'登入已失效，請重新登入':'Supabase 讀寫失敗'+(detail?'：'+detail:''),response.status===401?401:502);}
  if(response.status===204)return null;
  const text=await response.text();return text?JSON.parse(text):null;
 }
 const q=(o)=>new URLSearchParams({workspace_id:'eq.'+workspace,...o}).toString();
 return {
  workspace,client,rest,auth:token,
  async get(runId){const rows=await rest('runs?'+q({select:'metadata,status,updated_at',run_id:'eq.'+runId,limit:'1'}));return rows?.[0]||null;},
  async list(prefix,{limit=200,order='created_at.desc'}={}){return rest('runs?'+q({select:'run_id,status,metadata,created_at,updated_at',run_id:'like.'+prefix+'*',order,limit:String(limit)}));},
  /** Upsert one row; `metadata` replaces the whole document. */
  async put(runId,{provider='personalos',platform='',status='',metadata={}}={}){
   const rows=await rest('runs?on_conflict=workspace_id,run_id','POST',[{workspace_id:workspace,run_id:runId,provider,platform,status,metadata}],'resolution=merge-duplicates,return=representation');
   return rows?.[0]||null;
  },
  async remove(runId){await rest('runs?'+q({run_id:'eq.'+runId}),'DELETE');},
 };
}
