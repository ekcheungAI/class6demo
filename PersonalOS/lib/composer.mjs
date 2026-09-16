// Act 4 · 排版台：來源 → 我把聲（Rewrite，跟三條 voice rules）→ N 張平台卡。
// Cards come out as `draft`, each with its own content_hash; nothing here publishes.
import {readFile,mkdir,open} from 'node:fs/promises';
import path from 'node:path';
import {ContentError,rootDir,prepareRequest,createRecord} from './content-engine.mjs';
import {generateRecord} from './toapi.mjs';
import {feedBrief} from './feed-rewrite.mjs';
import {readSettings,voiceRulesPrompt} from './settings.mjs';
import {newCard,CARD_PREFIX} from './cards.mjs';
import {TODAY_SOURCE_ID} from './research.mjs';

const ENGINE_PLATFORM={threads:'Threads',instagram:'Instagram',newsletter:'Newsletter'};
const DEMO_ARTICLE=await readFile(new URL('../config/research-demo-article.md',import.meta.url),'utf8').catch(()=>'');

/** Resolve the text the rewrite will work from. Never invents content. */
export async function resolveSource(store,client,pick){
 if(pick?.kind==='feed'){
  const feed=await client.read(store.workspace,'rss');const item=feed.items.find(i=>i.post_id===pick.postId);
  if(!item)throw new ContentError('來源不在目前 workspace 嘅 RSS Feed 內',404);
  const saved=(await client.articles(store.workspace)).find(a=>a.post_id===item.post_id);
  return {source_id:item.post_id,title:item.caption.split('\n')[0],url:item.post_url,text:saved?.article?.text?[item.caption,saved.article.text].join('\n\n'):item.caption,mode:'LIVE',depth:saved?.article?.text?'extracted-public-article':'rss-summary'};
 }
 const today=(await store.get(TODAY_SOURCE_ID))?.metadata;
 if(!today)throw new ContentError('未標「今日來源」。去 Inspiration → 搵靈感 → 揀一張寫理由。');
 if(today.mode==='DEMO'){return {source_id:today.source_id,title:today.title,url:today.url,text:DEMO_ARTICLE.replace(/^---[\s\S]*?---\n/,'').trim()||today.title,mode:'DEMO',depth:'fixture-article'};}
 const text=[today.title,today.excerpt||''].filter(Boolean).join('\n\n');
 return {source_id:today.source_id,title:today.title,url:today.url,text,mode:'LIVE',depth:today.excerpt?'firecrawl-excerpt':'title-only'};
}

export async function compose({store,runtime,brain,requestId,platforms,pick}){
 if(typeof requestId!=='string'||!/^[0-9a-f-]{36}$/.test(requestId))throw new ContentError('缺少請求識別碼');
 const wanted=[...new Set((platforms||[]).map(p=>String(p).toLowerCase()))].filter(p=>ENGINE_PLATFORM[p]);
 if(!wanted.length)throw new ContentError('揀最少一個平台');
 const settings=await readSettings(store);
 const source=await resolveSource(store,runtime.client,pick);
 // one click = one paid call; the marker file blocks accidental double submits
 await mkdir(rootDir(),{recursive:true});let marker;try{marker=await open(path.join(rootDir(),'compose-'+requestId+'.marker'),'wx',0o600);}catch{throw new ContentError('此點擊已處理，不會重複生成',409);}await marker.close();
 const brief=feedBrief({post_id:source.source_id,workspace_id:store.workspace,post_url:source.url,caption:source.text,content_depth:source.depth},{...brain,outputPlatforms:wanted.map(p=>ENGINE_PLATFORM[p])},{voiceRules:voiceRulesPrompt(settings),sourceId:source.source_id});
 const skill=await readFile(path.join(process.cwd(),'.agents/skills/my-branding-skill/SKILL.md'),'utf8');
 const prepared=await createRecord(prepareRequest(brief,brain,skill));
 const result=await generateRecord(prepared.id,0);
 let factsCheck=[];try{const raw=JSON.parse(await readFile(path.join(rootDir(),prepared.id+'.response.json'),'utf8'));factsCheck=JSON.parse(raw.choices[0].message.content).facts_check||[];}catch{}
 factsCheck=(Array.isArray(factsCheck)?factsCheck:[]).slice(0,12).map(r=>({original:String(r?.original||'').slice(0,300),rewritten:String(r?.rewritten||'').slice(0,300),changed:String(r?.changed||'').includes('事實')?'事實':'講法'}));
 const outputs=result.revisions.at(-1).outputs;
 const cards=[];
 for(const p of wanted){const o=outputs.find(x=>x.platform===ENGINE_PLATFORM[p]);if(!o)continue;
  const card=newCard({sourceId:source.source_id,platform:p,content:o.body,title:o.title,recordId:prepared.id,model:result.model});
  card.source={title:source.title,url:source.url,mode:source.mode};
  await store.put(CARD_PREFIX+card.card_id,{provider:'composer',platform:p,status:'draft',metadata:card});cards.push(card);}
 const rewrite={record_id:prepared.id,source,voice_rules:settings.voiceRules,model:result.model,usage:result.usage,cost:result.cost,original:source.text,outputs,facts_check:factsCheck,created_at:new Date().toISOString(),card_ids:cards.map(c=>c.card_id)};
 await store.put('rewrite:'+prepared.id,{provider:'toapis',platform:'multi',status:'completed',metadata:rewrite});
 return {rewrite,cards};
}
