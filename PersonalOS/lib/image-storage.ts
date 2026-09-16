import {createClient} from '@supabase/supabase-js';
import {connectionConfig} from './read-only.mjs';
import {ContentError} from './content-engine.mjs';
export function imageStorage(auth:string){const c=connectionConfig();return createClient(c.url,c.key,{global:{headers:{Authorization:'Bearer '+auth}},auth:{persistSession:false,autoRefreshToken:false}}).storage.from('media-images');}
export async function imagePreview(auth:string,path:string,workspace:string){if(!path.startsWith(workspace+'/'))throw new ContentError('圖片不屬於目前workspace',403);const {data,error}=await imageStorage(auth).createSignedUrl(path,3600);if(error)throw new ContentError('圖片預覽未能讀取',502);return data!.signedUrl;}
