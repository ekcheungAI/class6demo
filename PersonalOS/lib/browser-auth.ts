import {createClient,type SupabaseClient,type SupportedStorage} from '@supabase/supabase-js';
const clients=new Map<string,SupabaseClient>();
export function createPersistentAuth(url:string,key:string,testOptions?:{storage:SupportedStorage;fetcher:typeof fetch}){
 return createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'heyommi-student-auth-'+new URL(url).hostname,...(testOptions?{storage:testOptions.storage}:{})},...(testOptions?{global:{fetch:testOptions.fetcher}}:{})});
}
export function browserAuth(url:string,key:string){
 const id=url+'|'+key;let client=clients.get(id);
 if(!client){client=createPersistentAuth(url,key);clients.set(id,client);}
 return client;
}
