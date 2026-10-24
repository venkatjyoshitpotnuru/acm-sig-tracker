'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteUserAccount } from '@/app/actions/admin';
import { Search, Trash2, Loader2 } from 'lucide-react';

// Profile Data Structure matching your database schema
interface Profile {
  id: string;
  full_name: string;
  roll_number: string;
  global_role: string;
  domain: string | null;
  semester: string | null;
}

export default function ChairDashboard() {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all members on mount
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching members:', error);
    } else if (data) {
      setMembers(data);
    }
    setLoading(false);
  };

  // Remove the deleted member from the UI instantly without needing a full page reload
  const handleRemoveFromState = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Live filter based on the search bar
  const filteredMembers = members.filter((m) => 
    (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.domain || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search member, roll number, domain"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#0c1222]/80 border border-blue-950/70 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-800 transition-colors"
        />
      </div>

      {/* Table Container */}
      <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-xl overflow-hidden shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#070b14]/80 border-b border-blue-950/70 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Member Info</th>
                <th className="px-6 py-4">Sem</th>
                <th className="px-6 py-4">Assigned Domain</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-950/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    No members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <MemberRow 
                    key={member.id} 
                    member={member} 
                    onDeleted={handleRemoveFromState} 
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Sub-component for individual rows to manage independent loading states
// ------------------------------------------------------------------
function MemberRow({ member, onDeleted }: { member: Profile, onDeleted: (id: string) => void }) {
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [domain, setDomain] = useState(member.domain || '');
  const [role, setRole] = useState(member.global_role || 'MEMBER');

  const handleDelete = async () => {
    // 1. Confirm intention
    if (!confirm(`Are you sure you want to permanently delete ${member.full_name}'s account? This action cannot be undone.`)) return;
    
    // 2. Trigger server action securely
    setIsDeleting(true);
    const result = await deleteUserAccount(member.id);
    
    if (result.error) {
      alert('Error deleting account: ' + result.error);
      setIsDeleting(false);
    } else {
      // 3. Remove row from screen instantly on success
      onDeleted(member.id);
    }
  };

  const handleDomainChange = async (newDomain: string) => {
    setIsUpdating(true);
    setDomain(newDomain);
    await supabase
      .from('profiles')
      .update({ domain: newDomain === '' ? null : newDomain })
      .eq('id', member.id);
    setIsUpdating(false);
  };

  const handleRoleChange = async (newRole: string) => {
    setIsUpdating(true);
    setRole(newRole);
    await supabase
      .from('profiles')
      .update({ global_role: newRole })
      .eq('id', member.id);
    setIsUpdating(false);
  };

  return (
    <tr className="hover:bg-blue-950/10 transition-colors">
      
      {/* 1. Member Info Column */}
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200">
              {member.full_name || 'Unknown User'}
            </span>
            {role === 'CHAIR' && (
              <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] font-medium text-blue-400">
                Chair
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            {member.roll_number || 'N/A'}
          </span>
        </div>
      </td>
      
      {/* 2. Semester Column */}
      <td className="px-6 py-4">
        <span className="text-zinc-400">{member.semester || 'N/A'}</span>
      </td>
      
      {/* 3. Domain Select Column */}
      <td className="px-6 py-4">
        <select
          disabled={isUpdating || role === 'CHAIR'}
          value={domain}
          onChange={(e) => handleDomainChange(e.target.value)}
          className="bg-[#070b14] border border-blue-950/70 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-700 disabled:opacity-50 transition-colors"
        >
          <option value="">Select Domain</option>
          <option value="SIG-AI">SIG-AI</option>
          <option value="SIG-Web Dev">SIG-Web Dev</option>
          <option value="SIG-Cyber">SIG-Cyber</option>
          <option value="SIG-Glitch">SIG-Glitch</option>
        </select>
      </td>
      
      {/* 4. Role Select Column */}
      <td className="px-6 py-4">
        <select
          disabled={isUpdating || role === 'CHAIR'}
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="bg-[#070b14] border border-blue-950/70 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-700 disabled:opacity-50 transition-colors"
        >
          <option value="MEMBER">Member</option>
          <option value="LEAD">Lead</option>
          <option value="CHAIR">Chair</option>
        </select>
      </td>
      
      {/* 5. Progress Column (Placeholder for future metrics) */}
      <td className="px-6 py-4">
        <div className="w-32">
          <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden mb-1.5">
            <div 
              className="h-full bg-blue-500 rounded-full" 
              style={{ width: '0%' }} // Update dynamically when tasks map is built
            />
          </div>
          <span className="text-[11px] text-zinc-500">0% (0/0)</span>
        </div>
      </td>
      
      {/* 6. Actions Column (Secure Server Action Delete) */}
      <td className="px-6 py-4 text-right">
        {role !== 'CHAIR' ? (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-50"
            title="Permanently Delete Account"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-400" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="text-[11px] text-zinc-600 font-mono pr-2">PROTECTED</span>
        )}
      </td>
      
    </tr>
  );
}