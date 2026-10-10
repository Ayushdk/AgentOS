const configuredApi=process.env.NEXT_PUBLIC_API_URL||'http://localhost:8000';

function apiBase(){
 if(typeof window==='undefined')return configuredApi;
 const configured=new URL(configuredApi);
 const pageHost=window.location.hostname;
 const loopback=new Set(['localhost','127.0.0.1']);
 if(loopback.has(configured.hostname)&&loopback.has(pageHost))configured.hostname=pageHost;
 return configured.origin;
}
let bearer:string|null=null;
export function setBearer(token:string|null){bearer=token;}
export async function api<T=any>(path:string,body?:unknown):Promise<T>{
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),95000);
 try {const response=await fetch(apiBase()+path,{method:body===undefined?'GET':'POST',credentials:'include',headers:{'Content-Type':'application/json','X-AgentOS-Request':'1',...(bearer?{Authorization:'Bearer '+bearer}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
 const data=await response.json();if(!response.ok)throw new Error(data.error?.message||data.detail?.[0]?.msg||'The request could not be completed.');return data;
 }catch(e){if(e instanceof Error&&e.name==='AbortError')throw new Error('The server is taking longer than expected. Refresh history before retrying; your workflow is saved.');throw e;}finally{clearTimeout(timer);}
}
export type Identity={tenant_id:string;employee_id:string;role:'employee'|'manager'|'hr';name:string;demo?:boolean};
export type Citation={id:string;document_id:string;title:string;version:string;effective_date:string;section_id:string;heading:string;excerpt:string};
export type Run={id:string;question:string;status:string;mode:string;specialist:string;result:any;created_at:string;latency_ms:number;model_calls:number};
export type Leave={id:string;start_date:string;end_date:string;leave_type:string;days:number;status:string;employee_id:string;employee_name?:string};
export type Report={rows:Record<string,string|number>[];chart:{type:'bar';x:string;y:string;unit:string};report:string;period:{start:string;end:string};definition:string;total:number;query:string};
export type HolidayItem={date:string;title:string};
export type CalendarEventItem={id:string;title:string;starts_at:string;ends_at:string};
export type CalendarData={holidays:HolidayItem[];leaves:Leave[];events:CalendarEventItem[];team_leaves:(Leave&{employee_name?:string})[]};
export type PolicySummary={id:string;title:string;version:string;effective_date:string;expires_on:string|null;audience:string;sections_count:number};
export type PolicySection={id:string;section_id:string;heading:string;text:string;claim_key:string|null;claim_value:string|null};
export type PolicyDetail={id:string;title:string;version:string;effective_date:string;expires_on:string|null;audience:string;sections:PolicySection[]};
export type TeamMember={id:string;name:string;department:string;role:string;joined_on:string;exited_on:string|null;status:'Active'|'Exited'};
