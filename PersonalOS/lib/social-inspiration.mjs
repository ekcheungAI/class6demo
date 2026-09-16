// Optional Step 18 · 追蹤社交帳戶：TikHub 抓一個帳戶最近嘅帖，存入 Inspiration。
// Endpoints checked against https://api.tikhub.io/openapi.json (2026-09-16):
//   instagram  GET /api/v1/instagram/v1/fetch_user_info_by_username?username= → user.id
//              GET /api/v1/instagram/v1/fetch_user_posts?user_id=&count=
//   twitter    GET /api/v1/twitter/web/fetch_user_post_tweet?screen_name=
//   threads    GET /api/v1/threads/web/fetch_user_info?username= → id → fetch_user_posts?user_id=
// Every call is billed, so: ≤10 posts per account per run, one run per click, and
// nothing is written unless the provider answered 200.
import {randomUUID} from 'node:crypto';
import {ContentError} from './content-engine.mjs';

export const PLATFORMS=['instagram','twitter','threads'];
export const MAX_ACCOUNTS=10;
export const POSTS_PER_ACCOUNT=10;
const BASE='https://api.tikhub.io';

export function validateAccounts(list){
 const out=[];const seen=new Set();
 for(const a of Array.isArray(list)?list:[]){
  const platform=String(a?.platform||'').toLowerCase();if(!PLATFORMS.includes(platform))throw new ContentError('平台只支援 instagram／twitter／threads');
  const handle=String(a?.handle||'').trim().replace(/^@/,'').replace(/^https?:\/\/[^/]+\//,'').replace(/\/.*$/,'');
  if(!/^[A-Za-z0-9._]{1,40}$/.test(handle))throw new ContentError('帳戶名無效：'+handle.slice(0,30));
  const id=platform+':'+handle.toLowerCase();if(seen.has(id))continue;seen.add(id);
  out.push({id,platform,handle,enabled:a?.enabled!==false});
 }
 if(out.length>MAX_ACCOUNTS)throw new ContentError('最多追蹤 '+MAX_ACCOUNTS+' 個帳戶');
 return out;
}

async function tik(path,key,log){
 const r=await fetch(BASE+path,{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(30000),cache:'no-store'});
 const body=await r.json().catch(()=>null);
 log.push({path:path.replace(/\?.*$/,''),http:r.status,billed:body?.code===200});
 if(!r.ok||body?.code!==200){const msg=body?.detail?.message||body?.message||('HTTP '+r.status);throw new ContentError('TikHub：'+String(msg).slice(0,120),502);}
 return body.data?.data??body.data;
}
const num=(v)=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const iso=(v)=>{if(!v)return null;const n=Number(v);const d=Number.isFinite(n)?new Date(n*(n<1e12?1000:1)):new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();};

export async function fetchAccountPosts(account,{key,log=/** @type {any[]} */([]),limit=POSTS_PER_ACCOUNT}){
 if(!key)throw new ContentError('TIKHUB_API_KEY 未設',400);
 const {platform,handle}=account;const fetched_at=new Date().toISOString();const posts=[];let profile_url='';
 if(platform==='instagram'){
  const info=await tik('/api/v1/instagram/v1/fetch_user_info_by_username?username='+encodeURIComponent(handle),key,log);
  const user=info?.user||info;const uid=user?.id||user?.pk;if(!uid)throw new ContentError('TikHub 讀唔到呢個 Instagram 帳戶');
  profile_url='https://www.instagram.com/'+handle+'/';
  const data=await tik('/api/v1/instagram/v1/fetch_user_posts?user_id='+encodeURIComponent(uid)+'&count='+limit,key,log);
  for(const it of (data?.items||[]).slice(0,limit)){const n=it.node||it;const cap=n.caption;const text=(typeof cap==='object'?cap?.text:cap)||'';const code=n.code||n.shortcode;if(!code||!text)continue;
   posts.push({post_id:'instagram:'+code, // `pk` is a >2^53 JSON number — precision is lost in JSON.parse; shortcode is exact
    platform:'instagram',account:handle,caption:String(text).slice(0,4000),post_url:'https://www.instagram.com/p/'+code+'/',published_at:iso(n.taken_at),image_url:n.display_url||n.image_versions2?.candidates?.[0]?.url||null,media_type:n.product_type||String(n.media_type||''),metrics:{like_count:num(n.like_count),comment_count:num(n.comment_count),view_count:num(n.play_count||n.view_count)}});}
 }else if(platform==='twitter'){
  const data=await tik('/api/v1/twitter/web/fetch_user_post_tweet?screen_name='+encodeURIComponent(handle),key,log);
  profile_url='https://x.com/'+handle;
  for(const t of (data?.timeline||[]).slice(0,limit)){if(!t.tweet_id||!t.text)continue;const sn=t.author?.screen_name||handle;
   posts.push({post_id:'twitter:'+t.tweet_id,platform:'twitter',account:sn,caption:String(t.text).slice(0,4000),post_url:'https://x.com/'+sn+'/status/'+t.tweet_id,published_at:iso(t.created_at),image_url:(t.media?.photo||t.media?.image||[])[0]?.media_url_https||null,media_type:t.media?.video?.length?'video':'post',metrics:{like_count:num(t.favorites),comment_count:num(t.replies),view_count:num(t.views),share_count:num(t.retweets)}});}
 }else if(platform==='threads'){
  const info=await tik('/api/v1/threads/web/fetch_user_info?username='+encodeURIComponent(handle),key,log);
  const uid=info?.id||info?.user?.id||info?.pk;if(!uid)throw new ContentError('TikHub 讀唔到呢個 Threads 帳戶');
  profile_url='https://www.threads.net/@'+handle;
  const data=await tik('/api/v1/threads/web/fetch_user_posts?user_id='+encodeURIComponent(uid),key,log);
  const threads=data?.data?.mediaData?.threads||data?.mediaData?.threads||data?.threads||[];
  for(const th of threads.slice(0,limit)){const p=th.thread_items?.[0]?.post||th.post||th;const text=p?.caption?.text||p?.text||'';const code=p?.code;if(!code||!text)continue;
   posts.push({post_id:'threads:'+code,platform:'threads',account:handle,caption:String(text).slice(0,4000),post_url:'https://www.threads.net/@'+handle+'/post/'+code,published_at:iso(p.taken_at),image_url:p.image_versions2?.candidates?.[0]?.url||null,media_type:'post',metrics:{like_count:num(p.like_count),comment_count:num(p.text_post_app_info?.direct_reply_count)}});}
 }
 return {source:{source_id:platform+':'+handle.toLowerCase(),platform,account:handle,profile_url},posts,fetched_at};
}

/** Rows for feedClient.syncRss(): same tables the Inspiration workspace already reads. */
export function mapSocial(result,workspace){
 const run_id='social:'+randomUUID();const {source,posts,fetched_at}=result;
 return {
  sources:[{workspace_id:workspace,source_id:source.source_id,platform:source.platform,account:source.account,profile_url:source.profile_url,fetched_at,collection_reason:'Followed account (Optional Step 18)',metadata:{inspiration_origin:'student-import',kind:'followed-account',provider:'tikhub'}}],
  run:{workspace_id:workspace,run_id,provider:'tikhub',platform:source.platform,requested_count:POSTS_PER_ACCOUNT,collected_count:posts.length,request_count:source.platform==='twitter'?1:2,estimated_cost_usd:null,fetched_at,status:'collected',metadata:{inspiration_origin:'student-import',source_id:source.source_id,kind:'followed-account'}},
  posts:posts.map(p=>({workspace_id:workspace,post_id:p.post_id,source_id:source.source_id,platform:p.platform,account:p.account,caption:p.caption,post_url:p.post_url,published_at:p.published_at,content_type:'social_post',fetched_at,run_id,like_count:p.metrics.like_count??null,comment_count:p.metrics.comment_count??null,view_count:p.metrics.view_count??null,share_count:p.metrics.share_count??null,save_count:null,metadata:{inspiration_origin:'student-import',kind:'followed-account',inspiration:{...p,source_id:source.source_id,fetched_at,content_depth:'social-post'}}})),
 };
}
