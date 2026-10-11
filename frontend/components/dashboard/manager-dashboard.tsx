"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Calendar, Check, Clock, RefreshCw, Send, ShieldCheck, Sparkles, UserCheck, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type CalendarData, type Identity, type Leave, type TeamMember } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";

type LoadState="loading"|"loaded"|"error";
interface ManagerDashboardProps{
 person:Identity;queue:Leave[];queueState:"idle"|"loading"|"loaded"|"error";
 onRetryQueue:()=>Promise<void>;onReview:(id:string,decision:"approved"|"rejected")=>Promise<void>;
 onNavigate:(view:any)=>void;onSendPrompt:(text:string)=>void;busy:boolean;
}
const isoLocal=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const isAway=(leave:Leave,date:string)=>leave.status==="approved"&&leave.start_date<=date&&leave.end_date>=date;

export function ManagerDashboard({person,queue,queueState,onRetryQueue,onReview,onNavigate,onSendPrompt,busy}:ManagerDashboardProps){
 const [promptText,setPromptText]=useState("");
 const [actionLoadingId,setActionLoadingId]=useState<string|null>(null);
 const [team,setTeam]=useState<TeamMember[]>([]);
 const [calendar,setCalendar]=useState<CalendarData|null>(null);
 const [contextState,setContextState]=useState<LoadState>("loading");
 const [contextError,setContextError]=useState("");
 const loadContext=useCallback(async()=>{
  setContextState("loading");setContextError("");
  const [teamResult,calendarResult]=await Promise.allSettled([api<TeamMember[]>("/manager/team"),api<CalendarData>("/calendar")]);
  if(teamResult.status==="fulfilled")setTeam(teamResult.value);
  if(calendarResult.status==="fulfilled")setCalendar(calendarResult.value);
  if(teamResult.status==="rejected"||calendarResult.status==="rejected"){
   const failure=teamResult.status==="rejected"?teamResult.reason:calendarResult.status==="rejected"?calendarResult.reason:null;
   setContextError(failure instanceof Error?failure.message:"Manager data could not be loaded.");setContextState("error");return;
  }
  setContextState("loaded");
 },[]);
 useEffect(()=>{loadContext();},[loadContext]);
 const activeTeam=team.filter(m=>m.status==="Active");
 const today=isoLocal(new Date());
 const awayToday=activeTeam.filter(m=>(calendar?.team_leaves||[]).some(l=>l.employee_id===m.id&&isAway(l,today)));
 const coverage=useMemo(()=>{
  const rows:{key:string;date:string;day:string;holiday:{date:string;title:string}|undefined;away:TeamMember[]}[]=[];let offset=0;
  while(rows.length<5&&offset<14){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset++);if(d.getDay()===0||d.getDay()===6)continue;const key=isoLocal(d);const holiday=calendar?.holidays.find(h=>h.date===key);const away=activeTeam.filter(m=>(calendar?.team_leaves||[]).some(l=>l.employee_id===m.id&&isAway(l,key)));rows.push({key,date:d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}),day:d.toLocaleDateString("en-IN",{weekday:"short"}),holiday,away});}
  return rows;
 },[activeTeam,calendar]);
 const overlaps=coverage.filter(row=>row.away.length>1).length;
 const firstName=person.name.split(" ")[0]||"Manager";
 const departments=[...new Set(team.map(m=>m.department).filter(Boolean))];
 const handleAction=async(id:string,decision:"approved"|"rejected")=>{setActionLoadingId(id);try{await onReview(id,decision);}finally{setActionLoadingId(null);}};
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(promptText.trim()){onSendPrompt(promptText.trim());setPromptText("");}};
 const queueUnavailable=queueState==="error";
 return <div className="dashboard-container manager-workspace">
  <div className="dashboard-header"><div><span className="team-badge"><ShieldCheck size={15}/>Manager workspace</span><h1 className="dashboard-title">Good morning, {firstName}</h1><p className="dashboard-subtitle">Review decisions, team availability, and coverage from live authorized records.</p></div><div className="user-profile-badge"><div className="avatar avatar-purple">{person.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div><div className="user-badge-meta"><strong className="user-badge-name">{person.name}</strong><span className="user-badge-role">Manager · {person.employee_id}</span></div></div></div>
  {contextState==="error"&&<div className="banner error" role="alert"><AlertCircle size={16}/><span>{contextError}</span><Button variant="ghost" size="sm" onClick={loadContext}><RefreshCw size={14}/> Retry team data</Button></div>}
  <div className="stats-trio-grid">
   <div className="stat-card"><div className="stat-card-header"><span className="stat-label">Approval inbox</span><div className="stat-icon-wrapper icon-amber"><Clock size={18}/></div></div><div className="stat-value-group"><span className="stat-number">{queueState==="loading"?"—":queue.length}</span><span className="stat-subtext">pending requests</span></div><div className="stat-tag-row"><span className={`badge ${queueUnavailable?"badge-danger":queue.length?"badge-warning":"badge-success"}`}>{queueUnavailable?"Unavailable":queue.length?"Action required":"Up to date"}</span></div></div>
   <div className="stat-card"><div className="stat-card-header"><span className="stat-label">Direct reports</span><div className="stat-icon-wrapper icon-blue"><Users size={18}/></div></div><div className="stat-value-group"><span className="stat-number">{contextState==="loading"?"—":activeTeam.length}</span><span className="stat-subtext">active employees</span></div><div className="stat-tag-row"><span className="badge badge-blue-subtle">{departments.length?departments.join(", "):"Live directory"}</span></div></div>
   <div className="stat-card"><div className="stat-card-header"><span className="stat-label">Available today</span><div className="stat-icon-wrapper icon-emerald"><UserCheck size={18}/></div></div><div className="stat-value-group"><span className="stat-number">{contextState==="loading"?"—":Math.max(0,activeTeam.length-awayToday.length)}</span><span className="stat-subtext">of {activeTeam.length} active</span></div><div className="stat-tag-row"><span className={`badge ${overlaps?"badge-warning":"badge-neutral"}`}>{overlaps?`${overlaps} upcoming overlap${overlaps===1?"":"s"}`:"No multi-person overlaps"}</span></div></div>
  </div>
  <div className="dashboard-content-split"><div className="dashboard-main-col">
   <div className="content-card"><div className="card-header-row"><div><h2 className="card-title">Approval inbox</h2><p className="card-subtitle">Requests from verified direct reports, with dates and reserved working days.</p></div>{queueState==="loaded"&&<span className="badge badge-warning">{queue.length} pending</span>}</div>
    {queueState==="loading"?<div className="empty-inbox-state"><RefreshCw className="spin"/><h3>Loading approvals</h3><p>Checking the current manager queue.</p></div>:queueUnavailable?<div className="empty-inbox-state" role="alert"><AlertCircle size={28}/><h3>Approval inbox unavailable</h3><p>The queue could not be loaded. No empty-state assumption was made.</p><Button variant="outline" onClick={()=>onRetryQueue()}>Retry approvals</Button></div>:queue.length?<div className="approval-cards-list">{queue.map(req=><div key={req.id} className="approval-inbox-card review-card"><div className="approval-card-left"><div className="avatar avatar-indigo">{(req.employee_name||req.employee_id).split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div><div className="approval-details"><div className="approval-title-row"><h3 className="approval-emp-name">{req.employee_name||req.employee_id}</h3><span className="leave-type-pill">{req.leave_type} leave</span></div><p className="approval-dates"><Calendar size={13}/>{formatShortDate(req.start_date)} — {formatShortDate(req.end_date)} · <strong>{req.days} working {req.days===1?"day":"days"}</strong></p><span className="approval-meta text-muted">Request {req.id.slice(0,8)}</span></div></div><div className="approval-actions review-actions"><Button size="sm" variant="outline" className="btn-reject" disabled={busy||actionLoadingId===req.id} onClick={()=>handleAction(req.id,"rejected")}><X size={14}/>Reject</Button><Button size="sm" className="btn-approve" disabled={busy||actionLoadingId===req.id} onClick={()=>handleAction(req.id,"approved")}><Check size={14}/>Approve</Button></div></div>)}</div>:<div className="empty-inbox-state"><div className="empty-icon-circle icon-emerald"><ShieldCheck size={28}/></div><h3>Approval inbox is clear</h3><p>No pending direct-report leave requests require a decision.</p></div>}
   </div>
   <div className="content-card ai-assistant-banner-card"><div className="ai-card-badge"><Sparkles size={16}/>AI manager assistant</div><h2 className="ai-card-title">Ask about your team</h2><p className="ai-card-desc">Review leave overlap, approval rules, or team schedules using your authorized scope.</p><form onSubmit={submit} className="ai-composer-wrapper"><input className="ai-composer-input" placeholder="Ask about coverage, approvals, or schedules…" value={promptText} onChange={e=>setPromptText(e.target.value)} disabled={busy}/><Button type="submit" size="icon" className="ai-composer-submit" disabled={busy||!promptText.trim()} aria-label="Send question"><Send size={15}/></Button></form></div>
  </div><div className="dashboard-side-col">
   <div className="content-card"><div className="card-header-simple"><h3 className="card-heading-sm"><Calendar size={16} className="text-blue"/>Five-day team coverage</h3><button type="button" className="btn-link-sm" onClick={()=>onNavigate("calendar")}>Calendar</button></div>{contextState==="loading"?<p className="text-muted">Loading team calendar…</p>:calendar?<div className="availability-timeline-list">{coverage.map(row=><div key={row.key} className="timeline-day-row"><div className="timeline-date-badge"><strong>{row.date}</strong><span>{row.day}</span></div><div className="timeline-status-info"><span className={`status-dot dot-${row.holiday?"holiday":row.away.length?"away":"all-in"}`}/><span className="timeline-label">{row.holiday?.title||(row.away.length?`${row.away.length} away: ${row.away.map(m=>m.name).join(", ")}`:"All active reports available")}</span></div></div>)}</div>:<p className="text-muted">Calendar data is unavailable.</p>}</div>
   <div className="content-card"><div className="card-header-simple"><h3 className="card-heading-sm"><Users size={16} className="text-purple"/>Direct reports ({team.length})</h3><button type="button" className="btn-link-sm" onClick={()=>onNavigate("team")}>Directory</button></div>{contextState==="loading"?<p className="text-muted">Loading directory…</p>:team.length?<div className="team-roster-list">{team.slice(0,6).map(m=><div key={m.id} className="team-roster-item"><div className="avatar avatar-sm avatar-neutral">{m.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div><div className="team-roster-meta"><strong>{m.name}</strong><span>{m.role} · {m.department}</span></div><span className={`badge badge-sm ${m.status==="Active"?"badge-success":"badge-neutral"}`}>{m.status}</span></div>)}</div>:contextState==="loaded"?<p className="text-muted">No direct reports are assigned.</p>:null}<button type="button" className="btn-link" onClick={()=>onNavigate("team")}>Open team directory <ArrowRight size={13}/></button></div>
  </div></div>
 </div>;
}
