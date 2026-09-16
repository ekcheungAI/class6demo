'use client';
// Act 1 · 「搵靈感」— Exa → Firecrawl → Tavily → Ommi Brain 打分 → ≤5 張卡。
// The RSS / social feeds below stay exactly as they were; this only adds a source.
import {useEffect,useState} from 'react';
type Card={card_id:string;source_id:string;title:string;url:string;published_at:string|null;fetched_at:string;source_role:string;confidence:string;claim_risk:string;why_now:string;persona_score:number;persona_reason:string;excerpt?:string|null;collector:string;credits_used:number;mode:string;needs_verification?:boolean;second_source?:string|null};
type Run={run_id:string;started_at:string;mode:string;query:string;reason?:string;log:any[];cards:Card[]};
const ROLE:Record<string,string>={primary:'primary · 官方／直接',independent:'independent · 第三方',signal:'signal · 社交／討論',marketing:'marketing · 廠商自己講'};
const fmt=(iso:string|null)=>iso?new Intl.DateTimeFormat('zh-HK',{dateStyle:'short',timeStyle:'short'}).format(new Date(iso)):'—';
export default function ResearchPanel({token}:{token:string}){
 const [decision,setDecision]=useState(''),[runs,setRuns]=useState<Run[]>([]),[today,setToday]=useState<any>(null),[keys,setKeys]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reason,setReason]=useState<Record<string,string>>({}),[tick,setTick]=useState(0);
 useEffect(()=>{if(!token)return;const c=new AbortController();fetch('/api/research',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setRuns(d.runs);setToday(d.today);setKeys(d.keys);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[token,tick]);
 const post=async(body:any)=>{setBusy(true);setError('');try{const r=await fetch('/api/research',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);setTick(v=>v+1);return d;}catch(e){setError(e instanceof Error?e.message:'未完成');}finally{setBusy(false);}};
 const latest=runs[0];
 if(!token)return null;
 return <section className="panel" style={{marginBottom:24}}>
  <div className="section-heading"><div><h2>搵靈感 <span className="tag">Lesson 6</span></h2><p className="muted">Exa 搵候選 → Firecrawl 讀正文 → Tavily 核 → 對住 Ommi Brain 打分。每輪上限：Exa 1 次 · scrape 3 頁 · Tavily 2 次 · 出 5 張卡。</p></div></div>
  {keys&&<p className="small-copy">Key 狀態（只顯示有冇，唔顯示值）：Exa {keys.exa?'✓':'✗'} · Firecrawl {keys.firecrawl?'✓':'✗'} · Tavily {keys.tavily?'✓':'✗'} · TopAPIs {keys.toapi?'✓':'✗'}{!keys.exa&&!keys.firecrawl&&' — 冇搜尋 key，會出 fixtures 五張 DEMO 卡'}</p>}
  <form onSubmit={e=>{e.preventDefault();void post({action:'run',decision});}} style={{display:'grid',gap:8,marginBottom:16}}>
   <label>我讀者今個星期要決定嘅係<input value={decision} onChange={e=>setDecision(e.target.value)} placeholder="例：值唔值得用 AI 幫手出帖" maxLength={120} required/></label>
   <div><button className="button" disabled={busy}>{busy?'搵緊…（~20 秒）':'搵靈感'}</button></div>
  </form>
  {error&&<p role="alert">{error}</p>}
  {today&&<p className="small-copy" style={{padding:12,border:'1px solid #7C5CFF',borderRadius:8}}><strong>今日來源：</strong>{today.source_id} · {today.title}<br/>理由：{today.reason}{today.mode==='DEMO'&&' · DEMO'}</p>}
  {latest&&<>
   <p className="small-copy">最近一輪 · {fmt(latest.started_at)} · query「{latest.query}」 · <strong>{latest.mode}</strong>{latest.reason&&` (${latest.reason})`} · credits：{latest.log.filter((l:any)=>l.credits).reduce((a:number,l:any)=>a+(l.credits||0),0)}</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))',gap:16}}>
    {latest.cards.map(c=><article key={c.card_id} className="panel" style={{margin:0,minWidth:0,opacity:c.needs_verification?0.7:1}}>
     <div className="section-heading"><strong>{c.source_id}</strong><span className="tag">{c.mode}</span></div>
     <h3 style={{fontSize:16}}><a href={c.url} target="_blank" rel="noopener noreferrer">{c.title}</a></h3>
     <p className="small-copy">來源角色：<strong>{ROLE[c.source_role]||c.source_role}</strong><br/>信心：<strong>{c.confidence}</strong> · claim_risk：{c.claim_risk}{c.needs_verification&&' · 待核實（冇 primary，唔可以入 Rewrite）'}<br/>發布：{fmt(c.published_at)} · 抓取：{fmt(c.fetched_at)}<br/>why_now：{c.why_now}<br/>persona_score：<strong>{c.persona_score}</strong> — {c.persona_reason}<br/>collector：{c.collector} · credits {c.credits_used}{c.second_source&&<> · 第二來源 ✓</>}</p>
     {c.excerpt&&<details><summary>原文節錄</summary><p className="small-copy">{c.excerpt}</p></details>}
     {!c.needs_verification&&<div style={{display:'grid',gap:6}}><input placeholder="一句理由（你揀，唔係 AI 揀）" value={reason[c.card_id]||''} onChange={e=>setReason(v=>({...v,[c.card_id]:e.target.value}))} maxLength={240}/><button className="quiet" disabled={busy||!(reason[c.card_id]||'').trim()} onClick={()=>void post({action:'mark',cardId:c.card_id,reason:reason[c.card_id]})}>標為今日來源</button></div>}
    </article>)}
   </div>
   <details style={{marginTop:12}}><summary>runs log（每個 provider 用咗幾多）</summary><pre className="small-copy" style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(latest.log,null,1)}</pre></details>
  </>}
 </section>;
}
