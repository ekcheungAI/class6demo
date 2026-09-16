import test from 'node:test';import assert from 'node:assert/strict';
import {newCard,editContent,approve,approvalValid,schedule,unschedule,setRoute,attach,dryRun,column,contentHash,approvalHash} from '../lib/cards.mjs';
import {validateSettings,defaultSettings,effectiveRssSources,voiceRulesPrompt} from '../lib/settings.mjs';
import {classify,demoCards,buildQuery} from '../lib/research.mjs';
import {publishCard,verifyCard} from '../lib/publish-adapter.mjs';

test('composer card: hash is sha256(platform\\ncontent)[:12], starts draft, newsletter never publishes',()=>{
 const c=newCard({sourceId:'S-06',platform:'threads',content:'今日試一份'});
 assert.equal(c.content_hash,contentHash('threads','今日試一份'));assert.equal(c.publish_status,'draft');assert.equal(c.publish_route,'unset');
 const n=newCard({sourceId:'S-06',platform:'newsletter',content:'x'});assert.equal(n.publish_route,'none');
 assert.throws(()=>newCard({sourceId:'S',platform:'threads',content:'字'.repeat(501)}),/500/);
 assert.throws(()=>newCard({sourceId:'S',platform:'tiktok',content:'x'}),/未知平台/);
});
test('approval binds account + content_hash + attachments; any change drops to draft',()=>{
 let c=setRoute(newCard({sourceId:'S-06',platform:'threads',content:'今日試一份'}),'threads_direct');
 assert.equal(dryRun(c,{accountId:'123',workspaceId:'w'}).ok,true);
 c=approve(c,{accountId:'123'});assert.equal(c.publish_status,'approved');assert.equal(c.approval_hash,approvalHash('123',c.content_hash,[]));
 assert.ok(approvalValid(c,'123'));assert.ok(!approvalValid(c,'999'));
 const edited=editContent(c,'今天試一份');assert.equal(edited.publish_status,'draft');assert.equal(edited.approval_hash,'');assert.notEqual(edited.content_hash,c.content_hash);assert.equal(edited.previous_hash,c.content_hash);
 const attached=attach(c,{id:'img1',url:'https://x/y.png',kind:'image'});assert.equal(attached.publish_status,'draft');assert.equal(attached.approval_hash,'');
 const rerouted=setRoute(c,'upload_post');assert.equal(rerouted.publish_status,'draft');
 assert.throws(()=>approve(c,{accountId:'123'}),/只有 draft/);
});
test('instagram must carry an image before leaving draft; route rules per platform',()=>{
 const ig=newCard({sourceId:'S-06',platform:'instagram',content:'x'});
 assert.throws(()=>setRoute(ig,'threads_direct'),/唔可以行/);
 const routed=setRoute(ig,'upload_post');assert.match(dryRun(routed,{accountId:'demo'}).problems.join(),/一定要有圖/);
 assert.throws(()=>approve(routed,{accountId:'demo'}),/一定要有圖/);
 const withImg=attach(routed,{id:'i',url:'https://x/i.png',kind:'image'});assert.equal(approve(withImg,{accountId:'demo'}).publish_status,'approved');
});
test('schedule keeps approval state; unschedule returns to approved or draft; columns per contract',()=>{
 let c=setRoute(newCard({sourceId:'S',platform:'threads',content:'x'}),'threads_direct');
 assert.throws(()=>schedule(c,{scheduledAt:new Date(Date.now()-1000).toISOString(),timeZone:'Asia/Hong_Kong'}),/未來/);
 const s1=schedule(c,{scheduledAt:new Date(Date.now()+60000).toISOString(),timeZone:'Asia/Hong_Kong'});assert.equal(column(s1),'scheduled');assert.equal(unschedule(s1).publish_status,'draft');
 const s2=schedule(approve(c,{accountId:'1'}),{scheduledAt:new Date(Date.now()+60000).toISOString(),timeZone:'Asia/Hong_Kong'});assert.equal(unschedule(s2).publish_status,'approved');
 assert.equal(column({publish_status:'unknown'}),'scheduled');assert.equal(column({publish_status:'published'}),'published');assert.equal(column({publish_status:'approved'}),'draft');
});
test('settings: ≤3 voice rules, cap 0–10, custom RSS validated, defaults stay',()=>{
 assert.throws(()=>validateSettings({voiceRules:[{rule:'a'},{rule:'b'},{rule:'c'},{rule:'d'}]}),/最多三條/);
 assert.throws(()=>validateSettings({dailyPostCap:11}),/0–10/);
 assert.throws(()=>validateSettings({rssSources:[{url:'not a url'}]}),/網址無效/);
 const s=validateSettings({voiceRules:[{rule:'開場先講讀者問題',scope:'教學'}],rssSources:[{name:'EK',url:'https://www.ekcheung.com/feed.xml'}],dailyPostCap:2,killSwitch:true});
 assert.equal(s.voiceRules[0].id,'R1');assert.equal(s.rssSources[0].enabled,true);assert.equal(s.killSwitch,true);
 const eff=effectiveRssSources(s);assert.ok(eff.some(x=>x.origin==='default'));assert.ok(eff.some(x=>x.origin==='settings'));
 assert.match(voiceRulesPrompt(s),/R1：開場先講讀者問題（適用：教學）/);assert.equal(voiceRulesPrompt(defaultSettings()),'');
});
test('research: role/risk rules, demo cards carry needs_verification, query built from decision',()=>{
 assert.equal(classify({url:'https://x.com/a/1',title:'',description:''}).source_role,'signal');
 assert.equal(classify({url:'https://openai.com/blog/x',title:'x',description:''}).source_role,'primary');
 assert.equal(classify({url:'https://news.site/a',title:'Company layoff after AI',description:''}).claim_risk,'high');
 const d=demoCards(6);assert.equal(d.cards.length,5);assert.ok(d.cards.every(c=>c.mode==='DEMO'));assert.ok(d.cards.some(c=>c.needs_verification));assert.equal(d.cards[0].source_id,'S-06');
 assert.match(buildQuery({brainProfile:{interests:['AI 工具']}},'值唔值得'),/值唔值得 AI 工具 過去一星期/);
});
test('publish adapter: refuses stale approval, duplicate, cap; threads two-step; UNKNOWN never resends',async()=>{
 const calls=[];const published=new Map();let n=0;
 globalThis.fetch=async(url,init={})=>{const u=String(url);calls.push(u.replace(/access_token=[^&]+/,'access_token=***'));const J=(o,ok=true,status=200)=>({ok,status,json:async()=>o});
  if(u.endsWith('/threads')){const text=new URLSearchParams(init.body).get('text');const id='C'+(++n);published.set('c:'+id,text);return J({id});}
  if(u.endsWith('/threads_publish')){const cid=new URLSearchParams(init.body).get('creation_id');const id='M'+(++n);if(!/UNVERIFIABLE/.test(published.get('c:'+cid)))published.set(id,'https://threads.net/p/'+id);return J({id});}
  if(/\/v1\.0\/M\d+\?/.test(u)){const id=u.split('/v1.0/')[1].split('?')[0];return published.has(id)?J({id,permalink:published.get(id)}):J({error:{message:'Object does not exist'}},false,400);}
  return J({error:{message:'no route'}},false,404);};
 const env={THREADS_USER_ACCESS_TOKEN:'t',THREADS_USER_ID:'u1'};const ledger=new Set();
 let c=approve(setRoute(newCard({sourceId:'S',platform:'threads',content:'hello'}),'threads_direct'),{accountId:'u1'});
 let r=await publishCard(c,{workspaceId:'w',accountId:'u9',ledger,env});assert.equal(r.result.reason,'approval_stale');
 r=await publishCard(c,{workspaceId:'w',accountId:'u1',ledger,env,cap:{used:1,limit:1}});assert.equal(r.result.reason,'daily_cap');
 r=await publishCard(c,{workspaceId:'w',accountId:'u1',ledger,env});assert.equal(r.result.status,'published');assert.equal(r.result.submitted_id,'C1');assert.equal(r.result.published_id,'M2');assert.equal(r.card.publish_status,'published');
 r=await publishCard(c,{workspaceId:'w',accountId:'u1',ledger,env});assert.equal(r.result.reason,'duplicate');
 assert.ok(!calls.some(x=>x.includes('access_token=t')),'token never appears in the recorded URLs');
 let u=approve(setRoute(newCard({sourceId:'S',platform:'threads',content:'UNVERIFIABLE'}),'threads_direct'),{accountId:'u1'});
 r=await publishCard(u,{workspaceId:'w',accountId:'u1',ledger:new Set(),env});assert.equal(r.result.status,'unknown');assert.equal(r.card.publish_status,'unknown');
 const before=calls.length;const v=await verifyCard(r.card,{env});assert.equal(v.result.status,'unknown');assert.equal(calls.length,before+1,'verify makes exactly one GET, no POST');
 await assert.rejects(()=>verifyCard(c,{env}),/只有 unknown/);
});

