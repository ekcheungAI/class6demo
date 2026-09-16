import {NextResponse} from 'next/server';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {rootDir} from '@/lib/content-engine.mjs';
import config from '@/config/inspiration-demo.json';
import {feedClient} from '@/lib/feed-supabase.mjs';
import {assertLocalRequest,ContentError} from '@/lib/content-engine.mjs';
import {token} from '@/lib/api';
export const dynamic='force-dynamic';
const fail=(e:unknown)=>NextResponse.json({error:e instanceof ContentError?e.message:'未能保存／讀取來源清單'},{status:e instanceof ContentError?e.status:503});
export async function GET(request:Request){try{assertLocalRequest(request);const c=feedClient(token(request));const id=await c.workspace();const [sources,posts]=await Promise.all([c.inspirationSources(id),c.inspirationPosts(id)]);const hub=new URL(request.url).searchParams.get('hub')==='1';const [runs,news]=hub?await Promise.all([c.inspirationRuns(id),c.read(id,'rss')]):[[],null];return NextResponse.json({...sources,posts,...(hub?{runs,newsCount:news?.items.length||0}:{})},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(){return NextResponse.json({error:'學生版從Connections匯入自己的Sheet資料，不使用老師demo批次'},{status:400});}
