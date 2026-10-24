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
  UserMinus,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  CheckSquare,
  Square,
  Shield
} from 'lucide-react';

interface Sig {
  id: string;
  name: string;
  description: string;
}

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
}

interface Task {
  id: string;
  sig_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  assigned_to: string;
  subtasks: Subtask[];
}

interface RosterMember {
  userId: string;
  fullName: string;
  rollNumber: string;
  globalRole: string;
  sigId: string | null;
  sigName: string | null;
  sigRole: string; // 'MEMBER' | 'LEAD'
  membershipStatus: string | null; // 'APPROVED' | 'PENDING' | null
  semester: string | null;
  completedSubtasks: number;
  totalSubtasks: number;
  progressPercent: number;
  createdAt: string;
}

interface PendingRequest {
  userId: string;
  sigId: string;
  sigName: string;
  fullName: string;
  rollNumber: string;
  semester: string | null;
}

export default function ChairDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Switchable Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'requests' | 'my-tasks'>('overview');
  const [expandedSigId, setExpandedSigId] = useState<string | null>(null);

  // Data States
  const [sigs, setSigs] = useState<Sig[]>([]);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllChairData();
  }, []);

  const fetchAllChairData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || null;
    setCurrentUserId(uid);

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

    const allSigs: Sig[] = sigsData || [];
    const allProfiles = profilesData || [];
    const allMemberships = membershipsData || [];
    const allTasks = tasksData || [];
    const allSubtasks: Subtask[] = subtasksData || [];

    setSigs(allSigs);

    // Map tasks with their subtasks
    const tasksWithSubtasks: Task[] = allTasks.map((t: any) => ({
      ...t,
      subtasks: allSubtasks.filter((st) => st.task_id === t.id)
    }));

    if (uid) {
      setMyTasks(tasksWithSubtasks.filter((t) => t.assigned_to === uid));
    }

    // Build Pending Requests Queue from sig_memberships where status === 'PENDING'
    const pendingList: PendingRequest[] = [];
    allMemberships
      .filter((m: any) => m.status === 'PENDING')
      .forEach((m: any) => {
        const prof = allProfiles.find((p: any) => p.id === m.user_id);
        const sigObj = allSigs.find((s) => s.id === m.sig_id);
        if (prof && sigObj) {
          const roll = prof.roll_number || (prof.email ? prof.email.split('@')[0].toUpperCase() : 'N/A');
          pendingList.push({
            userId: prof.id,
            sigId: sigObj.id,
            sigName: sigObj.name,
            fullName: prof.full_name || 'Unknown User',
            rollNumber: roll,
            semester: m.semester ? String(m.semester) : 'N/A'
          });
        }
      });
    setPendingRequests(pendingList);

    // Build Master Roster (First-come, first-placed based on profiles created_at ascending)
    const rosterList: RosterMember[] = allProfiles.map((prof: any) => {
      // Only attach APPROVED membership to active roster row
      const approvedMembership = allMemberships.find(
        (m: any) => m.user_id === prof.id && m.status === 'APPROVED'
      );
      const sigObj = approvedMembership
        ? allSigs.find((s) => s.id === approvedMembership.sig_id) || null
        : null;

      // Calculate user's subtask progress
      const userTasks = tasksWithSubtasks.filter((t) => t.assigned_to === prof.id);
      let totalSt = 0;
      let completedSt = 0;
      userTasks.forEach((t) => {
        totalSt += t.subtasks.length;
        completedSt += t.subtasks.filter((st) => st.is_completed).length;
      });
      const pct = totalSt > 0 ? Math.round((completedSt / totalSt) * 100) : 0;

      const roll = prof.roll_number || (prof.email ? prof.email.split('@')[0].toUpperCase() : 'N/A');

      return {
        userId: prof.id,
        fullName: prof.full_name || 'Unknown User',
        rollNumber: roll,
        globalRole: prof.global_role || 'MEMBER',
        sigId: sigObj ? sigObj.id : null,
        sigName: sigObj ? sigObj.name : null,
        sigRole: approvedMembership?.role || 'MEMBER',
        membershipStatus: approvedMembership ? 'APPROVED' : null,
        semester: approvedMembership?.semester ? String(approvedMembership.semester) : 'N/A',
        completedSubtasks: completedSt,
        totalSubtasks: totalSt,
        progressPercent: pct,
        createdAt: prof.created_at || ''
      };
    });

    setRoster(rosterList);
    setLoading(false);
  };

  // --- ACTIONS ---

  const handleAssignDomain = async (userId: string, newSigId: string) => {
    setUpdatingId(userId);
    if (!newSigId) {
      // Remove from domain
      await supabase.from('sig_memberships').delete().eq('user_id', userId);
    } else {
      // Check if membership row exists for user
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
    await fetchAllChairData();
    setUpdatingId(null);
  };

  const handleSigRoleChange = async (userId: string, sigId: string | null, newRole: string) => {
    if (!sigId) {
      alert('Assign the member to a SIG domain first before setting their Lead/Member role.');
      return;
    }
    setUpdatingId(userId);
    const { error } = await supabase
      .from('sig_memberships')
      .update({ role: newRole })
      .eq('user_id', userId)
      .eq('sig_id', sigId);

    if (error) {
      alert('Failed to update role: ' + error.message);
    }
    await fetchAllChairData();
    setUpdatingId(null);
  };

  const handleRemoveFromDomain = async (userId: string, fullName: string) => {
    if (!confirm(`Remove ${fullName} from their assigned domain?`)) return;
    setUpdatingId(userId);
    await supabase.from('sig_memberships').delete().eq('user_id', userId);
    await fetchAllChairData();
    setUpdatingId(null);
  };

  const handleDeleteAccount = async (userId: string, fullName: string) => {
    if (!confirm(`Permanently delete ${fullName}'s account from the portal? This cannot be undone.`)) return;
    setUpdatingId(userId);
    await supabase.from('sig_memberships').delete().eq('user_id', userId);
    const result = await deleteUserAccount(userId);
    if (result.error) {
      alert('Error deleting account: ' + result.error);
    } else {
      setRoster((prev) => prev.filter((r) => r.userId !== userId));
    }
    setUpdatingId(null);
  };

  const handleApproveRequest = async (req: PendingRequest) => {
    setUpdatingId(req.userId);
    await supabase
      .from('sig_memberships')
      .update({ status: 'APPROVED' })
      .eq('user_id', req.userId)
      .eq('sig_id', req.sigId);
    await fetchAllChairData();
    setUpdatingId(null);
  };

  const handleRejectRequest = async (req: PendingRequest) => {
    setUpdatingId(req.userId);
    await supabase
      .from('sig_memberships')
      .delete()
      .eq('user_id', req.userId)
      .eq('sig_id', req.sigId);
    await fetchAllChairData();
    setUpdatingId(null);
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    const newVal = !subtask.is_completed;
    await supabase
      .from('subtasks')
      .update({
        is_completed: newVal,
        completed_at: newVal ? new Date().toISOString() : null
      })
      .eq('id', subtask.id);
    await fetchAllChairData();
  };

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Roll Number', 'Semester', 'Assigned Domain', 'Role', 'Progress'];
    const rows = roster.map((r) => [
      r.fullName,
      r.rollNumber,
      r.semester || 'N/A',
      r.sigName || 'Unassigned',
      r.globalRole === 'CHAIR' ? 'Chair' : r.sigRole,
      `${r.progressPercent}% (${r.completedSubtasks}/${r.totalSubtasks})`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'acm_chapter_roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Roster
  const filteredRoster = roster.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.sigName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Executive Metrics
  const activeDomainMembers = roster.filter((r) => r.sigId !== null);
  const totalLeads = roster.filter((r) => r.sigRole === 'LEAD').length;

  return (
    <div className="space-y-8">
      {/* TOP BAR & SWITCHABLE PILL TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/50 border border-blue-800/40 text-xs font-medium text-blue-400 mb-2">
            <Shield className="h-3.5 w-3.5" />
            <span>Executive Governance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Chair Executive Suite</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Monitor SIG progress, approve domain requests, and manage chapter roles &amp; succession.
          </p>
        </div>

        {/* Pill Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#0c1222] border border-zinc-800/90 p-1.5 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Chapter Overview
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'roster'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Roster &amp; Roles
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Requests</span>
            {pendingRequests.length > 0 && (
              <span className="bg-amber-500 text-amber-950 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('my-tasks')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'my-tasks'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            My Tasks
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
        </div>
      ) : (
        <>
          {/* ==================== TAB 1: CHAPTER OVERVIEW & DETAILED SIG PROGRESS ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Total Accounts
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">{roster.length}</p>
                </div>

                <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                      <Activity className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Enrolled in SIGs
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">{activeDomainMembers.length}</p>
                </div>

                <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      SIG Leads
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">{totalLeads}</p>
                </div>

                <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Pending Approvals
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">{pendingRequests.length}</p>
                </div>
              </div>

              {/* Detailed SIG Progress Cards (Expandable per SIG to see each member's progress) */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  SIG Domains &amp; Detailed Member Progress
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {sigs.map((sig) => {
                    const sigMembers = roster.filter((r) => r.sigId === sig.id);
                    const sigLeads = sigMembers.filter((r) => r.sigRole === 'LEAD');
                    const totalSigSt = sigMembers.reduce((acc, m) => acc + m.totalSubtasks, 0);
                    const compSigSt = sigMembers.reduce((acc, m) => acc + m.completedSubtasks, 0);
                    const sigPct = totalSigSt > 0 ? Math.round((compSigSt / totalSigSt) * 100) : 0;
                    const isExpanded = expandedSigId === sig.id;

                    return (
                      <div
                        key={sig.id}
                        className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-6 shadow-lg flex flex-col justify-between space-y-5"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-bold text-white">{sig.name}</h3>
                              <p className="text-xs text-zinc-400 mt-1">{sig.description}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {sigMembers.length} Members
                            </span>
                          </div>

                          <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
                            <span className="font-medium text-zinc-300">Domain Lead:</span>
                            <span>
                              {sigLeads.length > 0
                                ? sigLeads.map((l) => l.fullName).join(', ')
                                : 'Unassigned'}
                            </span>
                          </div>

                          {/* Overall SIG Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-zinc-400">Overall Domain Completion</span>
                              <span className="text-blue-400 font-semibold">
                                {sigPct}% ({compSigSt}/{totalSigSt} subtasks)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-zinc-800/90 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${sigPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Toggle Detailed Member Breakdown */}
                        <div className="pt-3 border-t border-blue-950/60">
                          <button
                            onClick={() => setExpandedSigId(isExpanded ? null : sig.id)}
                            className="w-full flex items-center justify-between text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                          >
                            <span>
                              {isExpanded ? 'Hide Detailed Member Progress' : 'View Detailed Member Progress'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-zinc-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-zinc-400" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-4 space-y-3 divide-y divide-blue-950/40">
                              {sigMembers.length === 0 ? (
                                <p className="text-xs text-zinc-500 py-2">
                                  No approved members in {sig.name} yet.
                                </p>
                              ) : (
                                sigMembers.map((m) => (
                                  <div key={m.userId} className="pt-3 flex items-center justify-between gap-4">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-zinc-200">
                                          {m.fullName}
                                        </span>
                                        {m.sigRole === 'LEAD' && (
                                          <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] font-medium text-blue-400">
                                            Lead
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-zinc-500 uppercase">
                                        {m.rollNumber} • Sem {m.semester}
                                      </span>
                                    </div>

                                    <div className="w-36">
                                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-1">
                                        <div
                                          className="h-full bg-zinc-200 rounded-full"
                                          style={{ width: `${m.progressPercent}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] text-zinc-400 block text-right">
                                        {m.progressPercent}% ({m.completedSubtasks}/{m.totalSubtasks})
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: MASTER ROSTER & ROLES ==================== */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search member, roll number, domain"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0c1222]/80 border border-blue-950/70 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-800 transition-colors"
                  />
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-[#0c1222] hover:bg-zinc-900 border border-blue-950/80 rounded-lg text-xs font-medium text-zinc-300 flex items-center gap-2 w-fit transition-colors"
                >
                  <Download className="h-4 w-4 text-blue-400" />
                  <span>Export CSV</span>
                </button>
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
                      {filteredRoster.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                            No members found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredRoster.map((member) => {
                          const isBusy = updatingId === member.userId;
                          const isChair = member.globalRole === 'CHAIR';

                          return (
                            <tr key={member.userId} className="hover:bg-blue-950/10 transition-colors">
                              {/* 1. Member Info */}
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-zinc-200">
                                      {member.fullName}
                                    </span>
                                    {isChair && (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] font-medium text-blue-400">
                                        Chair
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-zinc-500 uppercase tracking-wide">
                                    {member.rollNumber}
                                  </span>
                                </div>
                              </td>

                              {/* 2. Semester */}
                              <td className="px-6 py-4 text-zinc-400">{member.semester}</td>

                              {/* 3. Assigned Domain (Stored in sig_memberships) */}
                              <td className="px-6 py-4">
                                <select
                                  disabled={isBusy}
                                  value={member.sigId || ''}
                                  onChange={(e) => handleAssignDomain(member.userId, e.target.value)}
                                  className="bg-[#070b14] border border-blue-950/70 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-700 disabled:opacity-50 transition-colors"
                                >
                                  <option value="">Select Domain</option>
                                  {sigs.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* 4. SIG Role ('MEMBER' or 'LEAD' in sig_memberships) */}
                              <td className="px-6 py-4">
                                <select
                                  disabled={isBusy || !member.sigId}
                                  value={member.sigRole}
                                  onChange={(e) =>
                                    handleSigRoleChange(member.userId, member.sigId, e.target.value)
                                  }
                                  className="bg-[#070b14] border border-blue-950/70 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-700 disabled:opacity-50 transition-colors"
                                >
                                  <option value="MEMBER">Member</option>
                                  <option value="LEAD">Lead</option>
                                </select>
                              </td>

                              {/* 5. Subtask Progress */}
                              <td className="px-6 py-4">
                                <div className="w-32">
                                  <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden mb-1.5">
                                    <div
                                      className="h-full bg-zinc-200 rounded-full"
                                      style={{ width: `${member.progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] text-zinc-500">
                                    {member.progressPercent}% ({member.completedSubtasks}/
                                    {member.totalSubtasks})
                                  </span>
                                </div>
                              </td>

                              {/* 6. Actions: Remove from Domain + Delete Account */}
                              <td className="px-6 py-4 text-right">
                                {!isChair && (
                                  <div className="flex items-center justify-end gap-2">
                                    {member.sigId && (
                                      <button
                                        onClick={() =>
                                          handleRemoveFromDomain(member.userId, member.fullName)
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
                                        handleDeleteAccount(member.userId, member.fullName)
                                      }
                                      disabled={isBusy}
                                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                      title="Permanently Delete Account"
                                    >
                                      {isBusy ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
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

          {/* ==================== TAB 3: GLOBAL REQUEST QUEUE ==================== */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">
                Pending Domain Enrollment Requests
              </h2>
              <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl overflow-hidden shadow-lg">
                {pendingRequests.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 text-sm">
                    No pending domain requests right now.
                  </div>
                ) : (
                  <div className="divide-y divide-blue-950/40">
                    {pendingRequests.map((req) => (
                      <div
                        key={`${req.userId}-${req.sigId}`}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-medium text-zinc-200 text-sm">{req.fullName}</p>
                          <p className="text-xs text-zinc-500 uppercase mt-0.5">
                            {req.rollNumber} • Sem {req.semester} • Requesting{' '}
                            <span className="text-amber-400 font-semibold">{req.sigName}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRejectRequest(req)}
                            disabled={updatingId === req.userId}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors flex items-center gap-1"
                          >
                            <X className="h-3.5 w-3.5 text-red-400" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleApproveRequest(req)}
                            disabled={updatingId === req.userId}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                          >
                            {updatingId === req.userId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            <span>Approve</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 4: PERSONAL TASKS ==================== */}
          {activeTab === 'my-tasks' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">My Assigned Tasks</h2>
              {myTasks.length === 0 ? (
                <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-12 text-center text-zinc-500 text-sm">
                  You have no personal tasks assigned.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 space-y-4"
                    >
                      <div>
                        <h3 className="font-semibold text-white text-sm">{task.title}</h3>
                        <p className="text-xs text-zinc-400 mt-1">{task.description}</p>
                      </div>
                      <div className="space-y-2">
                        {task.subtasks.map((st) => (
                          <button
                            key={st.id}
                            onClick={() => handleToggleSubtask(st)}
                            className="w-full flex items-center gap-2.5 text-left text-xs text-zinc-300 hover:text-white py-1"
                          >
                            {st.is_completed ? (
                              <CheckSquare className="h-4 w-4 text-blue-500 shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-zinc-600 shrink-0" />
                            )}
                            <span className={st.is_completed ? 'line-through text-zinc-500' : ''}>
                              {st.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}