import {validateAccounts,mapSocial} from '../lib/social-inspiration.mjs';
test('social accounts: handles normalised, platforms restricted, ≤10, rows land in the Inspiration tables',()=>{
 const a=validateAccounts([{platform:'instagram',handle:'@EKcheungAI'},{platform:'twitter',handle:'https://x.com/ekcheungAI/'},{platform:'instagram',handle:'ekcheungai'}]);
 assert.deepEqual(a.map(x=>x.id),['instagram:ekcheungai','twitter:ekcheungai']);
 assert.throws(()=>validateAccounts([{platform:'tiktok',handle:'x'}]),/只支援/);
 assert.throws(()=>validateAccounts(Array.from({length:11},(_,i)=>({platform:'twitter',handle:'u'+i}))),/最多/);
 const m=mapSocial({source:{source_id:'instagram:ek',platform:'instagram',account:'ek',profile_url:'https://www.instagram.com/ek/'},posts:[{post_id:'instagram:ABC',platform:'instagram',account:'ek',caption:'hi',post_url:'https://www.instagram.com/p/ABC/',published_at:null,image_url:null,media_type:'post',metrics:{like_count:3}}],fetched_at:'2026-09-16T00:00:00.000Z'},'ws');
 assert.equal(m.sources[0].metadata.inspiration_origin,'student-import');assert.equal(m.posts[0].metadata.inspiration_origin,'student-import');assert.equal(m.posts[0].like_count,3);assert.equal(m.posts[0].run_id,m.run.run_id);
});
