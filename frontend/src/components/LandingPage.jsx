import React from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  FileSearch,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { getGoogleOAuthStartUrl } from '../api/client.js';

export default function LandingPage({
  authConfig,
  onDemoLogin,
  demoLoading,
  authError,
  onShowToast
}) {
  const handleGoogleLogin = () => {
    if (!authConfig?.googleOAuthEnabled) {
      onShowToast(
        'Google OAuth credentials are not configured in backend/.env yet. Click "Load Interactive Demo Workspace" to explore the full app immediately.',
        'info'
      );
      return;
    }
    window.location.href = getGoogleOAuthStartUrl();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                CollabScore <span className="text-indigo-600">AI</span>
              </span>
              <p className="text-[11px] font-medium text-slate-500">
                Google Workspace &amp; Classroom Accountability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Scoped <code className="font-mono">drive.file</code> Privacy
            </span>
            <button
              onClick={onDemoLogin}
              disabled={demoLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              {demoLoading ? 'Loading Demo...' : 'Launch Demo'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {authError && (
          <div className="mb-8 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Google sign-in returned an error: <span className="font-semibold">{authError}</span>.
            You can retry or load the interactive demo workspace below.
          </div>
        )}

        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Gemini 3.8 Flash &amp; Drive v3 Telemetry
            </div>

            <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              End Free-Riding in College Group Projects.
            </h1>

            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              Google Classroom assigns one shared grade, masking free-riders while student team
              leaders spend 6–10 extra hours covering missing work.{' '}
              <span className="font-semibold text-slate-800">CollabScore AI</span> turns verified
              Google Docs &amp; Slides revision logs plus peer check-ins into fair, auditable
              individual scores.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleGoogleLogin}
                className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                Continue with Google
              </button>

              <button
                onClick={onDemoLogin}
                disabled={demoLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
              >
                <Play className="h-4 w-4" />
                {demoLoading ? 'Preparing Workspace...' : 'Load Interactive Demo Workspace'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Works offline with seeded Capstone data
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Student Leader &amp; Instructor Role Switcher
              </span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                    Live Audit Preview · CS 401 Capstone
                  </span>
                  <h2 className="mt-0.5 font-display text-lg font-bold text-slate-900">
                    Smart Campus Transit &amp; Carbon Tracker
                  </h2>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-1.5 text-right border border-amber-200">
                  <div className="text-[10px] font-semibold uppercase text-amber-700">
                    Fairness Score
                  </div>
                  <div className="font-display text-xl font-bold text-amber-700 tabular-nums">
                    64 / 100
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2 text-xs text-slate-600">
                <span>AI Evidence Weighting</span>
                <span className="font-semibold text-slate-800">
                  75% Drive Revisions · 25% Peer Check-ins
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  {
                    name: 'Maya Lin (Team Leader)',
                    pct: 44,
                    tier: 'Core Driver',
                    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    bar: 'bg-emerald-500',
                    meta: '58 edits · +48.6 KB · 11 days',
                    grade: '98.4'
                  },
                  {
                    name: 'Daniel Okafor',
                    pct: 28,
                    tier: 'Consistent Contributor',
                    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    bar: 'bg-indigo-500',
                    meta: '34 edits · +29.4 KB · 8 days',
                    grade: '93.8'
                  },
                  {
                    name: 'Sofia Reyes',
                    pct: 23,
                    tier: 'Consistent Contributor',
                    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    bar: 'bg-indigo-400',
                    meta: '27 edits · +23.1 KB · 7 days',
                    grade: '91.1'
                  },
                  {
                    name: 'Jordan Brooks',
                    pct: 5,
                    tier: 'Free-Rider Risk',
                    badge: 'bg-rose-50 text-rose-700 border-rose-200',
                    bar: 'bg-rose-500',
                    meta: '4 edits · +1.9 KB · 1 day (crammed)',
                    grade: '62.6'
                  }
                ].map((row) => (
                  <div
                    key={row.name}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{row.name}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${row.badge}`}
                        >
                          {row.tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs tabular-nums">
                        <span className="font-bold text-slate-900">{row.pct}%</span>
                        <span className="rounded bg-white px-2 py-0.5 font-medium text-slate-600 border border-slate-200">
                          Fair Grade: {row.grade}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${row.bar}`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">{row.meta}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FileSearch className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-slate-900">
              Drive v3 Revision Telemetry
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Attach Google Docs &amp; Slides via the scoped <code className="font-mono">drive.file</code>{' '}
              Picker. Extracts edit sessions, byte deltas, and active working days—catching
              last-minute cramming without reading unrelated Drive files.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-slate-900">
              Anti-Bias 75/25 AI Scoring
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Gemini 3.8 Flash weighs objective Drive authorship at 75% and peer check-ins at 25%,
              neutralizing popularity bias and inflated self-ratings with structured evidence bullets.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-slate-900">
              Instructor Grade Calculator
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Enter your Classroom group grade (e.g., 92/100) and immediately view fair individual
              adjustments, dispute-settling audit summaries, and CSV gradebook exports.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
