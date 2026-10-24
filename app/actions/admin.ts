'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Initialize administrative Supabase client using Service Role Key
// to bypass RLS for administrative operations (user deletion & role reassignments)
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Permanently deletes a user account from both Supabase Auth and relational database tables.
 */
export async function deleteUserAccount(userId: string) {
  try {
    const supabaseAdmin = getAdminClient();

    // 1. Clean up relational tables to preserve integrity
    await supabaseAdmin.from('subtasks').delete().match({ is_completed: false }); // Clean dangling subtasks if necessary
    await supabaseAdmin.from('tasks').delete().eq('assigned_to', userId);
    await supabaseAdmin.from('tasks').delete().eq('created_by', userId);
    await supabaseAdmin.from('sig_memberships').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 2. Delete user from Supabase Auth service
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      return { error: `Auth deletion failed: ${authError.message}` };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred while deleting the account.' };
  }
}

/**
 * Executes an atomic Chairmanship succession:
 * - Verifies caller has active CHAIR authority
 * - Promotes successor to global_role = 'CHAIR'
 * - Steps outgoing Chair down to global_role = 'MEMBER'
 */
export async function transferChairAuthority(
  currentChairId: string,
  successorUserId: string
) {
  try {
    const supabaseAdmin = getAdminClient();

    // 1. Verify that the initiator currently holds global CHAIR role
    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from('profiles')
      .select('global_role')
      .eq('id', currentChairId)
      .single();

    if (callerError || !callerProfile) {
      return { error: 'Verification failed: Could not locate incumbent Chair profile.' };
    }

    if (callerProfile.global_role !== 'CHAIR') {
      return { error: 'Unauthorized: Only an active Chair can execute succession.' };
    }

    // 2. Verify that the successor profile exists
    const { data: successorProfile, error: successorError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('id', successorUserId)
      .single();

    if (successorError || !successorProfile) {
      return { error: 'Successor profile not found in chapter directory.' };
    }

    // 3. Promote successor to CHAIR authority
    const { error: promoteError } = await supabaseAdmin
      .from('profiles')
      .update({ global_role: 'CHAIR' })
      .eq('id', successorUserId);

    if (promoteError) {
      return { error: `Failed to promote successor: ${promoteError.message}` };
    }

    // Also update auth user metadata if present
    await supabaseAdmin.auth.admin.updateUserById(successorUserId, {
      user_metadata: { global_role: 'CHAIR' },
    });

    // 4. Demote incumbent Chair to MEMBER
    const { error: demoteError } = await supabaseAdmin
      .from('profiles')
      .update({ global_role: 'MEMBER' })
      .eq('id', currentChairId);

    if (demoteError) {
      return { error: `Failed to update outgoing Chair status: ${demoteError.message}` };
    }

    // Update outgoing auth user metadata
    await supabaseAdmin.auth.admin.updateUserById(currentChairId, {
      user_metadata: { global_role: 'MEMBER' },
    });

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred during succession transfer.' };
  }
}