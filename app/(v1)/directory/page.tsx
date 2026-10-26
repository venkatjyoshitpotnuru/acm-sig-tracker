'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Code, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function DirectoryPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchMembers() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('member_profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (!error && data) {
        setMembers(data);
      }
      setIsLoading(false);
    }
    
    fetchMembers();
  }, []);

  // Simple client-side filtering based on the search input
  const filteredMembers = members.filter(member => 
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.skills?.some((skill: string) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Chapter Directory</h1>
        <p className="text-xs text-zinc-500 mt-1">Discover peers, view portfolios, and find collaborators across domains.</p>
      </div>

      {/* FILTER BAR */}
      <div className="flex items-center gap-4 bg-[#18181b] border border-zinc-800/80 rounded-lg p-3">
        <div className="flex-1 flex items-center gap-2">
          <Search className="h-4 w-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search by name, roll number, or skill (e.g., 'React')..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-sm text-zinc-200 w-full placeholder:text-zinc-600"
          />
        </div>
        <div className="h-4 w-px bg-zinc-800" />
        <div className="flex items-center gap-3">
          <select className="bg-[#09090b] border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600">
            <option value="">All Domains</option>
            <option value="SIG-WebDev">SIG-WebDev</option>
            <option value="SIG-AI">SIG-AI</option>
            <option value="SIG-Cyber">SIG-Cyber</option>
          </select>
        </div>
      </div>

      {/* ROSTER GRID */}
      <div className="relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]/50 z-10 rounded-lg">
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          </div>
        )}

        {!isLoading && filteredMembers.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500 bg-[#18181b] border border-zinc-800/80 rounded-lg">
            No members found matching your search.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-[#18181b] border border-zinc-800/80 rounded-lg p-4 hover:border-zinc-700/80 transition-colors flex flex-col">
              
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">{member.full_name}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{member.roll_number}</p>
                </div>
                {member.github_url && (
                  <a href={member.github_url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Code className="h-4 w-4" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium border border-blue-500/20">
                  {member.sig || 'No SIG'}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  member.role === 'SIG_LEAD' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                  member.role === 'SIG_CORE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                  'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {member.role || 'MEMBER'}
                </span>
              </div>

              <div className="mt-auto">
                <div className="text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider font-semibold">Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {member.skills && member.skills.map((skill: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-[#09090b] border border-zinc-800 rounded text-xs text-zinc-300">
                      {skill}
                    </span>
                  ))}
                  {(!member.skills || member.skills.length === 0) && (
                    <span className="text-xs text-zinc-600 italic">No skills listed</span>
                  )}
                </div>
              </div>
              
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}