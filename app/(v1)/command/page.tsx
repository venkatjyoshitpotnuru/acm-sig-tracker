'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, AlertCircle, CheckCircle2, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { initiateRollover } from '@/app/actions/v1-admin';

export default function CommandCenter() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRollingOver, setIsRollingOver] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    pendingApprovals: 0,
    globalCompletion: 0,
    domainsAtRisk: 0,
  });
  
  const [domainHealth, setDomainHealth] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);

      // 1. Fetch Audit Logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // 2. Fetch Members
      const { data: members } = await supabase
        .from('member_profiles')
        .select('id, sig, role');

      // 3. Fetch Submissions
      const { data: submissions, error: subError } = await supabase
        .from('task_submissions')
        .select('id, status, member_profiles!member_id(sig)');
        
      if (subError) console.error("Submissions fetch error:", subError);

      if (logs) setAuditLogs(logs);

      if (members && submissions) {
        // Calculate Top Metrics
        const pending = submissions.filter((s: any) => s.status === 'PENDING').length;
        const approved = submissions.filter((s: any) => s.status === 'APPROVED').length;
        const completionRate = submissions.length > 0 ? Math.round((approved / submissions.length) * 100) : 0;
        
        setMetrics({
          totalMembers: members.length,
          pendingApprovals: pending,
          globalCompletion: completionRate,
          domainsAtRisk: 0, 
        });

        // Calculate 2x2 Domain Matrix Data
        const sigs = ['SIG-WebDev', 'SIG-AI', 'SIG-Cyber', 'SIG-Design'];
        let riskCount = 0;

        const healthData = sigs.map(sig => {
          const sigMembers = members.filter((m: any) => m.sig === sig);
          
          const sigSubmissions = submissions.filter((s: any) => 
            Array.isArray(s.member_profiles) 
              ? s.member_profiles[0]?.sig === sig 
              : s.member_profiles?.sig === sig
          );
          
          const sigPending = sigSubmissions.filter((s: any) => s.status === 'PENDING').length;
          
          // Determine Status based on activity
          let status = 'Healthy';
          if (sigMembers.length === 0) status = 'Warning';
          else if (sigPending > 10) status = 'Critical';
          
          if (status === 'Critical') riskCount++;

          return {
            sig,
            lead: sigMembers.find((m: any) => m.role === 'SIG_LEAD')?.id ? 'Assigned' : 'No Lead',
            tasks: `${sigSubmissions.filter((s: any) => s.status === 'APPROVED').length}/${sigSubmissions.length}`,
            active: sigMembers.length > 0 ? '100%' : '0%', 
            status
          };
        });

        setDomainHealth(healthData);
        setMetrics(prev => ({ ...prev, domainsAtRisk: riskCount }));
      }

      setIsLoading(false);
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto relative">
      
      {isLoading && (
        <div className="absolute inset-0 bg-[#09090b]/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Domain Command Center</h1>
          <p className="text-xs text-zinc-500 mt-1">Macro-level chapter analytics and intervention matrix.</p>
        </div>
        
        {/* SEMESTER ROLLOVER BUTTON */}
        <button 
          onClick={async () => {
            if (window.confirm("Are you sure? This will archive all pending tasks for the new semester.")) {
              setIsRollingOver(true);
              await initiateRollover();
              setIsRollingOver(false);
              window.location.reload(); 
            }
          }}
          disabled={isRollingOver}
          className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {isRollingOver ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          {isRollingOver ? 'Processing...' : 'Initiate Semester Rollover'}
        </button>
      </div>

      {/* TOP METRICS */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Active Members', val: metrics.totalMembers, icon: Users, color: 'text-blue-400' },
          { label: 'Pending Approvals', val: metrics.pendingApprovals, icon: Clock, color: 'text-amber-400' },
          { label: 'Domains at Risk', val: metrics.domainsAtRisk, icon: ShieldAlert, color: 'text-red-400' },
          { label: 'Global Completion', val: `${metrics.globalCompletion}%`, icon: Activity, color: 'text-emerald-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-[#18181b] border border-zinc-800/80 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-zinc-100">{stat.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* THE 2x2 DOMAIN HEALTH MATRIX */}
        <div className="lg:col-span-2 bg-[#18181b] border border-zinc-800/80 rounded-lg p-0 overflow-hidden">
          <div className="border-b border-zinc-800/80 p-4 bg-[#1c1c1f]">
            <h2 className="text-sm font-semibold text-zinc-200">Domain Health Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-[#18181b] text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3 font-semibold border-b border-zinc-800/80">Domain / SIG</th>
                  <th className="px-4 py-3 font-semibold border-b border-zinc-800/80">Lead</th>
                  <th className="px-4 py-3 font-semibold border-b border-zinc-800/80">Task Velocity</th>
                  <th className="px-4 py-3 font-semibold border-b border-zinc-800/80">Active Ratio</th>
                  <th className="px-4 py-3 font-semibold border-b border-zinc-800/80">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs text-zinc-300 divide-y divide-zinc-800/60">
                {domainHealth.map((domain, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-100">{domain.sig}</td>
                    <td className="px-4 py-3 text-zinc-400">{domain.lead}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{domain.tasks}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{domain.active}</td>
                    <td className="px-4 py-3 flex items-center gap-1.5">
                      {domain.status === 'Healthy' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      {domain.status === 'Warning' && <Clock className="h-3.5 w-3.5 text-amber-500" />}
                      {domain.status === 'Critical' && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                      <span className={
                        domain.status === 'Healthy' ? 'text-emerald-500' : 
                        domain.status === 'Warning' ? 'text-amber-500' : 'text-red-500'
                      }>{domain.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AUDIT LOG FEED */}
        <div className="bg-[#18181b] border border-zinc-800/80 rounded-lg flex flex-col h-full max-h-[400px]">
          <div className="border-b border-zinc-800/80 p-4 bg-[#1c1c1f] shrink-0">
            <h2 className="text-sm font-semibold text-zinc-200">Global Activity Feed</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {auditLogs.length === 0 && !isLoading && (
              <div className="text-xs text-zinc-500 text-center py-4">No recent activity.</div>
            )}
            {auditLogs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 mb-0.5">{log.action_type.replace('_', ' ')}</div>
                  <div className="text-xs text-zinc-300 leading-relaxed">{log.details.message || JSON.stringify(log.details)}</div>
                  <div className="text-[10px] text-zinc-600 mt-1">
                    {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}