import {NextResponse} from 'next/server';
import {ContentError} from '@/lib/content-engine.mjs';
import {l6Store} from '@/lib/l6-store.mjs';
import {runOnce} from '@/lib/autopilot.mjs';
import {accountFor} from '@/app/api/cards/route';
export const dynamic='force-dynamic';export const maxDuration=90;
// Vercel Cron calls this with `Authorization: Bearer ${CRON_SECRET}`. The runner
// itself needs a workspace owner's Supabase session, so the student stores a
// long-lived refresh token as AUTOPILOT_REFRESH_TOKEN (homework, Step 99) and we
// exchange it here. Nothing runs without CRON_SECRET; nothing publishes with the
// kill switch on. This is the "不可逆" step the teacher demonstrates, not the student.
export async function GET(request:Request){
 try{
  const secret=process.env.CRON_SECRET;const auth=request.headers.get('authorization')||'';
  if(!secret||auth!=='Bearer '+secret)return NextResponse.json({ok:false,message:'CRON_SECRET 未設或唔對'},{status:401});
  const refresh=process.env.AUTOPILOT_REFRESH_TOKEN;const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!refresh||!url||!key)return NextResponse.json({ok:false,message:'AUTOPILOT_REFRESH_TOKEN 未設：runner 冇 workspace 身份，唔會跑'},{status:412});
  const r=await fetch(url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh}),signal:AbortSignal.timeout(15000)});
  const session=await r.json().catch(()=>null);if(!r.ok||!session?.access_token)return NextResponse.json({ok:false,message:'refresh token 換唔到 session（已過期或被撤銷）'},{status:401});
  const store=await l6Store(session.access_token);const run=await runOnce(store,{trigger:'cron',accountFor});
  return NextResponse.json({ok:true,run},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('[cron]',e);return NextResponse.json({ok:false,message:e instanceof ContentError?e.message:'cron run 未完成'},{status:503});}
}
