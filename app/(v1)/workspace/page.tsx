'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Search, Filter, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { reviewSubmission } from '@/app/actions/v1-admin';

export default function WorkspacePage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createClient();

  const fetchSubmissions = async () => {
    setIsLoading(true);
    
    // FIX: Added !member_id to resolve the Supabase relationship ambiguity
    const { data, error } = await supabase
      .from('task_submissions')
      .select(`
        id,
        status,
        submitted_at,
        submission_content,
        member_profiles!member_id ( full_name, roll_number, sig )
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
    } else {
      setSubmissions(data || []);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleReview = async (id: string, status: 'APPROVED' | 'CHANGES_REQUESTED') => {
    setProcessingId(id);
    try {
      await reviewSubmission(id, status);
      await fetchSubmissions();
    } catch (error) {
      console.error('Failed to review submission:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
    
    // Safely extract the member name for searching
    const memberName = Array.isArray(sub.member_profiles) 
      ? sub.member_profiles[0]?.full_name 
      : sub.member_profiles?.full_name;
      
    const matchesSearch = memberName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sub.submission_content?.toLowerCase().includes(searchTerm.toLowerCase());
                          
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Lead Workspace</h1>
        <p className="text-xs text-zinc-500 mt-1">Review member submissions and manage domain tasks.</p>
      </div>

      {/* FILTER BAR */}
      <div className="flex items-center justify-between bg-[#18181b] border border-zinc-800/80 rounded-lg p-3">
        <div className="flex items-center gap-2 w-72">
          <Search className="h-4 w-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search member or task..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-sm text-zinc-200 w-full placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
            <Filter className="h-3.5 w-3.5" />
            Filter by Domain
          </button>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#09090b] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="PENDING">Status: PENDING</option>
            <option value="APPROVED">Status: APPROVED</option>
            <option value="CHANGES_REQUESTED">Status: REJECTED</option>
            <option value="ALL">All Statuses</option>
          </select>
        </div>
      </div>

      {/* SUBMISSION QUEUE */}
      <div className="bg-[#18181b] border border-zinc-800/80 rounded-lg overflow-hidden">
        <div className="border-b border-zinc-800/80 p-4 bg-[#1c1c1f]">
          <h2 className="text-sm font-semibold text-zinc-200">Submission Review Queue</h2>
        </div>
        
        <div className="divide-y divide-zinc-800/60 min-h-[200px] relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#18181b]/50 backdrop-blur-sm z-10">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          )}
          
          {!isLoading && filteredSubmissions.length === 0 && (
             <div className="p-8 text-center text-sm text-zinc-500">
               No submissions in the queue right now.
             </div>
          )}

          {filteredSubmissions.map((sub) => (
            <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-100">
                    {Array.isArray(sub.member_profiles) ? sub.member_profiles[0]?.full_name : sub.member_profiles?.full_name || 'Unknown Member'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono bg-zinc-800 px-1.5 rounded">
                    {new Date(sub.submitted_at).toLocaleDateString()}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium border border-blue-500/20">
                    {Array.isArray(sub.member_profiles) ? sub.member_profiles[0]?.sig : sub.member_profiles?.sig || 'No SIG'}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">Content: {sub.submission_content}</div>
              </div>
              
              {/* ACTION BUTTONS */}
              {sub.status === 'PENDING' ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleReview(sub.id, 'APPROVED')}
                    disabled={processingId === sub.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {processingId === sub.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} 
                    Approve
                  </button>
                  <button 
                    onClick={() => handleReview(sub.id, 'CHANGES_REQUESTED')}
                    disabled={processingId === sub.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {processingId === sub.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} 
                    Reject
                  </button>
                </div>
              ) : (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${sub.status === 'APPROVED' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {sub.status === 'APPROVED' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {sub.status === 'APPROVED' ? 'Approved' : 'Changes Requested'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}