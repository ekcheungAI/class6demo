import fs from 'node:fs';import path from 'node:path';import {parseEnv} from 'node:util';import {readEnvFiles} from './env-state.mjs';
const root=path.resolve(import.meta.dirname,'..'),destination=path.join(root,'.env.local');
const files=readEnvFiles(root),template=fs.readFileSync(path.join(root,'.env.example'),'utf8');
if(fs.existsSync(destination))console.log('Existing .env.local preserved byte-for-byte; only fill genuinely missing values after review.');
else{const content=template.split(/\r?\n/).filter(line=>{const m=line.match(/^([A-Z_][A-Z0-9_]*)=/);if(!m)return true;return !Object.values(files).some(e=>Object.hasOwn(e,m[1]))&&!Object.hasOwn(process.env,m[1]);}).join('\n');fs.writeFileSync(destination,content,{flag:'wx',mode:0o600});console.log('Created .env.local with missing fields only; existing env definitions were not duplicated or shadowed.');}
for(const key of Object.keys(parseEnv(template))){const found=Object.entries(files).filter(([,v])=>Object.hasOwn(v,key)).map(([n])=>n);if(Object.hasOwn(process.env,key))found.unshift('process environment');console.log(key+': '+(found.length?'already defined in '+found.join(', '):'review missing field in .env.local'));}
console.log('No existing file was overwritten. No values shown. Run npm run check:env before editing.');
