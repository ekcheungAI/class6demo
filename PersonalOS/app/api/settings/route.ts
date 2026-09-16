import {NextResponse} from 'next/server';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
import {l6Store} from '@/lib/l6-store.mjs';
import {readSettings,writeSettings,effectiveRssSources} from '@/lib/settings.mjs';
export const dynamic='force-dynamic';
function fail(e:unknown){return NextResponse.json({error:e instanceof ContentError?e.message:'設定未保存'},{status:e instanceof ContentError?e.status:503});}
// Settings are read fresh on every call — there is no in-memory cache to go stale.
export async function GET(request:Request){try{assertLocalRequest(request);const store=await l6Store(token(request)!);const settings=await readSettings(store);return NextResponse.json({settings,rssSources:effectiveRssSources(settings),persistence:{mode:'supabase',runId:'system:settings',workspaceId:store.workspace}},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function PUT(request:Request){try{assertLocalRequest(request);const store=await l6Store(token(request)!);const body=await request.json();const current=await readSettings(store);const saved=await writeSettings(store,{...current,...body});return NextResponse.json({settings:saved,rssSources:effectiveRssSources(saved),persistence:{mode:'supabase',runId:'system:settings',workspaceId:store.workspace,verified:true}},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
