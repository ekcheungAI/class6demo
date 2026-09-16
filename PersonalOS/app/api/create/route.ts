import {NextResponse} from 'next/server';
import {cloudRuntime} from '@/lib/cloud-runtime.mjs';
import {createCloudContent} from '@/lib/cloud-content.mjs';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
export const dynamic='force-dynamic';export const maxDuration=120;
export async function POST(request:Request){let requestId;
 try{assertLocalRequest(request);const body=await request.json();requestId=body.requestId;const runtime=await cloudRuntime(token(request));return NextResponse.json(await createCloudContent(runtime,body),{headers:{'Cache-Control':'no-store'}});}
 catch(e){return NextResponse.json({error:e instanceof ContentError?e.message:'雲端生成未完成，請恢復同一請求',draftId:requestId,terminal:e instanceof ContentError&&(e.terminal===true||e.status===404)},{status:e instanceof ContentError?e.status:503});}}
export async function GET(request:Request){try{assertLocalRequest(request);const runtime=await cloudRuntime(token(request));const job=await runtime.job(new URL(request.url).searchParams.get('requestId'));return NextResponse.json({requestId:job.id,status:job.state,record:job.state==='completed'?job.record:null},{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'未能讀回'},{status:400});}}
