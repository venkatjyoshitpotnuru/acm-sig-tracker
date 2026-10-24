'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Loader2 } from 'lucide-react';

interface NavUser {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  roll_number?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();

  const [user, setUser] = useState<NavUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          if (mounted) window.location.replace('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('global_role, full_name, roll_number')
          .eq('id', session.user.id)
          .single();

        if (mounted) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: profile?.global_role || 'MEMBER',
            full_name: profile?.full_name,
            roll_number: profile?.roll_number,
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('Session verification error:', err);
        if (mounted) window.location.replace('/login');
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      window.location.replace('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const role = user?.role?.toUpperCase();

  return (
    <div className="min-h-screen bg-[#070b14] text-zinc-100 flex flex-col">
      {/* Chapter Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="bg-white rounded-md p-0.5 shadow-sm flex-shrink-0">
                <img
                  src="/acm-logo.jpg"
                  alt="ACM Logo"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <span className="font-semibold text-sm tracking-tight text-zinc-200 hidden sm:inline">
                ACM Portal
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              {role === 'CHAIR' && (
                <Link
                  href="/dashboard/chair"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname.startsWith('/dashboard/chair')
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Executive Suite
                </Link>
              )}

              {(role === 'CHAIR' || role === 'LEAD') && (
                <Link
                  href="/dashboard/lead"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname.startsWith('/dashboard/lead')
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Domain Lead Suite
                </Link>
              )}

              <Link
                href="/dashboard/member"
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  pathname.startsWith('/dashboard/member')
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                Student Portal
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-zinc-200">
                {user?.roll_number || user?.full_name || 'Member'}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{user?.role}</p>
            </div>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300 text-xs transition-colors disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}