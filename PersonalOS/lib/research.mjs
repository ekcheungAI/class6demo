// personalos-research: Exa (discover) → Firecrawl (read) → Tavily (cross-check)
// → score against Ommi Brain → ≤5 inspiration cards. One fixed order, hard
// per-run caps, and a fallback ladder that never turns a failure into a fake
// success. Contract: skills/personalos-research/SKILL.md + contracts/inspiration-card.md.
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {ContentError} from './content-engine.mjs';

export const CAPS={exaResults:8,scrapePages:3,tavilyChecks:2,cards:5};
export const RESEARCH_PREFIX='research:';
export const TODAY_SOURCE_ID='system:today-source';
const DEMO=JSON.parse(await readFile(new URL('../config/research-demo-cards.json',import.meta.url),'utf8'));

const j=async(r)=>{try{return await r.json();}catch{return null;}};
/** Firecrawl markdown → the first ~400 chars of body prose (no nav links, images, cookie banners). */
export function cleanExcerpt(md){
 const lines=String(md||'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').split('\n').map(l=>l.replace(/^[#>*\-\s|]+/,'').trim());
 const prose=lines.filter(l=>l.length>=40&&!/隱私|cookie|同意|訂閱|登入|分享|Skip to|跳至|廣告|©/i.test(l));
 return prose.join(' ').replace(/\s+/g,' ').slice(0,400)||null;
}
const timeout=(ms)=>AbortSignal.timeout(ms);

export function buildQuery(brain,decision){
 const readers=brain?.brainProfile?.styleNotes?.match(/受眾[:：]\s*([^\n]+)/)?.[1]||'';
 const interests=(brain?.brainProfile?.interests||[]).slice(0,2).join(' ');
 return [String(decision||'').trim(),interests,readers?readers.slice(0,30):'','過去一星期'].filter(Boolean).join(' ').slice(0,200);
}

async function exaSearch(query,key,log){
 const r=await fetch('https://api.exa.ai/search',{method:'POST',headers:{'x-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({query,numResults:CAPS.exaResults,startPublishedDate:new Date(Date.now()-7*864e5).toISOString(),type:'auto'}),signal:timeout(20000)});
 const d=await j(r);log.push({provider:'exa',calls:1,http:r.status,credits:r.ok?1:0});
 if(!r.ok)throw new Error('exa '+r.status);
 return (d?.results||[]).map(x=>({title:x.title,url:x.url,published_at:x.publishedDate||null,description:x.text?.slice(0,400)||'',collector:'exa'}));
}
async function firecrawlSearch(query,key,log){
 const r=await fetch('https://api.firecrawl.dev/v2/search',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({query,sources:['web','news'],tbs:'qdr:w',limit:5}),signal:timeout(20000)});
 const d=await j(r);log.push({provider:'firecrawl',op:'search',calls:1,http:r.status,credits:r.ok?2:0});
 if(!r.ok)throw new Error('firecrawl search '+r.status);
 const list=[...(d?.data?.web||[]),...(d?.data?.news||[])];
 return list.map(x=>({title:x.title,url:x.url,published_at:x.date||null,description:x.description||'',collector:'firecrawl'}));
}
async function firecrawlScrape(url,key,log){
 const r=await fetch('https://api.firecrawl.dev/v2/scrape',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({url,formats:['markdown'],onlyMainContent:true}),signal:timeout(30000)});
 const d=await j(r);log.push({provider:'firecrawl',op:'scrape',calls:1,http:r.status,credits:r.ok?1:0,url});
 if(!r.ok)return null;
 const md=d?.data?.markdown||'';const meta=d?.data?.metadata||{};
 return {excerpt:cleanExcerpt(md),published_at:meta.publishedTime||meta['article:published_time']||null,title:meta.title||null};
}
async function tavilyCheck(claim,key,log){
 const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({query:claim,search_depth:'basic',max_results:3}),signal:timeout(20000)});
 const d=await j(r);log.push({provider:'tavily',calls:1,http:r.status,credits:r.ok?1:0});
 if(!r.ok)return null;
 return (d?.results||[]).map(x=>x.url);
}

// Role / risk are rule-based (the contract is explicit); the LLM only scores.
export function classify(c){
 const host=(()=>{try{return new URL(c.url).hostname.replace(/^www\./,'');}catch{return '';}})();
 const text=(c.title+' '+c.description).toLowerCase();
 let source_role='independent';
 if(/(twitter|x\.com|threads\.net|reddit\.com|news\.ycombinator|linkedin\.com|facebook\.com|instagram\.com)/.test(host))source_role='signal';
 else if(/(press|newsroom|announc|introducing|launch)/.test(text)&&/(blog|news|press)/.test(host+text))source_role='marketing';
 else if(/(docs\.|developer|changelog|release|github\.com|openai\.com|anthropic\.com|google|microsoft|apple\.com)/.test(host))source_role='primary';
 let claim_risk='low';
 if(/(裁員|layoff|lawsuit|訴訟|安全事故|breach|醫療|financial|價格|price|pricing|quota|配額)/i.test(text))claim_risk=/(裁員|layoff|lawsuit|訴訟|breach|事故)/i.test(text)?'high':'medium';
 return {source_role,claim_risk};
}
function confidenceFor(role,secondSource){
 if(role==='primary')return secondSource?'high':'medium';
 if(role==='independent')return secondSource?'medium':'low';
 return 'low';
}

async function scoreWithBrain(cards,brain,decision,{key,log}){
 const fallback=()=>cards.map(c=>({...c,persona_score:c.source_role==='primary'?0.7:c.source_role==='independent'?0.6:0.4,persona_reason:'（規則評分）'+(c.source_role==='signal'?'只做「有人討論緊」角度':'可以做來源'),scored_by:'rules'}));
 if(!key)return fallback();
 const brief={readers:brain?.brainProfile?.styleNotes?.slice(0,600)||'',interests:brain?.brainProfile?.interests||[],decision,cards:cards.map(c=>({source_id:c.source_id,title:c.title,excerpt:(c.excerpt||c.description||'').slice(0,300),source_role:c.source_role}))};
 try{
  const r=await fetch('https://toapis.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'qwen3.5-flash',max_tokens:1200,response_format:{type:'json_object'},messages:[{role:'system',content:'你係 Ommi Brain 嘅打分員。對住讀者同「讀者今個星期要決定嘅事」，為每張卡打 persona_score（0–1）同一句廣東話 persona_reason（同我讀者有乜關）。唔准改事實，唔准加卡。只輸出 JSON：{"scores":[{"source_id":"S-xx","persona_score":0.0,"persona_reason":"..."}]}'},{role:'user',content:JSON.stringify(brief)}]}),signal:timeout(45000)});
  const d=await j(r);log.push({provider:'toapis',op:'score',model:'qwen3.5-flash',calls:1,http:r.status,tokens:d?.usage?.total_tokens||null});
  const scores=JSON.parse(d?.choices?.[0]?.message?.content||'{}').scores||[];
  return cards.map(c=>{const s=scores.find(x=>x.source_id===c.source_id);return s?{...c,persona_score:Math.max(0,Math.min(1,Number(s.persona_score)||0)),persona_reason:String(s.persona_reason||'').slice(0,160),scored_by:'qwen3.5-flash'}:fallback()[cards.indexOf(c)];});
 }catch(e){log.push({provider:'toapis',op:'score',error:String(e.message).slice(0,80)});return fallback();}
}

export function demoCards(nextSeq){
 return {mode:'DEMO',query:DEMO.query,cards:DEMO.cards.map((c,i)=>({...c,card_id:randomUUID(),source_id:'S-'+String(nextSeq+i).padStart(2,'0'),mode:'DEMO',fetched_at:new Date().toISOString(),excerpt:c.excerpt||null,needs_verification:c.claim_risk==='high'&&c.source_role!=='primary'}))};
}

/** One research run. Never throws for provider failures; the log says what happened. */
export async function runResearch({decision,brain,env=process.env,nextSeq=6}){
 const log=[];const started=new Date().toISOString();
 const keys={exa:env.EXA_API_KEY,firecrawl:env.FIRECRAWL_API_KEY,tavily:env.TAVILY_API_KEY,toapi:env.TOAPI_API_KEY};
 const query=buildQuery(brain,decision);
 if(!decision?.trim())throw new ContentError('先填「我讀者今個星期要決定嘅係」，query 由佢砌');
 if(!keys.exa&&!keys.firecrawl){const demo=demoCards(nextSeq);return {run_id:RESEARCH_PREFIX+randomUUID(),started_at:started,mode:'DEMO',query,reason:'no_search_keys',log:[{note:'EXA_API_KEY／FIRECRAWL_API_KEY 都未設；用 fixtures 五張卡'}],cards:demo.cards};}
 let candidates=[];
 try{if(!keys.exa)throw new Error('no exa key');candidates=await exaSearch(query,keys.exa,log);}
 catch(e){log.push({note:'exa 不可用 → firecrawl /v2/search',error:String(e.message).slice(0,60)});try{if(keys.firecrawl)candidates=await firecrawlSearch(query,keys.firecrawl,log);}catch(e2){log.push({note:'firecrawl search 都失敗',error:String(e2.message).slice(0,60)});}}
 // dedupe by url / near-identical title
 const seen=new Set();candidates=candidates.filter(c=>{if(!c?.url)return false;const k=c.url.replace(/[#?].*$/,'');const t=(c.title||'').toLowerCase().replace(/\W+/g,' ').trim().slice(0,40);if(seen.has(k)||seen.has('t:'+t))return false;seen.add(k);seen.add('t:'+t);return true;});
 if(!candidates.length){const demo=demoCards(nextSeq);return {run_id:RESEARCH_PREFIX+randomUUID(),started_at:started,mode:'DEMO',query,reason:candidates.length===0&&log.some(l=>l.http&&l.http<400)?'no_new_sources':'search_failed',log:[...log,{note:'全部失敗 → fixtures 五張卡'}],cards:demo.cards};}
 let cards=candidates.slice(0,CAPS.cards).map((c,i)=>({card_id:randomUUID(),source_id:'S-'+String(nextSeq+i).padStart(2,'0'),title:c.title||c.url,url:c.url,published_at:c.published_at||null,fetched_at:new Date().toISOString(),description:c.description||'',excerpt:null,collector:c.collector,credits_used:c.collector==='exa'?0:0,mode:'LIVE',...classify(c)}));
 // Firecrawl only reads the top ≤3 by role priority (primary > independent > rest)
 const order={primary:0,independent:1,marketing:2,signal:3};
 const toRead=[...cards].sort((a,b)=>order[a.source_role]-order[b.source_role]).slice(0,CAPS.scrapePages);
 for(const c of toRead){if(!keys.firecrawl){log.push({note:'FIRECRAWL_API_KEY 未設，excerpt 用 description，confidence 降一級'});break;}
  const page=await firecrawlScrape(c.url,keys.firecrawl,log).catch(()=>null);
  if(page){c.excerpt=page.excerpt;c.published_at=c.published_at||page.published_at||null;c.credits_used+=1;}else{c.excerpt=null;c.scrape_failed=true;}}
 // Tavily: only medium/high risk, ≤2 checks
 let checks=0;
 for(const c of cards){if(checks>=CAPS.tavilyChecks)break;if(!['medium','high'].includes(c.claim_risk))continue;
  if(!keys.tavily){log.push({note:'TAVILY_API_KEY 未設 → cross_check_unavailable'});break;}
  const urls=await tavilyCheck(c.title,keys.tavily,log).catch(()=>null);checks++;
  const other=(urls||[]).find(u=>{try{return new URL(u).hostname!==new URL(c.url).hostname;}catch{return false;}});
  c.second_source=other||null;c.credits_used+=1;}
 for(const c of cards){c.confidence=confidenceFor(c.source_role,!!c.second_source);if(c.scrape_failed&&c.confidence!=='low')c.confidence=c.confidence==='high'?'medium':'low';
  c.why_now=c.published_at?`${Math.max(0,Math.round((Date.now()-Date.parse(c.published_at))/864e5))} 日前發布，仍在一星期窗內`:'未知——冇發布時間';
  c.needs_verification=c.claim_risk==='high'&&c.source_role!=='primary';}
 cards=await scoreWithBrain(cards,brain,decision,{key:keys.toapi,log});
 return {run_id:RESEARCH_PREFIX+randomUUID(),started_at:started,mode:'LIVE',query,log,cards:cards.map(c=>{const {description:_d,...rest}=c;return rest;})};
}
