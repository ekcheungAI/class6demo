import {NextResponse} from 'next/server';
import {cloudRuntime} from '@/lib/cloud-runtime.mjs';
import {sourceUrl,sourceRequestId,fetchLink} from '@/lib/link-source.mjs';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
export const dynamic='force-dynamic';export const maxDuration=60;
export async function POST(request:Request){let runtime:any,job:any;try{assertLocalRequest(request);const body=await request.json();const parsed=sourceUrl(body.url);runtime=await cloudRuntime(token(request));const id=sourceRequestId(parsed.url);const claimed=await runtime.claim(id,'source',{url:parsed.url,provider:parsed.provider});job=claimed.job;
 if(!claimed.claimed){if(job.state==='completed')return NextResponse.json({sourceRequestId:id,source:job.source,cached:true});throw new ContentError('此來源讀取仍在處理或待核對，未重新抓取',409);}
 const result=await fetchLink(parsed.url);job=await runtime.update(job,'completed',{source:result.source,providerResponse:result.raw});return NextResponse.json({sourceRequestId:id,source:job.source,cached:false},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(runtime&&job?.state==='submitting'){try{await runtime.update(job,'unknown',{error:e instanceof Error?e.message:'Source read failed'});}catch{}}return NextResponse.json({error:e instanceof Error?e.message:'連結讀取失敗，未開始AI改寫'},{status:e instanceof ContentError?e.status:502});}}
