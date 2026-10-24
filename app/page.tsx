import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BarChart2, ShieldCheck, CheckSquare, Layers } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800">
      {/* Top Utility Header */}
      <nav className="border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-7 w-7 overflow-hidden rounded bg-white flex items-center justify-center p-0.5">
              <Image 
                src="/acm-logo.jpg" 
                alt="ACM Logo" 
                fill
                className="object-contain" 
                priority
              />
            </div>
            <span className="font-medium text-sm tracking-tight text-zinc-200">
              ACM Student Chapter
            </span>
          </div>
          <Link 
            href="/login" 
            className="text-xs font-medium text-zinc-300 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 px-3 py-1.5 rounded-md"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Main Hero Header */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          {/* Functional Domain Directory Badge (Replaced distracting pill) */}
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-400 mb-6 font-mono">
            <Layers className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-zinc-500">Domains:</span>
            <span className="text-zinc-300">AI</span>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-zinc-300">Web Dev</span>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-zinc-300">Cyber</span>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-zinc-300">Glitch</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-100 mb-5 leading-tight">
            Coordinated domain operations, milestone tracking, and task delegation.
          </h1>
          
          <p className="text-zinc-400 text-base md:text-lg mb-8 leading-relaxed font-normal">
            A dedicated system for student leads and chapter executives to distribute semester deliverables, track completion rates, and manage cross-SIG workloads across AI, Web Dev, Cyber, and Glitch.
          </p>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 px-5 py-2.5 rounded-md text-sm font-medium transition"
            >
              Access Portal <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span className="text-xs text-zinc-500 font-mono">
              Amrita Vishwa Vidyapeetham Chapter
            </span>
          </div>
        </div>

        {/* Structured Architectural Overview */}
        <div className="mt-20 border-t border-zinc-800/80 pt-12">
          <div className="mb-6">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">System Architecture</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/30">
              <div className="h-8 w-8 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-300 mb-4">
                <BarChart2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1.5">Executive Suite</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Centralized oversight for Chapter Chairs. Track active domains, verify completion quotas, and monitor member progression metrics.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/30">
              <div className="h-8 w-8 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-300 mb-4">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1.5">Domain Lead Workspace</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Role-isolated administration for SIG leads. Define core objectives, assign deliverables individually or by semester cohort, and audit work.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/30">
              <div className="h-8 w-8 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-300 mb-4">
                <CheckSquare className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1.5">Member Portal</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Targeted project checklists with automatic status sync, helping student members systematically execute required SIG milestones.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Structural Footer */}
      <footer className="border-t border-zinc-900 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>&copy; 2026 ACM Student Chapter. All rights reserved.</p>
          <p className="font-mono text-[11px]">Next.js &bull; Supabase RLS &bull; Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}