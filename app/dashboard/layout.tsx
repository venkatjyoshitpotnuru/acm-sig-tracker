'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Loader2 } from 'lucide-react';

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
    sig_role: string | null;
    sig_name: string | null;
    roll_number?: string | null;
  } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // 1. Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      // 2. Fetch domain membership to verify if user is LEAD
      const { data: membershipData } = await supabase
        .from('sig_memberships')
        .select('role, sigs(name)')
        .eq('user_id', session.user.id)
        .eq('status', 'APPROVED')
        .maybeSingle();

      const userGlobalRole = profileData?.global_role || session.user.user_metadata?.global_role || 'MEMBER';
      const userSigRole = membershipData?.role || null;
      const sigName = (membershipData?.sigs as any)?.name || null;

      const userProfile = {
        id: session.user.id,
        full_name: profileData?.full_name || session.user.user_metadata?.full_name || 'Member',
        email: session.user.email || '',
        global_role: userGlobalRole,
        sig_role: userSigRole,
        sig_name: sigName,
        roll_number: profileData?.roll_number || session.user.email?.split('@')[0]?.toUpperCase() || 'ACM-MEMBER'
      };

      setProfile(userProfile);

      // Route Guards
      if (pathname.startsWith('/dashboard/chair') && userGlobalRole !== 'CHAIR') {
        router.replace('/dashboard/member');
        return;
      }

      if (pathname.startsWith('/dashboard/lead') && userSigRole !== 'LEAD' && userGlobalRole !== 'CHAIR') {
        router.replace('/dashboard/member');
        return;
      }

      setLoading(false);
    }

    checkAuth();
  }, [router, pathname, supabase]);

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
  const isLead = profile?.sig_role === 'LEAD';
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User';
  const roll = profile?.roll_number || 'ACM-MEMBER';

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
              {/* Visible to Chair */}
              {isChair && (
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
              )}

              {/* Visible to Leads & Chairs */}
              {(isLead || isChair) && (
                <Link
                  href="/dashboard/lead"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    pathname.startsWith('/dashboard/lead')
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  Domain Lead Suite
                </Link>
              )}
              
              {/* Member Workspace */}
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
                {isChair ? (
                  <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] font-semibold text-blue-400">
                    CHAIR
                  </span>
                ) : isLead ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
                    {profile?.sig_name ? `${profile.sig_name} LEAD` : 'LEAD'}
                  </span>
                ) : null}
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