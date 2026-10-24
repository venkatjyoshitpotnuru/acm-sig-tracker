'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [rollNumber, setRollNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clear loading state on mount or when switching modes
  useEffect(() => {
    setLoading(false);
    setErrorMsg(null);
  }, [isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const formattedRoll = rollNumber.trim().toUpperCase();
    const mappedEmail = `${formattedRoll.toLowerCase()}@student.acm.org`;

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: mappedEmail,
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
              roll_number: formattedRoll,
              role: 'MEMBER',
            },
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          router.replace('/dashboard/member');
          return;
        }
      } else {
        // Sign In Flow
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: mappedEmail,
          password: password,
        });

        if (signInError) throw signInError;

        if (signInData.user) {
          // Fetch user profile to route correctly by role
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', signInData.user.id)
            .single();

          if (profileError || !profile) {
            router.replace('/dashboard/member');
            return;
          }

          const role = profile.role?.toUpperCase();
          if (role === 'CHAIR') {
            router.replace('/dashboard/chair');
          } else if (role === 'LEAD') {
            router.replace('/dashboard/lead');
          } else {
            router.replace('/dashboard/member');
          }
          return;
        }
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      // Release button loading state if navigation has not unmounted the view
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-white flex items-center justify-center mb-4 p-1 shadow-inner">
            <Image
              src="/acm-logo.jpg"
              alt="ACM Logo"
              fill
              className="object-contain p-1"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Chapter Portal</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {isSignUp ? 'Create your ACM Chapter account' : 'Sign in to access your deliverables.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Roll Number</label>
            <input
              type="text"
              required
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. CB.EN.U4AIE24000"
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm uppercase focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center min-h-[42px]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : isSignUp ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'New here? Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}