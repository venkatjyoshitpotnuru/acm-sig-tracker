'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // FIXED: Changed from @chapter.local to @student.acm.org to pass Supabase validation
  const getAuthEmail = (roll: string) => `${roll.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@student.acm.org`;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const authEmail = getAuthEmail(rollNumber);
    const cleanRollNumber = rollNumber.trim().toUpperCase();

    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ 
          email: authEmail, 
          password,
          options: {
            data: { full_name: fullName, roll_number: cleanRollNumber }
          }
        });
        if (signUpErr) throw signUpErr;

        // Ensure profile is updated just in case database triggers miss it
        if (signUpData.user) {
          await supabase.from('profiles').update({ 
            full_name: fullName, 
            roll_number: cleanRollNumber 
          }).eq('id', signUpData.user.id);
        }
        
        toast.success('Account created! Logging you in...');
      }

      // Execute Login
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ 
        email: authEmail, 
        password 
      });
      if (authErr) throw authErr;
      
      // Intelligent Routing
      if (authData.user) {
        // Double check profile roll number exists on login
        await supabase.from('profiles').update({ roll_number: cleanRollNumber }).eq('id', authData.user.id);

        const [ { data: profile }, { data: leadCheck } ] = await Promise.all([
          supabase.from('profiles').select('global_role').eq('id', authData.user.id).maybeSingle(),
          supabase.from('sig_memberships').select('role').eq('user_id', authData.user.id).in('role', ['LEAD', 'CO_LEAD']).limit(1)
        ]);

        if (profile?.global_role === 'CHAIR') router.push('/dashboard/chair');
        else if (leadCheck && leadCheck.length > 0) router.push('/dashboard/lead');
        else router.push('/dashboard/member');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-blue-500/30">
      <Toaster position="top-center" theme="dark" richColors toastOptions={{ className: 'border-zinc-800 bg-zinc-900' }} />
      
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800/60 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white p-2 rounded-lg flex items-center justify-center h-16 w-16 mb-6 shadow-md">
            <img src="/acm-logo.jpg" alt="ACM Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Chapter Portal</h1>
          <p className="text-sm text-zinc-500 mt-1.5 text-center">
            {isSignUp ? 'Create your workspace account.' : 'Sign in to access your deliverables.'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleAuth}>
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                placeholder="e.g. Alan Turing"
                required={isSignUp}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Roll Number</label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all uppercase"
              placeholder="e.g. CB.EN.U4AIE24000"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center h-10"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setPassword(''); }}
              disabled={loading}
              className="w-full bg-transparent hover:bg-zinc-800/50 border border-zinc-800 text-zinc-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 h-10"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'New here? Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}