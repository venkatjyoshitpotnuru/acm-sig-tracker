import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BarChart3, ShieldCheck, CheckSquare, Layers } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-zinc-100 selection:bg-blue-600/30">
      {/* Top Navigation */}
      <nav className="border-b border-zinc-800/80 bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-md bg-white flex items-center justify-center p-0.5">
              <Image 
                src="/acm-logo.jpg" 
                alt="ACM Logo" 
                fill
                className="object-contain" 
                priority
              />
            </div>
            <span className="font-semibold tracking-tight text-white text-base">
              ACM Student Chapter
            </span>
          </div>

          <Link
            href="/login"
            className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Centered Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        {/* Domain Scope Chip */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/40 border border-blue-900/60 text-xs font-medium text-blue-300 mb-8">
          <Layers className="h-3.5 w-3.5 text-blue-400" />
          <span>SIG Management &amp; Milestone Tracking</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight max-w-4xl mx-auto">
          Coordinate domains, assign tasks, track progress in real-time.
        </h1>

        {/* Hero Description */}
        <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Dedicated progress tracking for ACM Special Interest Groups: AI, Web Dev, Cyber, Glitch, and beyond.
        </p>

        {/* Primary Action Button */}
        <div className="flex justify-center items-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-base font-semibold px-7 py-3.5 rounded-xl transition-all shadow-md hover:shadow-blue-500/10 active:scale-[0.99]"
          >
            <span>Enter Chapter Portal</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      {/* Feature Cards Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Chair Card */}
          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-2xl p-7 hover:border-blue-900/80 transition-colors">
            <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-5">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Chair Overview</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Club-wide metrics, cross-SIG audit trails, and member rosters.
            </p>
          </div>

          {/* Lead Card */}
          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-2xl p-7 hover:border-blue-900/80 transition-colors">
            <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Lead Isolation</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Strict sandboxing: leads manage tasks and members only in their SIG.
            </p>
          </div>

          {/* Subtasks Card */}
          <div className="bg-[#0c1222]/80 border border-blue-950/70 rounded-2xl p-7 hover:border-blue-900/80 transition-colors">
            <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-5">
              <CheckSquare className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Subtask Checklists</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Nested subtasks with live percentage progress calculation.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900/80 py-8 text-center text-xs text-zinc-500">
        &copy; 2026 ACM Student Chapter. All rights reserved.
      </footer>
    </div>
  );
}