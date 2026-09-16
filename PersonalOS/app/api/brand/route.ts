import {NextResponse} from 'next/server';
import {cloudRuntime} from '@/lib/cloud-runtime.mjs';
import {brandSummary} from '@/lib/brand-summary.mjs';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{assertLocalRequest(request);return NextResponse.json(await (await cloudRuntime(token(request))).requireBrand(),{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'請登入並保存品牌'},{status:400});}}
export async function PUT(request:Request){try{assertLocalRequest(request);const runtime=await cloudRuntime(token(request));const body=await request.json();const summary=brandSummary(body.brand,body.skill);return NextResponse.json(await runtime.saveBrand(summary,body.expectedRevision),{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'品牌未保存'},{status:e instanceof ContentError?e.status:400});}}
