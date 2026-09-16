import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {readEnvFiles,envProfile} from './env-state.mjs';
const root=path.resolve(import.meta.dirname,'..');
const source=process.argv[2];if(!source)throw Error('Provide the teacher env file path. No values are logged.');
const input=parseEnv(fs.readFileSync(source,'utf8'));if(input.TOAPIS_API_KEY&&!input.TOAPI_API_KEY)input.TOAPI_API_KEY=input.TOAPIS_API_KEY;
const allowed=['TOAPI_API_KEY','MINIMAX_API_KEY','TIKHUB_API_KEY','TAVILY_API_KEY','FIRECRAWL_API_KEY'];
const files=readEnvFiles(root);const existing=envProfile(files,'development',allowed,process.env).env;
const conflicts=allowed.filter(k=>input[k]&&existing[k]&&input[k]!==existing[k]);
if(conflicts.length){console.log('CONFLICT variable names only:',conflicts.join(', '));process.exitCode=2;}
else {const file=path.join(root,'.env.local');let text=fs.existsSync(file)?fs.readFileSync(file,'utf8'):fs.readFileSync(path.join(root,'.env.example'),'utf8');
 for(const k of allowed){if(existing[k]||!input[k])continue;const value=input[k];if(/[\r\n']/.test(value))throw Error('Unsupported env value encoding; values withheld');const line=k+"='"+value+"'";const pattern=new RegExp('^'+k+'=.*$','m');text=pattern.test(text)?text.replace(pattern,()=>line):text+'\n'+line;}
 fs.writeFileSync(file,text+'\n',{mode:0o600});console.log('Provider settings merged; existing values preserved. Configure own Supabase via authorized connector.');}
