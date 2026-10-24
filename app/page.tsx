import Link from 'next/link';
import { ArrowRight, Layers, Users, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white tracking-wider">
            ACM
          </div>
          <span className="font-semibold text-lg tracking-tight">Student Chapter Tracker</span>
        </div>
        <Link
          href="/login"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          Sign In
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 text-center flex flex-col items-center">
        <span className="px-3 py-1 bg-blue-950 border border-blue-800 text-blue-400 rounded-full text-xs font-semibold mb-6">
          SIG Management & Milestone Tracking
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6">
          Coordinate domains, assign tasks, track progress in real-time.
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mb-10">
          Dedicated progress tracking for ACM Special Interest Groups: AI, Web Dev, Cyber, Glitch, and beyond.
        </p>

        <Link
          href="/login"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
        >
          Enter Chapter Portal <ArrowRight className="h-5 w-5" />
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full text-left">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <Layers className="h-6 w-6 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Chair Overview</h3>
            <p className="text-sm text-slate-400">Club-wide metrics, cross-SIG audit trails, and member rosters.</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <Users className="h-6 w-6 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Lead Isolation</h3>
            <p className="text-sm text-slate-400">Strict sandboxing: leads manage tasks and members only in their SIG.</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <CheckCircle2 className="h-6 w-6 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Subtask Checklists</h3>
            <p className="text-sm text-slate-400">Nested subtasks with live percentage progress calculation.</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        ACM Student Chapter Management System
      </footer>
    </div>
  );
}