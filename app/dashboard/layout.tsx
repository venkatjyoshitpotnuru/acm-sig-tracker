'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Layers, CheckCircle2, Clock, CheckSquare, Square } from 'lucide-react';

interface Sig {
  id: string;
  name: string;
  description: string;
}

interface Membership {
  sig_id: string;
  status: string; // 'PENDING' | 'APPROVED'
  role: string;
  semester: string | number | null;
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
  subtasks: Subtask[];
}

export default function StudentDashboard() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [sigs, setSigs] = useState<Sig[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [semester, setSemester] = useState<string>('3');
  const [loading, setLoading] = useState(true);
  const [requestingSigId, setRequestingSigId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentWorkspace();
  }, []);

  const fetchStudentWorkspace = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const uid = session.user.id;
    setUserId(uid);

    const [
      { data: sigsData },
      { data: memData },
      { data: tasksData },
      { data: subtasksData }
    ] = await Promise.all([
      supabase.from('sigs').select('*').order('name', { ascending: true }),
      supabase.from('sig_memberships').select('*').eq('user_id', uid),
      supabase.from('tasks').select('*').eq('assigned_to', uid),
      supabase.from('subtasks').select('*')
    ]);

    setSigs(sigsData || []);
    setMemberships(memData || []);

    if (memData && memData.length > 0 && memData[0].semester) {
      setSemester(String(memData[0].semester));
    }

    const allSubtasks: Subtask[] = subtasksData || [];
    const userTasks: Task[] = (tasksData || []).map((t: any) => ({
      ...t,
      subtasks: allSubtasks.filter((st) => st.task_id === t.id)
    }));
    setTasks(userTasks);
    setLoading(false);
  };

  const handleRequestToJoin = async (sigId: string) => {
    if (!userId) return;
    setRequestingSigId(sigId);

    const { error } = await supabase.from('sig_memberships').insert({
      user_id: userId,
      sig_id: sigId,
      role: 'MEMBER',
      status: 'PENDING',
      semester: semester
    });

    if (error) {
      alert('Error requesting domain: ' + error.message);
    } else {
      await fetchStudentWorkspace();
    }
    setRequestingSigId(null);
  };

  const handleToggleSubtask = async (st: Subtask) => {
    const newVal = !st.is_completed;
    await supabase
      .from('subtasks')
      .update({
        is_completed: newVal,
        completed_at: newVal ? new Date().toISOString() : null
      })
      .eq('id', st.id);
    await fetchStudentWorkspace();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const approvedMemberships = memberships.filter((m) => m.status === 'APPROVED');
  const totalSubtasks = tasks.reduce((acc, t) => acc + t.subtasks.length, 0);
  const completedSubtasks = tasks.reduce(
    (acc, t) => acc + t.subtasks.filter((st) => st.is_completed).length,
    0
  );
  const overallProgress =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/40 border border-blue-900/60 text-xs font-medium text-blue-300 w-fit mb-2">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Student Portal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">My Workspace</h1>
          <p className="text-sm text-zinc-400">
            Track your deliverables, domain enrollments, and semester milestones.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0c1222] border border-blue-950/70 px-3.5 py-2 rounded-xl w-fit">
          <span className="text-xs text-zinc-400">Current Semester:</span>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="bg-[#070b14] border border-blue-950/80 rounded px-2 py-1 text-xs text-white focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={String(s)}>
                Sem {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Enrolled Domains
          </h3>
          <p className="text-3xl font-bold text-white">{approvedMemberships.length}</p>
        </div>
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Total Deliverables
          </h3>
          <p className="text-3xl font-bold text-white">{tasks.length}</p>
        </div>
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Overall Progress
          </h3>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-zinc-400">Completion Rate</span>
              <span className="text-blue-400 font-medium">{overallProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deliverables */}
        <div className="lg:col-span-2 bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-6 shadow-lg space-y-4">
          <h3 className="text-base font-semibold text-white">Assigned Deliverables</h3>
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl">
              You have no pending deliverables.
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl bg-[#070b14]/70 border border-zinc-800/80 space-y-3"
                >
                  <div>
                    <h4 className="font-semibold text-white text-sm">{task.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1">{task.description}</p>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                    {task.subtasks.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => handleToggleSubtask(st)}
                        className="w-full flex items-center gap-2 text-left text-xs text-zinc-300 hover:text-white py-1"
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

        {/* Domain Hub */}
        <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl p-6 shadow-lg space-y-4">
          <h3 className="text-base font-semibold text-white">Domain Hub</h3>
          <div className="space-y-3">
            {sigs.map((sig) => {
              const existingRecord = memberships.find((m) => m.sig_id === sig.id);
              const isPending = existingRecord?.status === 'PENDING';
              const isApproved = existingRecord?.status === 'APPROVED';

              return (
                <div
                  key={sig.id}
                  className="p-4 rounded-xl bg-[#070b14]/60 border border-zinc-800/80 space-y-3"
                >
                  <div>
                    <h4 className="font-semibold text-white text-sm">{sig.name}</h4>
                    <p className="text-xs text-zinc-400 mt-1">{sig.description}</p>
                  </div>

                  {isApproved ? (
                    <div className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Enrolled</span>
                    </div>
                  ) : isPending ? (
                    <div className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Pending Chair Approval</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRequestToJoin(sig.id)}
                      disabled={requestingSigId === sig.id}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      {requestingSigId === sig.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span>Request to Join →</span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}