import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export async function containedFile(root,relative){
  if(typeof relative!=='string'||path.isAbsolute(relative))throw new Error('Invalid brand path');
  const base=await realpath(root), file=await realpath(path.resolve(base,relative));
  if(!file.startsWith(base+path.sep))throw new Error('Brand path outside configured root');
  return file;
}
export async function loadBrand(project=process.cwd(),vaultOverride=undefined){
  const brand=path.join(project,'brand');
  const context=JSON.parse(await readFile(path.join(brand,'context.json'),'utf8'));
  const vault=vaultOverride||path.resolve(brand,context.vaultRoot);
  const documents={};
  for(const name of ['company','voice','look']){
    const source=context.canonical[name];
    documents[name]={source,text:await readFile(await containedFile(vault,source),'utf8')};
  }
  const manifest=JSON.parse(await readFile(await containedFile(brand,context.assetManifest),'utf8'));
  const samples=[];
  for(const sample of context.writingSamples||[])samples.push({...sample,text:await readFile(await containedFile(vault,sample.path),'utf8')});
  const revision=createHash('sha256').update(JSON.stringify({context,documents,manifest,samples})).digest('hex').slice(0,12);
  return {owner:context.owner,status:context.status,outputPlatforms:context.outputPlatforms||["Threads","Newsletter"],revision,documents,samples,assets:manifest.assets,missing:context.missing,websites:context.websites};
}
export async function brandAsset(id,project=process.cwd()){
 const root=path.join(project,'brand');
 const context=JSON.parse(await readFile(path.join(root,'context.json'),'utf8'));
 const manifest=JSON.parse(await readFile(await containedFile(root,context.assetManifest),'utf8'));
 const asset=manifest.assets.find(a=>a.id===id);
 if(!asset||!asset.path.endsWith('.png'))throw new Error('Unknown asset');
 return readFile(await containedFile(root,asset.path));
}
