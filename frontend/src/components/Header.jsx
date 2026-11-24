import React from 'react';
import {
  Database,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserCheck
} from 'lucide-react';

export default function Header({
  user,
  activeProject,
  authConfig,
  onRoleSwitch,
  roleSwitching,
  onLogout
}) {
  const isInstructor = user?.role === 'INSTRUCTOR';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold tracking-tight text-slate-900">
                CollabScore <span className="text-indigo-600">AI</span>
              </span>
              {activeProject && (
                <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 md:inline-block">
                  {activeProject.course_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Database className="h-3 w-3 text-emerald-600" />
                {authConfig?.dbMode === 'mysql' ? 'MySQL Connected' : 'Interactive Demo Store'}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                <Sparkles className="h-3 w-3" />
                {authConfig?.geminiModel || 'gemini-3.8-flash'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1"
            role="group"
            aria-label="Presentation Role Switcher"
          >
            <button
              type="button"
              disabled={roleSwitching}
              onClick={() => onRoleSwitch('STUDENT')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                !isInstructor
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Student Leader View
            </button>
            <button
              type="button"
              disabled={roleSwitching}
              onClick={() => onRoleSwitch('INSTRUCTOR')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                isInstructor
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Instructor View
            </button>
          </div>

          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
            <img
              src={
                user?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user?.name || 'User'
                )}&background=4f46e5&color=fff`
              }
              alt={user?.name}
              className="h-8 w-8 rounded-full border border-slate-200 object-cover"
            />
            <div className="hidden text-left sm:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</div>
              <div className="text-[11px] text-slate-500 leading-tight">{user?.email}</div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              className="ml-1 inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
