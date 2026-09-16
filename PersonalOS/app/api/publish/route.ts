import {NextResponse} from 'next/server';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
import {l6Store} from '@/lib/l6-store.mjs';
import {readSettings} from '@/lib/settings.mjs';
import {CARD_PREFIX,column,approvalValid} from '@/lib/cards.mjs';
import {publishCard,verifyCard} from '@/lib/publish-adapter.mjs';
import {accountFor} from '@/app/api/cards/route';
import {publishLedger,countPublishedToday,logRun} from '@/lib/autopilot.mjs';
import {imagePreview} from '@/lib/image-storage';
export const dynamic='force-dynamic';export const maxDuration=90;
function fail(e:unknown){console.error('[publish]',e);return NextResponse.json({error:e instanceof ContentError?e.message:'發布入口未完成；冇自動重試'},{status:e instanceof ContentError?e.status:503});}
// POST {action:'publish', cardId} — one card, once, by a person clicking.
// POST {action:'verify',  cardId} — re-check an UNKNOWN card; never resends.
export async function POST(request:Request){try{assertLocalRequest(request);const store=await l6Store(token(request)!);const body=await request.json();const settings=await readSettings(store);
 const row=await store.get(CARD_PREFIX+String(body.cardId||''));if(!row)throw new ContentError('搵唔到呢張卡',404);
 let card=row.metadata;const account=accountFor(card,settings);let result:any;
 if(body.action==='publish'){
  if(settings.killSwitch)throw new ContentError('kill switch 開住：所有出街動作停',409);
  const ledger=await publishLedger(store);const used=await countPublishedToday(store);
  ({result,card}=await publishCard(card,{workspaceId:store.workspace,accountId:account,ledger:ledger.keys,cap:{used,limit:settings.dailyPostCap},sign:(p:string)=>imagePreview(store.auth,p,store.workspace)}));
  await ledger.save();
  await logRun(store,{trigger:'manual',cards:[{card_id:card.card_id,platform:card.platform,route:card.publish_route,...result}],settings});
 }else if(body.action==='verify'){({result,card}=await verifyCard(card,{}));}
 else throw new ContentError('未開放此操作');
 await store.put(CARD_PREFIX+card.card_id,{provider:'composer',platform:card.platform,status:card.publish_status,metadata:card});
 return NextResponse.json({result,card:{...card,column:column(card),approval_valid:approvalValid(card,account)}},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
