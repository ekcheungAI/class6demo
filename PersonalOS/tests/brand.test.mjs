import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadBrand,containedFile} from '../lib/brand-context.mjs';
test('brand readback follows canonical edits and changes revision without copying truth',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'brand-check-'));
 try{
 await mkdir(path.join(root,'brand'));await mkdir(path.join(root,'vault'));
 for(const key of ['company','voice','look'])await writeFile(path.join(root,'vault',key+'.md'),key+' v1');
 await writeFile(path.join(root,'brand','context.json'),JSON.stringify({owner:'Test',vaultRoot:'../vault',canonical:{company:'company.md',voice:'voice.md',look:'look.md'},assetManifest:'manifest.json'}));
 await writeFile(path.join(root,'brand','manifest.json'),'{"assets":[]}');
 const first=await loadBrand(root,'');await writeFile(path.join(root,'vault','voice.md'),'voice v2');const next=await loadBrand(root,'');
 assert.equal(next.documents.voice.text,'voice v2');assert.notEqual(first.revision,next.revision);
 await assert.rejects(containedFile(path.join(root,'brand'),'../vault/voice.md'));
 }finally{await rm(root,{recursive:true,force:true});}
});
