'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteUserAccount } from '@/app/actions/admin';
import { Search, Trash2, Loader2, BarChart3, Users, ShieldCheck, Clock } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  roll_number: string;
  global_role: string;
  domain: string | null;
  semester: string | null;
  status?: string | null; // PENDING or APPROVED
}

export default function ChairDashboard() {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Sorted ascending: First come, first placed (new members go to the bottom)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
    } else if (profiles) {
      setMembers(profiles);
    }
    setLoading(false);
  };

  const handleRemoveFromState = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const searchedMembers = members.filter((m) => 
    (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derived Metrics for Executive Overview
  const totalMembers = members.length;
  const pendingRequests = members.filter(m => m.status === 'PENDING').length;
  const activeLeads = members.filter(m => m.global_role === 'LEAD').length;
  
  const aiCount = members.filter(m => m.domain === 'SIG-AI').length;
  const webCount = members.filter(m => m.domain === 'SIG-Web Dev').length;
  const cyberCount = members.filter(m => m.domain === 'SIG-Cyber').length;
  const glitchCount = members.filter(m => m.domain === 'SIG-Glitch').length;

  return (
    <div className="space-y-8">
      
      {/* EXECUTIVE DETAILED OVERVIEW & METRICS */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Executive Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users className="h-5 w-5" /></div>
              <h3 className="text-sm font-medium text-zinc-400">Total Roster</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalMembers}</p>
          </div>

          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Clock className="h-5 w-5" /></div>
              <h3 className="text-sm font-medium text-zinc-400">Pending Requests</h3>
            </div>
            <p className="text-3xl font-bold text-white">{pendingRequests}</p>
          </div>

          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><ShieldCheck className="h-5 w-5" /></div>
              <h3 className="text-sm font-medium text-zinc-400">Domain Leads</h3>
            </div>
            <p className="text-3xl font-bold text-white">{activeLeads}</p>
          </div>

          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><BarChart3 className="h-5 w-5" /></div>
              <h3 className="text-sm font-medium text-zinc-400">Avg Progress</h3>
            </div>
            <p className="text-3xl font-bold text-white">0%</p>
          </div>
        </div>

        {/* SIG DISTRIBUTION PROGRESS BARS */}
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-6 shadow-lg">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">SIG Allocation & Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <SigMetric label="SIG-AI" count={aiCount} total={totalMembers} color="bg-blue-500" />
            <SigMetric label="SIG-Web Dev" count={webCount} total={totalMembers} color="bg-indigo-500" />
            <SigMetric label="SIG-Cyber" count={cyberCount} total={totalMembers} color="bg-emerald-500" />
            <SigMetric label="SIG-Glitch" count={glitchCount} total={totalMembers} color="bg-amber-500" />
          </div>
        </div>
      </div>

      {/* MEMBER ROSTER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Master Roster</h2>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search member, roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0c1222]/80 border border-blue-950/70 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-800 transition-colors"
            />
          </div>
        </div>

        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl overflow-hidden shadow-lg shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#070b14]/80 border-b border-blue-950/70 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Member Info</th>
                  <th className="px-6 py-4">Sem</th>
                  <th className="px-6 py-4">Assigned Domain</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-950/40">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                    </td>
                  </tr>
                ) : searchedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No members found.</td>
                  </tr>
                ) : (
                  searchedMembers.map((member) => (
                    <MemberRow key={member.id} member={member} onDeleted={handleRemoveFromState} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SigMetric({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-zinc-300 font-medium">{label}</span>
        <span className="text-zinc-500">{count} members</span>
      </div>
      <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MemberRow({ member, onDeleted }: { member: Profile, onDeleted: (id: string) => void }) {
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [domain, setDomain] = useState(member.domain || '');
  const [role, setRole] = useState(member.global_role || 'MEMBER');
  const [status, setStatus] = useState(member.status || 'APPROVED');

  const handleDelete = async () => {
    if (!confirm(`Permanently delete ${member.full_name}'s account?`)) return;
    setIsDeleting(true);
    const result = await deleteUserAccount(member.id);
    if (result.error) {
      alert('Error: ' + result.error);
      setIsDeleting(false);
    } else {
      onDeleted(member.id);
    }
  };

  const handleDomainChange = async (newDomain: string) => {
    setIsUpdating(true);
    setDomain(newDomain);
    setStatus('APPROVED'); // Direct Chair assignment automatically approves
    await supabase.from('profiles').update({ domain: newDomain === '' ? null : newDomain, status: 'APPROVED' }).eq('id', member.id);
    setIsUpdating(false);
  };

  const handleRoleChange = async (newRole: string) => {
    setIsUpdating(true);
    setRole(newRole);
    await supabase.from('profiles').update({ global_role: newRole }).eq('id', member.id);
    setIsUpdating(false);
  };

  const handleApproveRequest = async () => {
    setIsUpdating(true);
    setStatus('APPROVED');
    await supabase.from('profiles').update({ status: 'APPROVED' }).eq('id', member.id);
    setIsUpdating(false);
  };

  return (
    <tr className="hover:bg-blue-950/10 transition-colors">
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200">{member.full_name || 'Unknown User'}</span>
            {role === 'CHAIR' && (
              <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] font-medium text-blue-400">Chair</span>
            )}
          </div>
          <span className="text-xs text-zinc-500 uppercase tracking-wide">{member.roll_number || 'N/A'}</span>
        </div>
      </td>
      
      <td className="px-6 py-4 text-zinc-400">{member.semester || 'N/A'}</td>
      
      <td className="px-6 py-4">
        {role === 'CHAIR' ? (
          <span className="text-xs text-zinc-500">Executive</span>
        ) : status === 'PENDING' ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
              Request: {domain}
            </span>
            <button 
              onClick={handleApproveRequest} 
              disabled={isUpdating} 
              className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-1.5 rounded hover:bg-green-500/30 transition-colors uppercase tracking-wider"
            >
              Approve
            </button>
          </div>
        ) : (
          <select
            disabled={isUpdating}
            value={domain}
            onChange={(e) => handleDomainChange(e.target.value)}
            className="bg-[#070b14] border border-blue-950/70 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-700 disabled:opacity-50 transition-colors"
          >
            <option value="">Select Domain</option>
            <option value="SIG-AI">SIG-AI</option>
            <option value="SIG-Web Dev">SIG-Web Dev</option>
            <option value="SIG-Cyber">SIG-Cyber</option>
            <option value="SIG-Glitch">SIG-Glitch</option>
          </select>
        )}
      </td>
      
      <td className="px-6 py-4">
        <select
          disabled={isUpdating || role === 'CHAIR'}
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="bg-[#070b14] border border-blue-950/70 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-700 disabled:opacity-50 transition-colors"
        >
          <option value="MEMBER">Member</option>
          <option value="LEAD">Lead</option>
          <option value="CHAIR">Chair</option>
        </select>
      </td>
      
      <td className="px-6 py-4">
        {role === 'CHAIR' ? null : (
          <div className="w-32">
            <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }} />
            </div>
            <span className="text-[10px] text-zinc-500">0% (0/0)</span>
          </div>
        )}
      </td>
      
      <td className="px-6 py-4 text-right">
        {role !== 'CHAIR' && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors inline-flex items-center justify-center disabled:opacity-50"
            title="Delete Account"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
      </td>
    </tr>
  );
}