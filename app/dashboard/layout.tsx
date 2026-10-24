'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  ShieldCheck, 
  Layers, 
  LogOut, 
  Loader2, 
  LayoutDashboard,
  CheckCircle2
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string | null;
    email: string | null;
    global_role: string;
    roll_number?: string | null;
  } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !data) {
        // Fallback: If profile fetch fails, check metadata
        setProfile({
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || 'Member',
          email: session.user.email || '',
          global_role: session.user.user_metadata?.global_role || 'CHAIR'
        });
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    checkAuth();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isChair = profile?.global_role === 'CHAIR';
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User';
  const roll = profile?.roll_number || profile?.email?.split('@')[0]?.toUpperCase() || 'ACM-MEMBER';

  return (
    <div className="min-h-screen bg-[#070b14] text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-blue-950/60 bg-[#070b14]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Portal Switcher */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm shadow-inner">
                ACM
              </div>
              <span className="font-bold text-sm tracking-tight text-white hidden sm:inline-block">
                ACM Portal
              </span>
            </Link>

            <div className="h-4 w-px bg-blue-950" />

            <div className="flex items-center gap-1.5">
              <Link
                href="/dashboard/chair"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith('/dashboard/chair')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                Executive Suite
              </Link>
              <Link
                href="/dashboard/member"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith('/dashboard/member')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                Student Portal
              </Link>
            </div>
          </div>

          {/* Right Section: User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs font-semibold text-zinc-200">{displayName}</span>
                {isChair && (
                  <span className="px-1.5 py-0.2 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] font-semibold text-blue-400">
                    CHAIR
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-mono">
                {roll}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}