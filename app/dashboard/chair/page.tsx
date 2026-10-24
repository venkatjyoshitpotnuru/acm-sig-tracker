'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteUserAccount } from '@/app/actions/admin';
import { 
  Users, 
  Clock, 
  ShieldCheck, 
  Activity, 
  Search, 
  Trash2, 
  Loader2, 
  Check, 
  X, 
  Layers,
  BarChart2
} from 'lucide-react';

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
  
  // Tab switcher state: 'overview' | 'roster' | 'requests' | 'sig-details'
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'requests' | 'sig-details'>('overview');
  const [selectedSigTab, setSelectedSigTab] = useState<'SIG-AI' | 'SIG-Web Dev' | 'SIG-Cyber' | 'SIG-Glitch'>('SIG-AI');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    // Strict chronological sort: First-come, first-placed (newest members at the bottom)
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

  const handleUpdateMemberState = (id: string, updates: Partial<Profile>) => {
    setMembers((prev) => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  // Filtered members for search
  const filteredMembers = members.filter((m) => 
    (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.domain || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derived Metrics
  const totalMembers = members.filter(m => m.global_role !== 'CHAIR').length;
  const pendingRequests = members.filter(m => m.status === 'PENDING');
  const leadCount = members.filter(m => m.global_role === 'LEAD').length;

  const aiMembers = members.filter(m => m.domain === 'SIG-AI' && m.status !== 'PENDING');
  const webMembers = members.filter(m => m.domain === 'SIG-Web Dev' && m.status !== 'PENDING');
  const cyberMembers = members.filter(m => m.domain === 'SIG-Cyber' && m.status !== 'PENDING');
  const glitchMembers = members.filter(m => m.domain === 'SIG-Glitch' && m.status !== 'PENDING');

  return (
    <div className="space-y-6">
      
      {/* HEADER & PILL TAB SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Executive Suite</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Club-wide governance, domain operations, and milestone tracking.</p>
        </div>

        {/* Switchable Options Bar */}
        <div className="flex items-center gap-1 bg-[#0c1222]/90 border border-blue-950/80 p-1.5 rounded-xl shadow-md">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            Executive Overview
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'roster' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            Roster &amp; Roles
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'requests' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <span>Requests</span>
            {pendingRequests.length > 0 && (
              <span className="bg-amber-500 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sig-details')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sig-details' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            SIG Progress
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
        </div>
      ) : (
        <>
          {/* ================= TAB 1: EXECUTIVE OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
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
                  <p className="text-3xl font-bold text-white">{pendingRequests.length}</p>
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
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Chapter Status</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400 mt-1">Operational</p>
                </div>
              </div>

              {/* SIG Health Distribution */}
              <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-zinc-200 mb-5">SIG Distribution &amp; Workload Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <SigHealthCard label="SIG-AI" count={aiMembers.length} total={totalMembers} color="bg-blue-500" />
                  <SigHealthCard label="SIG-Web Dev" count={webMembers.length} total={totalMembers} color="bg-indigo-500" />
                  <SigHealthCard label="SIG-Cyber" count={cyberMembers.length} total={totalMembers} color="bg-emerald-500" />
                  <SigHealthCard label="SIG-Glitch" count={glitchMembers.length} total={totalMembers} color="bg-amber-500" />
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: MASTER ROSTER & ROLES ================= */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-white">Master Chapter Roster (First-Come, First-Placed)</h2>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search member, roll number, domain..."
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
                      {filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No members found.</td>
                        </tr>
                      ) : (
                        filteredMembers.map((member) => (
                          <MemberRow key={member.id} member={member} onDeleted={handleRemoveFromState} />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: PENDING REQUESTS ================= */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">Domain Join Requests</h2>
              <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl overflow-hidden shadow-lg">
                {pendingRequests.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 text-sm">No pending domain requests. All clear!</div>
                ) : (
                  <div className="divide-y divide-blue-950/40">
                    {pendingRequests.map((req) => (
                      <PendingRequestRow key={req.id} member={req} onUpdated={handleUpdateMemberState} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 4: DETAILED SIG OVERVIEW ================= */}
          {activeTab === 'sig-details' && (
            <div className="space-y-6">
              {/* SIG Sub-tabs */}
              <div className="flex gap-2 border-b border-zinc-800 pb-4">
                {(['SIG-AI', 'SIG-Web Dev', 'SIG-Cyber', 'SIG-Glitch'] as const).map((sig) => (
                  <button
                    key={sig}
                    onClick={() => setSelectedSigTab(sig)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedSigTab === sig
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'bg-[#0c1222] text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {sig} ({members.filter(m => m.domain === sig && m.status !== 'PENDING').length})
                  </button>
                ))}
              </div>

              {/* SIG Member Detailed Progress List */}
              <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl overflow-hidden shadow-lg">
                <div className="p-5 border-b border-blue-950/70 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-base">{selectedSigTab} Roster &amp; Member Progress</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Detailed task completion and milestone tracking for assigned members.</p>
                  </div>
                  <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full font-medium">
                    {members.filter(m => m.domain === selectedSigTab && m.status !== 'PENDING').length} Active Members
                  </span>
                </div>

                <div className="divide-y divide-blue-950/40">
                  {members.filter(m => m.domain === selectedSigTab && m.status !== 'PENDING').length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 text-sm">No members currently enrolled in {selectedSigTab}.</div>
                  ) : (
                    members
                      .filter(m => m.domain === selectedSigTab && m.status !== 'PENDING')
                      .map((m) => (
                        <div key={m.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-blue-950/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-sm">
                              {m.full_name ? m.full_name.substring(0, 2).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-200 text-sm">{m.full_name || 'Unknown'}</span>
                                {m.global_role === 'LEAD' && (
                                  <span className="px-1.5 py-0.2 rounded bg-green-500/20 text-green-400 text-[10px] font-bold">LEAD</span>
                                )}
                              </div>
                              <span className="text-xs text-zinc-500 uppercase tracking-wide">{m.roll_number}</span>
                            </div>
                          </div>

                          <div className="w-full sm:w-64">
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-zinc-400">Milestone Progress</span>
                              <span className="text-blue-400 font-medium">0% (0 tasks)</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }} />
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------
function SigHealthCard({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
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

function PendingRequestRow({ member, onUpdated }: { member: Profile, onUpdated: (id: string, updates: Partial<Profile>) => void }) {
  const supabase = createClient();
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    await supabase.from('profiles').update({ status: 'APPROVED' }).eq('id', member.id);
    onUpdated(member.id, { status: 'APPROVED' });
    setProcessing(false);
  };

  const handleReject = async () => {
    setProcessing(true);
    await supabase.from('profiles').update({ status: null, domain: null }).eq('id', member.id);
    onUpdated(member.id, { status: null, domain: null });
    setProcessing(false);
  };

  return (
    <div className="p-5 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-zinc-200 text-sm">{member.full_name}</p>
        <p className="text-xs text-zinc-500 uppercase">{member.roll_number} • Requesting <span className="text-amber-400 font-medium">{member.domain}</span></p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleReject}
          disabled={processing}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors flex items-center gap-1"
        >
          <X className="h-3.5 w-3.5 text-red-400" />
          <span>Reject</span>
        </button>
        <button
          onClick={handleApprove}
          disabled={processing}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
        >
          {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          <span>Approve Request</span>
        </button>
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

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${member.full_name}'s account?`)) return;
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
    await supabase.from('profiles').update({ domain: newDomain === '' ? null : newDomain, status: 'APPROVED' }).eq('id', member.id);
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
          <span className="text-xs text-zinc-500 font-mono">Executive Authority</span>
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
      
      <td className="px-6 py-4 text-right">
        {role !== 'CHAIR' ? (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-50"
            title="Permanently Delete Account"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4" />}
          </button>
        ) : (
          <span className="text-[10px] text-zinc-600 font-mono pr-2">PROTECTED</span>
        )}
      </td>
    </tr>
  );
}