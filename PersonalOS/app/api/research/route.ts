import {NextResponse} from 'next/server';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
import {l6Store} from '@/lib/l6-store.mjs';
import {cloudRuntime} from '@/lib/cloud-runtime.mjs';
import {loadBrand} from '@/lib/brand-context.mjs';
import {runtimeBrain} from '@/lib/ommi-brain.mjs';
import {runResearch,RESEARCH_PREFIX,TODAY_SOURCE_ID} from '@/lib/research.mjs';
export const dynamic='force-dynamic';export const maxDuration=120;

function fail(e:unknown){console.error("[research]",e);return NextResponse.json({error:e instanceof ContentError?e.message:"搵靈感未完成；冇自動重試"},{status:e instanceof ContentError?e.status:503});}

// GET: latest runs (cards + credits log) and the card marked as today's source.
export async function GET(request:Request){try{assertLocalRequest(request);const store=await l6Store(token(request)!);
 const runs=await store.list(RESEARCH_PREFIX,{limit:5});const today=await store.get(TODAY_SOURCE_ID);
 return NextResponse.json({runs:runs.map((r:any)=>r.metadata),today:today?.metadata||null,keys:{exa:!!process.env.EXA_API_KEY,firecrawl:!!process.env.FIRECRAWL_API_KEY,tavily:!!process.env.TAVILY_API_KEY,toapi:!!process.env.TOAPI_API_KEY}},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}

// POST {action:'run', decision}  → one research run, saved as runs row research:<uuid>
// POST {action:'mark', cardId, reason} → marks one card as 今日來源 (student decides, not the model)
export async function POST(request:Request){try{assertLocalRequest(request);const body=await request.json();const auth=token(request)!;const store=await l6Store(auth);
 if(body.action==='run'){
  const runtime=await cloudRuntime(auth);const saved=await runtime.brand();const brain=runtimeBrain(saved||await loadBrand(),await runtime.client.ommiBrain(runtime.workspace));
  const previous=await store.list(RESEARCH_PREFIX,{limit:50});const used=previous.flatMap((r:any)=>(r.metadata?.cards||[]).map((c:any)=>Number(String(c.source_id).replace('S-',''))||0));
  const result=await runResearch({decision:String(body.decision||''),brain,nextSeq:Math.max(5,...used)+1});
  await store.put(result.run_id,{provider:'personalos-research',platform:'web',status:result.mode,metadata:result});
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }
 if(body.action==='mark'){
  const reason=String(body.reason||'').trim().slice(0,240);if(!reason)throw new ContentError('寫一句理由先');
  const runs=await store.list(RESEARCH_PREFIX,{limit:20});let card:any=null;for(const r of runs){card=(r.metadata?.cards||[]).find((c:any)=>c.card_id===body.cardId);if(card)break;}
  if(!card)throw new ContentError('搵唔到呢張卡',404);
  if(card.needs_verification)throw new ContentError('呢張卡 claim_risk=high 而且冇 primary：標「待核實」，唔可以做今日來源');
  const today={...card,reason,marked_at:new Date().toISOString()};
  await store.put(TODAY_SOURCE_ID,{provider:'personalos-research',platform:'web',status:'today',metadata:today});
  return NextResponse.json({today},{headers:{'Cache-Control':'no-store'}});
 }
 throw new ContentError('未開放此操作');
}catch(e){return fail(e);}}
