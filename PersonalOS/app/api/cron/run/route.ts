import {NextResponse} from 'next/server';
import {ContentError} from '@/lib/content-engine.mjs';
import {l6Store} from '@/lib/l6-store.mjs';
import {runOnce} from '@/lib/autopilot.mjs';
import {accountFor} from '@/app/api/cards/route';
import {imagePreview} from '@/lib/image-storage';
export const dynamic='force-dynamic';export const maxDuration=90;
// Vercel Cron calls this with `Authorization: Bearer ${CRON_SECRET}`.
// The runner needs the workspace owner's Supabase session. Two stateless ways
// (homework, Step 99) — both live in server env only, never NEXT_PUBLIC_:
//   AUTOPILOT_EMAIL + AUTOPILOT_PASSWORD  → password grant every run (recommended)
//   AUTOPILOT_REFRESH_TOKEN               → only works if the project has refresh-token rotation OFF
// Nothing runs without CRON_SECRET; nothing publishes with the kill switch on.
// This is the "不可逆" step the teacher demonstrates, not the student.
async function session(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new ContentError('Supabase env 未設',412);
 const email=process.env.AUTOPILOT_EMAIL,password=process.env.AUTOPILOT_PASSWORD,refresh=process.env.AUTOPILOT_REFRESH_TOKEN;
 let grant:string,body:Record<string,string>;
 if(email&&password){grant='password';body={email,password};}
 else if(refresh){grant='refresh_token';body={refresh_token:refresh};}
 else throw new ContentError('AUTOPILOT_EMAIL＋AUTOPILOT_PASSWORD（或 AUTOPILOT_REFRESH_TOKEN）未設：runner 冇 workspace 身份，唔會跑',412);
 const r=await fetch(url+'/auth/v1/token?grant_type='+grant,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const s=await r.json().catch(()=>null);
 if(!r.ok||!s?.access_token)throw new ContentError(grant==='password'?'runner 登入失敗（email／password 唔對）':'refresh token 換唔到 session（已用過或被撤銷；Supabase 有 rotation 就用 email/password）',401);
 return s.access_token as string;
}
export async function GET(request:Request){
 try{
  const secret=process.env.CRON_SECRET;const auth=request.headers.get('authorization')||'';
  if(!secret||auth!=='Bearer '+secret)return NextResponse.json({ok:false,message:'CRON_SECRET 未設或唔對'},{status:401});
  const store=await l6Store(await session());const run=await runOnce(store,{trigger:'cron',accountFor,sign:(p:string)=>imagePreview(store.auth,p,store.workspace)});
  return NextResponse.json({ok:true,run},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('[cron]',e);return NextResponse.json({ok:false,message:e instanceof ContentError?e.message:'cron run 未完成'},{status:e instanceof ContentError?e.status:503});}
}
