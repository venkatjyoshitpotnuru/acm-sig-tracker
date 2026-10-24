'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Loader2, Shield } from 'lucide-react';

interface UserProfileState {
  id: string;
  fullName: string;
  email: string;
  globalRole: string;
  isLead: boolean;
  leadDomainName: string | null;
  rollNumber: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileState | null>(null);

  useEffect(() => {
    async function checkAuthAndRole() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const uid = session.user.id;

      // Fetch profile and all approved domain memberships concurrently
      const [{ data: profileData }, { data: membershipsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase
          .from('sig_memberships')
          .select('role, sig_id, status, sigs(name)')
          .eq('user_id', uid)
          .eq('status', 'APPROVED'),
      ]);

      const globalRole = profileData?.global_role || session.user.user_metadata?.global_role || 'MEMBER';

      // Find if this user is assigned as 'LEAD' across any of their approved SIGs
      const leadMembership = (membershipsData || []).find(
        (m: any) => m.role?.toUpperCase() === 'LEAD'
      );

      let domainName: string | null = null;
      if (leadMembership?.sigs) {
        domainName = Array.isArray(leadMembership.sigs)
          ? leadMembership.sigs[0]?.name
          : (leadMembership.sigs as any)?.name;
      }

      const userState: UserProfileState = {
        id: uid,
        fullName: profileData?.full_name || session.user.user_metadata?.full_name || 'Member',
        email: session.user.email || '',
        globalRole: globalRole,
        isLead: Boolean(leadMembership),
        leadDomainName: domainName,
        rollNumber:
          profileData?.roll_number ||
          session.user.email?.split('@')[0]?.toUpperCase() ||
          'ACM-MEMBER',
      };

      setProfile(userState);

      // Route Access Control
      if (pathname.startsWith('/dashboard/chair') && userState.globalRole !== 'CHAIR') {
        router.replace('/dashboard/member');
        return;
      }

      if (
        pathname.startsWith('/dashboard/lead') &&
        !userState.isLead &&
        userState.globalRole !== 'CHAIR'
      ) {
        router.replace('/dashboard/member');
        return;
      }

      setLoading(false);
    }

    checkAuthAndRole();
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

  const isChair = profile?.globalRole === 'CHAIR';
  const isLead = Boolean(profile?.isLead);

  return (
    <div className="min-h-screen bg-[#070b14] text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-blue-950/60 bg-[#070b14]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Portal Switcher Tabs */}
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
              {/* Executive Suite (Chair Only) */}
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

              {/* Domain Lead Suite (Visible if Lead of any SIG, or Chair) */}
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

              {/* Student Portal (Available to all authenticated members) */}
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

          {/* User Info & Session Actions */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs font-semibold text-zinc-200">
                  {profile?.fullName}
                </span>
                {isChair ? (
                  <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] font-semibold text-blue-400">
                    CHAIR
                  </span>
                ) : isLead ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
                    {profile?.leadDomainName ? `${profile.leadDomainName} LEAD` : 'LEAD'}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-mono">
                {profile?.rollNumber}
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

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}