import {NextResponse} from 'next/server';
import {cloudRuntime} from '@/lib/cloud-runtime.mjs';
import {loadBrand} from '@/lib/brand-context.mjs';
import {brandSummary} from '@/lib/brand-summary.mjs';
import {readFile} from 'node:fs/promises';
import {runtimeBrain,validateBrainProfile} from '@/lib/ommi-brain.mjs';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
export const dynamic='force-dynamic';
async function snapshot(runtime:any){const saved=await runtime.brand();if(saved)return saved;if(process.env.VERCEL)throw new ContentError('請先從本機匯入品牌摘要');return loadBrand();}
export async function GET(request:Request){try{assertLocalRequest(request);const runtime=await cloudRuntime(token(request));return NextResponse.json(runtimeBrain(await snapshot(runtime),await runtime.client.ommiBrain(runtime.workspace)),{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'品牌讀取未完成'},{status:400});}}
export async function PUT(request:Request){try{assertLocalRequest(request);const runtime=await cloudRuntime(token(request));let brand=await snapshot(runtime);if(brand.status==='unconfigured')throw new ContentError('請先連接自己的Vault');const profile=validateBrainProfile((await request.json()).profile);if(!await runtime.brand()){const skill=await readFile('.agents/skills/my-branding-skill/SKILL.md','utf8');brand=await runtime.saveBrand(brandSummary(brand,skill),'');}const saved=await runtime.client.saveOmmiBrain({profile,vaultRevision:brand.revision});return NextResponse.json(runtimeBrain(brand,saved),{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'品牌未保存'},{status:400});}}
