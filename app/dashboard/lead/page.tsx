'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface Subtask {
  id?: string;
  title: string;
  is_completed: boolean;
}

interface DomainMember {
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

export default function LeadDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Lead Domain Info
  const [leadSig, setLeadSig] = useState<{ id: string; name: string } | null>(null);
  const [domainMembers, setDomainMembers] = useState<DomainMember[]>([]);
  const [tasks, setTasks] = useState<SigTask[]>([]);

  // Task Creation Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [assignmentMode, setAssignmentMode] = useState<'INDIVIDUAL' | 'SEMESTER' | 'ALL'>('INDIVIDUAL');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Sem 1');
  const [subtaskList, setSubtaskList] = useState<string[]>(['']);

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

    const currentUserId = session.user.id;

    // 1. Fetch Lead membership to identify which SIG this user leads
    const { data: leadMembership, error: leadError } = await supabase
      .from('sig_memberships')
      .select('sig_id, role, sigs(id, name)')
      .eq('user_id', currentUserId)
      .eq('role', 'LEAD')
      .eq('status', 'APPROVED')
      .maybeSingle();

    if (leadError || !leadMembership || !leadMembership.sigs) {
      // If user is not an approved Lead of any SIG, bounce to member dashboard
      router.replace('/dashboard/member');
      return;
    }

    const activeSig = Array.isArray(leadMembership.sigs)
      ? leadMembership.sigs[0]
      : (leadMembership.sigs as any);

    setLeadSig({ id: activeSig.id, name: activeSig.name });

    // 2. Fetch ONLY members belonging to THIS specific SIG
    const [
      { data: membershipsData },
      { data: profilesData },
      { data: tasksData },
      { data: subtasksData }
    ] = await Promise.all([
      supabase
        .from('sig_memberships')
        .select('*')
        .eq('sig_id', activeSig.id)
        .eq('status', 'APPROVED'),
      supabase.from('profiles').select('*'),
      supabase
        .from('tasks')
        .select('*')
        .eq('sig_id', activeSig.id)
        .order('created_at', { ascending: false }),
      supabase.from('subtasks').select('*')
    ]);

    const profs = profilesData || [];
    const members: DomainMember[] = (membershipsData || []).map((m: any) => {
      const p = profs.find((prof: any) => prof.id === m.user_id);
      return {
        userId: m.user_id,
        fullName: p?.full_name || 'ACM Member',
        rollNumber: p?.roll_number || (p?.email ? p.email.split('@')[0].toUpperCase() : 'N/A'),
        semester: m.semester ? `Sem ${m.semester}` : 'Sem 1'
      };
    });

    setDomainMembers(members);

    // Default first member for dropdown if available
    if (members.length > 0) {
      setSelectedMemberId(members[0].userId);
    }

    // 3. Attach subtasks to tasks
    const subs: Subtask[] = subtasksData || [];
    const fullTasks: SigTask[] = (tasksData || []).map((t: any) => {
      const assignedProf = profs.find((p: any) => p.id === t.assigned_to);
      return {
        ...t,
        assigneeName: assignedProf?.full_name || 'Assigned Member',
        subtasks: subs.filter((s: any) => s.task_id === t.id)
      };
    });

