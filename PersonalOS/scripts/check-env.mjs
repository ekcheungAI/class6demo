import fs from 'node:fs';import path from 'node:path';import {parseEnv} from 'node:util';import {connectionConfig} from '../lib/read-only.mjs';import {readEnvFiles,envProfile} from './env-state.mjs';
const root=path.resolve(import.meta.dirname,'..'),files=readEnvFiles(root);const keys=[...new Set([...Object.keys(parseEnv(fs.readFileSync(path.join(root,'.env.example'),'utf8'))),...Object.values(files).flatMap(Object.keys)])];let good=true;
for(const mode of ['development','production']){console.log('PROFILE '+mode);const {env,sources,conflicts}=envProfile(files,mode,keys,process.env);
for(const {key,files:where} of conflicts){good=false;console.log('CONFLICT '+key+' in '+where.join(', ')+'; review deliberately, no automatic overwrite');}
try{connectionConfig(env);console.log('PASS Supabase URL/key format');}catch{good=false;console.log('CHECK Supabase URL/publishable key');}
const present=!!env.TOAPI_API_KEY&&!/YOUR_|PASTE|填入/.test(env.TOAPI_API_KEY);console.log((present?'PRESENT ':'MISSING ')+'TOAPI_API_KEY'+(sources.TOAPI_API_KEY?' from '+sources.TOAPI_API_KEY:''));if(!present)good=false;
if(env.MINIMAX_API_KEY)console.log('OPTIONAL MINIMAX_API_KEY (not used by current text runtime)');
const cap=Number(env.STUDENT_TOAPI_BUDGET_CREDITS);if(cap>0&&cap<=100)console.log('PASS budget cap format');else{good=false;console.log('CHECK teacher-approved budget cap (max 100)');}
if(Object.keys(env).some(k=>k.startsWith('NEXT_PUBLIC_')&&/TOAPI|TIKHUB|SECRET|TOKEN/.test(k))){good=false;console.log('FAIL private provider key uses NEXT_PUBLIC_');}
if(Object.values(env).some(v=>typeof v==='string'&&/\$\{?[A-Za-z_]/.test(v))){good=false;console.log('REVIEW env variable expansion; this checker does not evaluate interpolated values');}}
console.log('Values redacted. Presence/format only, not proof of key validity. No network or paid calls.');process.exitCode=good?0:1;
