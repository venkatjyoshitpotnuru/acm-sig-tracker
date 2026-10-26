'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// 1. APPROVE OR REJECT A TASK SUBMISSION (For the Lead Workspace)
export async function reviewSubmission(submissionId: string, status: 'APPROVED' | 'CHANGES_REQUESTED', feedback?: string) {
  try {
    const supabase = await createClient();
    
    // Security Check: Ensure user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { error: updateError } = await supabase
      .from('task_submissions')
      .update({ 
        status: status, 
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) throw new Error('Failed to update submission');

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action_type: status === 'APPROVED' ? 'TASK_APPROVED' : 'TASK_REJECTED',
        target_id: submissionId,
        actor_id: user.id, // Logs exactly who approved this
        details: { message: `Submission ${submissionId} was ${status.toLowerCase()}`, feedback }
      });

    if (auditError) console.error("Audit Log Error:", auditError);

    revalidatePath('/workspace');
    revalidatePath('/command');
    
    return { success: true };
  } catch (error) {
    console.error("Server Action Failed:", error);
    throw error;
  }
}

// 2. PROMOTE A MEMBER TO SIG_CORE OR SIG_LEAD (For Chair / Lead)
export async function assignRole(memberId: string, newRole: string) {
  const supabase = await createClient();
  
  // Security Check: Ensure user is logged in
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');
  
  const { error } = await supabase
    .from('member_profiles')
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) throw new Error('Failed to assign role');

  await supabase.from('audit_logs').insert({
    action_type: 'ROLE_ASSIGNED',
    target_id: memberId,
    actor_id: user.id,
    details: { message: `Role ${newRole} assigned to member ${memberId}` }
  });

  revalidatePath('/directory');
  revalidatePath('/command');
  return { success: true };
}

// 3. INITIATE SEMESTER ROLLOVER (Chair Only)
export async function initiateRollover() {
  try {
    const supabase = await createClient();

    // Security Check: Ensure user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Archive all currently PENDING submissions
    const { error: updateError } = await supabase
      .from('task_submissions')
      .update({ status: 'ARCHIVED' })
      .eq('status', 'PENDING');

    if (updateError) throw new Error('Failed to archive tasks');

    // Log the massive chapter-wide event
    await supabase.from('audit_logs').insert({
      action_type: 'SEMESTER_ROLLOVER',
      target_id: 'GLOBAL',
      actor_id: user.id,
      details: { message: 'Semester rollover initiated. All pending tasks archived.' }
    });

    revalidatePath('/command');
    revalidatePath('/workspace');
    
    return { success: true };
  } catch (error) {
    console.error("Rollover Failed:", error);
    throw error;
  }
}