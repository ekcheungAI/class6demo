// Codex creates a normalized review file; this script generates SQL, never executes it.
import fs from 'node:fs';import path from 'node:path';import {mapStudentImport} from '../lib/student-import.mjs';
const [input,workspace,owner,output]=process.argv.slice(2);const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!input||!uuid.test(workspace||'')||!uuid.test(owner||'')||!output)throw Error('Usage: node scripts/prepare-import.mjs input.json workspace-uuid owner-uuid output.sql');
const destination=path.join(fs.realpathSync(path.dirname(path.resolve(output))),path.basename(output)),privateRoot=fs.realpathSync('.student-data')+path.sep;if(!destination.startsWith(privateRoot))throw Error('Output SQL contains private data; put it under .student-data/');
const mapped=mapStudentImport(JSON.parse(fs.readFileSync(input,'utf8')),workspace);const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
function block(body){let tag='$student_guard$';while(body.includes(tag))tag=tag.slice(0,-1)+'_$';return 'DO '+tag+' '+body+' '+tag+';\n';}
let sql=`-- Review-only generated import. Confirm target project and mapping before execution.\nBEGIN;\nSET LOCAL standard_conforming_strings = on;\nDO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.workspaces WHERE id='${workspace}'::uuid AND owner_id='${owner}'::uuid) THEN RAISE EXCEPTION 'Workspace owner mismatch'; END IF; END $$;\n`;
for(const [table,rows]of Object.entries(mapped)){
 if(!rows.length)continue;const key={sources:'source_id',runs:'run_id',posts:'post_id',media:'media_id'}[table];const cols=Object.keys(rows[0]);const typecols=cols.map(c=>'"'+c+'"').join(',');
 // Compare typed columns (timestamps/numbers included), excluding metadata to preserve manual metadata.
 const comparisons=cols.filter(c=>!['metadata','workspace_id',key].includes(c)).map(c=>`a."${c}" IS DISTINCT FROM b."${c}"`).join(' OR ');
 const dataset=`jsonb_populate_recordset(NULL::public."${table}", ${quote(JSON.stringify(rows))}::jsonb)`;
 sql+=block(`BEGIN IF EXISTS(SELECT 1 FROM public."${table}" a JOIN ${dataset} b ON a.workspace_id=b.workspace_id AND a."${key}"=b."${key}" WHERE ${comparisons||'false'}) THEN RAISE EXCEPTION 'Conflicting existing ${table}; inspect mapping, do not overwrite'; END IF; END;`);
 sql+=`INSERT INTO public."${table}" (${typecols}) SELECT ${typecols} FROM ${dataset} ON CONFLICT(workspace_id,"${key}") DO NOTHING;\n`;
 sql+=block(`BEGIN IF (SELECT count(*) FROM public."${table}" WHERE workspace_id='${workspace}' AND "${key}" IN (${rows.map(r=>quote(r[key])).join(',')})) <> ${rows.length} THEN RAISE EXCEPTION '${table} count verification failed'; END IF; END;`);
}
sql+='COMMIT;\n';fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,sql,{mode:0o600});console.log(JSON.stringify({reviewFile:destination,counts:Object.fromEntries(Object.entries(mapped).map(([k,v])=>[k,v.length])),executed:false}));
