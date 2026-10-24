export type GlobalRole = 'CHAIR' | 'MEMBER';
export type SigRole = 'LEAD' | 'CO_LEAD' | 'MEMBER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  global_role: GlobalRole;
  created_at: string;
}

export interface Sig {
  id: string;
  name: string;
  domain: string;
  description: string;
  created_at: string;
}

export interface SigMembership {
  id: string;
  user_id: string;
  sig_id: string;
  role: SigRole;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  completed_at?: string;
}

export interface Task {
  id: string;
  sig_id: string;
  assigned_to: string;
  created_by: string;
  title: string;
  description?: string;
  priority: Priority;
  due_date: string;
  subtasks?: Subtask[];
}