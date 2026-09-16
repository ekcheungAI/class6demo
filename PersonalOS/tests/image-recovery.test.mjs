import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {imageBudget,pollImage} from '../lib/toapi-image.mjs';

// Execute the component's actual polling callback, with no provider/network calls.
const source=await fs.readFile(new URL('../components/creator-image-studio.tsx',import.meta.url),'utf8');
const body=source.match(/async function poll\(\)\{([\s\S]*?)\}void poll\(\);/)[1];
const submitBody=source.match(/async function generate\(\)\{([\s\S]*?)\}\n return/)[1];
test('submission retains request ID for uncertain responses and network errors, clears only confirmed uncreated requests',async()=>{
 for(const mode of ['network','unknown','not-created']){
  const stored=new Map();const state={task:'',status:'',loading:false};
  const context={target:'',drafts:[],content:'A sufficiently long fixture brief',template:null,brandMode:'snapshot',token:'fixture',text:'A sufficiently long fixture brief',task:'',direction:'',ratio:'1:1',sessionKey:'fixture',crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},sessionStorage:{setItem:(k,v)=>stored.set(k,v),getItem:k=>stored.get(k),removeItem:k=>stored.delete(k)},setTask:v=>state.task=v,setStatus:v=>state.status=v,setLoading:v=>state.loading=v,setProgress:()=>{},setError:()=>{},setBudget:()=>{},fetch:async()=>{if(mode==='network')throw Error('network');return {ok:false,json:async()=>({error:'fixture',requestState:mode})};},Error,JSON};
  await vm.runInNewContext('(async function generate(){'+submitBody+'})()',context);
  assert.equal(state.loading,false);
  assert.equal(stored.has('fixture'),mode!=='not-created');
  assert.equal(!!state.task,mode!=='not-created');
 }
});
async function poll(response){
 const state={task:'saved-task',status:'in_progress',progress:10,loading:true,session:true,timers:0,error:''};
 const context={live:true,task:'saved-task',token:'fixture',timer:null,fetch:async()=>{if(response instanceof Error)throw response;return {ok:response.ok,json:async()=>{if(response.invalidJson)throw Error('invalid JSON');return response.data;}};},sessionStorage:{removeItem:()=>state.session=false},sessionKey:'fixture',setTask:v=>state.task=v,setStatus:v=>state.status=v,setProgress:v=>state.progress=v,setLoading:v=>state.loading=v,setError:v=>state.error=v,history:async()=>{},window:{setTimeout:()=>++state.timers},Error,Number,encodeURIComponent};
 await vm.runInNewContext('(async function poll(){'+body+'})()',context);
 return state;
}
test('confirmed failure stops polling and clears active progress for HTTP 502 and 200',async()=>{
 for(const ok of [false,true]){const state=await poll({ok,data:{status:'failed',progress:10,error:'provider failed'}});assert.equal(state.task,'');assert.equal(state.session,false);assert.equal(state.progress,0);assert.equal(state.loading,false);assert.equal(state.status,'failed');assert.equal(state.timers,0);}
});
test('network, JSON and temporary HTTP failures preserve task and pause without spinning',async()=>{
 for(const response of [new Error('network'),{ok:false,data:{error:'temporarily unavailable'}},{ok:false,data:{error:'Storage upload incomplete'}},{ok:true,invalidJson:true}]){const state=await poll(response);assert.equal(state.task,'saved-task');assert.equal(state.session,true);assert.equal(state.status,'paused');assert.equal(state.progress,0);assert.equal(state.loading,false);assert.equal(state.timers,0);}
});
test('same task can resume to pending or completed',async()=>{
 const pending=await poll({ok:true,data:{status:'in_progress',progress:30}});assert.equal(pending.timers,1);assert.equal(pending.task,'saved-task');
 const completed=await poll({ok:true,data:{status:'completed',progress:100}});assert.equal(completed.task,'');assert.equal(completed.session,false);assert.equal(completed.loading,false);assert.equal(completed.timers,0);
});
test('saved terminal/provider-completed tasks never call provider again; budget uses lower cap',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'personalos-recovery-'));
 const previous=process.env.STUDENT_TOAPI_BUDGET_CREDITS;
 try{
  for(const status of ['failed','completed','provider-failed','provider-completed']){await fs.writeFile(path.join(dir,'image-task-task_fixture.json'),JSON.stringify({taskId:'task_fixture',status}));const task=await pollImage('task_fixture',{dir,key:'fixture',fetcher:()=>{throw Error('unexpected provider request');}});assert.equal(task.status,status);}
  await fs.writeFile(path.join(dir,'_toapi-budget.json'),JSON.stringify({limitCredits:20,spentCredits:3,uncertain:false,attempts:[]}));process.env.STUDENT_TOAPI_BUDGET_CREDITS='50';assert.deepEqual(await imageBudget({dir}),{limitCredits:20,spentCredits:3,remainingCredits:17,reservationCredits:20,uncertain:false});
  process.env.STUDENT_TOAPI_BUDGET_CREDITS='10';assert.equal((await imageBudget({dir})).limitCredits,10);
 }finally{if(previous===undefined)delete process.env.STUDENT_TOAPI_BUDGET_CREDITS;else process.env.STUDENT_TOAPI_BUDGET_CREDITS=previous;await fs.rm(dir,{recursive:true,force:true});}
});
