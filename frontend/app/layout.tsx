import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'AgentOS · Meridian Ledger',description:'Independent portfolio demonstration of evidence-backed employee support. All people, policies, HR and calendar data are synthetic.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
