// npm run check:keys — 課前 Key 檢查嘅命令行版。同 Connections 頁個面板跑同一個函數。
// 讀本機 env 檔（development profile，process.env 優先），逐條 key 做免費 read-only 呼叫。
// 印出嘅只有名同結論；值永遠唔印。有 ✗ 或者「－」就 exit 1。
import fs from 'node:fs';import path from 'node:path';import {parseEnv} from 'node:util';
import {readEnvFiles,envProfile} from './env-state.mjs';import {checkKeys,formatReport} from '../lib/key-check.mjs';
const root=path.resolve(import.meta.dirname,'..'),files=readEnvFiles(root);
const keys=[...new Set([...Object.keys(parseEnv(fs.readFileSync(path.join(root,'.env.example'),'utf8'))),...Object.values(files).flatMap(Object.keys),'TOPAPIS_API_KEY','NEXT_PUBLIC_SUPABASE_ANON_KEY','AUTOPILOT_EMAIL','AUTOPILOT_PASSWORD'])];
const {env,conflicts}=envProfile(files,'development',keys,process.env);
for(const {key,files:where} of conflicts)console.log('CONFLICT '+key+' in '+where.join(', ')+'; review deliberately');
const track=(process.argv.find(a=>a.startsWith('--track='))||'').slice(8)||undefined;
const report=await checkKeys(env,{track});console.log(formatReport(report));process.exitCode=report.readyForClass?0:1;
