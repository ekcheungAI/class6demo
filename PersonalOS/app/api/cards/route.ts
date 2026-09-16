import {NextResponse} from 'next/server';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
import {l6Store} from '@/lib/l6-store.mjs';
import {readSettings} from '@/lib/settings.mjs';
import {CARD_PREFIX,column,dryRun,approve,editContent,setRoute,attach,schedule,unschedule,approvalValid} from '@/lib/cards.mjs';
export const dynamic='force-dynamic';
function fail(e:unknown){return NextResponse.json({error:e instanceof ContentError?e.message:'卡未保存'},{status:e instanceof ContentError?e.status:503});}
/** The account a route publishes as. threads_direct = env user id; upload_post = chosen profile. */
export function accountFor(card:any,settings:any){
 if(card.publish_route==='threads_direct')return process.env.THREADS_USER_ID||'';
 if(card.publish_route==='upload_post')return settings.uploadPostProfile||'';
 if(card.publish_route==='none')return 'archive';
 return '';
}
export async function GET(request:Request){try{assertLocalRequest(request);const store=await l6Store(token(request)!);const settings=await readSettings(store);
 const rows=await store.list(CARD_PREFIX,{limit:200});
 const cards=rows.map((r:any)=>r.metadata).map((c:any)=>({...c,column:column(c),approval_valid:approvalValid(c,accountFor(c,settings))}));
 return NextResponse.json({cards,columns:{draft:cards.filter((c:any)=>c.column==='draft').length,scheduled:cards.filter((c:any)=>c.column==='scheduled').length,published:cards.filter((c:any)=>c.column==='published').length},routes:{threads_direct:!!(process.env.THREADS_USER_ACCESS_TOKEN&&process.env.THREADS_USER_ID),upload_post:!!process.env.UPLOAD_POST_API_KEY}},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(request:Request){try{assertLocalRequest(request);const store=await l6Store(token(request)!);const body=await request.json();const settings=await readSettings(store);
 const row=await store.get(CARD_PREFIX+String(body.cardId||''));if(!row)throw new ContentError('搵唔到呢張卡',404);
 let card=row.metadata;const account=accountFor(card,settings);
 if(body.action==='dryrun')return NextResponse.json({pack:dryRun(card,{accountId:account,workspaceId:store.workspace}),card},{headers:{'Cache-Control':'no-store'}});
 if(body.action==='approve')card=approve(card,{accountId:account});
 else if(body.action==='edit')card=editContent(card,body.content,body.title);
 else if(body.action==='route')card=setRoute(card,String(body.route||''));
 else if(body.action==='attach')card=attach(card,body.attachment);
 else if(body.action==='schedule')card=schedule(card,{scheduledAt:body.scheduledAt,timeZone:body.timeZone});
 else if(body.action==='unschedule')card=unschedule(card);
 else throw new ContentError('未開放此操作');
 await store.put(CARD_PREFIX+card.card_id,{provider:'composer',platform:card.platform,status:card.publish_status,metadata:card});
 return NextResponse.json({card:{...card,column:column(card),approval_valid:approvalValid(card,accountFor(card,settings))}},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
