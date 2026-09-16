import {connectionConfig} from './read-only.mjs';
import {feedClient} from './feed-supabase.mjs';
import {ContentError} from './content-engine.mjs';
import {studentBudget} from './student-budget.mjs';

export async function cloudRuntime(auth,{fetcher=fetch,config=connectionConfig()}={}){
 const client=feedClient(auth,{config,fetcher});const workspace=await client.workspace();
 async function request(route,method='GET',body){const response=await fetcher(config.url+'/rest/v1/'+route,{method,headers:{apikey:config.key,Authorization:'Bearer '+auth,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok){let detail;try{detail=await response.json();}catch{}if(detail?.message==='Budget insufficient or unresolved'){const error=new ContentError('改寫額度不足或仍待核對；來源可保留，未提交新的模型請求',409);error.terminal=true;throw error;}throw new ContentError('雲端狀態未完成，請核對登入、固定runtime SQL或版本／額度',response.status===401?401:409);}return response.json();}
 const rpc=(name,body)=>request('rpc/'+name,'POST',body);
 async function job(id){if(!/^[0-9a-f-]{36}$/.test(id))throw new ContentError('請求ID無效');const rows=await request('runs?'+new URLSearchParams({select:'metadata',workspace_id:'eq.'+workspace,run_id:'eq.job:'+id}));if(!rows[0])throw new ContentError('找不到此workspace請求',404);return rows[0].metadata;}
 const update=(value,state,patch={})=>rpc('personalos_update',{p_workspace:workspace,p_id:value.id,p_version:value.version,p_state:state,p_patch:patch});
 async function brand(){const rows=await request('sources?'+new URLSearchParams({select:'metadata',workspace_id:'eq.'+workspace,source_id:'eq.system:brand-runtime'}));return rows[0]?.metadata||null;}
 // Feed-rewrite drafts are saved as `content:<id>` rows (see feedClient.saveContentDraft),
 // not as `job:<id>` tasks, so queue actions on them used to fail with 找不到此workspace請求.
 async function draft(id){try{return await job(id);}catch(e){if(e?.status!==404)throw e;}
  const rows=await request('runs?'+new URLSearchParams({select:'metadata',workspace_id:'eq.'+workspace,run_id:'eq.content:'+id}));
  if(!rows[0]?.metadata?.record)throw new ContentError('找不到此workspace請求',404);
  return {id,kind:'text',state:'completed',version:0,record:rows[0].metadata.record,contentRow:true};}
 async function saveDraft(value,state,patch={}){if(!value.contentRow)return update(value,state,patch);
  const response=await fetcher(config.url+'/rest/v1/runs?on_conflict=workspace_id,run_id',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+auth,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify([{workspace_id:workspace,run_id:'content:'+value.id,provider:'toapis',platform:'multi',status:'draft',metadata:{content_origin:'student-os',record:patch.record}}]),cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new ContentError('草稿未保存（Supabase '+response.status+'）',502);
  return {...value,record:patch.record};}
 return {workspace,client,job,draft,saveDraft,brand,request,rpc,
  async pendingJobs(kind){if(!['image','text','analysis'].includes(kind))throw new ContentError('請求類型不符');const rows=await request('runs?'+new URLSearchParams({select:'metadata',workspace_id:'eq.'+workspace,'metadata->>kind':'eq.'+kind,'metadata->>state':'not.in.(completed,failed)',order:'created_at.asc',limit:'10'}));return rows.map(r=>({taskId:r.metadata.id,status:r.metadata.state}));},
  async requireBrand(){const value=await brand();if(!value)throw new ContentError('請先在Ommi Brain保存品牌摘要到雲端');return value;},
  saveBrand:(value,expected)=>rpc('personalos_brand',{p_workspace:workspace,p_expected:expected||'',p_brand:value}),
  claim:(id,kind,payload)=>rpc('personalos_claim',{p_workspace:workspace,p_id:id,p_kind:kind,p_payload:payload,p_limit:studentBudget()}),
  update,
  async budget(){const rows=await request('runs?'+new URLSearchParams({select:'metadata',workspace_id:'eq.'+workspace,run_id:'eq.system:toapi-budget'}));const v=rows[0]?.metadata||{limit:studentBudget(),committed:0};return {limitCredits:Math.min(v.limit,studentBudget()),remainingCredits:Math.max(0,Math.min(v.limit,studentBudget())-v.committed),reservationCredits:20,uncertain:!!v.uncertain,accounting:'conservative-reservation-not-exact-bill'};}
 };
}
