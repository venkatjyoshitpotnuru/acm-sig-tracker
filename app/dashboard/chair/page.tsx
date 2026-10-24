'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteUserAccount } from '@/app/actions/admin';
import { Search, Trash2, Loader2, Users, Clock, ShieldCheck, Activity } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  roll_number: string;
  global_role: string;
  domain: string | null;
  semester: string | null;
  status?: string | null;
  created_at?: string;
}

export default function ChairDashboard() {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    // Strict chronological sort: First-come, first-placed (new members appear at the bottom)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
    } else if (data) {
      setMembers(data);
    }
    setLoading(false);
  };

  const handleRemoveFromState = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const filteredMembers = members.filter((m) => 
    (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.domain || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Executive Metrics Calculations
  const totalMembers = members.filter(m => m.global_role !== 'CHAIR').length;
  const pendingCount = members.filter(m => m.status === 'PENDING').length;
  const leadCount = members.filter(m => m.global_role === 'LEAD').length;

  const aiCount = members.filter(m => m.domain === 'SIG-AI').length;
  const webCount = members.filter(m => m.domain === 'SIG-Web Dev').length;
  const cyberCount = members.filter(m => m.domain === 'SIG-Cyber').length;
  const glitchCount = members.filter(m => m.domain === 'SIG-Glitch').length;

  return (
    <div className="space-y-8">
      
      {/* 1. EXECUTIVE METRICS & SIG PROGRESS OVERVIEW */}
      <div className="space-y-4">
        <h1 className="text-xl font-bold tracking-tight text-white">Executive Suite</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users className="h-5 w-5" /></div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Members</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalMembers}</p>
          </div>

          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Clock className="h-5 w-5" /></div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Pending Requests</span>
            </div>
            <p className="text-3xl font-bold text-white">{pendingCount}</p>
          </div>

          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><ShieldCheck className="h-5 w-5" /></div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Domain Leads</span>
            </div>
            <p className="text-3xl font-bold text-white">{leadCount}</p>
          </div>

          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Activity className="h-5 w-5" /></div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Chapter Health</span>
            </div>
            <p className="text-3xl font-bold text-white">Active</p>
          </div>
        </div>

        {/* SIG Progress Health Distribution */}
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-6 shadow-lg">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">SIG Distribution &amp; Workload Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <SigProgressCard label="SIG-AI" count={aiCount} total={totalMembers} color="bg-blue-500" />
            <SigProgressCard label="SIG-Web Dev" count={webCount} total={totalMembers} color="bg-indigo-500" />
            <SigProgressCard label="SIG-Cyber" count={cyberCount} total={totalMembers} color="bg-emerald-500" />
            <SigProgressCard label="SIG-Glitch" count={glitchCount} total={totalMembers} color="bg-amber-500" />
          </div>
        </div>
      </div>

      {/* 2. MASTER ROSTER TABLE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Master Chapter Roster</h2>
          
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search member, roll number, domain"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0c1222]/80 border border-blue-950/70 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-800 transition-colors"
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
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      No members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <MemberRow 
                      key={member.id} 
                      member={member} 
                      onDeleted={handleRemoveFromState} 
                    />
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

// ------------------------------------------------------------------
// SIG Progress Card Sub-component
// ------------------------------------------------------------------
function SigProgressCard({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-zinc-300 font-medium">{label}</span>
        <span className="text-zinc-500">{count} members</span>
      </div>
      <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Row Component (Isolated state, domain/role dropdowns, approve/delete)
// ------------------------------------------------------------------
function MemberRow({ member, onDeleted }: { member: Profile, onDeleted: (id: string) => void }) {
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [domain, setDomain] = useState(member.domain || '');
  const [role, setRole] = useState(member.global_role || 'MEMBER');
  const [status, setStatus] = useState(member.status || 'APPROVED');

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${member.full_name}'s account?`)) return;
    
    setIsDeleting(true);
    const result = await deleteUserAccount(member.id);
    
    if (result.error) {
      alert('Error deleting account: ' + result.error);
      setIsDeleting(false);
    } else {
      onDeleted(member.id);
    }
  };

  const handleDomainChange = async (newDomain: string) => {
    setIsUpdating(true);
    setDomain(newDomain);
    setStatus('APPROVED');
    await supabase
      .from('profiles')
      .update({ domain: newDomain === '' ? null : newDomain, status: 'APPROVED' })
      .eq('id', member.id);
    setIsUpdating(false);
  };

  const handleRoleChange = async (newRole: string) => {
    setIsUpdating(true);
    setRole(newRole);
    await supabase
      .from('profiles')
      .update({ global_role: newRole })
      .eq('id', member.id);
    setIsUpdating(false);
  };

  const handleApprove = async () => {
    setIsUpdating(true);
    setStatus('APPROVED');
    await supabase.from('profiles').update({ status: 'APPROVED' }).eq('id', member.id);
    setIsUpdating(false);
  };

  return (
    <tr className="hover:bg-blue-950/10 transition-colors">
      
      {/* 1. Member Info Column */}
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200">
              {member.full_name || 'Unknown User'}
            </span>
            {role === 'CHAIR' && (
              <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] font-medium text-blue-400">
                Chair
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            {member.roll_number || 'N/A'}
          </span>
        </div>
      </td>
      
      {/* 2. Semester Column */}
      <td className="px-6 py-4">
        <span className="text-zinc-400">{member.semester || 'N/A'}</span>
      </td>
      
      {/* 3. Assigned Domain Column (Handles pending requests vs active dropdown) */}
      <td className="px-6 py-4">
        {role === 'CHAIR' ? (
          <span className="text-xs text-zinc-500 font-mono">Executive Authority</span>
        ) : status === 'PENDING' ? (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
              Request: {domain}
            </span>
            <button
              onClick={handleApprove}
              disabled={isUpdating}
              className="px-2.5 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded text-xs font-medium text-green-400 transition-colors"
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
      
      {/* 4. Role Select Column */}
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
      
      {/* 5. Progress Column */}
      <td className="px-6 py-4">
        {role === 'CHAIR' ? (
          <span className="text-[11px] text-zinc-600 font-mono">N/A</span>
        ) : (
          <div className="w-32">
            <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }} />
            </div>
            <span className="text-[11px] text-zinc-500">0% (0/0)</span>
          </div>
        )}
      </td>
      
      {/* 6. Actions Column */}
      <td className="px-6 py-4 text-right">
        {role !== 'CHAIR' ? (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-50"
            title="Permanently Delete Account"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-400" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="text-[10px] text-zinc-600 font-mono pr-2">PROTECTED</span>
        )}
      </td>
      
    </tr>
  );
}