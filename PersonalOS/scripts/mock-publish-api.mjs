// Local stand-in for Threads Graph + Upload-Post so the whole publish flow can
// be rehearsed with no real token and no real post. Shapes follow the real
// APIs (Threads Graph v1.0; Upload-Post openapi.json 2026-09-16).
//   node scripts/mock-publish-api.mjs        # listens on 127.0.0.1:4802
//   THREADS_BASE=http://127.0.0.1:4802 UPLOAD_POST_BASE=http://127.0.0.1:4802 npm run dev
// Token tricks: NO_PUBLISH_SCOPE → 403 at container; EXPIRED → 401;
// text containing "UNVERIFIABLE" → publish accepted but verify never finds it (UNKNOWN).
import http from 'node:http';
const published=new Map();let n=0;
const J=(s,o,c=200)=>{s.writeHead(c,{'Content-Type':'application/json'});s.end(JSON.stringify(o));};
http.createServer(async(q,s)=>{
 const u=new URL(q.url,'http://x');let body='';for await(const c of q)body+=c;
 const ct=q.headers['content-type']||'';let p={};
 if(ct.startsWith('application/x-www-form-urlencoded'))p=Object.fromEntries(new URLSearchParams(body));
 else if(ct.startsWith('multipart/form-data')){const b=ct.split('boundary=')[1];for(const part of body.split('--'+b)){const m=part.match(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n$/);if(m)p[m[1]]=(p[m[1]]?p[m[1]]+',':'')+m[2];}}
 const tok=p.access_token||u.searchParams.get('access_token');
 // Threads
 if(u.pathname.endsWith('/threads')&&q.method==='POST'){if(tok==='NO_PUBLISH_SCOPE')return J(s,{error:{message:'Insufficient scope: threads_content_publish',code:10}},403);if(tok==='EXPIRED')return J(s,{error:{message:'Session has expired',code:190}},401);const id='CONTAINER_'+(++n);published.set('c:'+id,p.text||'');return J(s,{id});}
 if(u.pathname.endsWith('/threads_publish')&&q.method==='POST'){const id='MEDIA_'+(++n);const text=published.get('c:'+p.creation_id)||'';if(!/UNVERIFIABLE/.test(text))published.set(id,{permalink:'https://www.threads.net/@mock/post/'+id});return J(s,{id});}
 if(/\/v1\.0\/MEDIA_/.test(u.pathname)&&q.method==='GET'){const id=u.pathname.split('/').pop();return published.has(id)?J(s,{id,...published.get(id),timestamp:new Date().toISOString()}):J(s,{error:{message:'Unsupported get request. Object does not exist',code:100}},400);}
 if(u.pathname.endsWith('/me')&&q.method==='GET'){if(tok==='EXPIRED')return J(s,{error:{message:'Session has expired',code:190}},401);return J(s,{id:'2362669794238644',username:'mockuser'});}
 if(u.pathname.endsWith('/debug_token'))return J(s,{data:{scopes:tok==='NO_PUBLISH_SCOPE'?['threads_basic']:['threads_basic','threads_content_publish'],expires_at:Math.floor(Date.now()/1000)+59*86400}});
 // Upload-Post
 const apikey=(q.headers.authorization||'').startsWith('Apikey ');
 if(u.pathname==='/api/uploadposts/users')return apikey?J(s,{success:true,plan:'free',profiles:[{username:'demo',social_accounts:{threads:{handle:'mock_threads'},instagram:'',tiktok:{handle:'mock_tt'}}}]}):J(s,{error:'unauthorized'},401);
 if(u.pathname==='/api/upload_text'||u.pathname==='/api/upload_photos'){if(!apikey)return J(s,{error:'unauthorized'},401);const plats=String(p['platform[]']||'').split(',').filter(Boolean);if(plats.includes('instagram')&&!p['photos[]'])return J(s,{error:'instagram requires media'},400);const results=Object.fromEntries(plats.map(pl=>[pl,{success:true,post_id:pl.toUpperCase()+'_'+(++n),url:'https://'+pl+'.mock/p/'+n}]));return J(s,{success:true,results});}
 if(u.pathname==='/api/uploadposts/status')return J(s,{request_id:u.searchParams.get('request_id'),status:'completed',completed:1,total:1,results:[]});
 J(s,{error:'no route '+u.pathname},404);
}).listen(4802,'127.0.0.1',()=>console.log('mock publish api on http://127.0.0.1:4802'));
