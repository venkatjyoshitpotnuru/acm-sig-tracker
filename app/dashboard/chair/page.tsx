'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteUserAccount } from '@/app/actions/admin';
import { Search, Trash2, Loader2, Activity, Users, Bell, Shield } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  roll_number: string;
  global_role: string;
  domain: string | null;
  semester: string | null;
  status?: string; // For pending requests
}

export default function ChairDashboard() {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // 1. Fetch all members
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching members:', error);
    } else if (profiles) {
      setMembers(profiles);
    }
    
    // Note: If you have a separate 'requests' or 'tasks' table for progress, 
    // you would fetch them here and map them to the members state.
    
    setLoading(false);
  };

  const handleRemoveFromState = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Filter members for the search bar
  const filteredMembers = members.filter((m) => 
    (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.domain || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derived Stats for Top Dashboard
  const totalMembers = members.filter(m => m.global_role !== 'CHAIR').length;
  const pendingRequests = members.filter(m => m.status === 'PENDING').length || 0; 
  
  const getSigCount = (domain: string) => members.filter(m => m.domain === domain).length;

  return (
    <div className="space-y-8">
      
      {/* 1. TOP METRICS & PROGRESS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Members Card */}
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users className="h-5 w-5" /></div>
            <h3 className="text-sm font-medium text-zinc-400">Total Members</h3>
          </div>
          <p className="text-3xl font-bold text-white">{totalMembers}</p>
        </div>

        {/* Requests Card */}
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Bell className="h-5 w-5" /></div>
            <h3 className="text-sm font-medium text-zinc-400">Pending Requests</h3>
          </div>
          <p className="text-3xl font-bold text-white">{pendingRequests}</p>
        </div>

        {/* SIG Progress Overview */}
        <div className="md:col-span-2 bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-medium text-zinc-400">SIG Distribution & Progress</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ProgressMetric label="SIG-AI" count={getSigCount('SIG-AI')} percent={75} />
            <ProgressMetric label="SIG-Web Dev" count={getSigCount('SIG-Web Dev')} percent={40} />
            <ProgressMetric label="SIG-Cyber" count={getSigCount('SIG-Cyber')} percent={60} />
            <ProgressMetric label="SIG-Glitch" count={getSigCount('SIG-Glitch')} percent={25} />
          </div>
        </div>
      </div>

      {/* 2. MEMBER ROSTER TABLE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Chapter Roster</h2>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search roster..."
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
// Mini Component for SIG Progress Bars in the Top Dashboard
// ------------------------------------------------------------------
function ProgressMetric({ label, count, percent }: { label: string, count: number, percent: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-zinc-300 font-medium">{label} <span className="text-zinc-500 font-normal">({count})</span></span>
        <span className="text-blue-400">{percent}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Row Component (Handles isolated state, role drops, and secure delete)
// ------------------------------------------------------------------
function MemberRow({ member, onDeleted }: { member: Profile, onDeleted: (id: string) => void }) {
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [domain, setDomain] = useState(member.domain || '');
  const [role, setRole] = useState(member.global_role || 'MEMBER');

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${member.full_name}'s account? This action cannot be undone.`)) return;
    
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
    await supabase.from('profiles').update({ domain: newDomain === '' ? null : newDomain }).eq('id', member.id);
    setIsUpdating(false);
  };

  const handleRoleChange = async (newRole: string) => {
    setIsUpdating(true);
    setRole(newRole);
    await supabase.from('profiles').update({ global_role: newRole }).eq('id', member.id);
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
      
      {/* 3. Assigned Domain Column (FIXED: Chairs no longer have a dropdown) */}
      <td className="px-6 py-4">
        {role === 'CHAIR' ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400">
            <Shield className="h-3 w-3" />
            Executive Authority
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
      
      {/* 5. Member Progress Column */}
      <td className="px-6 py-4">
        <div className="w-32">
          {role === 'CHAIR' ? (
            <span className="text-[11px] text-zinc-500 font-mono tracking-wider">N/A</span>
          ) : (
            <>
              <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }} />
              </div>
              <span className="text-[11px] text-zinc-500">0% (0 tasks)</span>
            </>
          )}
        </div>
      </td>
      
      {/* 6. Actions Column */}
      <td className="px-6 py-4 text-right">
        {role !== 'CHAIR' && (
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
        )}
      </td>
      
    </tr>
  );
}