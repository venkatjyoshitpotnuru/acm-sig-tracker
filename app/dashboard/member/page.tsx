'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Layers,
  Clock,
  Loader2,
  AlertCircle,
  FolderGit2
} from 'lucide-react';

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  created_at?: string;
}

interface MemberTask {
  id: string;
  sig_id: string;
  title: string;
  description: string;
  due_date: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigned_to: string;
  subtasks: Subtask[];
}

interface SigDomain {
  id: string;
  name: string;
  description: string;
}

interface SigMembership {
  id: string;
  user_id: string;
  sig_id: string;
  status: 'PENDING' | 'APPROVED';
  role: 'MEMBER' | 'LEAD';
  semester?: number;
}

export default function MemberDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);

  const [domains, setDomains] = useState<SigDomain[]>([]);
  const [memberships, setMemberships] = useState<SigMembership[]>([]);
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [requestingSigId, setRequestingSigId] = useState<string | null>(null);
  const [togglingSubtaskId, setTogglingSubtaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberDashboard();
  }, []);

  const fetchMemberDashboard = async () => {
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

    // Fetch domains, memberships, tasks assigned to this member, and subtasks
    const [
      { data: sigsData },
      { data: memsData },
      { data: tasksData },
      { data: subtasksData }
    ] = await Promise.all([
      supabase.from('sigs').select('*').order('name', { ascending: true }),
      supabase.from('sig_memberships').select('*').eq('user_id', uid),
      supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', uid)
        .order('created_at', { ascending: false }),
      // CRITICAL: Explicit ascending order by created_at ensures chronological milestone steps
      supabase
        .from('subtasks')
        .select('*')
        .order('created_at', { ascending: true })
    ]);

    setDomains(sigsData || []);
    setMemberships(memsData || []);

    const subList: Subtask[] = subtasksData || [];
    const taskList: MemberTask[] = (tasksData || []).map((t: any) => ({
      ...t,
      subtasks: subList.filter((s) => s.task_id === t.id)
    }));

    setTasks(taskList);
    setLoading(false);
  };

  // Toggle Subtask Completion
  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean, taskId: string) => {
    setTogglingSubtaskId(subtaskId);

    // Optimistic UI update
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, is_completed: !currentStatus } : st
          )
        };
      })
    );

    const { error } = await supabase
      .from('subtasks')
      .update({ is_completed: !currentStatus })
      .eq('id', subtaskId);

    if (error) {
      alert('Failed to update milestone: ' + error.message);
      await fetchMemberDashboard();
    }

    setTogglingSubtaskId(null);
  };

  // Request to Join Domain
  const handleRequestDomainJoin = async (sigId: string) => {
    if (!currentUserId) return;
    setRequestingSigId(sigId);

    const { error } = await supabase.from('sig_memberships').insert({
      user_id: currentUserId,
      sig_id: sigId,
      status: 'PENDING',
      role: 'MEMBER',
      semester: selectedSemester
    });

    if (error) {
      alert('Could not submit request: ' + error.message);
    } else {
      await fetchMemberDashboard();
    }

    setRequestingSigId(null);
  };

  // Aggregated Metrics Calculations
  const approvedDomainsCount = useMemo(() => {
    return memberships.filter((m) => m.status === 'APPROVED').length;
  }, [memberships]);

  const { overallPercentage } = useMemo(() => {
    let totalSubs = 0;
    let completedSubs = 0;

    tasks.forEach((t) => {
      totalSubs += t.subtasks.length;
      completedSubs += t.subtasks.filter((s) => s.is_completed).length;
    });

    const pct = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
    return { overallPercentage: pct, totalSubs, completedSubs };
  }, [tasks]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER & SEMESTER SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-950/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Workspace</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Track your deliverables, domain enrollments, and semester milestones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Current Semester:</span>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(Number(e.target.value))}
            className="bg-[#0c1222] border border-blue-950/80 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-700"
          >
            <option value={1}>Sem 1</option>
            <option value={2}>Sem 2</option>
            <option value={3}>Sem 3</option>
            <option value={4}>Sem 4</option>
          </select>
        </div>
      </div>

      {/* METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            Enrolled Domains
          </span>
          <p className="text-3xl font-bold text-white mt-1.5">{approvedDomainsCount}</p>
        </div>

        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            Total Deliverables
          </span>
          <p className="text-3xl font-bold text-white mt-1.5">{tasks.length}</p>
        </div>

        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Overall Progress
            </span>
            <span className="text-xs font-mono text-blue-400 font-semibold">{overallPercentage}%</span>
          </div>
          <div className="space-y-1.5 mt-2">
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>Completion Rate</span>
              <span>{overallPercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: ASSIGNED DELIVERABLES & STEP CHECKLISTS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Assigned Deliverables</h2>
            <span className="text-xs text-zinc-400 font-mono">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-16 text-center text-zinc-500 text-sm">
              You have no pending deliverables.
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const completedSubs = task.subtasks.filter((s) => s.is_completed).length;
                const totalSubs = task.subtasks.length;
                const taskPct = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

                return (
                  <div
                    key={task.id}
                    className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg space-y-4 hover:border-blue-900/50 transition-colors"
                  >
                    {/* Deliverable Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-zinc-100 text-base">{task.title}</h3>
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
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {task.due_date && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/60 border border-zinc-800 px-2.5 py-1 rounded-md shrink-0">
                          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{task.due_date}</span>
                        </div>
                      )}
                    </div>

                    {/* Deliverable Milestone Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400 text-[11px]">Milestones</span>
                        <span className="text-blue-400 font-mono text-[11px] font-medium">
                          {taskPct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${taskPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Milestone Checklist (Strict Chronological Insertion Sequence) */}
                    {task.subtasks.length > 0 && (
                      <div className="pt-2 border-t border-blue-950/40 space-y-2">
                        {task.subtasks.map((st) => {
                          const isBusy = togglingSubtaskId === st.id;
                          return (
                            <button
                              key={st.id}
                              onClick={() => handleToggleSubtask(st.id, st.is_completed, task.id)}
                              disabled={isBusy}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left text-xs transition-colors ${
                                st.is_completed
                                  ? 'bg-blue-950/20 text-zinc-400 hover:bg-blue-950/30'
                                  : 'bg-[#070b14]/60 text-zinc-200 hover:bg-[#070b14] border border-blue-950/30'
                              }`}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-400 shrink-0" />
                              ) : st.is_completed ? (
                                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-zinc-600 shrink-0" />
                              )}
                              <span
                                className={`flex-1 ${
                                  st.is_completed ? 'line-through text-zinc-500' : ''
                                }`}
                              >
                                {st.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DOMAIN HUB & JOIN REQUESTS */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Domain Hub</h2>

          <div className="space-y-3">
            {domains.map((domain) => {
              const mem = memberships.find((m) => m.sig_id === domain.id);
              const isApproved = mem?.status === 'APPROVED';
              const isPending = mem?.status === 'PENDING';
              const isLead = mem?.role === 'LEAD';
              const isSubmitting = requestingSigId === domain.id;

              return (
                <div
                  key={domain.id}
                  className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg space-y-3"
                >
                  <div>
                    <h3 className="font-semibold text-zinc-200 text-sm">{domain.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                      {domain.description}
                    </p>
                  </div>

                  <div>
                    {isApproved ? (
                      <div className="w-full py-2 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg text-center flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Enrolled {isLead ? 'as LEAD' : 'as Member'}</span>
                      </div>
                    ) : isPending ? (
                      <div className="w-full py-2 bg-amber-950/30 border border-amber-500/30 text-amber-400 text-xs font-medium rounded-lg text-center flex items-center justify-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Pending Chair Approval</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRequestDomainJoin(domain.id)}
                        disabled={isSubmitting}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        <span>Request to Join &rarr;</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}