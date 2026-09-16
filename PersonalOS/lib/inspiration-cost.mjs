const THIRTY_DAYS=30*86400000;
const amount=value=>{if(typeof value==='number')return Number.isFinite(value)?value:null;if(typeof value==='string'&&value.trim()!==''){const n=Number(value);return Number.isFinite(n)?n:null;}return null;};

export function costMetadata(estimatedCostUsd,basis){const n=amount(estimatedCostUsd);return {cost_status:n!==null&&n>0?'estimated':'unknown',cost_basis:basis};}

export function summarizeInspirationCosts(rows,now=Date.now()){
 const runs=(Array.isArray(rows)?rows:[]).filter(row=>{const time=Date.parse(row?.fetched_at);return Number.isFinite(time)&&time>=now-THIRTY_DAYS&&time<=now;});
 const known=runs.filter(row=>{const n=amount(row.estimated_cost_usd),status=row.metadata?.cost_status;return status!=='unknown'&&((n!==null&&n>0)||status==='verified_zero'&&n===0);});
 const estimatedUsd=known.reduce((sum,row)=>sum+Number(row.estimated_cost_usd),0);
 const verifiedZero=known.length>0&&known.every(row=>row.metadata?.cost_status==='verified_zero');
 const status=!runs.length?'empty':known.length===runs.length?(verifiedZero?'verified_zero':'estimated'):known.length?'partial':'unknown';
 return {status,totalRuns:runs.length,pricedRuns:known.length,unknownRuns:runs.length-known.length,estimatedUsd};
}

export function presentInspirationCost(summary){
 if(!summary||summary.status==='empty')return {value:'—',note:'近30日未有 TikHub 抓取'};
 if(summary.status==='unknown')return {value:'—',note:`費用待核對 · 0/${summary.totalRuns} runs 有估價`};
 if(summary.status==='verified_zero')return {value:'US$0.000',note:`已核實免收費 · ${summary.pricedRuns}/${summary.totalRuns} runs`};
 const partial=summary.status==='partial';
 return {value:`≈ US$${summary.estimatedUsd.toFixed(3)}`,note:`${partial?'部分估算 · ':''}${summary.pricedRuns}/${summary.totalRuns} runs 有估價`};
}
