'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteUserAccount } from '@/app/actions/admin';
import { Search, Trash2, Loader2, Check, X, Shield } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  roll_number: string;
  global_role: string;
  domain: string | null;
  semester: string | null;
  status: string | null; // PENDING or APPROVED
}

export default function ChairDashboard() {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'PENDING'>('ROSTER');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching members:', error);
    } else if (data) {
      setMembers(data);
    }
    setLoading(false);
  };

  const handleStateUpdate = (id: string, updates: Partial<Profile>) => {
    setMembers((prev) => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleRemoveFromState = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Filter by search query
  const searchedMembers = members.filter((m) => 
    (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split into Tabs
  const pendingRequests = searchedMembers.filter(m => m.status === 'PENDING');
  const activeRoster = searchedMembers.filter(m => m.status !== 'PENDING');

  return (
    <div className="space-y-6">
      
      {/* Top Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Toggle */}
        <div className="flex p-1 bg-[#0c1222]/80 border border-blue-950/70 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('ROSTER')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'ROSTER' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Active Roster ({members.filter(m => m.status !== 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Pending Requests 
            {members.filter(m => m.status === 'PENDING').length > 0 && (
              <span className="bg-amber-500 text-amber-950 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {members.filter(m => m.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search member or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0c1222]/80 border border-blue-950/70 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-800 transition-colors"
          />
        </div>
      </div>

      {/* Main Detailed Overview Table */}
      <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl overflow-hidden shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#070b14]/80 border-b border-blue-950/70 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 w-[25%]">Member Info</th>
                <th className="px-6 py-4 w-[10%]">Sem</th>
                <th className="px-6 py-4 w-[20%]">{activeTab === 'PENDING' ? 'Requested Domain' : 'Assigned Domain'}</th>
                <th className="px-6 py-4 w-[15%]">Role</th>
                {activeTab === 'ROSTER' && <th className="px-6 py-4 w-[20%]">Progress</th>}
                <th className="px-6 py-4 w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-950/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : activeTab === 'PENDING' ? (
                pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No pending requests.</td>
                  </tr>
                ) : (
                  pendingRequests.map((member) => (
                    <PendingRow 
                      key={member.id} 
                      member={member} 
                      onUpdate={handleStateUpdate} 
                    />
                  ))
                )
              ) : (
                activeRoster.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No members found.</td>
                  </tr>
                ) : (
                  activeRoster.map((member) => (
                    <MemberRow 
                      key={member.id} 
                      member={member} 
                      onDeleted={handleRemoveFromState} 
                    />
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// ROW: PENDING APPROVALS
// ------------------------------------------------------------------
function PendingRow({ member, onUpdate }: { member: Profile, onUpdate: (id: string, updates: Partial<Profile>) => void }) {
  const supabase = createClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    await supabase.from('profiles').update({ status: 'APPROVED' }).eq('id', member.id);
    onUpdate(member.id, { status: 'APPROVED' });
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    // Rejects the request by dropping their domain claim
    await supabase.from('profiles').update({ status: null, domain: null }).eq('id', member.id);
    onUpdate(member.id, { status: null, domain: null });
    setIsProcessing(false);
  };

  return (
    <tr className="hover:bg-blue-950/10 transition-colors">
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-zinc-200">{member.full_name || 'Unknown User'}</span>
          <span className="text-xs text-zinc-500 uppercase tracking-wide">{member.roll_number || 'N/A'}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-zinc-400">{member.semester || 'N/A'}</td>
      <td className="px-6 py-4">
        <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
          {member.domain || 'Unknown Domain'}
        </span>
      </td>
      <td className="px-6 py-4 text-zinc-400 capitalize">{member.global_role.toLowerCase()}</td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
            title="Reject Request"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="p-1.5 text-zinc-500 hover:text-green-400 hover:bg-green-500/10 rounded-md transition-colors disabled:opacity-50"
            title="Approve Request"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-green-400" /> : <Check className="h-4 w-4" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ------------------------------------------------------------------
// ROW: ACTIVE ROSTER (Matches your precise Image 17 layout)
// ------------------------------------------------------------------
function MemberRow({ member, onDeleted }: { member: Profile, onDeleted: (id: string) => void }) {
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [domain, setDomain] = useState(member.domain || '');
  const [role, setRole] = useState(member.global_role || 'MEMBER');

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
    await supabase.from('profiles').update({ domain: newDomain === '' ? null : newDomain }).eq('id', member.id);
    setIsUpdating(false);
  };

  const handleRoleChange = async (newRole: string) => {
    setIsUpdating(true);
    setRole(newRole);
    await supabase.from('profiles').update({ global_role: newRole }).eq('id', member.id);
    setIsUpdating(false);
  };

  // Mock progress logic for detailed overview
  let progressPercent = 0;
  let progressText = '0% (0/0)';
  if (role !== 'CHAIR' && domain) {
    // Temporary mock data for visual accuracy; replace with real task calculations later
    if (member.roll_number === 'TEST.MEMBER') { progressPercent = 19; progressText = '19% (3/16)'; }
    if (member.global_role === 'LEAD') { progressPercent = 100; progressText = '100% (1/1)'; }
  }

  return (
    <tr className="hover:bg-blue-950/10 transition-colors">
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200">{member.full_name || 'Unknown User'}</span>
            {role === 'CHAIR' && (
              <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] font-medium text-blue-400">
                Chair
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-500 uppercase tracking-wide">{member.roll_number || 'N/A'}</span>
        </div>
      </td>
      
      <td className="px-6 py-4 text-zinc-400">{member.semester || 'N/A'}</td>
      
      <td className="px-6 py-4">
        {role === 'CHAIR' ? (
          <span className="text-xs text-zinc-500">System Admin</span>
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
            <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full ${progressPercent === 100 ? 'bg-green-500' : 'bg-zinc-400'}`} 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
            <span className="text-[10px] text-zinc-500">{progressText}</span>
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