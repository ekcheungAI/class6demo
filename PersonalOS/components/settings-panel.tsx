'use client';
// Act 6 · 你改設定，唔係 Codex 改。四樣嘢存 DB，Rewrite／feed／runner 每次執行前重新讀，改完唔使 deploy。
import {useEffect,useState} from 'react';
type Rule={id:string;rule:string;scope:string;notScope:string;example:string;counterExample:string};
type Src={id:string;name:string;url:string;enabled:boolean;origin?:string};
const blank=(i:number):Rule=>({id:'R'+(i+1),rule:'',scope:'',notScope:'',example:'',counterExample:''});
export default function SettingsPanel({token}:{token:string}){
 const [s,setS]=useState<any>(null),[sources,setSources]=useState<Src[]>([]),[runs,setRuns]=useState<any[]>([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[error,setError]=useState(''),[tick,setTick]=useState(0),[newUrl,setNewUrl]=useState(''),[newName,setNewName]=useState('');
 useEffect(()=>{if(!token)return;const c=new AbortController();Promise.all([fetch('/api/settings',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:c.signal}).then(r=>r.json()),fetch('/api/autopilot',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:c.signal}).then(r=>r.json())]).then(([a,b])=>{if(a.error)throw new Error(a.error);setS(a.settings);setSources(a.rssSources);setRuns(b.runs||[]);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[token,tick]);
 async function save(patch:any,label='已保存到 Supabase（重新整理仍然喺度）'){setBusy(true);setError('');setMsg('');try{const r=await fetch('/api/settings',{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(patch)});const d=await r.json();if(!r.ok)throw new Error(d.error);setS(d.settings);setSources(d.rssSources);setMsg(label);}catch(e){setError(e instanceof Error?e.message:'未保存');}finally{setBusy(false);}}
 async function runOnce(){setBusy(true);setError('');try{const r=await fetch('/api/autopilot',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'run-once'})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMsg(d.run.stopped?'runner：'+d.run.stopped:`runner 跑完：published ${d.run.cards_published} · unknown ${d.run.cards_unknown} · skipped ${d.run.cards_skipped}`);setTick(v=>v+1);}catch(e){setError(e instanceof Error?e.message:'runner 未完成');}finally{setBusy(false);}}
 if(!token)return null;if(!s)return <p role="status">{error||'讀取設定…'}</p>;
 const rules:Rule[]=[0,1,2].map(i=>s.voiceRules[i]||blank(i));
 return <section className="panel settings" style={{marginTop:24}}>
  <h2>我的設定 <span className="tag">Lesson 6</span></h2><p className="muted">四樣嘢全部存落 Supabase（`system:settings`），Rewrite、feed 同 runner 每次執行前重新讀。改完唔使 deploy。</p>
  {msg&&<p role="status">{msg}</p>}{error&&<p role="alert">{error}</p>}
  <h3>1 · 三條 voice rules（Rewrite 每次都讀）</h3>
  <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const voiceRules=[0,1,2].map(i=>({id:'R'+(i+1),rule:f.get('rule'+i),scope:f.get('scope'+i),notScope:f.get('notScope'+i),example:f.get('example'+i),counterExample:f.get('counterExample'+i)})).filter(r=>String(r.rule).trim());void save({voiceRules},'voice rules 已保存。返 Composer 再撳「我把聲」，輸出會跟新規則。');}} style={{display:'grid',gap:12}}>
   {rules.map((r,i)=><fieldset key={i} style={{border:'1px solid #e9e7ee',borderRadius:8,padding:12,display:'grid',gap:6}}><legend>{r.id}</legend>
    <label>規則（一句）<input name={'rule'+i} defaultValue={r.rule} maxLength={200} placeholder="例：開場先講讀者問題，唔講功能"/></label>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><label>適用<input name={'scope'+i} defaultValue={r.scope} maxLength={120}/></label><label>唔適用<input name={'notScope'+i} defaultValue={r.notScope} maxLength={120}/></label></div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><label>正例<input name={'example'+i} defaultValue={r.example} maxLength={240}/></label><label>反例<input name={'counterExample'+i} defaultValue={r.counterExample} maxLength={240}/></label></div>
   </fieldset>)}
   <div><button className="button" disabled={busy}>保存 voice rules</button></div>
  </form>
  <hr/>
  <h3>2 · Feed 嘅 RSS 來源清單</h3><p className="muted">原本嗰批來源照留做預設；你加嘅會即刻出現喺 Feed 頁「RSS來源設定」，撳抓料就讀到。</p>
  <form onSubmit={e=>{e.preventDefault();if(!newUrl)return;void save({rssSources:[...s.rssSources,{name:newName,url:newUrl,enabled:true}]},'來源已加。去 Feed 揀佢撳抓料。');setNewUrl('');setNewName('');}} style={{display:'grid',gridTemplateColumns:'1fr 2fr auto',gap:8,alignItems:'end'}}>
   <label>名稱<input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="例：Simon Willison"/></label><label>RSS／Atom 網址<input value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="https://simonwillison.net/atom/everything/" required/></label><button className="button" disabled={busy||!newUrl}>加</button>
  </form>
  <ul className="small-copy" style={{marginTop:12}}>
   {s.rssSources.map((src:Src)=><li key={src.id}><label><input type="checkbox" checked={src.enabled} disabled={busy} onChange={e=>void save({rssSources:s.rssSources.map((x:Src)=>x.id===src.id?{...x,enabled:e.target.checked}:x)})}/> <strong>{src.name}</strong> · {src.url}</label> <button className="quiet" disabled={busy} onClick={()=>void save({rssSources:s.rssSources.filter((x:Src)=>x.id!==src.id)})}>刪</button></li>)}
   {!s.rssSources.length&&<li className="muted">你未加任何來源；feed 照行預設嗰批（{sources.filter(x=>x.origin==='default').length} 個）。</li>}
  </ul>
  <details><summary className="small-copy">預設來源（{sources.filter(x=>x.origin==='default').length}）— 可以關</summary><ul className="small-copy">{sources.filter(x=>x.origin==='default').map(src=><li key={src.id}><label><input type="checkbox" checked={src.enabled} disabled={busy} onChange={e=>void save({disabledDefaultSources:e.target.checked?s.disabledDefaultSources.filter((id:string)=>id!==src.id):[...s.disabledDefaultSources,src.id]})}/> {src.name}</label></li>)}</ul></details>
  <hr/>
  <h3>3 · 每日出帖上限 &nbsp; 4 · Kill switch</h3>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
   <label>每日上限（0–10）<input type="number" min={0} max={10} value={s.dailyPostCap} disabled={busy} onChange={e=>void save({dailyPostCap:Number(e.target.value)})}/></label>
   <label style={{alignSelf:'end'}}><input type="checkbox" checked={s.killSwitch} disabled={busy} onChange={e=>void save({killSwitch:e.target.checked},e.target.checked?'kill switch 開咗：下次 run 第一行會寫 stopped by kill switch；手動「只發一次」都會停。':'kill switch 關咗。')}/> <strong>Kill switch</strong>（開 → 全部出街動作停）</label>
   <label style={{alignSelf:'end'}}><input type="checkbox" checked={s.autopilotEnabled} disabled={busy} onChange={e=>void save({autopilotEnabled:e.target.checked},e.target.checked?'自動模式開咗：cron 觸發時 runner 先會發（今日老師示範，你功課先開）。':'自動模式關咗。')}/> <strong>自動模式</strong>（cron 觸發先有用；缺少設定 = 關）</label>
   <label>Upload-Post profile<input value={s.uploadPostProfile||''} disabled={busy} onBlur={e=>void save({uploadPostProfile:e.target.value})} onChange={e=>setS({...s,uploadPostProfile:e.target.value})} placeholder="Connections 頁揀咗嗰個 username"/></label>
  </div>
  <div className="card-actions" style={{marginTop:12}}><button className="button" disabled={busy} onClick={()=>void runOnce()}>Run once now</button><span className="small-copy">同 cron 行同一段 code：讀設定 → kill switch？→ 到期而且批準仍有效嘅卡 → 出街 → 寫 log。</span></div>
  <h3 style={{marginTop:16}}>Runs log</h3>
  {runs.length?<table className="small-copy" style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={{textAlign:'left'}}>時間</th><th>trigger</th><th>published</th><th>unknown</th><th>skipped</th><th style={{textAlign:'left'}}>log</th></tr></thead><tbody>{runs.slice(0,12).map(r=><tr key={r.id} style={{borderTop:'1px solid #e9e7ee'}}><td style={{padding:4}}>{new Intl.DateTimeFormat('zh-HK',{dateStyle:'short',timeStyle:'short'}).format(new Date(r.started_at))}</td><td style={{textAlign:'center'}}>{r.trigger}</td><td style={{textAlign:'center'}}>{r.cards_published}</td><td style={{textAlign:'center'}}>{r.cards_unknown}</td><td style={{textAlign:'center'}}>{r.cards_skipped}</td><td style={{padding:4}}>{r.stopped?<strong>{r.stopped}</strong>:r.log.map((l:any,i:number)=><span key={i}>{l.platform} {l.status}{l.reason?` (${l.reason})`:''}{l.public_url?` ${l.public_url}`:''}; </span>)}</td></tr>)}</tbody></table>:<p className="muted">未有 run。撳「Run once now」。</p>}
  <p className="small-copy" style={{marginTop:12}}>裝 cron（功課／老師示範）：`vercel.json` 已登記 <code>/api/cron/run</code> 每日 01:00 UTC（09:00 HKT）；Vercel env 要有 <code>CRON_SECRET</code> 同 <code>AUTOPILOT_REFRESH_TOKEN</code>（runner 用嚟換 session）。冇呢兩條 = cron 唔會跑，唔會出事。</p>
 </section>;
}
