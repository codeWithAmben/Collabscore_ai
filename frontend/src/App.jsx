import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, FolderKanban, Loader2, X } from 'lucide-react';
import { api, consumeTokenFromUrl, getStoredToken } from './api/client.js';
import ContributionDashboard from './components/ContributionDashboard.jsx';
import Header from './components/Header.jsx';
import InstructorGradeView from './components/InstructorGradeView.jsx';
import LandingPage from './components/LandingPage.jsx';
import ProjectSidebar from './components/ProjectSidebar.jsx';
import StudentWorkspace from './components/StudentWorkspace.jsx';

export default function App() {
  const [authConfig, setAuthConfig] = useState(null);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [roleSwitching, setRoleSwitching] = useState(false);

  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);

  const [authError, setAuthError] = useState('');
  const [toast, setToast] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileSidebarOpen]);

  const loadWorkspaceProjects = useCallback(async (preferredProjectId = null) => {
    const { projects: list } = await api.listProjects();
    setProjects(list);
    if (list.length === 0) {
      setActiveProjectId(null);
      setActiveProject(null);
      return;
    }
    const nextId =
      preferredProjectId && list.some((p) => p.id === preferredProjectId)
        ? preferredProjectId
        : list[0].id;
    setActiveProjectId(nextId);
    setLoadingProject(true);
    try {
      const { project } = await api.getProject(nextId);
      setActiveProject(project);
    } finally {
      setLoadingProject(false);
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        consumeTokenFromUrl();
        const params = new URLSearchParams(window.location.search);
        const oauthErr = params.get('auth_error');
        if (oauthErr) {
          setAuthError(oauthErr);
          window.history.replaceState(null, '', window.location.pathname);
        }

        const cfg = await api.getAuthConfig().catch(() => null);
        if (cfg) setAuthConfig(cfg);

        if (getStoredToken()) {
          const meData = await api.getMe();
          setUser(meData.user);
          await loadWorkspaceProjects();
        }
      } catch {
        setUser(null);
      } finally {
        setBooting(false);
      }
    }
    bootstrap();
  }, [loadWorkspaceProjects]);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const res = await api.loginDemo();
      setUser(res.user);
      const cfg = await api.getAuthConfig().catch(() => null);
      if (cfg) setAuthConfig(cfg);
      await loadWorkspaceProjects();
      showToast('Loaded interactive CollabScore AI demo workspace.', 'success');
    } catch (error) {
      showToast(error.message || 'Could not load demo workspace.', 'error');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSelectProject = async (projectId) => {
    setActiveProjectId(projectId);
    setLoadingProject(true);
    try {
      const { project } = await api.getProject(projectId);
      setActiveProject(project);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoadingProject(false);
    }
  };

  const handleProjectUpdated = async (updatedProject) => {
    setActiveProject(updatedProject);
    try {
      const { projects: refreshedList } = await api.listProjects();
      setProjects(refreshedList);
    } catch {
      // Keep current list if refresh fails
    }
  };

  const handleProjectCreated = async (newProject) => {
    await loadWorkspaceProjects(newProject.id);
  };

  const handleRoleSwitch = async (nextRole) => {
    if (!user || user.role === nextRole) return;
    setRoleSwitching(true);
    try {
      const res = await api.switchRole(nextRole);
      setUser(res.user);
      showToast(
        nextRole === 'INSTRUCTOR'
          ? 'Switched to Instructor Audit & Grade Calculator View.'
          : 'Switched to Student Team Leader Workspace.',
        'info'
      );
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setRoleSwitching(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setProjects([]);
    setActiveProjectId(null);
    setActiveProject(null);
  };

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-slate-700">Loading CollabScore AI...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage
          authConfig={authConfig}
          onDemoLogin={handleDemoLogin}
          demoLoading={demoLoading}
          authError={authError}
          onShowToast={showToast}
        />
        <ToastBanner toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  const isInstructor = user.role === 'INSTRUCTOR';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        user={user}
        activeProject={activeProject}
        authConfig={authConfig}
        onRoleSwitch={handleRoleSwitch}
        roleSwitching={roleSwitching}
        onLogout={handleLogout}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      <main className="mx-auto max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-xs transition hover:border-indigo-300 cursor-pointer"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FolderKanban className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-slate-900">
                  {activeProject ? activeProject.title : 'Projects & Group Roster'}
                </div>
                <div className="truncate text-[11px] text-slate-500">
                  {projects.length} projects
                  {activeProject ? ` · ${activeProject.members.length} members` : ''}
                </div>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              Projects
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          <div
            className={
              mobileSidebarOpen
                ? 'fixed inset-y-0 left-0 z-50 w-[min(88vw,340px)] overflow-y-auto bg-slate-50 p-4 shadow-2xl lg:static lg:z-auto lg:col-span-3 lg:w-auto lg:overflow-visible lg:bg-transparent lg:p-0 lg:shadow-none'
                : 'hidden lg:block lg:col-span-3'
            }
          >
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <span className="font-display text-sm font-bold text-slate-900">
                Projects &amp; Roster
              </span>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close projects drawer"
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ProjectSidebar
              projects={projects}
              activeProjectId={activeProjectId}
              activeProject={activeProject}
              onSelectProject={(projectId) => {
                setMobileSidebarOpen(false);
                handleSelectProject(projectId);
              }}
              onProjectCreated={(newProject) => {
                setMobileSidebarOpen(false);
                return handleProjectCreated(newProject);
              }}
              onProjectUpdated={handleProjectUpdated}
              onShowToast={showToast}
            />
          </div>

          <div className="lg:col-span-9 min-w-0 space-y-4 sm:space-y-6">
            {loadingProject ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : !activeProject ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center sm:p-12">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  No Project Selected
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Create a new project or import one from Google Classroom using the sidebar.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                        {isInstructor ? 'Instructor Audit Mode' : 'Student Leader Workspace'} ·{' '}
                        {activeProject.course_name}
                      </span>
                      <h1 className="mt-0.5 font-display text-lg font-extrabold text-slate-900 break-words sm:text-xl">
                        {activeProject.title}
                      </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700">
                        Base Grade: <strong className="tabular-nums">{activeProject.group_base_grade}/100</strong>
                      </span>
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700">
                        {activeProject.members.length} Students
                      </span>
                    </div>
                  </div>
                </div>

                {isInstructor ? (
                  <>
                    <InstructorGradeView
                      project={activeProject}
                      onProjectUpdated={handleProjectUpdated}
                      onShowToast={showToast}
                    />
                    <ContributionDashboard
                      project={activeProject}
                      onProjectUpdated={handleProjectUpdated}
                      onShowToast={showToast}
                    />
                  </>
                ) : (
                  <>
                    <StudentWorkspace
                      user={user}
                      project={activeProject}
                      onProjectUpdated={handleProjectUpdated}
                      onShowToast={showToast}
                    />
                    <ContributionDashboard
                      project={activeProject}
                      onProjectUpdated={handleProjectUpdated}
                      onShowToast={showToast}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <ToastBanner toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function ToastBanner({ toast, onClose }) {
  if (!toast) return null;
  const styles =
    toast.type === 'error'
      ? 'border-rose-300 bg-rose-50 text-rose-900'
      : toast.type === 'success'
        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
        : 'border-indigo-300 bg-indigo-50 text-indigo-900';

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-sm">
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs font-medium shadow-lg ${styles}`}
      >
        <span className="leading-relaxed">{toast.message}</span>
        <button type="button" onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
