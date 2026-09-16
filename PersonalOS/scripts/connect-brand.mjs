import fs from 'node:fs/promises';import path from 'node:path';
const vault=await fs.realpath(process.argv[2]||'');const project=path.resolve(import.meta.dirname,'..');
await fs.access(path.join(vault,'AGENTS.md'));const index=await fs.readFile(path.join(vault,'INDEX.md'),'utf8');
let paths={company:'10-公司與品牌/01-公司定位.md',voice:'11-內容與平台/00-共通品牌/TONE.md',look:'11-內容與平台/00-共通品牌/DESIGN.md'};
if(process.argv[3])paths=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
 const missing=[];for(const [key,rel]of Object.entries(paths)){try{await fs.access(path.join(vault,rel));}catch{missing.push(key);}}
 if(missing.length){const candidates=[];for(const rel of ['INDEX.md','10-公司與品牌/INDEX.md','11-內容與平台/INDEX.md']){try{const text=await fs.readFile(path.join(vault,rel),'utf8');for(const match of text.matchAll(/\\[[^\\]]+\\]\\(([^)]+\\.md)\\)/g))candidates.push({index:rel,path:match[1]});}catch{}}
 console.log(JSON.stringify({needsMapping:missing,indexCandidates:candidates,message:'請Codex沿索引選擇company/voice/look來源，核對後傳入mapping.json作第三參數；不用移動Vault檔案。'}));process.exit(2);}
 const texts={};for(const [key,rel]of Object.entries(paths)){const f=await fs.realpath(path.join(vault,rel));if(!f.startsWith(vault+path.sep))throw Error('Brand source outside Vault');texts[key]=await fs.readFile(f,'utf8');}
const dest=path.join(project,'.student-data/brand');await fs.mkdir(dest,{recursive:true});for(const [key,text]of Object.entries(texts))await fs.writeFile(path.join(dest,key+'.md'),text,{mode:0o600});
const c=JSON.parse(await fs.readFile(path.join(project,'brand/context.json')));c.owner=index.match(/^company_name:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g,'')||'My Brand';c.status='student-source-needs-review';c.vaultRoot='../.student-data/brand';c.canonical={company:'company.md',voice:'voice.md',look:'look.md'};
await fs.writeFile(path.join(dest,'provenance.json'),JSON.stringify({vault,paths,createdAt:new Date().toISOString(),type:'local-runtime-snapshot-not-canonical'},null,2));await fs.writeFile(path.join(project,'brand/context.json'),JSON.stringify(c,null,2)+'\n');console.log('Brand snapshot ready. Review Ommi Brain before generation. Source Vault unchanged.');
