import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BarChart3, ShieldCheck, CheckSquare } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="border-b border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-md bg-white flex items-center justify-center">
              <Image 
                src="/acm-logo.jpg" 
                alt="ACM Logo" 
                fill
                className="object-contain p-0.5" 
                priority
              />
            </div>
            <span className="font-semibold tracking-tight text-zinc-100">ACM Student Chapter</span>
          </div>
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors px-4 py-2">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-blue-400 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Chapter Portal v2.0 is Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 max-w-4xl mx-auto">
          Coordinate domains, assign tasks, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">track progress.</span>
        </h1>
        
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          The official academic workspace for ACM Special Interest Groups. Built to streamline deliverables across AI, Web Dev, Cyber, and Glitch domains.
        </p>
        
        <Link href="/login" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition shadow-lg shadow-blue-500/20">
          Enter Chapter Portal <ArrowRight className="h-4 w-4" />
        </Link>
      </main>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: BarChart3,
              title: 'Executive Oversight',
              desc: 'Chapter Chairs get real-time analytics, global completion metrics, and cross-domain roster audits.'
            },
            {
              icon: ShieldCheck,
              title: 'Domain Isolation',
              desc: 'Strict sandboxing ensures Domain Leads manage tasks, milestones, and members exclusively within their SIG.'
            },
            {
              icon: CheckSquare,
              title: 'Milestone Tracking',
              desc: 'Members receive tailored subtasks and progress bars, transforming large deliverables into actionable steps.'
            }
          ].map((feature, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 hover:bg-zinc-900 transition-colors">
              <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8 text-center">
        <p className="text-xs text-zinc-600 font-medium">
          &copy; 2026 ACM Student Chapter. All rights reserved.
        </p>
      </footer>
    </div>
  );
}