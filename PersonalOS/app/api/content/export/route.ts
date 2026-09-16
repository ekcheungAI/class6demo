import {NextResponse} from 'next/server';
import {assertLocalRequest,ContentError,exportContent} from '@/lib/content-engine.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 assertLocalRequest(request);if(process.env.STUDENT_TEACHER_PREVIEW!=='1')throw new ContentError('學生模式未開放老師資料',403);
 const data=await exportContent(new URL(request.url).searchParams.get('id'));
 return new Response(JSON.stringify(data,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="content-${data.id}.json"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return NextResponse.json({error:e instanceof ContentError?e.message:'匯出未完成'},{status:e instanceof ContentError?e.status:503});}}
