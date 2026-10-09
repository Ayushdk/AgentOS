import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {setBearer} from './api';
let client:SupabaseClient|null=null;
export function supabase(){
 if(!client){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error('Supabase authentication is not configured.');
  client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}});
  client.auth.onAuthStateChange((_event,session)=>setBearer(session?.access_token??null));
 }
 return client;
}
