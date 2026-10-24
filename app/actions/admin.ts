'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function deleteUserAccount(userId: string) {
  // Initialize the admin client (bypasses Row Level Security)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Delete the user from Supabase Auth
    // (This automatically deletes their row in the 'profiles' table if you set up foreign key cascades)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (error) throw error

    // 2. Refresh the server cache so the table updates instantly
    revalidatePath('/dashboard/chair')
    
    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    return { error: error.message }
  }
}