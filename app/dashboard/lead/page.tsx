'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Users, Calendar, CheckCircle2, Circle, ListTodo, Pencil, Trash2,
  Search, AlertTriangle, Check, X, Clock, Eye, UserMinus, Layers
} from 'lucide-react';

interface Subtask { id: string; task_id: string; title: string; is_completed: boolean; }
interface TaskItem { id: string; title: string; description: string; due_date: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; assigned_to: string; assignee_name?: string; subtasks: Subtask[]; }
interface MemberProgress { userId: string; name: string; rollNumber: string; semester: string; completedTasks: number; totalTasks: number; percent: number; }
interface PendingRequest { userId: string; name: string; rollNumber: string; semester: string; }

export default function LeadDashboard() {
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sigName, setSigName] = useState<string>('My Domain');
  const [sigId, setSigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'manage' | 'personal' | 'requests'>('manage');
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Task Modal State & Bulk Assignment
  const [showModal, setShowModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  
  // NEW: Bulk Assignment States
  const [assignmentMode, setAssignmentMode] = useState<'INDIVIDUAL' | 'SEMESTER' | 'ALL'>('INDIVIDUAL');
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('1');

  const [subtasks, setSubtasks] = useState<{ id?: string; title: string; is_completed?: boolean }[]>([{ title: '' }]);
  const [submitting, setSubmitting] = useState(false);

  const [deletingTask, setDeletingTask] = useState<TaskItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);

  const loadLeadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUserId(user.id);

    const { data: leadMembership } = await supabase.from('sig_memberships').select('sig_id, sigs(name)').eq('user_id', user.id).in('role', ['LEAD', 'CO_LEAD']).maybeSingle();
    const activeSigId = leadMembership?.sig_id;
    if (!activeSigId) { setLoading(false); return; }
    setSigId(activeSigId);
    setSigName((leadMembership?.sigs as any)?.name || 'Domain Management');

    const { data: sigMembers } = await supabase.from('sig_memberships').select('user_id, status, semester, profiles:user_id (id, full_name, roll_number)').eq('sig_id', activeSigId);
    const { data: sigTasks } = await supabase.from('tasks').select('*').eq('sig_id', activeSigId);
    const taskList = sigTasks || [];
    const taskIds = taskList.map((t) => t.id);

    let subtasksList: Subtask[] = [];
    if (taskIds.length > 0) {
      const { data: stData } = await supabase.from('subtasks').select('*').in('task_id', taskIds);
      if (stData) subtasksList = stData as Subtask[];
    }

    const allMembers = sigMembers || [];
    const memberMap = new Map<string, { name: string; rollNumber: string }>();
    allMembers.forEach((m: any) => { if (m.profiles) memberMap.set(m.profiles.id, { name: m.profiles.full_name || 'Member', rollNumber: m.profiles.roll_number || 'N/A' }); });

    const compiledTasks: TaskItem[] = taskList.map((t) => ({
      ...t, assignee_name: memberMap.get(t.assigned_to)?.name || 'Domain Member',
      subtasks: subtasksList.filter((st) => st.task_id === t.id),
    }));
    setTasks(compiledTasks);

    const approved = allMembers.filter(m => m.status === 'APPROVED');
    const pending = allMembers.filter(m => m.status === 'PENDING').map(m => ({
      userId: m.user_id, name: (m.profiles as any)?.full_name || 'Member', rollNumber: (m.profiles as any)?.roll_number || 'N/A', semester: m.semester || 'N/A'
    }));

    const progressList: MemberProgress[] = approved.map((m: any) => {
      const uId = m.profiles?.id || m.user_id;
      const memberTasks = compiledTasks.filter((t) => t.assigned_to === uId);
      let totalSt = 0, doneSt = 0;
      memberTasks.forEach((t) => { totalSt += t.subtasks.length; doneSt += t.subtasks.filter((st) => st.is_completed).length; });
      return {
        userId: uId, name: m.profiles?.full_name || 'Member', rollNumber: m.profiles?.roll_number || 'N/A', semester: m.semester || 'N/A',
        completedTasks: doneSt, totalTasks: totalSt, percent: totalSt > 0 ? Math.round((doneSt / totalSt) * 100) : 0,
      };
    });

    setMembers(progressList);
    setPendingRequests(pending);
    if (progressList.length > 0 && !selectedMember) setSelectedMember(progressList[0].userId);
    setLoading(false);
  }, [supabase, selectedMember]);

  useEffect(() => {
    loadLeadData();
    const channel = supabase.channel('lead-portal-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadLeadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => loadLeadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sig_memberships' }, () => loadLeadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadLeadData]);

  const myTasks = useMemo(() => tasks.filter((t) => t.assigned_to === currentUserId), [tasks, currentUserId]);
  const myStats = useMemo(() => {
    let total = 0, done = 0;
    myTasks.forEach((t) => { total += t.subtasks.length; done += t.subtasks.filter((s) => s.is_completed).length; });
    return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [myTasks]);

  const availableSemesters = useMemo(() => {
    return Array.from(new Set(members.map(m => m.semester))).sort();
  }, [members]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.assignee_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === 'ALL' || task.priority === filterPriority;
      const isComplete = task.subtasks.length > 0 && task.subtasks.filter((s) => s.is_completed).length === task.subtasks.length;
      const matchesStatus = filterStatus === 'ALL' || (filterStatus === 'COMPLETED' && isComplete) || (filterStatus === 'IN_PROGRESS' && !isComplete);
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [tasks, searchQuery, filterPriority, filterStatus]);

  const handleApprove = async (userId: string) => {
    try { const { error } = await supabase.from('sig_memberships').update({ status: 'APPROVED' }).eq('user_id', userId).eq('sig_id', sigId); if (error) throw error; await loadLeadData(); toast.success('Enrollment approved!'); } catch (err: any) { toast.error(err.message); }
  };
  const handleReject = async (userId: string) => {
    try { const { error } = await supabase.from('sig_memberships').delete().eq('user_id', userId).eq('sig_id', sigId); if (error) throw error; await loadLeadData(); toast.success('Request rejected.'); } catch (err: any) { toast.error(err.message); }
  };
  const handleRemoveMember = async (userId: string) => {
    if (confirm("Remove this member from your domain?")) {
      try { const { error } = await supabase.rpc('remove_member_from_sig', { target_user_id: userId, target_sig_id: sigId }); if (error) throw error; await loadLeadData(); toast.success('Member removed.'); } catch (err: any) { toast.error(err.message); }
    }
  };
  const toggleSubtask = async (taskId: string, subtaskId: string, currentState: boolean) => {
    const nextState = !currentState;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, subtasks: t.subtasks.map((st) => st.id === subtaskId ? { ...st, is_completed: nextState } : st ) } : t));
    try { const { error } = await supabase.from('subtasks').update({ is_completed: nextState, completed_at: nextState ? new Date().toISOString() : null }).eq('id', subtaskId); if (error) throw error; } catch (err: any) { toast.error('Failed to update.'); loadLeadData(); }
  };

  const handleOpenCreate = () => {
    setEditingTaskId(null); 
    setTaskTitle(''); 
    setTaskDesc(''); 
    setTaskPriority('MEDIUM'); 
    setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]); 
    setAssignmentMode('INDIVIDUAL');
    if (members.length > 0) setSelectedMember(members[0].userId); 
    if (availableSemesters.length > 0) setSelectedSemester(availableSemesters[0]);
    setSubtasks([{ title: '' }]); 
    setShowModal(true);
  };

  const handleOpenEdit = (task: TaskItem) => {
    setEditingTaskId(task.id); 
    setTaskTitle(task.title); 
    setTaskDesc(task.description || ''); 
    setTaskPriority(task.priority); 
    setDueDate(task.due_date); 
    setAssignmentMode('INDIVIDUAL');
    setSelectedMember(task.assigned_to); 
    setSubtasks(task.subtasks.length > 0 ? task.subtasks.map((s) => ({ id: s.id, title: s.title, is_completed: s.is_completed })) : [{ title: '' }]); 
    setShowModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!sigId || !currentUserId) return; 
    setSubmitting(true);

    try {
      const cleanSubtasks = subtasks.filter((s) => s.title.trim().length > 0);

      if (editingTaskId) {
        // Edit single existing task
        const { error: upErr } = await supabase.from('tasks').update({ title: taskTitle, description: taskDesc, priority: taskPriority, due_date: dueDate, assigned_to: selectedMember }).eq('id', editingTaskId); 
        if (upErr) throw upErr;
        
        await supabase.from('subtasks').delete().eq('task_id', editingTaskId);
        if (cleanSubtasks.length > 0) { 
          const { error: stErr } = await supabase.from('subtasks').insert(cleanSubtasks.map((st) => ({ task_id: editingTaskId, title: st.title.trim(), is_completed: st.is_completed || false }))); 
          if (stErr) throw stErr; 
        }
        toast.success('Task updated successfully.');
      } else {
        // Create new task (handles bulk assignments)
        let targetUserIds: string[] = [];
        
        if (assignmentMode === 'INDIVIDUAL') {
          if (selectedMember) targetUserIds = [selectedMember];
        } else if (assignmentMode === 'SEMESTER') {
          targetUserIds = members.filter(m => m.semester === selectedSemester).map(m => m.userId);
        } else if (assignmentMode === 'ALL') {
          targetUserIds = members.map(m => m.userId);
        }

        if (targetUserIds.length === 0) {
          toast.error('No valid members found for the selected target.');
          setSubmitting(false);
          return;
        }

        // Generate the task and subtasks for everyone targeted
        for (const uId of targetUserIds) {
          const { data: newTask, error: taskError } = await supabase.from('tasks').insert({ 
            sig_id: sigId, 
            assigned_to: uId, 
            created_by: currentUserId, 
            title: taskTitle, 
            description: taskDesc, 
            priority: taskPriority, 
            due_date: dueDate 
          }).select('id').single();
          
          if (taskError) throw taskError;

          if (cleanSubtasks.length > 0 && newTask) {
            const { error: stErr } = await supabase.from('subtasks').insert(
              cleanSubtasks.map((st) => ({ 
                task_id: newTask.id, 
                title: st.title.trim(), 
                is_completed: false 
              }))
            );
            if (stErr) throw stErr;
          }
        }

        toast.success(`Task assigned to ${targetUserIds.length} member(s)!`);
      }

      setShowModal(false); 
      await loadLeadData();
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return; setIsDeleting(true);
    try { const { error } = await supabase.from('tasks').delete().eq('id', deletingTask.id); if (error) throw error; setDeletingTask(null); await loadLeadData(); toast.success('Task deleted.'); } catch (err: any) { toast.error(err.message); } finally { setIsDeleting(false); }
  };

  const viewingMember = members.find((m) => m.userId === viewingMemberId);
  const viewingMemberTasks = useMemo(() => tasks.filter((t) => t.assigned_to === viewingMemberId), [tasks, viewingMemberId]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-zinc-500 text-sm font-medium">Loading domain workspace...</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-800/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 mb-3">
            <Layers className="h-3.5 w-3.5 text-blue-500" /> Domain Lead Suite
          </div>
          <h2 className="text-3xl font-semibold text-zinc-100 tracking-tight">{sigName}</h2>
          <p className="text-sm text-zinc-500 mt-1">Assign deliverables and manage member milestones.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
            {[
              { id: 'manage', label: 'Domain' },
              { id: 'requests', label: 'Requests', count: pendingRequests.length },
              { id: 'personal', label: 'My Tasks', count: myTasks.length }
            ].map(tab => (
              <button 
                key={tab.id} onClick={() => setActiveTab(tab.id as any)} 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {tab.label} {!!tab.count && <span className="bg-blue-600/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-md">{tab.count}</span>}
              </button>
            ))}
          </div>
          {activeTab === 'manage' && (
            <button onClick={handleOpenCreate} className="flex items-center justify-center w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
              <Plus className="h-4 w-4" /> Assign Task
            </button>
          )}
        </div>
      </div>

      {activeTab === 'manage' && (
        <div className="space-y-8">
          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-zinc-800/60 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-100 text-sm">Active Member Roster</h3>
              <span className="text-xs font-medium text-zinc-500">{members.length} verified</span>
            </div>

            {members.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 text-sm">No members are currently enrolled.</div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {members.map((m) => (
                  <div key={m.userId} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-zinc-800/20 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                        {m.name}
                        {m.userId === currentUserId && <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded font-medium">You</span>}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1 uppercase">{m.rollNumber} • Semester {m.semester}</p>
                    </div>
                    
                    <div className="w-full md:w-64">
                      <div className="flex justify-between text-xs font-medium text-zinc-500 mb-1.5">
                        <span>Milestones ({m.completedTasks}/{m.totalTasks})</span>
                        <span className="text-zinc-300">{m.percent}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${m.percent}%` }} /></div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewingMemberId(m.userId)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-md text-xs font-medium transition shadow-sm">Details</button>
                      {m.userId !== currentUserId && (
                        <button onClick={() => handleRemoveMember(m.userId)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition" title="Remove Member"><UserMinus className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-sm font-semibold text-zinc-300">Domain Deliverables</h3>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-700 transition" />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="w-full sm:w-auto bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 outline-none focus:border-zinc-700">
                    <option value="ALL">All Priorities</option><option value="HIGH">High Priority</option><option value="MEDIUM">Medium Priority</option><option value="LOW">Low Priority</option>
                  </select>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full sm:w-auto bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 outline-none focus:border-zinc-700">
                    <option value="ALL">All Status</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-10 text-center text-zinc-500 text-sm">No deliverables found. Assign a new task above.</div>
            ) : (
              <div className="grid gap-4">
                {filteredTasks.map((task) => {
                  const completedCount = task.subtasks.filter((st) => st.is_completed).length;
                  const totalCount = task.subtasks.length;
                  const taskPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                  return (
                    <div key={task.id} className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5 hover:border-zinc-700 transition shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-semibold text-zinc-100">{task.title}</h4>
                          <p className="text-xs font-medium text-zinc-500">Assigned to: <span className="text-zinc-300">{task.assignee_name}</span></p>
                          {task.description && <p className="text-xs text-zinc-400 pt-1">{task.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800"><Calendar className="h-3 w-3" /> {task.due_date}</span>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-medium border ${task.priority === 'HIGH' ? 'bg-red-500/10 border-red-500/20 text-red-400' : task.priority === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{task.priority}</span>
                          <button onClick={() => handleOpenEdit(task)} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDeletingTask(task)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      
                      <div className="mt-5 mb-4">
                        <div className="flex justify-between text-[10px] font-medium text-zinc-500 mb-1.5">
                          <span>Progress</span>
                          <span>{taskPercent}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden"><div className="bg-zinc-400 h-1 rounded-full transition-all" style={{ width: `${taskPercent}%` }} /></div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800/60">
                        {task.subtasks.map((st) => (
                          <span key={st.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${st.is_completed ? 'bg-zinc-950 border-zinc-800 text-zinc-500 line-through' : 'bg-zinc-800/50 border-zinc-700 text-zinc-300'}`}>
                            {st.is_completed ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> : <Circle className="h-3.5 w-3.5 text-zinc-500" />} {st.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden">
           <div className="p-5 border-b border-zinc-800/60">
            <h3 className="font-semibold text-zinc-100 text-sm">Pending Join Requests</h3>
          </div>
          {pendingRequests.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm">No pending enrollment requests.</div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {pendingRequests.map((req) => (
                <div key={req.userId} className="p-5 flex justify-between items-center hover:bg-zinc-800/20 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{req.name}</p>
                    <p className="text-xs text-zinc-500 mt-1 uppercase">{req.rollNumber} • Semester {req.semester}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReject(req.userId)} className="px-3 py-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition text-xs font-medium">Reject</button>
                    <button onClick={() => handleApprove(req.userId)} className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-md text-xs font-medium transition shadow-sm">Approve</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'personal' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-zinc-100">Your Personal Roadmap</h3>
              <span className="text-lg font-medium text-blue-500">{myStats.percent}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${myStats.percent}%` }} /></div>
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
                <h3 className="text-lg font-semibold text-zinc-100">Review: {viewingMember.name}</h3>
                <p className="text-sm text-zinc-500 mt-1 uppercase">{viewingMember.rollNumber} • Semester {viewingMember.semester}</p>
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

      {/* CREATE / EDIT TASK MODAL WITH BULK ASSIGNMENT */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <h3 className="text-lg font-semibold text-zinc-100">{editingTaskId ? 'Edit Deliverable' : `Assign Task in ${sigName}`}</h3>
            <form onSubmit={handleSaveTask} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
                <input type="text" required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition" placeholder="e.g. Build Tokenizer Pipeline" />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
                <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition" placeholder="Task details..." />
              </div>

              {!editingTaskId && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Assignment Target</label>
                    <select value={assignmentMode} onChange={(e) => setAssignmentMode(e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition">
                      <option value="INDIVIDUAL">Specific Member</option>
                      <option value="SEMESTER">All in a Semester</option>
                      <option value="ALL">All Domain Members</option>
                    </select>
                  </div>

                  {assignmentMode === 'INDIVIDUAL' && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Member</label>
                      <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition">
                        {members.map((m) => (<option key={m.userId} value={m.userId}>{m.name} ({m.rollNumber})</option>))}
                      </select>
                    </div>
                  )}

                  {assignmentMode === 'SEMESTER' && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Semester</label>
                      <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition">
                        {availableSemesters.map((sem) => (<option key={sem} value={sem}>Semester {sem}</option>))}
                      </select>
                    </div>
                  )}

                  {assignmentMode === 'ALL' && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target Scope</label>
                      <div className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-blue-400 font-medium flex items-center h-[38px]">
                        All {members.length} active members
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editingTaskId && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Assign To</label>
                  <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition disabled:opacity-50" disabled>
                    <option value={selectedMember}>{members.find(m => m.userId === selectedMember)?.name || 'Member'}</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
                  <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition">
                    <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Due Date</label>
                  <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-medium text-zinc-400">Milestones</label>
                  <button type="button" onClick={() => setSubtasks((prev) => [...prev, { title: '' }])} className="text-xs font-medium text-blue-500 hover:text-blue-400 transition">+ Add Step</button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {subtasks.map((st, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text" value={st.title} onChange={(e) => { const updated = [...subtasks]; updated[idx].title = e.target.value; setSubtasks(updated); }} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition" placeholder="Action item..." />
                      {subtasks.length > 1 && <button type="button" onClick={() => setSubtasks((prev) => prev.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-400 text-xs px-2 py-1 transition"><X className="h-4 w-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/60">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-md text-sm font-medium transition shadow-sm">{submitting ? 'Assigning...' : 'Assign Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400"><AlertTriangle className="h-5 w-5" /></div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Delete Deliverable?</h3>
              <p className="text-sm text-zinc-500 mt-1">Remove &quot;{deletingTask.title}&quot; permanently?</p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => setDeletingTask(null)} className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition">Cancel</button>
              <button onClick={handleDeleteTask} disabled={isDeleting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition shadow-sm">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}