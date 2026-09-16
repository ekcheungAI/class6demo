import test from 'node:test';import assert from 'node:assert/strict';
import {createPersistentAuth} from '../lib/browser-auth.ts';
test('SDK session restores across clients, isolates projects, and local signout clears saved session',async()=>{
 const data=new Map();const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:'fixture-user',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
 const fake=async(url)=>String(url).includes('/logout')?new Response(null,{status:204}):Response.json({access_token:token,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user:{id:'fixture-user'}});
 const opts={storage,fetcher:fake};const a=createPersistentAuth('https://aaaaaaaaaaaaaaaaaaaa.supabase.co','test',opts);await a.auth.stopAutoRefresh();
 assert.equal((await a.auth.signInWithPassword({email:'fixture@example.test',password:'fixture-only'})).error,null);
 assert.ok(data.size>0);
 const b=createPersistentAuth('https://aaaaaaaaaaaaaaaaaaaa.supabase.co','test',opts);await b.auth.stopAutoRefresh();
 assert.equal((await b.auth.getSession()).data.session?.user.id,'fixture-user');
 const other=createPersistentAuth('https://bbbbbbbbbbbbbbbbbbbb.supabase.co','test',opts);await other.auth.stopAutoRefresh();assert.equal((await other.auth.getSession()).data.session,null);
 assert.equal((await b.auth.signOut({scope:'local'})).error,null);
 assert.equal((await b.auth.getSession()).data.session,null);assert.ok(![...data.values()].some(v=>v.includes('fixture-refresh')));
});
