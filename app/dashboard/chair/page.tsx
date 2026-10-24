'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  ShieldCheck, Layers, CheckCircle2, Circle, UserCheck, Calendar, UserCog,
  Search, AlertTriangle, Clock, Check, X, ArrowRightLeft, UserMinus,
  Eye, ChevronDown, ChevronUp
} from 'lucide-react';

interface Subtask { id: string; task_id: string; title: string; is_completed: boolean; }
interface TaskItem { id: string; sig_id: string; title: string; description: string; due_date: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; assigned_to: string; subtasks: Subtask[]; }
interface SigItem { id: string; name: string; description: string; }
interface SigStat extends SigItem { totalTasks: number; completedTasks: number; totalSubtasks: number; completedSubtasks: number; memberCount: number; completionRate: number; }
interface ChapterMember { 
  profileId: string; fullName: string; rollNumber: string; globalRole: string; 
  sigId?: string; sigName?: string; sigRole?: 'MEMBER' | 'CO_LEAD' | 'LEAD'; 
  status?: string; semester?: string;
  completedTasks: number; totalTasks: number; percent: number;
}

export default function ChairDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sigs, setSigs] = useState<SigItem[]>([]);
  const [sigStats, setSigStats] = useState<SigStat[]>([]);
  const [myTasks, setMyTasks] = useState<TaskItem[]>([]);
  const [allGlobalTasks, setAllGlobalTasks] = useState<TaskItem[]>([]);
  const [roster, setRoster] = useState<ChapterMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChapterMember[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'admin' | 'requests' | 'personal'>('overview');
  const [loading, setLoading] = useState(true);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [expandedSigs, setExpandedSigs] = useState<Record<string, boolean>>({});
  const [showSuccessionModal, setShowSuccessionModal] = useState(false);
  const [successorId, setSuccessorId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setAuthErrorMsg('Session expired.'); setLoading(false); return; }
      setCurrentUserId(user.id);

      let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      
      if ((profile?.global_role || '').toString().trim().toUpperCase() !== 'CHAIR') {
        setAuthErrorMsg('Access Restricted. Only the Chapter Chair can access this suite.');
        setLoading(false);
        return;
      }

      const [
        { data: sigsData }, { data: allTasks }, { data: allSubtasks },
        { data: memberships }, { data: profiles },
      ] = await Promise.all([
        supabase.from('sigs').select('*'), supabase.from('tasks').select('*'),
        supabase.from('subtasks').select('*'), supabase.from('sig_memberships').select('sig_id, user_id, role, status, semester'),
        supabase.from('profiles').select('*'),
      ]);

      const tasksList = allTasks || [];
      const subtasksList = (allSubtasks as Subtask[]) || [];
      const rawSigs = sigsData || [];
      setSigs(rawSigs);

      const compiledGlobalTasks: TaskItem[] = tasksList.map(t => ({
        ...t, subtasks: subtasksList.filter(st => st.task_id === t.id)
      }));
      setAllGlobalTasks(compiledGlobalTasks);

      if (rawSigs.length > 0) {
        setSigStats(rawSigs.map((sig) => {
          const sigTasks = compiledGlobalTasks.filter((t) => t.sig_id === sig.id);
          let cSt = 0; let tSt = 0;
          sigTasks.forEach(t => { tSt += t.subtasks.length; cSt += t.subtasks.filter(s => s.is_completed).length; });
          const membersInSig = (memberships || []).filter((m) => m.sig_id === sig.id && m.status === 'APPROVED');
          return {
            id: sig.id, name: sig.name, description: sig.description || '', totalTasks: sigTasks.length, completedTasks: 0,
            totalSubtasks: tSt, completedSubtasks: cSt, memberCount: membersInSig.length,
            completionRate: tSt > 0 ? Math.round((cSt / tSt) * 100) : 0,
          };
        }));
      }

      setMyTasks(compiledGlobalTasks.filter((t) => t.assigned_to === user.id));

      const memberMap = new Map<string, any>();
      (memberships || []).forEach((m) => memberMap.set(m.user_id, m));

      const allMembers: ChapterMember[] = (profiles || []).map((p) => {
        const mem = memberMap.get(p.id);
        const sig = rawSigs.find((s) => s.id === mem?.sig_id);
        
        const memberTasks = compiledGlobalTasks.filter(t => t.assigned_to === p.id);
        let cSt = 0; let tSt = 0;
        memberTasks.forEach(t => { tSt += t.subtasks.length; cSt += t.subtasks.filter(s => s.is_completed).length; });

        return {
          profileId: p.id, fullName: p.full_name || 'Member', rollNumber: p.roll_number || 'N/A',
          globalRole: p.global_role || 'MEMBER', sigId: mem?.sig_id, sigName: sig?.name || 'Unassigned',
          sigRole: mem?.role || 'MEMBER', status: mem?.status || 'N/A', semester: mem?.semester || 'N/A',
          completedTasks: cSt, totalTasks: tSt, percent: tSt > 0 ? Math.round((cSt / tSt) * 100) : 0
        };
      });

      const active = allMembers.filter(m => m.status !== 'PENDING').sort((a, b) => {
        if (a.globalRole === 'CHAIR') return -1;
        if (b.globalRole === 'CHAIR') return 1;
        return 0;
      });
      setRoster(active);
      setPendingRequests(allMembers.filter(m => m.status === 'PENDING'));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const channel = supabase.channel('chair-portal-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sig_memberships' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const clubTotals = useMemo(() => {
    let subtasksTotal = 0, subtasksDone = 0, totalMemberships = 0;
    sigStats.forEach((s) => { subtasksTotal += s.totalSubtasks; subtasksDone += s.completedSubtasks; totalMemberships += s.memberCount; });
    return { sigsCount: sigStats.length, subtasksTotal, subtasksDone, totalMemberships, averageRate: subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0 };
  }, [sigStats]);

  const chairPersonalStats = useMemo(() => {
    let total = 0, done = 0;
    myTasks.forEach((t) => { total += t.subtasks.length; done += t.subtasks.filter((s) => s.is_completed).length; });
    return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [myTasks]);

  const toggleSubtask = async (taskId: string, subtaskId: string, currentState: boolean) => {
    const nextState = !currentState;
    setMyTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, subtasks: t.subtasks.map((st) => st.id === subtaskId ? { ...st, is_completed: nextState } : st ) } : t));
    try {
      const { error } = await supabase.from('subtasks').update({ is_completed: nextState, completed_at: nextState ? new Date().toISOString() : null }).eq('id', subtaskId);
      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to update task.');
      loadData();
    }
  };

  const handleUpdateMembership = async (userId: string, newSigId: string, newRole: string, currentSemester: string) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase.from('sig_memberships').upsert({ user_id: userId, sig_id: newSigId, role: newRole, status: 'APPROVED', semester: currentSemester === 'N/A' ? '1' : currentSemester }, { onConflict: 'user_id,sig_id' });
      if (error) throw error;
      await loadData();
      toast.success('Role updated.');
    } catch (err: any) { toast.error(err.message); } finally { setUpdatingId(null); }
  };

  const handleRemoveMember = async (userId: string, sigId: string) => {
    if (confirm("Permanently remove this member from the domain?")) {
      try {
        const { error } = await supabase.rpc('remove_member_from_sig', { target_user_id: userId, target_sig_id: sigId });
        if (error) throw error;
        await loadData();
        toast.success('Member removed.');
      } catch (err: any) { toast.error(err.message); }
    }
  };

  const handleApproveRequest = async (userId: string, sigId: string) => {
    try {
      const { error } = await supabase.from('sig_memberships').update({ status: 'APPROVED' }).eq('user_id', userId).eq('sig_id', sigId);
      if (error) throw error;
      await loadData();
      toast.success('Approved.');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRejectRequest = async (userId: string, sigId: string) => {
    try {
      const { error } = await supabase.from('sig_memberships').delete().eq('user_id', userId).eq('sig_id', sigId);
      if (error) throw error;
      await loadData();
      toast.success('Rejected.');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleTransferLeadership = async () => {
    if (!successorId || !currentUserId) return;
    setIsTransferring(true);
    try {
      const { error } = await supabase.rpc('transfer_leadership', { new_chair_id: successorId });
      if (error) throw error;
      toast.success('Succession complete.');
      window.location.href = '/dashboard/member';
    } catch (err: any) { toast.error(err.message); setIsTransferring(false); }
  };

  const toggleSigExpanded = (sigId: string) => { setExpandedSigs(prev => ({ ...prev, [sigId]: !prev[sigId] })); };
  
  const filteredRoster = useMemo(() => roster.filter((m) => m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || m.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) || (m.sigName && m.sigName.toLowerCase().includes(searchQuery.toLowerCase()))), [roster, searchQuery]);
  const viewingMember = roster.find((m) => m.profileId === viewingMemberId);
  const viewingMemberTasks = useMemo(() => { return allGlobalTasks.filter((t) => t.assigned_to === viewingMemberId); }, [allGlobalTasks, viewingMemberId]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-zinc-500 text-sm font-medium">Loading chapter analytics...</div>;

  if (authErrorMsg) return (
    <div className="max-w-md mx-auto my-16 p-8 bg-zinc-900 border border-zinc-800 rounded-xl text-center space-y-4">
      <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center mx-auto text-red-400"><AlertTriangle className="h-6 w-6" /></div>
      <h3 className="text-lg font-semibold text-zinc-100">Access Denied</h3><p className="text-sm text-zinc-400">{authErrorMsg}</p>
      <div className="pt-4 flex gap-3 justify-center">
        <button onClick={() => router.push('/dashboard/member')} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md text-sm font-medium transition-colors">Return</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-800/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Executive Suite
          </div>
          <h2 className="text-3xl font-semibold text-zinc-100 tracking-tight">Chapter Overview</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage domains, oversee progress, and configure chapter roles.</p>
        </div>

        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'admin', label: 'Roster' },
            { id: 'requests', label: 'Requests', count: pendingRequests.length },
            { id: 'personal', label: 'My Tasks', count: myTasks.length }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {tab.label}
              {!!tab.count && <span className="bg-blue-600/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-md">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800/60 p-6 rounded-xl">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Active Domains</p>
              <p className="text-3xl font-semibold text-zinc-100">{clubTotals.sigsCount}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800/60 p-6 rounded-xl">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Milestones Complete</p>
              <p className="text-3xl font-semibold text-zinc-100">{clubTotals.subtasksDone} <span className="text-lg text-zinc-600">/ {clubTotals.subtasksTotal}</span></p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800/60 p-6 rounded-xl">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Verified Members</p>
              <p className="text-3xl font-semibold text-zinc-100">{clubTotals.totalMemberships}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {sigStats.map((sig) => {
              const sigMembers = roster.filter(m => m.sigId === sig.id);
              const isExpanded = expandedSigs[sig.id] || false;

              return (
                <div key={sig.id} className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-6 transition flex flex-col space-y-4">
                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <h4 className="text-lg font-semibold text-zinc-100">{sig.name}</h4>
                      <span className="text-lg font-medium text-zinc-300">{sig.completionRate}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mb-3">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${sig.completionRate}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-500 font-medium">
                      <span>{sig.memberCount} members</span>
                      <span>{sig.completedSubtasks} / {sig.totalSubtasks} milestones</span>
                    </div>
                  </div>
                  
                  {sigMembers.length > 0 && (
                    <button onClick={() => toggleSigExpanded(sig.id)} className="flex items-center justify-between w-full p-3 mt-2 bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-800/50 rounded-lg transition text-xs font-medium text-zinc-300">
                      <span>View Domain Roster</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                    </button>
                  )}

                  {isExpanded && sigMembers.length > 0 && (
                    <div className="pt-2 flex-1 overflow-y-auto pr-1 space-y-2 max-h-[300px]">
                      {sigMembers.map(m => (
                        <div key={m.profileId} className="flex items-center justify-between gap-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-200 truncate">{m.fullName}</span>
                              {m.sigRole === 'LEAD' && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-medium">Lead</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex-1 bg-zinc-800 rounded-full h-1 overflow-hidden"><div className="bg-zinc-400 h-1 rounded-full" style={{ width: `${m.percent}%` }} /></div>
                              <span className="text-[10px] text-zinc-500 font-medium w-8 text-right">{m.percent}%</span>
                            </div>
                          </div>
                          <button onClick={() => setViewingMemberId(m.profileId)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-md transition border border-zinc-700/50" title="View Detailed Tasks">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-zinc-800/60">
            <h3 className="font-semibold text-zinc-100 text-sm">Global Pending Requests</h3>
          </div>
          {pendingRequests.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm">No pending enrollment requests.</div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {pendingRequests.map((req) => (
                <div key={`${req.profileId}-${req.sigId}`} className="p-5 flex justify-between items-center hover:bg-zinc-800/20">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{req.fullName}</p>
                    <p className="text-xs text-zinc-500 mt-1">{req.rollNumber} • Sem {req.semester} • <span className="text-zinc-300 font-medium">{req.sigName}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRejectRequest(req.profileId, req.sigId!)} className="px-3 py-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition text-xs font-medium">Reject</button>
                    <button onClick={() => handleApproveRequest(req.profileId, req.sigId!)} className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-md text-xs font-medium transition shadow-sm">Approve</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search member, roll number, domain..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-700 transition" />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-zinc-800/60 bg-zinc-950/30 text-zinc-500 text-xs font-medium uppercase tracking-wide">
                    <th className="px-5 py-4">Member Info</th>
                    <th className="px-5 py-4">Sem</th>
                    <th className="px-5 py-4">Assigned Domain</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Progress</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredRoster.map((m) => (
                    <tr key={m.profileId} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-zinc-200 flex items-center gap-2">
                          {m.fullName}
                          {m.globalRole === 'CHAIR' && <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">Chair</span>}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1 uppercase">{m.rollNumber}</div>
                      </td>
                      <td className="px-5 py-4 text-zinc-400">{m.semester}</td>
                      <td className="px-5 py-4">
                        <select disabled={updatingId === m.profileId || m.globalRole === 'CHAIR'} value={m.sigId || ''} onChange={(e) => handleUpdateMembership(m.profileId, e.target.value, m.sigRole || 'MEMBER', m.semester || 'N/A')} className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-md px-3 py-1.5 text-xs outline-none focus:border-zinc-600 w-full disabled:opacity-50">
                          <option value="" disabled>Select Domain</option>
                          {sigs.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <select disabled={updatingId === m.profileId || !m.sigId || m.globalRole === 'CHAIR'} value={m.sigRole || 'MEMBER'} onChange={(e) => handleUpdateMembership(m.profileId, m.sigId!, e.target.value as any, m.semester || 'N/A')} className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-md px-3 py-1.5 text-xs outline-none focus:border-zinc-600 w-full disabled:opacity-50">
                          <option value="MEMBER">Member</option><option value="CO_LEAD">Co-Lead</option><option value="LEAD">Lead</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-24 bg-zinc-800 rounded-full h-1 overflow-hidden mb-1.5"><div className="bg-zinc-400 h-1 rounded-full" style={{ width: `${m.percent}%` }} /></div>
                        <span className="text-[10px] text-zinc-500 font-medium">{m.percent}% ({m.completedTasks}/{m.totalTasks})</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {m.sigId && m.globalRole !== 'CHAIR' && (
                            <button onClick={() => handleRemoveMember(m.profileId, m.sigId!)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition" title="Remove Member">
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-zinc-900 border border-red-900/30 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-semibold text-red-400">Chapter Succession</h3>
                <p className="text-xs text-zinc-500 mt-1">Transfer the Chapter Chair role. You will immediately lose access to this suite.</p>
              </div>
              <button onClick={() => setShowSuccessionModal(true)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md text-xs font-semibold transition border border-red-500/20">
                Appoint Successor
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'personal' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-zinc-100">Chair Executive Tasks</h3>
              <span className="text-lg font-medium text-blue-500">{chairPersonalStats.percent}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${chairPersonalStats.percent}%` }} /></div>
          </div>
          <div className="grid gap-4">
            {myTasks.map((task) => (
              <div key={task.id} className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5">
                <h4 className="text-sm font-medium text-zinc-100">{task.title}</h4>
                <div className="space-y-2 mt-4">
                  {task.subtasks.map((st) => (
                    <button key={st.id} onClick={() => toggleSubtask(task.id, st.id, st.is_completed)} className="w-full flex items-center gap-3 text-left p-2 -mx-2 rounded-lg hover:bg-zinc-800/50 transition">
                      {st.is_completed ? <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" /> : <Circle className="h-4 w-4 text-zinc-600 shrink-0" />}
                      <span className={`text-sm ${st.is_completed ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>{st.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEMBER DETAILED PROGRESS MODAL */}
      {viewingMemberId && viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Review: {viewingMember.fullName}</h3>
                <p className="text-sm text-zinc-500 mt-1 uppercase">{viewingMember.rollNumber} • {viewingMember.sigName} ({viewingMember.sigRole})</p>
              </div>
              <button onClick={() => setViewingMemberId(null)} className="p-1.5 text-zinc-500 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 rounded-md transition"><X className="h-4 w-4" /></button>
            </div>

            <div className="bg-zinc-950/50 p-5 rounded-lg border border-zinc-800/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-zinc-300">Completion</span>
                <span className="text-base font-semibold text-zinc-100">{viewingMember.percent}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${viewingMember.percent}%` }} /></div>
              <p className="text-xs text-zinc-500 mt-3">{viewingMember.completedTasks} of {viewingMember.totalTasks} milestones completed.</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Assigned Deliverables</h4>
              {viewingMemberTasks.length === 0 ? (
                <div className="text-center text-zinc-600 text-sm py-6">No tasks assigned.</div>
              ) : (
                viewingMemberTasks.map(task => {
                   const cCount = task.subtasks.filter((st) => st.is_completed).length;
                   const tCount = task.subtasks.length;
                   const tPercent = tCount > 0 ? Math.round((cCount / tCount) * 100) : 0;
                   return (
                     <div key={task.id} className="bg-zinc-950/30 border border-zinc-800/50 rounded-lg p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-sm font-medium text-zinc-200">{task.title}</h5>
                            <span className="text-[10px] text-zinc-500 mt-1 block">Due: {task.due_date}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${task.priority === 'HIGH' ? 'bg-red-500/10 border-red-500/20 text-red-400' : task.priority === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{task.priority}</span>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
                            <span>Progress</span>
                            <span>{tPercent}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden"><div className="bg-zinc-400 h-1 rounded-full" style={{ width: `${tPercent}%` }} /></div>
                        </div>

                        <div className="space-y-2 pt-3 border-t border-zinc-800/60">
                          {task.subtasks.map(st => (
                            <div key={st.id} className="flex items-center gap-2.5 text-sm">
                              {st.is_completed ? <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" /> : <Circle className="h-4 w-4 text-zinc-600 shrink-0" />}
                              <span className={st.is_completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}>{st.title}</span>
                            </div>
                          ))}
                        </div>
                     </div>
                   );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESSION MODAL */}
      {showSuccessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 space-y-5">
            <h3 className="text-lg font-semibold text-zinc-100">Transfer Leadership</h3>
            <p className="text-sm text-zinc-400">Select the next Chapter Chair. You will be demoted to a standard Member upon confirmation.</p>
            <div>
              <select value={successorId} onChange={(e) => setSuccessorId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-600">
                <option value="" disabled>Choose a member...</option>
                {roster.filter(m => m.profileId !== currentUserId).map(m => (
                  <option key={m.profileId} value={m.profileId}>{m.fullName} ({m.rollNumber})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowSuccessionModal(false)} className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition">Cancel</button>
              <button onClick={handleTransferLeadership} disabled={!successorId || isTransferring} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-md text-sm font-medium transition shadow-sm">
                {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}