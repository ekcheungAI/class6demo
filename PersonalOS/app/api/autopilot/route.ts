import {NextResponse} from 'next/server';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
import {l6Store} from '@/lib/l6-store.mjs';
import {runOnce,RUN_PREFIX} from '@/lib/autopilot.mjs';
import {accountFor} from '@/app/api/cards/route';
import {imagePreview} from '@/lib/image-storage';
export const dynamic='force-dynamic';export const maxDuration=90;
function fail(e:unknown){console.error('[autopilot]',e);return NextResponse.json({error:e instanceof ContentError?e.message:'runner 未完成'},{status:e instanceof ContentError?e.status:503});}
// GET  → runs log (newest first)
// POST {action:'run-once'} → the student presses the button; same code path as cron
export async function GET(request:Request){try{assertLocalRequest(request);const store=await l6Store(token(request)!);const runs=await store.list(RUN_PREFIX,{limit:30});return NextResponse.json({runs:runs.map((r:any)=>r.metadata)},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(request:Request){try{assertLocalRequest(request);const store=await l6Store(token(request)!);const body=await request.json();if(body.action!=='run-once')throw new ContentError('未開放此操作');const run=await runOnce(store,{trigger:'manual',accountFor,sign:(p:string)=>imagePreview(store.auth,p,store.workspace)});return NextResponse.json({run},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
