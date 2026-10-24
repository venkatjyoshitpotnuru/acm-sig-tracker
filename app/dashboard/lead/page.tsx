'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Trash2,
  Calendar,
  Users,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Pencil,
  X,
  Clock,
  Check,
  UserMinus
} from 'lucide-react';

interface Subtask {
  id?: string;
  task_id?: string;
  title: string;
  is_completed: boolean;
}

interface DomainMember {
  userId: string;
  fullName: string;
  rollNumber: string;
  semester: string;
  sigRole: string;
  totalSubtasks: number;
  completedSubtasks: number;
  progressPercent: number;
}

interface DomainRequest {
  id: string; 
  userId: string;
  fullName: string;
  rollNumber: string;
  semester: string;
}

interface SigTask {
  id: string;
  sig_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigned_to: string;
  assigneeName?: string;
  subtasks: Subtask[];
}

interface GroupedDeliverable {
  title: string;
  description: string;
  due_date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  sig_id: string;
  taskIds: string[];
  members: {
    taskId: string;
    userId: string;
    name: string;
    rollNumber: string;
    subtasks: Subtask[];
    completedCount: number;
    totalCount: number;
    pct: number;
  }[];
  overallPct: number;
}

export default function LeadDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leadSig, setLeadSig] = useState<{ id: string; name: string } | null>(null);
  const [domainMembers, setDomainMembers] = useState<DomainMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DomainRequest[]>([]);
  const [tasks, setTasks] = useState<SigTask[]>([]);
  const [activeTab, setActiveTab] = useState<'roster' | 'tasks' | 'requests'>('roster');
  const [expandedDeliverable, setExpandedDeliverable] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [assignmentMode, setAssignmentMode] = useState<'INDIVIDUAL' | 'SEMESTER' | 'ALL'>('INDIVIDUAL');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Sem 1');
  const [subtaskList, setSubtaskList] = useState<string[]>(['']);

  const [editingDeliverable, setEditingDeliverable] = useState<GroupedDeliverable | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    fetchLeadDashboard();
  }, []);

  const fetchLeadDashboard = async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    const uid = session.user.id;
    setCurrentUserId(uid);

    const { data: leadMembership, error: leadError } = await supabase
      .from('sig_memberships')
      .select('sig_id, role, sigs(id, name)')
      .eq('user_id', uid)
      .eq('role', 'LEAD')
      .eq('status', 'APPROVED')
      .maybeSingle();

    if (leadError || !leadMembership || !leadMembership.sigs) {
      router.replace('/dashboard/member');
      return;
    }

    const activeSig = Array.isArray(leadMembership.sigs)
      ? leadMembership.sigs[0]
      : (leadMembership.sigs as any);

    setLeadSig({ id: activeSig.id, name: activeSig.name });

    const [
      { data: membershipsData },
      { data: profilesData },
      { data: tasksData },
      { data: subtasksData }
    ] = await Promise.all([
      supabase.from('sig_memberships').select('*').eq('sig_id', activeSig.id),
      supabase.from('profiles').select('*'),
      supabase.from('tasks').select('*').eq('sig_id', activeSig.id).order('created_at', { ascending: false }),
      supabase.from('subtasks').select('*').order('created_at', { ascending: true })
    ]);

    const profs = profilesData || [];
    const allMemberships = membershipsData || [];
    const taskList = tasksData || [];
    const subList: Subtask[] = subtasksData || [];

    const approvedMemberships = allMemberships.filter((m: any) => m.status === 'APPROVED');
    const requestsList: DomainRequest[] = allMemberships
      .filter((m: any) => m.status === 'PENDING')
      .map((m: any) => {
        const p = profs.find((prof: any) => prof.id === m.user_id);
        return {
          id: m.id,
          userId: m.user_id,
          fullName: p?.full_name || 'ACM Member',
          rollNumber: p?.roll_number || (p?.email ? p.email.split('@')[0].toUpperCase() : 'N/A'),
          semester: m.semester ? `Sem ${m.semester}` : 'Sem 1'
        };
      });
    setPendingRequests(requestsList);

    const fullTasks: SigTask[] = taskList.map((t: any) => {
      const assignedProf = profs.find((p: any) => p.id === t.assigned_to);
      return {
        ...t,
        assigneeName: assignedProf?.full_name || 'Assigned Member',
        subtasks: subList.filter((s: any) => s.task_id === t.id)
      };
    });
    setTasks(fullTasks);

    const members: DomainMember[] = approvedMemberships.map((m: any) => {
      const p = profs.find((prof: any) => prof.id === m.user_id);
      const userTasks = fullTasks.filter((t) => t.assigned_to === m.user_id);

      let totalSub = 0;
      let completedSub = 0;
      userTasks.forEach((t) => {
        totalSub += t.subtasks.length;
        completedSub += t.subtasks.filter((st) => st.is_completed).length;
      });

      const pct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

      return {
        userId: m.user_id,
        fullName: p?.full_name || 'ACM Member',
        rollNumber: p?.roll_number || (p?.email ? p.email.split('@')[0].toUpperCase() : 'N/A'),
        semester: m.semester ? `Sem ${m.semester}` : 'Sem 1',
        sigRole: m.role || 'MEMBER',
        totalSubtasks: totalSub,
        completedSubtasks: completedSub,
        progressPercent: pct
      };
    });

    setDomainMembers(members);

    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].userId);
    }

    setLoading(false);
  };

  const groupedDeliverables: GroupedDeliverable[] = useMemo(() => {
    const groups: { [key: string]: GroupedDeliverable } = {};

    tasks.forEach((t) => {
      const key = `${t.title}__${t.due_date || ''}`;
      const completedSubs = t.subtasks.filter((s) => s.is_completed).length;
      const totalSubs = t.subtasks.length;
      const pct = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

      const memberObj = {
        taskId: t.id,
        userId: t.assigned_to,
        name: t.assigneeName || 'Member',
        rollNumber: domainMembers.find((m) => m.userId === t.assigned_to)?.rollNumber || '',
        subtasks: t.subtasks,
        completedCount: completedSubs,
        totalCount: totalSubs,
        pct
      };

      if (!groups[key]) {
        groups[key] = {
          title: t.title,
          description: t.description,
          due_date: t.due_date,
          priority: t.priority,
          sig_id: t.sig_id,
          taskIds: [t.id],
          members: [memberObj],
          overallPct: 0
        };
      } else {
        groups[key].taskIds.push(t.id);
        groups[key].members.push(memberObj);
      }
    });

    return Object.values(groups).map((group) => {
      const totalAllSubs = group.members.reduce((acc, m) => acc + m.totalCount, 0);
      const completedAllSubs = group.members.reduce((acc, m) => acc + m.completedCount, 0);
      return {
        ...group,
        overallPct: totalAllSubs > 0 ? Math.round((completedAllSubs / totalAllSubs) * 100) : 0
      };
    });
  }, [tasks, domainMembers]);

  const handleApproveRequest = async (req: DomainRequest) => {
    if (!leadSig) return;
    setActionLoadingId(req.userId);
    await supabase.from('sig_memberships').update({ status: 'APPROVED' }).eq('user_id', req.userId).eq('sig_id', leadSig.id);
    await fetchLeadDashboard();
    setActionLoadingId(null);
  };

  const handleRejectRequest = async (req: DomainRequest) => {
    if (!leadSig) return;
    setActionLoadingId(req.userId);
    await supabase.from('sig_memberships').delete().eq('user_id', req.userId).eq('sig_id', leadSig.id);
    await fetchLeadDashboard();
    setActionLoadingId(null);
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!leadSig) return;
    if (!confirm(`Are you sure you want to permanently remove ${name} from ${leadSig.name}?`)) return;
    setActionLoadingId(userId);
    const { error } = await supabase.from('sig_memberships').delete().eq('user_id', userId).eq('sig_id', leadSig.id);
    if (error) {
      alert('Failed to remove member: ' + error.message);
    }
    await fetchLeadDashboard();
    setActionLoadingId(null);
  };

  const handleAddSubtaskInput = () => setSubtaskList([...subtaskList, '']);
  const handleSubtaskChange = (index: number, val: string) => {
    const updated = [...subtaskList];
    updated[index] = val;
    setSubtaskList(updated);
  };
  const handleRemoveSubtaskInput = (index: number) => {
    setSubtaskList(subtaskList.filter((_, i) => i !== index));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadSig || !currentUserId) return;
    if (!title.trim()) {
      alert('Task title is required.');
      return;
    }

    let targetAssigneeIds: string[] = [];
    if (assignmentMode === 'INDIVIDUAL') {
      if (!selectedMemberId) { alert('Please select a member.'); return; }
      targetAssigneeIds = [selectedMemberId];
    } else if (assignmentMode === 'SEMESTER') {
      targetAssigneeIds = domainMembers.filter((m) => m.semester === selectedSemester).map((m) => m.userId);
      if (targetAssigneeIds.length === 0) { alert(`No members found in ${selectedSemester}.`); return; }
    } else if (assignmentMode === 'ALL') {
      targetAssigneeIds = domainMembers.map((m) => m.userId);
    }

    setSubmitting(true);
    try {
      const cleanSubtasks = subtaskList.map((s) => s.trim()).filter((s) => s.length > 0);
      for (const uid of targetAssigneeIds) {
        const { data: insertedTask, error: taskErr } = await supabase
          .from('tasks')
          .insert({ sig_id: leadSig.id, created_by: currentUserId, assigned_to: uid, title, description, due_date: dueDate || null, priority })
          .select().single();
        if (taskErr) throw taskErr;
        if (cleanSubtasks.length > 0 && insertedTask) {
          for (let i = 0; i < cleanSubtasks.length; i++) {
            await supabase.from('subtasks').insert({ task_id: insertedTask.id, title: cleanSubtasks[i], is_completed: false });
          }
        }
      }
      setTitle(''); setDescription(''); setDueDate(''); setPriority('MEDIUM'); setSubtaskList(['']);
      await fetchLeadDashboard();
      setActiveTab('tasks');
    } catch (err: any) {
      alert('Failed to assign task: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (group: GroupedDeliverable) => {
    setEditingDeliverable(group);
    setEditTitle(group.title);
    setEditDescription(group.description || '');
    setEditDueDate(group.due_date || '');
    setEditPriority(group.priority);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeliverable) return;
    setEditSubmitting(true);
    try {
      const { error } = await supabase.from('tasks')
        .update({ title: editTitle, description: editDescription, due_date: editDueDate || null, priority: editPriority })
        .in('id', editingDeliverable.taskIds);
      if (error) throw error;
      setEditingDeliverable(null);
      await fetchLeadDashboard();
    } catch (err: any) {
      alert('Failed to update: ' + err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteGroupedDeliverable = async (taskIds: string[]) => {
    if (!confirm('Are you sure you want to delete this deliverable for all assigned members?')) return;
    for (const tid of taskIds) {
      await supabase.from('subtasks').delete().eq('task_id', tid);
      await supabase.from('tasks').delete().eq('id', tid);
    }
    await fetchLeadDashboard();
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-800 text-emerald-400 text-xs font-semibold">
              {leadSig?.name} Lead Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Domain Lead Suite</h1>
        </div>

        <div className="flex items-center gap-1 bg-[#0c1222] border border-zinc-800 p-1 rounded-xl shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'roster' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Roster ({domainMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tasks' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Tasks ({groupedDeliverables.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'requests' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Requests</span>
            {pendingRequests.length > 0 && (
              <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: ASSIGN FORM */}
        <div className="lg:col-span-1 bg-[#0c1222] border border-zinc-800 rounded-xl p-6 h-fit shadow-sm">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-400" />
            Assign Deliverable
          </h2>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Deliverable Title</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Implement CNN" className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Guidelines..." className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Assignment Mode</label>
              <div className="grid grid-cols-3 gap-1 bg-[#070b14] p-1 rounded-lg border border-zinc-800 mb-3">
                <button type="button" onClick={() => setAssignmentMode('INDIVIDUAL')} className={`py-1 text-xs font-medium rounded ${assignmentMode === 'INDIVIDUAL' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}>Individual</button>
                <button type="button" onClick={() => setAssignmentMode('SEMESTER')} className={`py-1 text-xs font-medium rounded ${assignmentMode === 'SEMESTER' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}>Semester</button>
                <button type="button" onClick={() => setAssignmentMode('ALL')} className={`py-1 text-xs font-medium rounded ${assignmentMode === 'ALL' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}>All Domain</button>
              </div>

              {assignmentMode === 'INDIVIDUAL' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Member</label>
                  <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600">
                    {domainMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>{m.fullName} ({m.semester})</option>
                    ))}
                  </select>
                </div>
              )}

              {assignmentMode === 'SEMESTER' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Semester</label>
                  <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600">
                    <option value="Sem 1">Semester 1</option>
                    <option value="Sem 2">Semester 2</option>
                    <option value="Sem 3">Semester 3</option>
                    <option value="Sem 4">Semester 4</option>
                  </select>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-zinc-400">Milestone Steps</label>
                <button type="button" onClick={handleAddSubtaskInput} className="text-xs text-blue-400 hover:text-blue-300 font-medium">+ Add Step</button>
              </div>
              <div className="space-y-2">
                {subtaskList.map((st, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-mono w-4">{index + 1}.</span>
                    <input type="text" placeholder={`Step ${index + 1}`} value={st} onChange={(e) => handleSubtaskChange(index, e.target.value)} className="flex-1 bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600" />
                    {subtaskList.length > 1 && (
                      <button type="button" onClick={() => handleRemoveSubtaskInput(index)} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={submitting || (assignmentMode === 'INDIVIDUAL' && domainMembers.length === 0)} className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Publish Deliverable</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* VIEW 1: ROSTER */}
          {activeTab === 'roster' && (
            <div className="bg-[#0c1222] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-semibold text-white text-base">Member Roster</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#070b14] border-b border-zinc-800 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Member Info</th>
                      <th className="px-6 py-4">Semester</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Milestones</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {domainMembers.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No members assigned.</td></tr>
                    ) : (
                      domainMembers.map((member) => (
                        <tr key={member.userId} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-zinc-200">{member.fullName}</span>
                              <span className="text-xs text-zinc-500 uppercase">{member.rollNumber}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-400">{member.semester}</td>
                          <td className="px-6 py-4">
                            {member.sigRole === 'LEAD' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-400 text-xs font-semibold">Lead</span>
                            ) : (<span className="text-xs text-zinc-400">Member</span>)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-32">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-500">{member.completedSubtasks}/{member.totalSubtasks}</span>
                                <span className="text-blue-400 font-mono">{member.progressPercent}%</span>
                              </div>
                              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${member.progressPercent}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {member.sigRole !== 'LEAD' && (
                              <button
                                onClick={() => handleRemoveMember(member.userId, member.fullName)}
                                disabled={actionLoadingId === member.userId}
                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                title="Remove member from SIG"
                              >
                                {actionLoadingId === member.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {groupedDeliverables.length === 0 ? (
                <div className="bg-[#0c1222] border border-zinc-800 rounded-xl p-12 text-center text-zinc-500 text-sm">No deliverables assigned.</div>
              ) : (
                groupedDeliverables.map((group) => {
                  const key = `${group.title}__${group.due_date}`;
                  const isExpanded = expandedDeliverable === key;

                  return (
                    <div key={key} className="bg-[#0c1222] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-5 flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-semibold text-white text-base">{group.title}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">{group.priority}</span>
                          </div>
                          {group.description && <p className="text-xs text-zinc-400">{group.description}</p>}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-1">
                            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /><strong className="text-zinc-200">{group.members.length} Assigned</strong></span>
                            {group.due_date && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{group.due_date}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleOpenEdit(group)} className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteGroupedDeliverable(group.taskIds)} className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-900/30 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>

                      <div className="bg-[#070b14] px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400">Total Completion:</span>
                          <div className="w-28 h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${group.overallPct}%` }} /></div>
                          <span className="text-xs font-mono text-blue-400 font-semibold">{group.overallPct}%</span>
                        </div>
                        <button onClick={() => setExpandedDeliverable(isExpanded ? null : key)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-medium px-2 py-1 rounded-md transition-colors">
                          <span>{isExpanded ? 'Hide Breakdown' : 'View Breakdown'}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="divide-y divide-zinc-800/50 bg-[#070b14] p-5 space-y-4">
                          {group.members.map((member) => (
                            <div key={member.taskId} className="pt-3 first:pt-0 space-y-2">
                              <div className="flex items-center justify-between">
                                <div><span className="text-xs font-semibold text-zinc-200">{member.name}</span><span className="text-[11px] text-zinc-500 ml-2 font-mono uppercase">{member.rollNumber}</span></div>
                                <div className="flex items-center gap-2"><span className="text-xs text-zinc-400">{member.completedCount}/{member.totalCount} completed</span><span className="text-xs font-mono text-emerald-400 font-semibold">{member.pct}%</span></div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-2">
                                {member.subtasks.map((st, idx) => (
                                  <div key={st.id || idx} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md border ${st.is_completed ? 'bg-emerald-900/20 border-emerald-900/50 text-emerald-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'}`}>
                                    {st.is_completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <Circle className="h-3.5 w-3.5 text-zinc-600 shrink-0" />}
                                    <span className={st.is_completed ? 'line-through text-zinc-500' : ''}>{st.title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 3: REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="bg-[#0c1222] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-zinc-800">
                  <h2 className="font-semibold text-white text-base">Pending Enrollment Requests</h2>
                </div>
                {pendingRequests.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 text-sm">No pending requests.</div>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="p-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-zinc-200 text-sm">{req.fullName}</p>
                          <p className="text-xs text-zinc-500 uppercase">{req.rollNumber} • Sem {req.semester}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRejectRequest(req)} disabled={actionLoadingId === req.userId} className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors flex items-center gap-1">
                            <X className="h-3.5 w-3.5 text-red-400" /><span>Decline</span>
                          </button>
                          <button onClick={() => handleApproveRequest(req)} disabled={actionLoadingId === req.userId} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1">
                            {actionLoadingId === req.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
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
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingDeliverable && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-zinc-800 rounded-xl w-full max-w-lg p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2"><Pencil className="h-4 w-4" /> Edit Deliverable</h3>
              <button onClick={() => setEditingDeliverable(null)} className="text-zinc-400 hover:text-white p-1"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
                <input type="text" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
                <textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Due Date</label>
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as any)} className="w-full bg-[#070b14] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button type="button" onClick={() => setEditingDeliverable(null)} className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                  {editSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}