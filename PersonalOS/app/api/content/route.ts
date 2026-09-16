import {NextResponse} from 'next/server';
import {feedClient} from '@/lib/feed-supabase.mjs';
import {token} from '@/lib/api';
import {cloudRuntime} from '@/lib/cloud-runtime.mjs';
import {imagePreview} from '@/lib/image-storage';
import {updateQueueRecord} from '@/lib/queue-record.mjs';
import {validateOutputs} from '@/lib/content-engine.mjs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {generateRecord} from '@/lib/toapi.mjs';
import {loadBrand} from '@/lib/brand-context.mjs';
import {assertLocalRequest,ContentError,prepareRequest,createRecord,listContent,changeContent} from '@/lib/content-engine.mjs';
export const dynamic='force-dynamic';
const enabled=()=>process.env.STUDENT_TEACHER_PREVIEW==='1';
function fail(e:unknown){return NextResponse.json({error:e instanceof ContentError?e.message:'本地保存未完成，請重讀後再試。'},{status:e instanceof ContentError?e.status:503});}
export async function GET(request:Request){try{assertLocalRequest(request);if(new URL(request.url).searchParams.get('scope')==='cloud'){const auth=token(request)!;const rt=await cloudRuntime(auth);const result=await rt.client.cloudDrafts();for(const r of result.items)for(const image of Object.values(r.images||{}) as any[])image.signedUrl=await imagePreview(auth,image.storagePath,rt.workspace).catch(()=>null);return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});}return NextResponse.json({enabled:enabled(),modelReady:enabled()&&!!process.env.TOAPI_API_KEY,items:enabled()?await listContent():[]},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(request:Request){try{assertLocalRequest(request);const input=await request.clone().json();if(['schedule','unschedule','queueEdit','attachImage'].includes(input.action)){const runtime=await cloudRuntime(token(request));const job=await runtime.job(input.id);if(job.kind!=='text'||job.state!=='completed')throw new ContentError('草稿未完成',409);if(input.action==='attachImage'){const imageJob=await runtime.job(input.imageTaskId);if(imageJob.kind!=='image'||imageJob.state!=='completed')throw new ContentError('圖片未完成保存');input.verifiedImage={taskId:imageJob.id,storagePath:imageJob.record.storagePath};}const record=updateQueueRecord(job.record,input);const saved=await runtime.update(job,'completed',{record});return NextResponse.json({...saved.record,persistence:{mode:'supabase',verified:true}});}if(input.action==='edit'){const runtime=await cloudRuntime(token(request));const job=await runtime.job(input.id);if(job.kind!=='text'||job.state!=='completed'||job.record.version!==input.expectedVersion)throw new ContentError('草稿版本不一致，請重新讀取',409);const outputs=validateOutputs(input.outputs,job.record.brief.platforms);const record={...job.record,version:job.record.version+1,status:'human_edit',queue:{},revisions:[...job.record.revisions,{version:job.record.version+1,status:'human_edit',createdAt:new Date().toISOString(),outputs,review:null}]};const saved=await runtime.update(job,'completed',{record});return NextResponse.json({...saved.record,persistence:{mode:'supabase',verified:true}});}if(!enabled())throw new ContentError('學生模式未開放老師測試',403);
 const text=await request.text();if(text.length>150000)throw new ContentError('內容過大',413);let body;try{body=JSON.parse(text);}catch{throw new ContentError('JSON格式無效');}
 if(body.action==='prepare'){
 const brand=await loadBrand();const skill=await readFile(path.join(process.cwd(),'.agents/skills/my-branding-skill/SKILL.md'),'utf8');return NextResponse.json(await createRecord(prepareRequest(body.brief,brand,skill)));
 }
 if(body.action==='generate')return NextResponse.json(await generateRecord(body.id,body.expectedVersion));
 if(!['import','edit','approve'].includes(body.action))throw new ContentError('未開放此操作');
 return NextResponse.json(await changeContent(body.id,body));
 }catch(e){return fail(e);}}
