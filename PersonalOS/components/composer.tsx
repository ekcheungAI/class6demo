'use client';
// Act 4 · 排版台：來源 → 我把聲 → 平台卡。Output is draft cards in the Queue, never a post.
import {useEffect,useState} from 'react';import Link from 'next/link';
type Rewrite={record_id:string;source:{source_id:string;title:string;url:string;mode:string};voice_rules:any[];model:string;original:string;outputs:{platform:string;title:string;body:string}[];facts_check:{original:string;rewritten:string;changed:string}[];created_at:string;card_ids:string[];usage?:any};
export default function Composer({token}:{token:string}){
 const [data,setData]=useState<any>(null),[platforms,setPlatforms]=useState<string[]>(['threads','instagram','newsletter']),[pick,setPick]=useState<any>({kind:'today'}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<any>(null),[tick,setTick]=useState(0);
 useEffect(()=>{if(!token)return;const c=new AbortController();fetch('/api/composer',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[token,tick]);
 async function compose(){if(busy)return;setBusy(true);setError('');setResult(null);try{const r=await fetch('/api/composer',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),platforms,source:pick})});const d=await r.json();if(!r.ok)throw new Error(d.error);setResult(d);setTick(v=>v+1);}catch(e){setError(e instanceof Error?e.message:'未完成');}finally{setBusy(false);}}
 if(!token)return <section className="panel"><p>請先到<Link href="/connections">Connections登入</Link>。</p></section>;
 const rw:Rewrite|null=result?.rewrite||data?.rewrites?.[0]||null;
 return <section className="panel">
  <div className="section-heading"><div><h2>Composer · 排版台 <span className="tag">Lesson 6</span></h2><p className="muted">揀一個來源 → 撳「我把聲」跑 Rewrite（跟你三條 voice rules）→ 每個平台一張卡，各自一個 content_hash，狀態 draft，自動入 Queue。呢度出嘅係草稿，唔係帖。</p></div><Link className="quiet" href="/queue">去 Queue</Link></div>
  {data&&!data.modelReady&&<p role="alert">TOAPI_API_KEY 或 STUDENT_TEACHER_PREVIEW=1 未設，Rewrite 跑唔郁。</p>}
  <div style={{display:'grid',gap:12,marginBottom:16}}>
   <fieldset style={{border:'1px solid #e9e7ee',borderRadius:8,padding:12}}><legend>來源</legend>
    <label style={{display:'block'}}><input type="radio" name="src" checked={pick.kind==='today'} onChange={()=>setPick({kind:'today'})}/> 今日來源{data?.today?<>：<strong>{data.today.source_id}</strong> · {data.today.title} {data.today.mode==='DEMO'&&<span className="tag">DEMO</span>}</>:<span className="muted">（未標；去 Inspiration → 搵靈感 揀一張）</span>}</label>
    {(data?.feed||[]).length>0&&<label style={{display:'block',marginTop:8}}><input type="radio" name="src" checked={pick.kind==='feed'} onChange={()=>setPick({kind:'feed',postId:data.feed[0].post_id})}/> Feed 文章：<select disabled={pick.kind!=='feed'} value={pick.postId||''} onChange={e=>setPick({kind:'feed',postId:e.target.value})}>{data.feed.map((f:any)=><option key={f.post_id} value={f.post_id}>{f.title}</option>)}</select></label>}
   </fieldset>
   <fieldset style={{border:'1px solid #e9e7ee',borderRadius:8,padding:12}}><legend>今日要出（每個平台一張卡）</legend>
    {['threads','instagram','newsletter'].map(p=><label key={p} style={{marginRight:16}}><input type="checkbox" checked={platforms.includes(p)} onChange={e=>setPlatforms(v=>e.target.checked?[...v,p]:v.filter(x=>x!==p))}/> {p}{p==='instagram'&&'（要有圖先出到）'}{p==='newsletter'&&'（只存檔）'}</label>)}
   </fieldset>
   <div><button className="button" disabled={busy||!platforms.length||(pick.kind==='today'&&!data?.today)} onClick={()=>void compose()}>{busy?'改寫緊…（~30 秒，一次一個模型請求）':'我把聲'}</button></div>
   {error&&<p role="alert">{error}</p>}
  </div>
  {result&&<p className="small-copy" style={{padding:12,border:'1px solid #7C5CFF',borderRadius:8}}>出咗 {result.cards.length} 張卡：{result.cards.map((c:any)=><span key={c.card_id} style={{marginRight:12}}><strong>{c.platform}</strong> <code>{c.content_hash}</code> · {c.publish_status}</span>)} — 去 <Link href="/queue">Queue</Link> 重新整理核對。</p>}
  {rw&&<details open={!!result}><summary>並排：原文 ／ 改寫稿（{rw.source.source_id} · {rw.model} · voice rules {rw.voice_rules?.length||0} 條）</summary>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,320px),1fr))',gap:16,marginTop:12}}>
    <article className="panel" style={{margin:0}}><h3>原文（{rw.source.mode}）</h3><p className="small-copy" style={{whiteSpace:'pre-wrap'}}>{rw.original.slice(0,2500)}</p><a href={rw.source.url} target="_blank" rel="noopener noreferrer">來源 ↗</a></article>
    {rw.outputs.map(o=><article key={o.platform} className="panel" style={{margin:0}}><h3>{o.platform}{o.title?` · ${o.title}`:''}</h3><p style={{whiteSpace:'pre-wrap'}}>{o.body}</p><p className="small-copy">來源 ID：{rw.source.source_id}</p></article>)}
   </div>
   <h3 style={{marginTop:16}}>三欄對照表（原句／改寫句／改咗嘅係講法定事實）</h3>
   {rw.facts_check?.length?<table className="small-copy" style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={{textAlign:'left'}}>原句</th><th style={{textAlign:'left'}}>改寫句</th><th>改咗</th></tr></thead><tbody>{rw.facts_check.map((f,i)=><tr key={i} style={{background:f.changed==='事實'?'#ffe3e3':'transparent'}}><td style={{padding:6,verticalAlign:'top'}}>{f.original}</td><td style={{padding:6,verticalAlign:'top'}}>{f.rewritten}</td><td style={{padding:6,textAlign:'center',color:f.changed==='事實'?'#b00020':'inherit',fontWeight:700}}>{f.changed}</td></tr>)}</tbody></table>:<p className="muted">模型今次冇交對照表。</p>}
   <p className="small-copy">「事實」欄有紅 = 叫 AI 改返，唔好跳步。</p>
  </details>}
 </section>;
}
