import { Activity, History, LayoutDashboard, PhoneCall } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '@/lib/api';
import type { HealthStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/calls', label: 'Call history', icon: History, end: false },
];

export function AppShell() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .health()
      .then((value) => {
        if (active) setHealth(value);
      })
      .catch(() => {
        if (active) setHealthError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const backendState = healthError
    ? 'Backend offline'
    : health
      ? health.database.reachable
        ? 'API connected'
        : 'Database unreachable'
      : 'Checking API';

  return (
    <div className="min-h-dvh">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] shell-grid opacity-60" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col lg:flex-row">
        <aside className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-line bg-paper/90 px-5 py-3 backdrop-blur lg:h-dvh lg:w-64 lg:flex-col lg:items-stretch lg:justify-start lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <NavLink to="/" className="flex items-center gap-2.5 focus-visible:outline-none">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-ink">
              <PhoneCall className="size-4" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-[19px] font-semibold tracking-tight">CallPilot</span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-muted">Cold-call assistant</span>
            </span>
          </NavLink>

          <nav className="flex items-center gap-1 lg:mt-10 lg:flex-col lg:items-stretch lg:gap-1.5" aria-label="Main">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-ink/5 hover:text-ink',
                  )
                }
              >
                <item.icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="hidden lg:mt-auto lg:block">
            <div className="rounded-lg border border-line bg-surface p-3">
              <p className="rule-label flex items-center gap-1.5">
                <Activity className="size-3" />
                System
              </p>
              <p className="mt-2 flex items-center gap-2 text-xs text-ink">
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    healthError || (health && !health.database.reachable) ? 'bg-signal' : health ? 'bg-teal' : 'bg-muted',
                  )}
                />
                {backendState}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted">
                DB {health?.database.driver ?? '-'} · LLM {health?.llm.provider ?? '-'}
              </p>
            </div>
            <p className="mt-4 px-1 font-mono text-[9px] leading-relaxed text-muted/80">
              Built from 100 cold-call transcripts. Fictional prospects in all examples.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
