import React from 'react';
import {
  Database,
  GraduationCap,
  LogOut,
  Menu,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function Header({
  user,
  activeProject,
  authConfig,
  onRoleSwitch,
  roleSwitching,
  onLogout,
  onOpenMobileSidebar
}) {
  const isInstructor = user?.role === 'INSTRUCTOR';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2.5 px-3 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              aria-label="Open projects and roster"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm sm:h-9 sm:w-9">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold tracking-tight text-slate-900 sm:text-base truncate">
                  CollabScore <span className="text-indigo-600">AI</span>
                </span>
                {activeProject && (
                  <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 md:inline-block">
                    {activeProject.course_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex min-w-0 items-center gap-1 truncate">
                  <Database className="h-3 w-3 shrink-0 text-emerald-600" />
                  <span className="truncate">
                    {authConfig?.dbMode === 'mysql' ? 'MySQL Connected' : 'Interactive Demo Store'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
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
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1 lg:inline-flex lg:w-auto lg:items-center"
            role="group"
            aria-label="Presentation Role Switcher"
          >
            <button
              type="button"
              disabled={roleSwitching}
              onClick={() => onRoleSwitch('STUDENT')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer sm:px-3 ${
                !isInstructor
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                Student<span className="hidden sm:inline"> Leader</span> View
              </span>
            </button>
            <button
              type="button"
              disabled={roleSwitching}
              onClick={() => onRoleSwitch('INSTRUCTOR')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer sm:px-3 ${
                isInstructor
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Instructor View</span>
            </button>
          </div>

          <div className="hidden items-center gap-2.5 border-l border-slate-200 pl-3 lg:flex">
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
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</div>
              <div className="text-[11px] text-slate-500 leading-tight">{user?.email}</div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
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
