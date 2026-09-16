import {brandAsset} from '@/lib/brand-context.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{const bytes=await brandAsset(new URL(request.url).searchParams.get('id'));return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 catch{return new Response('Asset unavailable',{status:404});}
}
