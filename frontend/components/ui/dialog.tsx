'use client';
import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
export const Dialog=D.Root;
export const DialogTrigger=D.Trigger;
export function DialogContent({title,children}:{title:string;children:React.ReactNode}){return <D.Portal><D.Overlay className="dialog-overlay"/><D.Content className="dialog-content"><div className="dialog-heading"><D.Title>{title}</D.Title><D.Close aria-label="Close source"><X size={20}/></D.Close></div><D.Description className="sr-only">Verified supporting policy section from Meridian Ledger.</D.Description>{children}</D.Content></D.Portal>;}
