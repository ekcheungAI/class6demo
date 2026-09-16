export function stableJson(v){return JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);}
import {connectionConfig} from './read-only.mjs';
import {ContentError} from './content-engine.mjs';
import {OMMI_BRAIN_SOURCE_ID,validateBrainProfile} from './ommi-brain.mjs';
import {costMetadata} from './inspiration-cost.mjs';
export function mapFeed(snapshot,workspace){
 if(!snapshot?.items?.length||snapshot.items.length>30||!snapshot.requestId)throw new ContentError('沒有可同步的已驗證TikHub批次');
 const runId='tikhub:'+snapshot.requestId;const sources=new Map();
 const posts=snapshot.items.map(i=>{
 if(!/^reddit:t3_[a-z0-9]+$/.test(i.post_id)||typeof i.caption!=='string')throw new ContentError('來源ID或原文不符合已確認格式');
 const sourceId='reddit:'+i.account;sources.set(sourceId,{workspace_id:workspace,source_id:sourceId,platform:'reddit',account:i.account,collection_reason:'TikHub Feed pilot',fetched_at:snapshot.fetchedAt,metadata:{feed_origin:'tikhub'}});
 const time=i.created_at?Date.parse(i.created_at):NaN;
 return {workspace_id:workspace,post_id:i.post_id,source_id:sourceId,platform:'reddit',account:i.account,content_type:'news_link',caption:i.caption,published_at:Number.isFinite(time)?new Date(time).toISOString():null,post_url:i.post_url,comment_count:i.comments??null,fetched_at:snapshot.fetchedAt,run_id:runId,metadata:{feed_origin:'tikhub',feed:i}};
 });
 return {sources:[...sources.values()],run:{workspace_id:workspace,run_id:runId,provider:'tikhub',platform:'reddit',requested_count:posts.length,collected_count:posts.length,request_count:1,estimated_cost_usd:snapshot.cost?.estimatedUsd??null,fetched_at:snapshot.fetchedAt,status:'collected',metadata:{feed_origin:'tikhub',upstream_request_id:snapshot.requestId,content_scope:snapshot.scope,raw_backup:'local-only'}},posts};
}
export function feedClient(token,{config=connectionConfig(),fetcher=fetch}={}){
 if(!token||!/^[A-Za-z0-9_.-]{20,12000}$/.test(token))throw new ContentError('請先在Connections用Supabase Auth登入',401);
 const headers={apikey:config.key,Authorization:'Bearer '+token};
 async function request(route,method='GET',body,prefer){let response;try{response=await fetcher(config.url+route,{method,headers:{...headers,'Content-Type':'application/json',...(method==='POST'?{Prefer:prefer||'resolution=ignore-duplicates,return=minimal'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});}catch{throw new ContentError('Supabase未回應；同步可能未完成，請重讀後再試',502);}
 if(!response.ok)throw new ContentError(response.status===401?'登入已失效，請重新登入':response.status===403?'此身份沒有現有表格的操作權限；未更改policy':'Supabase讀寫失敗；不顯示本地資料為同步成功',response.status===401||response.status===403?response.status:502);
 return method==='POST'||method==='PATCH'?null:response.json();}
 async function workspace(){const user=await request('/auth/v1/user');if(!user.id)throw new ContentError('未能確認登入身份',401);const rows=await request('/rest/v1/workspaces?select=id&owner_id=eq.'+encodeURIComponent(user.id)+'&limit=2');if(!Array.isArray(rows))throw new ContentError('Workspace資料格式錯誤');if(rows.length===0){await request('/rest/v1/rpc/ensure_student_workspace','POST',{});const created=await request('/rest/v1/workspaces?select=id&owner_id=eq.'+encodeURIComponent(user.id)+'&limit=2');if(created.length!==1)throw new ContentError('請先執行固定bootstrap');return created[0].id;}if(rows.length!==1)throw new ContentError('需要唯一owner workspace');return rows[0].id;}
 async function read(workspaceId,origin='tikhub'){const q=new URLSearchParams({select:'*',workspace_id:'eq.'+workspaceId,'metadata->>feed_origin':'eq.'+origin,order:'fetched_at.desc,post_id.asc',limit:'100'});const rows=await request('/rest/v1/posts?'+q);if(!Array.isArray(rows))throw new ContentError('Supabase回應格式未確認');return {mode:'supabase-live',workspaceId,projectRef:config.projectRef,items:rows.map(r=>({...r.metadata.feed,post_id:r.post_id,caption:r.caption,post_url:r.post_url,account:r.account,workspace_id:r.workspace_id})),fetchedAt:rows[0]?.fetched_at||null,checkedAt:new Date().toISOString(),fetchEnabled:false,limit:100};}
 async function inspirationSources(id){const q=new URLSearchParams({select:'*',workspace_id:'eq.'+id,'metadata->>inspiration_origin':'in.(student-demo,student-import)',order:'platform.asc,source_id.asc'});const rows=await request('/rest/v1/sources?'+q);if(!Array.isArray(rows))throw new ContentError('來源清單格式未確認');return {mode:'supabase-live',workspaceId:id,sources:rows};}
 async function inspirationPosts(id){const q=new URLSearchParams({select:'*',workspace_id:'eq.'+id,'metadata->>inspiration_origin':'in.(student-demo,student-import)',order:'published_at.desc.nullslast,post_id.asc',limit:'100'});const rows=await request('/rest/v1/posts?'+q);if(!Array.isArray(rows))throw new ContentError('帖子回應未確認');return rows.map(r=>({...r.metadata.inspiration,post_id:r.post_id,source_id:r.source_id,caption:r.caption,post_url:r.post_url,fetched_at:r.fetched_at,workspace_id:r.workspace_id}));}
 async function syncInspirationPosts(payload){
 const id=await workspace();const configured=await inspirationSources(id);const posts=[],runs=[];
 if(!payload?.demo||!Array.isArray(payload.batches)||payload.batches.length!==6)throw new ContentError('首批只接受六個已配置demo來源');
 for(const batch of payload.batches){const source=configured.sources.find(s=>s.source_id===batch.source.source_id&&s.profile_url===batch.source.profile_url);if(!source||!batch.items.length||batch.items.length>3)throw new ContentError('請先保存指定來源，首批每來源最多3則');
 runs.push({workspace_id:id,run_id:batch.run_id,provider:'tikhub',platform:source.platform,requested_count:3,collected_count:batch.items.length,request_count:batch.request_count||1,estimated_cost_usd:batch.estimated_cost_usd??null,fetched_at:batch.fetched_at,status:'collected',metadata:{inspiration_origin:'student-demo',demo:true,source_id:source.source_id,coverage:batch.coverage,...costMetadata(batch.estimated_cost_usd,'demo')}});
 for(const i of batch.items){if(i.source_id!==source.source_id||i.platform!==source.platform||!i.post_id.startsWith(source.platform+':')||!i.caption)throw new ContentError('帖子與來源不一致');const metrics=i.metrics||{};posts.push({workspace_id:id,post_id:i.post_id,source_id:i.source_id,platform:i.platform,account:i.account,caption:i.caption,post_url:i.post_url,published_at:i.published_at,content_type:i.content_depth==='title-only'?'post_preview':'social_post',fetched_at:batch.fetched_at,run_id:batch.run_id,...Object.fromEntries(['like_count','comment_count','view_count','share_count','save_count'].map(k=>[k,metrics[k]??null])),metadata:{inspiration_origin:'student-demo',demo:true,inspiration:i}});}
 }
 await request('/rest/v1/runs?on_conflict=workspace_id,run_id','POST',runs);
 await request('/rest/v1/posts?on_conflict=workspace_id,post_id','POST',posts);
 const result=await inspirationPosts(id);for(const p of posts){const got=result.find(x=>x.post_id===p.post_id);if(!got||got.caption!==p.caption||got.post_url!==p.post_url)throw new ContentError('帖子保存後讀回不符，未覆寫舊內容',409);}
 return {...configured,posts:result,verifiedPosts:posts.length};
 }
 async function articles(id){const q=new URLSearchParams({select:'metadata',workspace_id:'eq.'+id,'metadata->>article_origin':'eq.rss',limit:'100'});return (await request('/rest/v1/runs?'+q)).map(r=>r.metadata);}
 async function ommiBrain(id){const q=new URLSearchParams({select:'workspace_id,source_id,metadata,updated_at',workspace_id:'eq.'+id,source_id:'eq.'+OMMI_BRAIN_SOURCE_ID,limit:'1'});const rows=await request('/rest/v1/sources?'+q);const row=rows[0];if(!row)return null;if(row.metadata?.ommi_brain_origin!=='student-os'||!row.metadata.profile)throw new ContentError('Supabase Ommi Brain記錄格式未確認',409);return {workspaceId:id,profile:validateBrainProfile(row.metadata.profile),vaultRevision:row.metadata.vault_revision,updatedAt:row.updated_at};}
 async function imageGenerations(id){const q=new URLSearchParams({select:'metadata',workspace_id:'eq.'+id,'metadata->>image_origin':'eq.student-creator-studio',order:'created_at.desc',limit:'20'});const rows=await request('/rest/v1/runs?'+q);return rows.map(r=>r.metadata.record).filter(Boolean);}
 return {workspace,read,articles,ommiBrain,imageGenerations,async saveImageGeneration(id,record){
 const runId='image:'+record.taskId;await request('/rest/v1/runs?on_conflict=workspace_id,run_id','POST',[{workspace_id:id,run_id:runId,provider:'toapis',platform:'image',request_count:1,requested_count:1,collected_count:1,estimated_cost_usd:record.estimatedUsd,status:'collected',metadata:{image_origin:'student-creator-studio',record}}]);const saved=(await imageGenerations(id)).find(r=>r.taskId===record.taskId);if(!saved||saved.storagePath!==record.storagePath)throw new ContentError('圖片記錄未能從Supabase讀回',409);return saved;
 },async saveOmmiBrain({profile,vaultRevision}){
 const id=await workspace();const checked=validateBrainProfile({...profile,source:'supabase',updatedAt:new Date().toISOString()});const row={workspace_id:id,source_id:OMMI_BRAIN_SOURCE_ID,platform:'system',account:checked.name,collection_reason:'Ommi Brain runtime settings from Company Vault',fetched_at:checked.updatedAt,metadata:{ommi_brain_origin:'student-os',version:1,vault_revision:vaultRevision,profile:checked}};
 await request('/rest/v1/sources?on_conflict=workspace_id,source_id','POST',[row],'resolution=merge-duplicates,return=minimal');const saved=await ommiBrain(id);if(!saved||stableJson(saved.profile)!==stableJson(checked))throw new ContentError('Ommi Brain保存後讀回未吻合',409);return saved;
 },async syncInspirationDetails(payload){
 const id=await workspace();const items=payload?.batches?.flatMap(b=>b.items)||[];
 if(!payload?.demo||items.length!==18)throw new ContentError('只接受現有18則demo資料補齊');
 for(const item of items){const q=new URLSearchParams({select:'metadata,source_id',workspace_id:'eq.'+id,post_id:'eq.'+item.post_id,'metadata->>inspiration_origin':'in.(student-demo,student-import)'});const rows=await request('/rest/v1/posts?'+q);const old=rows[0];if(!old||old.source_id!==item.source_id)throw new ContentError('資料補齊來源不吻合');
 const pq=new URLSearchParams({workspace_id:'eq.'+id,post_id:'eq.'+item.post_id,'metadata->>inspiration_origin':'in.(student-demo,student-import)'});
 await request('/rest/v1/posts?'+pq,'PATCH',{metadata:{...old.metadata,inspiration:{...old.metadata.inspiration,image_url:item.image_url,media:item.media,media_type:item.media_type,duration_seconds:item.duration_seconds??null,metrics:item.metrics},presentation_updated_at:new Date().toISOString()}});
 }
 const posts=await inspirationPosts(id);for(const item of items){const got=posts.find(p=>p.post_id===item.post_id);if(!got||got.image_url!==item.image_url)throw new ContentError('圖片欄位讀回未吻合');}
 return {...await inspirationSources(id),posts};
 },async saveArticle(id,postId,article){
 const runId='article:'+postId;
 await request('/rest/v1/runs?on_conflict=workspace_id,run_id','POST',[{workspace_id:id,run_id:runId,provider:'direct-html',platform:'rss',request_count:1,collected_count:1,status:'collected',metadata:{article_origin:'rss',post_id:postId,article}}]);
 const saved=(await articles(id)).find(r=>r.post_id===postId);if(!saved?.article?.text)throw new ContentError('正文未能從Supabase讀回，未報成功');return saved.article;
 },async syncRss(mapped){
 await request('/rest/v1/sources?on_conflict=workspace_id,source_id','POST',mapped.sources);
 await request('/rest/v1/runs?on_conflict=workspace_id,run_id','POST',[mapped.run]);
 await request('/rest/v1/posts?on_conflict=workspace_id,post_id','POST',mapped.posts);
 const result=await read(mapped.run.workspace_id,'rss');
 for(const p of mapped.posts){if(!result.items.some(i=>i.post_id===p.post_id))throw new ContentError('RSS保存後未讀回，請核對',409);}
 return {...result,sync:{verified:true,matched:mapped.posts.length}};
 },async inspirationRuns(id){const q=new URLSearchParams({select:'run_id,platform,fetched_at,estimated_cost_usd,request_count,status,metadata',workspace_id:'eq.'+id,provider:'eq.tikhub',fetched_at:'not.is.null',order:'fetched_at.desc',limit:'100'});return request('/rest/v1/runs?'+q);},async cloudDrafts(){const id=await workspace();const q=new URLSearchParams({select:'metadata',workspace_id:'eq.'+id,'metadata->>content_origin':'eq.student-os',order:'created_at.desc',limit:'100'});const rows=await request('/rest/v1/runs?'+q);const jobs=await request('/rest/v1/runs?'+new URLSearchParams({select:'metadata',workspace_id:'eq.'+id,'metadata->>kind':'eq.text','metadata->>state':'eq.completed',order:'created_at.desc',limit:'100'}));const merged=new Map(rows.map(r=>[r.metadata.record.id,r.metadata.record]));for(const row of jobs)if(row.metadata.record)merged.set(row.metadata.record.id,row.metadata.record);return {mode:'supabase-live',items:[...merged.values()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))};},async saveContentDraft(record){
 const id=await workspace();if(record.brief.source?.workspace_id!==id||record.status!=='draft')throw new ContentError('草稿與workspace不一致');
 const runId='content:'+record.id;
 await request('/rest/v1/runs?on_conflict=workspace_id,run_id','POST',[{workspace_id:id,run_id:runId,provider:record.cost?.provider||'toapis',platform:'multi',request_count:1,requested_count:record.brief.platforms.length,collected_count:record.revisions.at(-1).outputs.length,status:'draft',metadata:{content_origin:'student-os',record}}]);
 const q=new URLSearchParams({select:'run_id,metadata',workspace_id:'eq.'+id,run_id:'eq.'+runId});const rows=await request('/rest/v1/runs?'+q);
 const saved=rows[0]?.metadata?.record;if(!saved||saved.id!==record.id||stableJson(saved.revisions)!==stableJson(record.revisions))throw new ContentError('Supabase草稿讀回未吻合，未報成功');
 return {...saved,persistence:{mode:'supabase',runId,workspaceId:id,verified:true}};
 },inspirationSources,inspirationPosts,syncInspirationPosts,async setupInspiration(definitions){
 const id=await workspace();const rows=definitions.map(s=>({workspace_id:id,source_id:s.source_id,platform:s.platform,account:s.account,profile_url:s.profile_url,collection_reason:'Owner-selected classroom demo; not final targeting',metadata:{inspiration_origin:'student-demo',demo:true,kind:s.kind,resolution:s.resolution,canonical_profile_url:s.canonical_profile_url||s.profile_url,collection_status:'not-fetched',automatic_collection:false}}));
 await request('/rest/v1/sources?on_conflict=workspace_id,source_id','POST',rows);
 const result=await inspirationSources(id);for(const s of rows){const got=result.sources.find(x=>x.source_id===s.source_id);if(!got||got.profile_url!==s.profile_url)throw new ContentError('Demo來源讀回不吻合，未覆寫舊資料',409);}return {...result,verifiedCount:rows.length};
 },async sync(snapshot){const id=await workspace();const mapped=mapFeed(snapshot,id);
 // Known existing tables only. Ignore duplicates preserves previously saved/manual values.
 await request('/rest/v1/sources?on_conflict=workspace_id,source_id','POST',mapped.sources);
 await request('/rest/v1/runs?on_conflict=workspace_id,run_id','POST',[mapped.run]);
 await request('/rest/v1/posts?on_conflict=workspace_id,post_id','POST',mapped.posts);
 const result=await read(id);for(const post of mapped.posts){const got=result.items.find(i=>i.post_id===post.post_id);if(!got||got.caption!==post.caption||got.post_url!==post.post_url)throw new ContentError('保存後讀回未吻合或已有不同版本，未覆寫舊內容；請核對',409);}
 return {...result,sync:{verified: true,expected:mapped.posts.length,matched:mapped.posts.length,mode:'insert-missing-preserve-existing'}};
 }};
}
