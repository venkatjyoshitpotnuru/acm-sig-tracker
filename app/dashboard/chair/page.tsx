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
  AlertTriangle
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
  completionRate: number;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'requests' | 'sig-details'>('overview');
  const [selectedSigTab, setSelectedSigTab] = useState<string>('SIG-AI');

  const [sigs, setSigs] = useState<SigItem[]>([]);
  const [sigStats, setSigStats] = useState<SigStat[]>([]);
  const [roster, setRoster] = useState<ChapterMember[]>([]);
  const [requests, setRequests] = useState<DomainRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Succession Modal State
  const [successorCandidate, setSuccessorCandidate] = useState<ChapterMember | null>(null);
  const [successionConfirmText, setSuccessionConfirmText] = useState('');
  const [transferringSuccession, setTransferringSuccession] = useState(false);

  useEffect(() => {
    fetchChairDashboardData();
  }, []);

  const fetchChairDashboardData = async () => {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
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
      ...t,
      subtasks: subList.filter((st) => st.task_id === t.id)
    }));

    const pendingList: DomainRequest[] = [];
    memList
      .filter((m: any) => m.status === 'PENDING')
      .forEach((m: any) => {
        const prof = profList.find((p: any) => p.id === m.user_id);
        const sig = sigList.find((s) => s.id === m.sig_id);
        if (prof && sig) {
          pendingList.push({
            id: m.id || `${m.user_id}-${m.sig_id}`,
            userId: prof.id,
            fullName: prof.full_name || 'ACM Member',
            rollNumber: prof.roll_number || (prof.email ? prof.email.split('@')[0].toUpperCase() : 'N/A'),
            semester: m.semester ? String(m.semester) : 'N/A',
            sigId: sig.id,
            sigName: sig.name,
            status: 'PENDING'
          });
        }
      });
    setRequests(pendingList);

    const rosterList: ChapterMember[] = profList.map((prof: any) => {
      const approvedMem = memList.find(
        (m: any) => m.user_id === prof.id && m.status === 'APPROVED'
      );
      const sigObj = approvedMem ? sigList.find((s) => s.id === approvedMem.sig_id) : null;

      const userTasks = tasksWithSubtasks.filter((t) => t.assigned_to === prof.id);
      let totalSub = 0;
      let completedSub = 0;
      userTasks.forEach((t) => {
        totalSub += t.subtasks.length;
        completedSub += t.subtasks.filter((st) => st.is_completed).length;
      });
      const pct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

      return {
        profileId: prof.id,
        fullName: prof.full_name || 'Member',
        rollNumber: prof.roll_number || (prof.email ? prof.email.split('@')[0].toUpperCase() : 'N/A'),
        globalRole: prof.global_role || 'MEMBER',
        sigId: sigObj?.id,
        sigName: sigObj?.name,
        sigRole: approvedMem?.role || 'MEMBER',
        status: approvedMem?.status || 'UNASSIGNED',
        semester: approvedMem?.semester ? String(approvedMem.semester) : 'N/A',
        completedSubtasks: completedSub,
        totalSubtasks: totalSub,
        progressPercent: pct,
        createdAt: prof.created_at || ''
      };
    });
    setRoster(rosterList);

    const stats: SigStat[] = sigList.map((sig) => {
      const sigMembers = rosterList.filter((m) => m.sigId === sig.id);
      const sigTasks = tasksWithSubtasks.filter((t) => t.sig_id === sig.id);

      let totalSub = 0;
      let completedSub = 0;
      sigTasks.forEach((t) => {
        totalSub += t.subtasks.length;
        completedSub += t.subtasks.filter((st) => st.is_completed).length;
      });

      const completionRate = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

      return {
        ...sig,
        totalTasks: sigTasks.length,
        completedTasks: sigTasks.filter(
          (t) => t.subtasks.length > 0 && t.subtasks.every((st) => st.is_completed)
        ).length,
        totalSubtasks: totalSub,
        completedSubtasks: completedSub,
        memberCount: sigMembers.length,
        completionRate
      };
    });
    setSigStats(stats);

    setLoading(false);
  };

  const handleApproveRequest = async (req: DomainRequest) => {
    setActionLoadingId(req.userId);
    await supabase
      .from('sig_memberships')
      .update({ status: 'APPROVED' })
      .eq('user_id', req.userId)
      .eq('sig_id', req.sigId);
    await fetchChairDashboardData();
    setActionLoadingId(null);
  };

  const handleRejectRequest = async (req: DomainRequest) => {
    setActionLoadingId(req.userId);
    await supabase
      .from('sig_memberships')
      .delete()
      .eq('user_id', req.userId)
      .eq('sig_id', req.sigId);
    await fetchChairDashboardData();
    setActionLoadingId(null);
  };

  const handleAssignDomain = async (userId: string, newSigId: string) => {
    setActionLoadingId(userId);
    if (!newSigId) {
      await supabase.from('sig_memberships').delete().eq('user_id', userId);
    } else {
      const { data: existing } = await supabase
        .from('sig_memberships')
        .select('*')
        .eq('user_id', userId);

      if (existing && existing.length > 0) {
        await supabase
          .from('sig_memberships')
          .update({ sig_id: newSigId, status: 'APPROVED' })
          .eq('user_id', userId);
      } else {
        await supabase.from('sig_memberships').insert({
          user_id: userId,
          sig_id: newSigId,
          role: 'MEMBER',
          status: 'APPROVED'
        });
      }
    }
    await fetchChairDashboardData();
    setActionLoadingId(null);
  };

  const handleSigRoleChange = async (userId: string, sigId: string | undefined, newRole: 'MEMBER' | 'LEAD') => {
    if (!sigId) return;
    setActionLoadingId(userId);
    const { error } = await supabase
      .from('sig_memberships')
      .update({ role: newRole })
      .eq('user_id', userId)
      .eq('sig_id', sigId);

    if (error) alert('Error updating role: ' + error.message);
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
    if (!confirm(`Are you sure you want to permanently delete ${name}'s account?`)) return;
    setActionLoadingId(userId);
    await supabase.from('sig_memberships').delete().eq('user_id', userId);
    const res = await deleteUserAccount(userId);
    if (res.error) {
      alert('Delete failed: ' + res.error);
    } else {
      setRoster((prev) => prev.filter((r) => r.profileId !== userId));
    }
    setActionLoadingId(null);
  };

  // SUCCESSION HANDLER
  const handleExecuteSuccession = async () => {
    if (!currentUserId || !successorCandidate) return;
    if (successionConfirmText.trim().toUpperCase() !== 'TRANSFER') {
      alert('Type TRANSFER to confirm succession.');
      return;
    }

    setTransferringSuccession(true);
    const res = await transferChairAuthority(currentUserId, successorCandidate.profileId);

    if (res.error) {
      alert('Succession failed: ' + res.error);
      setTransferringSuccession(false);
      return;
    }

    alert(`Succession complete! ${successorCandidate.fullName} is now the Chair.`);
    setSuccessorCandidate(null);
    setSuccessionConfirmText('');
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

  const filteredRoster = roster.filter(
    (m) =>
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.sigName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMembers = roster.filter((r) => r.globalRole !== 'CHAIR').length;
  const leadCount = roster.filter((r) => r.sigRole === 'LEAD').length;

  return (
    <div className="space-y-6">
      {/* EXECUTIVE HEADER & TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-950/60 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Executive Suite</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Club-wide governance, domain operations, and succession planning.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#0c1222] border border-blue-950/80 p-1.5 rounded-xl shadow-md">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Executive Overview
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'roster'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Roster &amp; Succession
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Requests</span>
            {requests.length > 0 && (
              <span className="bg-amber-500 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sig-details')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sig-details'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
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
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Total Members
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">{totalMembers}</p>
                </div>

                <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Pending Requests
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">{requests.length}</p>
                </div>

                <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Domain Leads
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">{leadCount}</p>
                </div>

                <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                      <Activity className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Chapter Status
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-400 mt-1">Operational</p>
                </div>
              </div>

              <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-zinc-200 mb-5">
                  SIG Distribution &amp; Workload Health
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {sigStats.map((st) => (
                    <div key={st.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300 font-medium">{st.name}</span>
                        <span className="text-zinc-500">{st.memberCount} members</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              totalMembers > 0
                                ? Math.round((st.memberCount / totalMembers) * 100)
                                : 0
                            }%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MASTER ROSTER & SUCCESSION ACTIONS */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-white">
                  Master Chapter Roster &amp; Succession Management
                </h2>
                <div className="flex items-center gap-2">
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
                  <button
                    onClick={handleExportCSV}
                    className="p-2.5 bg-[#0c1222] hover:bg-zinc-900 border border-blue-950/80 rounded-lg text-zinc-300 transition-colors"
                    title="Export CSV"
                  >
                    <Download className="h-4 w-4 text-blue-400" />
                  </button>
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
                        <th className="px-6 py-4 text-right">Actions &amp; Succession</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-950/40">
                      {filteredRoster.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                            No members found.
                          </td>
                        </tr>
                      ) : (
                        filteredRoster.map((member) => {
                          const isChair = member.globalRole === 'CHAIR';
                          const isBusy = actionLoadingId === member.profileId;

                          return (
                            <tr
                              key={member.profileId}
                              className="hover:bg-blue-950/10 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-zinc-200">
                                      {member.fullName}
                                    </span>
                                    {isChair && (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] font-medium text-blue-400 flex items-center gap-1">
                                        <Crown className="h-3 w-3" />
                                        Chair
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-zinc-500 uppercase tracking-wide">
                                    {member.rollNumber}
                                  </span>
                                </div>
                              </td>

                              <td className="px-6 py-4 text-zinc-400">{member.semester}</td>

                              <td className="px-6 py-4">
                                {isChair ? (
                                  <span className="text-xs text-zinc-500 font-mono">
                                    Executive Authority
                                  </span>
                                ) : (
                                  <select
                                    disabled={isBusy}
                                    value={member.sigId || ''}
                                    onChange={(e) =>
                                      handleAssignDomain(member.profileId, e.target.value)
                                    }
                                    className="bg-[#070b14] border border-blue-950/70 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-700 disabled:opacity-50 transition-colors"
                                  >
                                    <option value="">Select Domain</option>
                                    {sigs.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              <td className="px-6 py-4">
                                {isChair ? (
                                  <span className="text-xs text-zinc-500 font-mono">Chair</span>
                                ) : (
                                  <select
                                    disabled={isBusy || !member.sigId}
                                    value={member.sigRole}
                                    onChange={(e) =>
                                      handleSigRoleChange(
                                        member.profileId,
                                        member.sigId,
                                        e.target.value as 'MEMBER' | 'LEAD'
                                      )
                                    }
                                    className="bg-[#070b14] border border-blue-950/70 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-700 disabled:opacity-50 transition-colors"
                                  >
                                    <option value="MEMBER">Member</option>
                                    <option value="LEAD">Lead</option>
                                  </select>
                                )}
                              </td>

                              <td className="px-6 py-4">
                                {isChair ? (
                                  <span className="text-[11px] text-zinc-600 font-mono">N/A</span>
                                ) : (
                                  <div className="w-32">
                                    <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden mb-1.5">
                                      <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${member.progressPercent}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] text-zinc-500">
                                      {member.progressPercent}% ({member.completedSubtasks}/
                                      {member.totalSubtasks})
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="px-6 py-4 text-right">
                                {!isChair ? (
                                  <div className="flex items-center justify-end gap-2">
                                    {/* Successor Nomination Button */}
                                    <button
                                      onClick={() => setSuccessorCandidate(member)}
                                      disabled={isBusy}
                                      className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors flex items-center gap-1 text-xs"
                                      title="Nominate as Chapter Chair Successor"
                                    >
                                      <Crown className="h-4 w-4 text-amber-400" />
                                      <span className="hidden xl:inline text-[11px]">Pass Chair</span>
                                    </button>

                                    {member.sigId && (
                                      <button
                                        onClick={() =>
                                          handleRemoveFromDomain(
                                            member.profileId,
                                            member.fullName
                                          )
                                        }
                                        disabled={isBusy}
                                        className="p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors"
                                        title="Remove from Domain"
                                      >
                                        <UserMinus className="h-4 w-4" />
                                      </button>
                                    )}

                                    <button
                                      onClick={() =>
                                        handleDeleteUserAccount(
                                          member.profileId,
                                          member.fullName
                                        )
                                      }
                                      disabled={isBusy}
                                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors inline-flex items-center justify-center disabled:opacity-50"
                                      title="Permanently Delete Account"
                                    >
                                      {isBusy ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-blue-400 font-mono pr-2">
                                    ACTIVE INCUMBENT
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PENDING REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">
                Domain Join Requests (Pending Approval)
              </h2>
              <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl overflow-hidden shadow-lg">
                {requests.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 text-sm">
                    No pending domain requests. All clear!
                  </div>
                ) : (
                  <div className="divide-y divide-blue-950/40">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className="p-5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-medium text-zinc-200 text-sm">{req.fullName}</p>
                          <p className="text-xs text-zinc-500 uppercase">
                            {req.rollNumber} • Sem {req.semester} • Requesting{' '}
                            <span className="text-amber-400 font-medium">{req.sigName}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRejectRequest(req)}
                            disabled={actionLoadingId === req.userId}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors flex items-center gap-1"
                          >
                            <X className="h-3.5 w-3.5 text-red-400" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleApproveRequest(req)}
                            disabled={actionLoadingId === req.userId}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                          >
                            {actionLoadingId === req.userId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            <span>Approve Request</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DETAILED SIG OVERVIEW */}
          {activeTab === 'sig-details' && (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-zinc-800 pb-4 overflow-x-auto">
                {sigs.map((sig) => (
                  <button
                    key={sig.id}
                    onClick={() => setSelectedSigTab(sig.name)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedSigTab === sig.name
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'bg-[#0c1222] text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {sig.name} ({roster.filter((m) => m.sigName === sig.name).length})
                  </button>
                ))}
              </div>

              <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl overflow-hidden shadow-lg">
                <div className="p-5 border-b border-blue-950/70 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {selectedSigTab} Roster &amp; Member Progress
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Detailed task completion and milestone tracking for assigned members.
                    </p>
                  </div>
                  <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full font-medium">
                    {roster.filter((m) => m.sigName === selectedSigTab).length} Active Members
                  </span>
                </div>

                <div className="divide-y divide-blue-950/40">
                  {roster.filter((m) => m.sigName === selectedSigTab).length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 text-sm">
                      No members currently enrolled in {selectedSigTab}.
                    </div>
                  ) : (
                    roster
                      .filter((m) => m.sigName === selectedSigTab)
                      .map((m) => (
                        <div
                          key={m.profileId}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-blue-950/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-sm">
                              {m.fullName ? m.fullName.substring(0, 2).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-200 text-sm">
                                  {m.fullName}
                                </span>
                                {m.sigRole === 'LEAD' && (
                                  <span className="px-1.5 py-0.2 rounded bg-green-500/20 text-green-400 text-[10px] font-bold">
                                    LEAD
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-zinc-500 uppercase tracking-wide">
                                {m.rollNumber} • Sem {m.semester}
                              </span>
                            </div>
                          </div>

                          <div className="w-full sm:w-64">
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-zinc-400">Milestone Progress</span>
                              <span className="text-blue-400 font-medium">
                                {m.progressPercent}% ({m.completedSubtasks}/{m.totalSubtasks})
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${m.progressPercent}%` }}
                              />
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

      {/* CHAIR SUCCESSION CONFIRMATION MODAL */}
      {successorCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-amber-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Transfer Chair Authority</span>
                  <Crown className="h-4 w-4 text-amber-400" />
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You are about to transfer full executive governance of the ACM Chapter to{' '}
                  <strong className="text-zinc-200">{successorCandidate.fullName}</strong> (
                  <span className="font-mono text-amber-400">{successorCandidate.rollNumber}</span>).
                </p>
              </div>
            </div>

            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300/90 space-y-2">
              <p className="font-semibold text-amber-300">Important consequences:</p>
              <ul className="list-disc pl-4 space-y-1 text-amber-400/80">
                <li>Your account will immediately step down to a standard Member role.</li>
                <li>You will immediately lose access to this Executive Suite.</li>
                <li>Only the new Chair will be able to reverse this action.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">
                Type <span className="font-mono font-bold text-amber-400">TRANSFER</span> to confirm:
              </label>
              <input
                type="text"
                value={successionConfirmText}
                onChange={(e) => setSuccessionConfirmText(e.target.value)}
                placeholder="TRANSFER"
                className="w-full bg-[#070b14] border border-amber-500/30 rounded-lg px-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-blue-950/60">
              <button
                type="button"
                onClick={() => {
                  setSuccessorCandidate(null);
                  setSuccessionConfirmText('');
                }}
                disabled={transferringSuccession}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSuccession}
                disabled={
                  transferringSuccession ||
                  successionConfirmText.trim().toUpperCase() !== 'TRANSFER'
                }
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
              >
                {transferringSuccession ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                <span>Confirm Succession</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}