    setTasks(fullTasks);
    setLoading(false);
  };

  const handleAddSubtaskInput = () => {
    setSubtaskList([...subtaskList, '']);
  };

  const handleSubtaskChange = (index: number, val: string) => {
    const updated = [...subtaskList];
    updated[index] = val;
    setSubtaskList(updated);
  };

  const handleRemoveSubtaskInput = (index: number) => {
    setSubtaskList(subtaskList.filter((_, i) => i !== index));
  };

  // --- STRICT TASK ASSIGNMENT LOGIC ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadSig) return;
    if (!title.trim()) {
      alert('Task title is required.');
      return;
    }

    // Calculate target assignees strictly from domainMembers
    let targetAssigneeIds: string[] = [];

    if (assignmentMode === 'INDIVIDUAL') {
      if (!selectedMemberId) {
        alert('Please select a member to assign this task.');
        return;
      }
      targetAssigneeIds = [selectedMemberId];
    } else if (assignmentMode === 'SEMESTER') {
      targetAssigneeIds = domainMembers
        .filter((m) => m.semester === selectedSemester)
        .map((m) => m.userId);

      if (targetAssigneeIds.length === 0) {
        alert(`No members in ${selectedSemester} found for ${leadSig.name}.`);
        return;
      }
    } else if (assignmentMode === 'ALL') {
      targetAssigneeIds = domainMembers.map((m) => m.userId);
      if (targetAssigneeIds.length === 0) {
        alert(`No members enrolled in ${leadSig.name}.`);
        return;
      }
    }

    // Verify all targets belong to this SIG
    const validDomainUserIds = new Set(domainMembers.map((m) => m.userId));
    const allValid = targetAssigneeIds.every((uid) => validDomainUserIds.has(uid));
    if (!allValid) {
      alert('Security violation: Attempted to assign task to a non-domain member.');
      return;
    }

    setSubmitting(true);

    try {
      // Insert individual tasks for each target member
      for (const uid of targetAssigneeIds) {
        const { data: insertedTask, error: taskErr } = await supabase
          .from('tasks')
          .insert({
            sig_id: leadSig.id, // Strictly tied to Lead's SIG
            assigned_to: uid,    // Strictly a member of this SIG
            title,
            description,
            due_date: dueDate || null,
            priority
          })
          .select()
          .single();

        if (taskErr) throw taskErr;

        // Insert subtasks if provided
        const cleanSubtasks = subtaskList
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        if (cleanSubtasks.length > 0 && insertedTask) {
          const subtaskPayload = cleanSubtasks.map((stTitle) => ({
            task_id: insertedTask.id,
            title: stTitle,
            is_completed: false
          }));

          const { error: subErr } = await supabase.from('subtasks').insert(subtaskPayload);
          if (subErr) throw subErr;
        }
      }

      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('MEDIUM');
      setSubtaskList(['']);
      await fetchLeadDashboard();
    } catch (err: any) {
      alert('Failed to assign task: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this deliverable?')) return;
    await supabase.from('subtasks').delete().eq('task_id', taskId);
    await supabase.from('tasks').delete().eq('id', taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
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
      <div className="border-b border-blue-950/60 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            {leadSig?.name} Lead Portal
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Domain Deliverables &amp; Tasks</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Assign milestones and oversee task completion strictly for members enrolled in {leadSig?.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TASK CREATION FORM */}
        <div className="lg:col-span-1 bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-6 shadow-xl h-fit">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-400" />
            Assign Deliverable
          </h2>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Deliverable Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Implement CNN Architecture"
                className="w-full bg-[#070b14] border border-blue-950/70 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief guidelines or resource links..."
                className="w-full bg-[#070b14] border border-blue-950/70 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#070b14] border border-blue-950/70 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-[#070b14] border border-blue-950/70 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-700"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            {/* ASSIGNMENT SCOPE */}
            <div className="border-t border-blue-950/60 pt-4">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Assignment Mode</label>
              <div className="grid grid-cols-3 gap-1 bg-[#070b14] p-1 rounded-lg border border-blue-950/70 mb-3">
                <button
                  type="button"
                  onClick={() => setAssignmentMode('INDIVIDUAL')}
                  className={`py-1 text-xs font-medium rounded ${
                    assignmentMode === 'INDIVIDUAL' ? 'bg-blue-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode('SEMESTER')}
                  className={`py-1 text-xs font-medium rounded ${
                    assignmentMode === 'SEMESTER' ? 'bg-blue-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  Semester
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode('ALL')}
                  className={`py-1 text-xs font-medium rounded ${
                    assignmentMode === 'ALL' ? 'bg-blue-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  All {leadSig?.name}
                </button>
              </div>

              {/* TARGET MEMBER DROPDOWN (Strictly filtered to this SIG) */}
              {assignmentMode === 'INDIVIDUAL' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Select {leadSig?.name} Member
                  </label>
                  {domainMembers.length === 0 ? (
                    <p className="text-xs text-amber-400">No members approved in this SIG yet.</p>
                  ) : (
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full bg-[#070b14] border border-blue-950/70 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-700"
                    >
                      {domainMembers.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.fullName} ({m.rollNumber} • {m.semester})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {assignmentMode === 'SEMESTER' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Target Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full bg-[#070b14] border border-blue-950/70 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-700"
                  >
                    <option value="Sem 1">Semester 1</option>
                    <option value="Sem 2">Semester 2</option>
                    <option value="Sem 3">Semester 3</option>
                    <option value="Sem 4">Semester 4</option>
                  </select>
                </div>
              )}
            </div>

            {/* CHECKLIST / SUBTASKS */}
            <div className="border-t border-blue-950/60 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-zinc-400">Subtask Milestones</label>
                <button
                  type="button"
                  onClick={handleAddSubtaskInput}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  + Add Step
                </button>
              </div>

              <div className="space-y-2">
                {subtaskList.map((st, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Milestone ${index + 1}`}
                      value={st}
                      onChange={(e) => handleSubtaskChange(index, e.target.value)}
                      className="flex-1 bg-[#070b14] border border-blue-950/70 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-700"
                    />
                    {subtaskList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtaskInput(index)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || (assignmentMode === 'INDIVIDUAL' && domainMembers.length === 0)}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Publish Deliverable</span>
            </button>
          </form>
        </div>

        {/* ACTIVE DOMAIN DELIVERABLES LIST */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Current {leadSig?.name} Deliverables ({tasks.length})
            </h2>
            <span className="text-xs text-zinc-400">
              {domainMembers.length} Active {leadSig?.name} Members
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-12 text-center text-zinc-500 text-sm">
              No tasks currently assigned in {leadSig?.name}. Use the form on the left to assign work to members.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const completedSubs = task.subtasks.filter((s) => s.is_completed).length;
                const totalSubs = task.subtasks.length;
                const pct = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

                return (
                  <div
                    key={task.id}
                    className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-md hover:border-blue-900/60 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-zinc-100 text-sm">{task.title}</h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              task.priority === 'HIGH'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : task.priority === 'MEDIUM'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-zinc-400 leading-relaxed">{task.description}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Delete Deliverable"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-blue-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-4 text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-blue-400" />
                          <strong className="text-zinc-300 font-medium">{task.assigneeName}</strong>
                        </span>
                        {task.due_date && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                            {task.due_date}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500">
                          Milestones: <strong className="text-zinc-300">{completedSubs}/{totalSubs}</strong>
                        </span>
                        <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-blue-400 font-mono text-[11px]">{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}