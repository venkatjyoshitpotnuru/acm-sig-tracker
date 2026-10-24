'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
// FIXED: Added Check to the imports list
import { BookOpen, CheckCircle2, Circle, Calendar, ArrowRight, Clock, AlertCircle, Check } from 'lucide-react';

interface SigItem { id: string; name: string; description: string; }
interface Membership { sig_id: string; role: string; status: string; semester: string; }
interface Subtask { id: string; task_id: string; title: string; is_completed: boolean; }
interface TaskItem { id: string; sig_id: string; title: string; description: string; due_date: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; subtasks: Subtask[]; }

export default function MemberDashboard() {
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sigs, setSigs] = useState<SigItem[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [semesterFilter, setSemesterFilter] = useState('1'); 

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [
        { data: allSigs },
        { data: myMemberships },
        { data: myTasks }
      ] = await Promise.all([
        supabase.from('sigs').select('*'),
        supabase.from('sig_memberships').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('assigned_to', user.id)
      ]);

      setSigs(allSigs || []);
      setMemberships(myMemberships || []);

      const taskList = myTasks || [];
      const taskIds = taskList.map(t => t.id);
      
      let subtasksList: Subtask[] = [];
      if (taskIds.length > 0) {
        const { data: stData } = await supabase.from('subtasks').select('*').in('task_id', taskIds);
        if (stData) subtasksList = stData as Subtask[];
      }

      setTasks(taskList.map(t => ({
        ...t,
        subtasks: subtasksList.filter(st => st.task_id === t.id).sort((a, b) => a.id.localeCompare(b.id))
      })));

    } catch (error: any) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const channel = supabase.channel('member-portal-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sig_memberships' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const handleRequestJoin = async (sigId: string) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase.from('sig_memberships').insert({
        user_id: currentUserId,
        sig_id: sigId,
        role: 'MEMBER',
        status: 'PENDING',
        semester: semesterFilter
      });
      
      if (error) throw error;
      toast.success('Join request sent successfully.');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request.');
    }
  };

  const toggleSubtask = async (taskId: string, subtaskId: string, currentState: boolean) => {
    const nextState = !currentState;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: t.subtasks.map(st => st.id === subtaskId ? { ...st, is_completed: nextState } : st) } : t));
    
    try {
      const { error } = await supabase.from('subtasks').update({ 
        is_completed: nextState, 
        completed_at: nextState ? new Date().toISOString() : null 
      }).eq('id', subtaskId);
      
      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to update task.');
      loadData(); 
    }
  };

  const activeDomains = useMemo(() => memberships.filter(m => m.status === 'APPROVED'), [memberships]);
  const activeSigsCount = activeDomains.length;
  const totalTasks = tasks.length;
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  tasks.forEach(t => {
    totalSubtasks += t.subtasks.length;
    completedSubtasks += t.subtasks.filter(st => st.is_completed).length;
  });
  const overallProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-zinc-500 text-sm font-medium">Loading workspace...</div>;

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-800/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 mb-3">
            <BookOpen className="h-3.5 w-3.5 text-blue-500" /> Student Portal
          </div>
          <h2 className="text-3xl font-semibold text-zinc-100 tracking-tight">My Workspace</h2>
          <p className="text-sm text-zinc-500 mt-1">Track your deliverables, domain enrollments, and semester milestones.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800/60 p-6 rounded-xl">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Enrolled Domains</p>
          <p className="text-3xl font-semibold text-zinc-100">{activeSigsCount}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/60 p-6 rounded-xl">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Total Deliverables</p>
          <p className="text-3xl font-semibold text-zinc-100">{totalTasks}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/60 p-6 rounded-xl">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Overall Progress</p>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-semibold text-zinc-100">{overallProgress}%</p>
            <div className="flex-1 pb-1.5">
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-semibold text-zinc-100">Assigned Deliverables</h3>
          {tasks.length === 0 ? (
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-10 text-center text-zinc-500 text-sm">
              You have no pending deliverables. Request to join a domain to receive assignments.
            </div>
          ) : (
            <div className="grid gap-4">
              {tasks.map(task => {
                const cCount = task.subtasks.filter(st => st.is_completed).length;
                const tCount = task.subtasks.length;
                const percent = tCount > 0 ? Math.round((cCount / tCount) * 100) : 0;
                
                return (
                  <div key={task.id} className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-6 transition shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h4 className="text-base font-semibold text-zinc-100">{task.title}</h4>
                        {task.description && <p className="text-sm text-zinc-400 mt-1">{task.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800">
                          <Calendar className="h-3 w-3" /> {task.due_date}
                        </span>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-medium border ${task.priority === 'HIGH' ? 'bg-red-500/10 border-red-500/20 text-red-400' : task.priority === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-5 mb-4">
                      <div className="flex justify-between text-xs font-medium text-zinc-500 mb-1.5">
                        <span>Milestones</span>
                        <span className="text-zinc-300">{percent}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-zinc-800/60 mt-4">
                      {task.subtasks.map(st => (
                        <button 
                          key={st.id} 
                          onClick={() => toggleSubtask(task.id, st.id, st.is_completed)}
                          className="w-full flex items-center gap-3 text-left p-2.5 -mx-2.5 rounded-lg hover:bg-zinc-800/50 transition group"
                        >
                          {st.is_completed ? <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" /> : <Circle className="h-5 w-5 text-zinc-600 shrink-0 group-hover:text-zinc-400 transition-colors" />}
                          <span className={`text-sm font-medium ${st.is_completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                            {st.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Domains Hub */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-100">Domain Hub</h3>
            <select 
              value={semesterFilter} 
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md px-2.5 py-1 text-xs outline-none focus:border-zinc-600 transition"
            >
              {[1,2,3,4,5,6,7,8].map(sem => (
                <option key={sem} value={sem.toString()}>Semester {sem}</option>
              ))}
            </select>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-zinc-800/60">
              {sigs.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-sm">No domains available.</div>
              ) : (
                sigs.map(sig => {
                  const mem = memberships.find(m => m.sig_id === sig.id);
                  const isPending = mem?.status === 'PENDING';
                  const isApproved = mem?.status === 'APPROVED';

                  return (
                    <div key={sig.id} className="p-5 flex flex-col gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-100">{sig.name}</h4>
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">{sig.description}</p>
                      </div>
                      
                      <div className="pt-2">
                        {isApproved ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-300">
                            <Check className="h-3 w-3" /> Enrolled as {mem.role}
                          </div>
                        ) : isPending ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                            <Clock className="h-3 w-3" /> Request Pending Review
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleRequestJoin(sig.id)}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium transition shadow-sm"
                          >
                            Request to Join <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
             <h4 className="text-sm font-medium text-zinc-200 flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 text-zinc-500" /> Need Help?</h4>
             <p className="text-xs text-zinc-500 leading-relaxed">If your request has been pending for over 48 hours, please contact your Domain Lead or the Chapter Chair.</p>
          </div>
        </div>
      </div>
    </div>
  );
}