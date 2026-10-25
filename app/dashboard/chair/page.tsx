'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { deleteUserAccount, transferChairAuthority } from '@/app/actions/admin';
import {
  ShieldCheck,
  Search,
  Clock,
  Check,
  X,
  UserMinus,
  Trash2,
  Download,
  Loader2,
  Users,
  Activity,
  Crown,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
}

interface TaskItem {
  id: string;
  sig_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigned_to: string;
  subtasks: Subtask[];
}

interface SigItem {
  id: string;
  name: string;
  description: string;
}

interface SigStat extends SigItem {
  totalTasks: number;
  completedTasks: number;
  totalSubtasks: number;
  completedSubtasks: number;
  memberCount: number;
  pendingCount: number;
  completionRate: number;
  leadName: string;
}

interface ChapterMember {
  profileId: string;
  fullName: string;
  rollNumber: string;
  globalRole: string;
  sigId?: string;
  sigName?: string;
  sigRole?: 'MEMBER' | 'LEAD';
  status?: string;
  semester?: string;
  completedSubtasks: number;
  totalSubtasks: number;
  progressPercent: number;
  createdAt: string;
}

interface DomainRequest {
  id: string;
  userId: string;
  fullName: string;
  rollNumber: string;
  semester: string;
  sigId: string;
  sigName: string;
  status: string;
}

