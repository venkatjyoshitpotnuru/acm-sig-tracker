'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Layers, CheckCircle2, Clock } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  roll_number: string;
  domain: string | null;
  status: string | null;
}

export default function StudentDashboard() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingSig, setRequestingSig] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleRequestToJoin = async (sigName: string) => {
    if (!profile) return;
    setRequestingSig(sigName);

    // Forces status to PENDING so it enters the Chair's approval queue
    const { error } = await supabase
      .from('profiles')
      .update({
        domain: sigName,
        status: 'PENDING'
      })
      .eq('id', profile.id);

    if (error) {
      alert('Error requesting domain: ' + error.message);
    } else {
      setProfile(prev => prev ? { ...prev, domain: sigName, status: 'PENDING' } : null);
    }
    setRequestingSig(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const isPending = profile?.status === 'PENDING';
  const isApproved = profile?.status === 'APPROVED' && profile?.domain;

  return (
    <div className="space-y-8">
      {/* Top Banner / Workspace Header */}
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/40 border border-blue-900/60 text-xs font-medium text-blue-300 w-fit mb-2">
          <Layers className="h-3.5 w-3.5 text-blue-400" />
          <span>Student Portal</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Workspace</h1>
        <p className="text-sm text-zinc-400">Track your deliverables, domain enrollments, and semester milestones.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Enrolled Domains</h3>
          <p className="text-3xl font-bold text-white">{isApproved ? 1 : 0}</p>
        </div>
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Total Deliverables</h3>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Overall Progress</h3>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-zinc-400">Completion Rate</span>
              <span className="text-blue-400 font-medium">0%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Deliverables */}
        <div className="lg:col-span-2 bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-6 shadow-lg">
          <h3 className="text-base font-semibold text-white mb-4">Assigned Deliverables</h3>
          {isApproved ? (
            <div className="p-8 text-center text-zinc-400 text-sm border border-dashed border-zinc-800 rounded-xl">
              You have no pending deliverables assigned for {profile?.domain}.
            </div>
          ) : isPending ? (
            <div className="p-8 text-center text-amber-400/90 bg-amber-500/5 border border-amber-500/20 rounded-xl flex flex-col items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <p className="text-sm font-medium">Request to join <span className="underline">{profile?.domain}</span> is pending Chair approval.</p>
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl">
              You have no pending deliverables. Request to join a domain to receive assignments.
            </div>
          )}
        </div>

        {/* Domain Hub */}
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-6 shadow-lg space-y-4">
          <h3 className="text-base font-semibold text-white">Domain Hub</h3>
          
          <div className="space-y-3">
            {[
              { name: 'SIG-AI', desc: 'Artificial intelligence, deep learning, and computer vision' },
              { name: 'SIG-Web Dev', desc: 'Full-stack engineering, modern web apps, and UI/UX design' },
              { name: 'SIG-Cyber', desc: 'Network security, ethical hacking, and digital forensics' },
              { name: 'SIG-Glitch', desc: 'Game development, creative coding, and interactive media' },
            ].map((sig) => {
              const isCurrentSig = profile?.domain === sig.name;
              return (
                <div key={sig.name} className="p-4 rounded-xl bg-[#070b14]/60 border border-zinc-800/80 space-y-3">
                  <div>
                    <h4 className="font-semibold text-white text-sm">{sig.name}</h4>
                    <p className="text-xs text-zinc-400 mt-1">{sig.desc}</p>
                  </div>

                  {isCurrentSig ? (
                    <div className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 ${
                      isPending 
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' 
                        : 'bg-green-500/10 border border-green-500/30 text-green-400'
                    }`}>
                      {isPending ? <Clock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>{isPending ? 'Pending Approval' : 'Enrolled'}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRequestToJoin(sig.name)}
                      disabled={requestingSig === sig.name}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      {requestingSig === sig.name ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span>Request to Join →</span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}