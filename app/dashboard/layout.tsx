'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';
import { Toaster } from 'sonner';

interface NavUser {
  id: string;
  rollNumber: string;
  fullName: string;
  globalRole: string;
  isLead: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [user, setUser] = useState<NavUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
      
      if (authErr || !authUser) {
        router.push('/login');
        return;
      }

      const [
        { data: profile },
        { data: leadCheck }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
        supabase.from('sig_memberships').select('role').eq('user_id', authUser.id).in('role', ['LEAD', 'CO_LEAD']).limit(1)
      ]);

      setUser({
        id: authUser.id,
        rollNumber: profile?.roll_number || 'Unknown Roll No.',
        fullName: profile?.full_name || 'ACM Member',
        globalRole: profile?.global_role || 'MEMBER',
        isLead: (leadCheck && leadCheck.length > 0) ? true : false,
      });

      setLoading(false);
    }
    loadUser();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-blue-500/30">
      <Toaster position="bottom-right" theme="dark" richColors toastOptions={{ className: 'border-zinc-800 bg-zinc-900' }} />
      
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded flex items-center justify-center h-8 w-8 overflow-hidden">
                  <img src="/acm-logo.jpg" alt="ACM Logo" className="h-full w-full object-contain" />
                </div>
                <h1 className="text-base font-semibold text-zinc-100 tracking-tight hidden sm:block">
                  ACM Student Chapter
                </h1>
              </div>

              {!loading && user && (
                <nav className="hidden lg:flex items-center gap-6">
                  <Link href="/dashboard/member" className={`text-sm font-medium transition-colors ${pathname === '/dashboard/member' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    Student Portal
                  </Link>
                  {user.isLead && (
                    <Link href="/dashboard/lead" className={`text-sm font-medium transition-colors ${pathname === '/dashboard/lead' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      Lead Suite
                    </Link>
                  )}
                  {user.globalRole === 'CHAIR' && (
                    <Link href="/dashboard/chair" className={`text-sm font-medium transition-colors ${pathname === '/dashboard/chair' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      Executive Suite
                    </Link>
                  )}
                </nav>
              )}
            </div>

            <div className="flex items-center gap-5">
              {loading ? (
                <div className="h-8 w-32 bg-zinc-800/50 animate-pulse rounded-md"></div>
              ) : (
                <>
                  <div className="hidden md:flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-medium text-zinc-200 leading-tight">{user?.fullName}</p>
                      <p className="text-[11px] text-zinc-500 font-medium mt-0.5 tracking-wider">
                        {user?.rollNumber}
                      </p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-sm font-medium text-zinc-300">
                      {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </div>
                  
                  <div className="w-px h-5 bg-zinc-800 hidden md:block"></div>

                  <button onClick={handleSignOut} className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors duration-200">
                    <LogOut className="h-4 w-4" /> 
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}