export default function ChairDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'requests'>('overview');
  const [expandedSigId, setExpandedSigId] = useState<string | null>(null);

  const [sigs, setSigs] = useState<SigItem[]>([]);
  const [sigStats, setSigStats] = useState<SigStat[]>([]);
  const [roster, setRoster] = useState<ChapterMember[]>([]);
  const [requests, setRequests] = useState<DomainRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [showSuccessionModal, setShowSuccessionModal] = useState(false);
  const [successionSearch, setSuccessionSearch] = useState('');
  const [successorCandidate, setSuccessorCandidate] = useState<ChapterMember | null>(null);
  const [successionConfirmText, setSuccessionConfirmText] = useState('');
  const [transferringSuccession, setTransferringSuccession] = useState(false);

  useEffect(() => {
    fetchChairDashboardData();
  }, []);

  const fetchChairDashboardData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    setCurrentUserId(session.user.id);

    const [
      { data: sigsData },
      { data: profilesData },
      { data: membershipsData },
      { data: tasksData },
      { data: subtasksData }
    ] = await Promise.all([
      supabase.from('sigs').select('*').order('name', { ascending: true }),
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('sig_memberships').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('subtasks').select('*')
    ]);

    const sigList: SigItem[] = sigsData || [];
    const profList = profilesData || [];
    const memList = membershipsData || [];
    const taskList = tasksData || [];
    const subList: Subtask[] = subtasksData || [];

    setSigs(sigList);

    const tasksWithSubtasks: TaskItem[] = taskList.map((t: any) => ({
      ...t, subtasks: subList.filter((st) => st.task_id === t.id)
    }));

    const pendingList: DomainRequest[] = [];
    memList.filter((m: any) => m.status === 'PENDING').forEach((m: any) => {
      const prof = profList.find((p: any) => p.id === m.user_id);
      const sig = sigList.find((s) => s.id === m.sig_id);
      if (prof && sig) {
        pendingList.push({
          id: m.id || `${m.user_id}-${m.sig_id}`,
          userId: prof.id, fullName: prof.full_name || 'ACM Member',
          rollNumber: prof.roll_number || (prof.email ? prof.email.split('@')[0].toUpperCase() : 'N/A'),
          semester: m.semester ? String(m.semester) : 'N/A',
          sigId: sig.id, sigName: sig.name, status: 'PENDING'
        });
      }
    });
    setRequests(pendingList);

    const rosterList: ChapterMember[] = profList.map((prof: any) => {
      const approvedMem = memList.find((m: any) => m.user_id === prof.id && m.status === 'APPROVED');
      const sigObj = approvedMem ? sigList.find((s) => s.id === approvedMem.sig_id) : null;
      const userTasks = tasksWithSubtasks.filter((t) => t.assigned_to === prof.id);
      let totalSub = 0; let completedSub = 0;
      userTasks.forEach((t) => { totalSub += t.subtasks.length; completedSub += t.subtasks.filter((st) => st.is_completed).length; });
      const pct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

      return {
        profileId: prof.id, fullName: prof.full_name || 'Member',
        rollNumber: prof.roll_number || (prof.email ? prof.email.split('@')[0].toUpperCase() : 'N/A'),
        globalRole: prof.global_role || 'MEMBER', sigId: sigObj?.id, sigName: sigObj?.name,
        sigRole: approvedMem?.role || 'MEMBER', status: approvedMem?.status || 'UNASSIGNED',
        semester: approvedMem?.semester ? String(approvedMem.semester) : 'N/A',
        completedSubtasks: completedSub, totalSubtasks: totalSub, progressPercent: pct,
        createdAt: prof.created_at || ''
      };
    });
    setRoster(rosterList);

    const stats: SigStat[] = sigList.map((sig) => {
      const sigMembers = rosterList.filter((m) => m.sigId === sig.id);
      const sigLead = sigMembers.find((m) => m.sigRole === 'LEAD');
      const sigPending = pendingList.filter((p) => p.sigId === sig.id).length;
      
      const sigTasks = tasksWithSubtasks.filter((t) => t.sig_id === sig.id);
      let totalSub = 0; let completedSub = 0;
      sigTasks.forEach((t) => { totalSub += t.subtasks.length; completedSub += t.subtasks.filter((st) => st.is_completed).length; });
      const completionRate = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

      return {
        ...sig, 
        totalTasks: sigTasks.length,
        completedTasks: sigTasks.filter((t) => t.subtasks.length > 0 && t.subtasks.every((st) => st.is_completed)).length,
        totalSubtasks: totalSub, 
        completedSubtasks: completedSub, 
        memberCount: sigMembers.length, 
        pendingCount: sigPending,
        completionRate,
        leadName: sigLead ? sigLead.fullName : 'None'
      };
    });
    setSigStats(stats);
    setLoading(false);
  };

  const handleApproveRequest = async (req: DomainRequest) => {
    setActionLoadingId(req.userId);
    await supabase.from('sig_memberships').update({ status: 'APPROVED' }).eq('user_id', req.userId).eq('sig_id', req.sigId);
    await fetchChairDashboardData();
    setActionLoadingId(null);
  };

  const handleRejectRequest = async (req: DomainRequest) => {
    setActionLoadingId(req.userId);
    await supabase.from('sig_memberships').delete().eq('user_id', req.userId).eq('sig_id', req.sigId);
    await fetchChairDashboardData();
    setActionLoadingId(null);
  };

  const handleAssignDomain = async (userId: string, newSigId: string) => {
    setActionLoadingId(userId);
    if (!newSigId) {
      await supabase.from('sig_memberships').delete().eq('user_id', userId);
    } else {
      const { data: existing } = await supabase.from('sig_memberships').select('*').eq('user_id', userId);
      if (existing && existing.length > 0) {
        await supabase.from('sig_memberships').update({ sig_id: newSigId, status: 'APPROVED' }).eq('user_id', userId);
      } else {
        await supabase.from('sig_memberships').insert({ user_id: userId, sig_id: newSigId, role: 'MEMBER', status: 'APPROVED' });
      }
    }
    await fetchChairDashboardData();
    setActionLoadingId(null);
  };

  const handleSigRoleChange = async (userId: string, sigId: string | undefined, newRole: 'MEMBER' | 'LEAD') => {
    if (!sigId) return;
    setActionLoadingId(userId);
    await supabase.from('sig_memberships').update({ role: newRole }).eq('user_id', userId).eq('sig_id', sigId);
    await fetchChairDashboardData();
    setActionLoadingId(null);
  };

  const handleRemoveFromDomain = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from their assigned domain?`)) return;
    setActionLoadingId(userId);
    await supabase.from('sig_memberships').delete().eq('user_id', userId);
    await fetchChairDashboardData();
    setActionLoadingId(null);
  };

  const handleDeleteUserAccount = async (userId: string, name: string) => {
    if (!confirm(`Permanently delete ${name}'s account?`)) return;
    setActionLoadingId(userId);
    await deleteUserAccount(userId);
    setRoster((prev) => prev.filter((r) => r.profileId !== userId));
    setActionLoadingId(null);
  };

  const handleExecuteSuccession = async () => {
    if (!currentUserId || !successorCandidate) return;
    if (successionConfirmText.trim().toUpperCase() !== 'TRANSFER') { alert('Type TRANSFER to confirm.'); return; }
    setTransferringSuccession(true);
    const res = await transferChairAuthority(currentUserId, successorCandidate.profileId);
    if (res.error) { alert('Succession failed: ' + res.error); setTransferringSuccession(false); return; }
    alert(`Succession complete!`);
    router.replace('/dashboard/member');
  };

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Roll Number', 'Semester', 'Domain', 'Role', 'Progress'];
    const rows = roster.map((r) => [
      r.fullName,
      r.rollNumber,
      r.semester || 'N/A',
      r.sigName || 'Unassigned',
      r.globalRole === 'CHAIR' ? 'Chair' : r.sigRole || 'Member',
      `${r.progressPercent}% (${r.completedSubtasks}/${r.totalSubtasks})`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const a = document.createElement('a');
    a.setAttribute('href', encoded);
    a.setAttribute('download', 'acm_roster.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredRoster = roster.filter(m => 
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.sigName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const successionFiltered = roster.filter(m => 
    m.globalRole !== 'CHAIR' && 
    (m.fullName.toLowerCase().includes(successionSearch.toLowerCase()) || 
     m.rollNumber.toLowerCase().includes(successionSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* PLAIN FLAT HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Executive Suite</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Chapter-wide governance and administrative controls.</p>
        </div>
        <div className="flex items-center gap-1 bg-[#0c1222] border border-zinc-800 p-1 rounded-xl">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-xs font-semibold ${activeTab === 'overview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>Overview</button>
          <button onClick={() => setActiveTab('roster')} className={`px-4 py-2 rounded-lg text-xs font-semibold ${activeTab === 'roster' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>Roster</button>
          <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${activeTab === 'requests' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>
            <span>Requests</span>
            {requests.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">{requests.length}</span>}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-500 mx-auto" /></div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & 2x2 DOMAIN HEALTH GRID */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Clean solid blocks for metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-[#0c1222] border border-zinc-800 rounded-lg p-5">
                  <span className="text-xs text-zinc-400 uppercase font-semibold">Total Members</span>
                  <p className="text-3xl font-bold text-white mt-1">{roster.length}</p>
                </div>
                <div className="bg-[#0c1222] border border-zinc-800 rounded-lg p-5">
                  <span className="text-xs text-zinc-400 uppercase font-semibold">Pending Requests</span>
                  <p className="text-3xl font-bold text-white mt-1">{requests.length}</p>
                </div>
                <div className="bg-[#0c1222] border border-zinc-800 rounded-lg p-5">
                  <span className="text-xs text-zinc-400 uppercase font-semibold">Active Leads</span>
                  <p className="text-3xl font-bold text-white mt-1">{roster.filter(r => r.sigRole === 'LEAD').length}</p>
                </div>
                <div className="bg-[#0c1222] border border-zinc-800 rounded-lg p-5">
                  <span className="text-xs text-zinc-400 uppercase font-semibold">Chapter Status</span>
                  <p className="text-xl font-bold text-emerald-500 mt-2.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5" /> Operational
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4 text-blue-400" />
                  Domain Health & Performance
                </h2>

                {/* 2x2 Clean Grid layout for SIGs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sigStats.map((stat) => {
                    const isExpanded = expandedSigId === stat.id;
                    const domainMembers = roster.filter(m => m.sigId === stat.id);

                    return (
                      <div key={stat.id} className="bg-[#0c1222] border border-zinc-800 rounded-lg overflow-hidden transition-all">
                        {/* Domain Block Header (Clickable) */}
                        <button 
                          onClick={() => setExpandedSigId(isExpanded ? null : stat.id)}
                          className="w-full p-5 flex flex-col hover:bg-zinc-900/30 transition-colors text-left"
                        >
                          <div className="flex justify-between items-start w-full">
                            <div>
                              <h3 className="font-semibold text-white">{stat.name}</h3>
                              <p className="text-xs text-zinc-500 mt-0.5">Lead: {stat.leadName}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-blue-400 font-mono font-medium">{stat.completionRate}%</span>
                              <div className="text-[10px] text-zinc-500">{stat.memberCount} Members</div>
                            </div>
                          </div>

                          <div className="w-full mt-4 flex items-center justify-between text-xs text-zinc-400">
                            <span>Tasks: {stat.totalTasks}</span>
                            <span>Pending: {stat.pendingCount}</span>
                          </div>

                          <div className="w-full h-1 bg-zinc-900 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${stat.completionRate}%` }} />
                          </div>
                        </button>

                        {/* Expanded Member Details Area */}
                        {isExpanded && (
                          <div className="bg-[#070b14] border-t border-zinc-800 p-4 space-y-3">
                            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Member Progress</h4>
                            {domainMembers.length === 0 ? (
                              <div className="text-xs text-zinc-500 text-center py-2">No members enrolled.</div>
                            ) : (
                              domainMembers.map(m => (
                                <div key={m.profileId} className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm text-zinc-200">{m.fullName}</div>
                                    <div className="text-[10px] text-zinc-500">{m.rollNumber} {m.sigRole === 'LEAD' ? '• LEAD' : ''}</div>
                                  </div>
                                  <div className="text-right w-24">
                                    <div className="text-xs text-blue-400 mb-1">{m.progressPercent}%</div>
                                    <div className="h-1 bg-zinc-800 rounded-full">
                                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${m.progressPercent}%` }} />
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-white">Master Chapter Roster</h2>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#0c1222] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
                  </div>
                  {/* Clean flat button */}
                  <button onClick={() => setShowSuccessionModal(true)} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors">
                    <Crown className="h-4 w-4 text-amber-500" /> <span>Pass Chair</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#0c1222] border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#070b14] border-b border-zinc-800 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Member Info</th>
                        <th className="px-6 py-4">Sem</th>
                        <th className="px-6 py-4">Domain</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filteredRoster.map((member) => (
                        <tr key={member.profileId} className="hover:bg-zinc-900/40">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-zinc-200 flex items-center gap-2">
                                {member.fullName} {member.globalRole === 'CHAIR' && <Crown className="h-3 w-3 text-amber-500" />}
                              </span>
                              <span className="text-xs text-zinc-500">{member.rollNumber}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-400">{member.semester}</td>
                          <td className="px-6 py-4">
                            {member.globalRole === 'CHAIR' ? <span className="text-xs text-zinc-500">Executive</span> : (
                              <select value={member.sigId || ''} onChange={(e) => handleAssignDomain(member.profileId, e.target.value)} className="bg-[#070b14] border border-zinc-700 rounded text-xs px-2 py-1 text-zinc-300">
                                <option value="">Select</option>
                                {sigs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {member.globalRole === 'CHAIR' ? <span className="text-xs text-zinc-500">Chair</span> : (
                              <select value={member.sigRole} onChange={(e) => handleSigRoleChange(member.profileId, member.sigId, e.target.value as 'MEMBER'|'LEAD')} className="bg-[#070b14] border border-zinc-700 rounded text-xs px-2 py-1 text-zinc-300">
                                <option value="MEMBER">Member</option><option value="LEAD">Lead</option>
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {member.globalRole !== 'CHAIR' && (
                              <div className="flex gap-2">
                                {member.sigId && <button onClick={() => handleRemoveFromDomain(member.profileId, member.fullName)} className="text-zinc-500 hover:text-zinc-300 p-1"><UserMinus className="h-4 w-4"/></button>}
                                <button onClick={() => handleDeleteUserAccount(member.profileId, member.fullName)} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 className="h-4 w-4"/></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
             <div className="space-y-4">
             <div className="bg-[#0c1222] border border-zinc-800 rounded-xl overflow-hidden">
               <div className="p-5 border-b border-zinc-800">
                 <h2 className="font-semibold text-white text-base">Pending Domain Requests</h2>
               </div>
               {requests.length === 0 ? (
                 <div className="p-12 text-center text-zinc-500 text-sm">No pending requests.</div>
               ) : (
                 <div className="divide-y divide-zinc-800/50">
                   {requests.map((req) => (
                     <div key={req.id} className="p-5 flex items-center justify-between gap-4">
                       <div>
                         <p className="font-medium text-zinc-200 text-sm">{req.fullName}</p>
                         <p className="text-xs text-zinc-500 uppercase">{req.rollNumber} • {req.sigName}</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <button onClick={() => handleRejectRequest(req)} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg"><X className="h-3.5 w-3.5 inline mr-1" />Decline</button>
                         <button onClick={() => handleApproveRequest(req)} className="px-3 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded-lg"><Check className="h-3.5 w-3.5 inline mr-1" />Approve</button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </div>
          )}
        </>
      )}

      {/* SUCCESSION SEARCH MODAL */}
      {showSuccessionModal && !successorCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-zinc-800 rounded-xl w-full max-w-md shadow-xl flex flex-col h-[50vh]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" /> Select Successor</h3>
              <button onClick={() => setShowSuccessionModal(false)} className="text-zinc-500 hover:text-white p-1"><X className="h-4 w-4"/></button>
            </div>
            <div className="p-4 border-b border-zinc-800">
              <input type="text" placeholder="Search member to promote..." value={successionSearch} onChange={(e) => setSuccessionSearch(e.target.value)} className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
            </div>
            <div className="overflow-y-auto flex-1">
              {successionFiltered.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">No matching members found.</div>
              ) : (
                successionFiltered.map((m) => (
                  <button key={m.profileId} onClick={() => setSuccessorCandidate(m)} className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 border-b border-zinc-800/50 text-left">
                    <div>
                      <div className="text-sm text-zinc-200 font-medium">{m.fullName}</div>
                      <div className="text-xs text-zinc-500">{m.rollNumber}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESSION CONFIRMATION MODAL */}
      {successorCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-zinc-800 rounded-xl w-full max-w-sm p-6 shadow-xl space-y-5 text-center">
             <Crown className="h-8 w-8 text-amber-500 mx-auto" />
             <div>
               <h3 className="text-base font-bold text-white">Transfer Authority to {successorCandidate.fullName}?</h3>
               <p className="text-xs text-zinc-400 mt-2">You will immediately step down to a standard member. Type <strong>TRANSFER</strong> to confirm.</p>
             </div>
             <input type="text" value={successionConfirmText} onChange={(e) => setSuccessionConfirmText(e.target.value)} placeholder="TRANSFER" className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-center text-sm font-mono text-zinc-200 focus:outline-none" />
             <div className="flex gap-2">
               <button onClick={() => setSuccessorCandidate(null)} className="flex-1 py-2 text-xs bg-zinc-900 text-zinc-400 rounded-lg">Cancel</button>
               <button onClick={handleExecuteSuccession} disabled={transferringSuccession || successionConfirmText.trim().toUpperCase() !== 'TRANSFER'} className="flex-1 py-2 text-xs bg-amber-700/50 text-amber-100 rounded-lg disabled:opacity-50">Confirm</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}