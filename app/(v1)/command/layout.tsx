'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  Settings, 
  ShieldAlert,
  Search,
  LogOut
} from 'lucide-react';

export default function V1AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // We will dynamically render these based on actual user role later
  const navItems = [
    { label: 'Workspace', icon: LayoutDashboard, href: '/workspace' },
    { label: 'Directory', icon: Users, href: '/directory' },
    { label: 'Knowledge Base', icon: BookOpen, href: '/knowledge' },
    { label: 'Events', icon: Calendar, href: '/events' },
  ];

  const adminItems = [
    { label: 'Domain Command', icon: ShieldAlert, href: '/command' },
    { label: 'Chapter Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-blue-500/30">
      
      {/* FIXED LEFT SIDEBAR */}
      <aside className="w-64 border-r border-zinc-800/60 bg-[#09090b] flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 bg-white rounded flex items-center justify-center">
              <img src="/acm-logo.jpg" alt="ACM" className="h-full w-full object-contain p-0.5" />
            </div>
            <span className="font-bold text-sm text-zinc-100 tracking-tight">ACM Portal</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          
          <div>
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">General</div>
            <nav className="space-y-0.5">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors">
                  <item.icon className="h-4 w-4" /> {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Administration</div>
            <nav className="space-y-0.5">
              {adminItems.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors">
                  <item.icon className="h-4 w-4" /> {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* BOTTOM PROFILE TAB */}
        <div className="p-3 border-t border-zinc-800/60">
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-800/50 transition-colors text-left">
            <div className="h-8 w-8 rounded bg-blue-900/50 border border-blue-800 flex items-center justify-center text-blue-400 font-bold text-xs">
              VJ
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium text-zinc-200 truncate">Venkat Jyoshit</div>
              <div className="text-[10px] text-zinc-500 truncate uppercase">SUPER_ADMIN</div>
            </div>
            <LogOut className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-14 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>Workspace</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200 font-medium">Dashboard</span>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search members, tasks..." 
              className="w-full bg-[#18181b] border border-zinc-800/80 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 border border-zinc-700 rounded px-1">⌘K</div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}