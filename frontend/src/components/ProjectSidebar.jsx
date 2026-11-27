import React, { useState } from 'react';
import {
  BookOpen,
  Crown,
  FolderKanban,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { api } from '../api/client.js';

export default function ProjectSidebar({
  projects,
  activeProjectId,
  activeProject,
  onSelectProject,
  onProjectCreated,
  onProjectUpdated,
  onShowToast
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTab, setCreateTab] = useState('manual');
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [courseName, setCourseName] = useState('');
  const [classroomCourseId, setClassroomCourseId] = useState('');
  const [baseGrade, setBaseGrade] = useState(90);
  const [membersDraft, setMembersDraft] = useState([
    { user_name: '', user_email: '', assigned_section: 'Architecture & Synthesis', is_leader: true },
    { user_name: '', user_email: '', assigned_section: 'Research & Data', is_leader: false }
  ]);

  const [classroomLoading, setClassroomLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [classroomNote, setClassroomNote] = useState('');

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    user_name: '',
    user_email: '',
    assigned_section: '',
    is_leader: false
  });
  const [addingMember, setAddingMember] = useState(false);

  const openModal = async () => {
    setShowCreateModal(true);
    setCreateTab('classroom');
    setClassroomLoading(true);
    try {
      const data = await api.getClassroomCourses();
      setCourses(data.courses || []);
      setClassroomNote(data.message || data.warning || '');
    } catch (error) {
      setClassroomNote(error.message);
    } finally {
      setClassroomLoading(false);
    }
  };

  const handleSelectClassroomCourse = async (course) => {
    setCourseName(course.section ? `${course.name} (${course.section})` : course.name);
    setTitle(course.courseWorkTitle || `${course.name} — Group Project`);
    setClassroomCourseId(course.id);

    try {
      const rosterData = await api.getClassroomRoster(course.id);
      if (Array.isArray(rosterData.students) && rosterData.students.length > 0) {
        setMembersDraft(rosterData.students);
        onShowToast(`Imported ${rosterData.students.length} roster member(s).`, 'success');
      } else if (rosterData.warning) {
        setClassroomNote(rosterData.warning);
      }
    } catch {
      // Manual member entry remains available
    }
  };

  const handleAddDraftRow = () => {
    setMembersDraft((prev) => [
      ...prev,
      { user_name: '', user_email: '', assigned_section: 'General Contribution', is_leader: false }
    ]);
  };

  const handleUpdateDraftRow = (idx, field, value) => {
    setMembersDraft((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  const handleRemoveDraftRow = (idx) => {
    setMembersDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !courseName.trim()) {
      onShowToast('Project title and course name are required.', 'error');
      return;
    }
    setCreating(true);
    try {
      const validMembers = membersDraft.filter((m) => m.user_email.trim());
      const { project } = await api.createProject({
        title: title.trim(),
        course_name: courseName.trim(),
        classroom_course_id: classroomCourseId || null,
        group_base_grade: Number(baseGrade) || 90,
        members: validMembers
      });
      setShowCreateModal(false);
      setTitle('');
      setCourseName('');
      setClassroomCourseId('');
      onProjectCreated(project);
      onShowToast('Project workspace created.', 'success');
    } catch (error) {
      onShowToast(error.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!activeProject || !newMember.user_email.trim()) return;
    setAddingMember(true);
    try {
      const { project } = await api.addMember(activeProject.id, newMember);
      onProjectUpdated(project);
      setNewMember({ user_name: '', user_email: '', assigned_section: '', is_leader: false });
      setShowAddMember(false);
      onShowToast('Teammate added to project roster.', 'success');
    } catch (error) {
      onShowToast(error.message, 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!activeProject) return;
    try {
      const { project } = await api.removeMember(activeProject.id, memberId);
      onProjectUpdated(project);
      onShowToast('Member removed from roster.', 'info');
    } catch (error) {
      onShowToast(error.message, 'error');
    }
  };

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-indigo-600" />
            <h2 className="font-display text-sm font-bold text-slate-900">Projects</h2>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {projects.map((proj) => {
            const active = proj.id === activeProjectId;
            const fairness = proj.latest_fairness_score;
            const fairnessBadge =
              fairness === null || fairness === undefined
                ? 'bg-slate-100 text-slate-600'
                : fairness >= 80
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200';

            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => onSelectProject(proj.id)}
                className={`w-full rounded-xl border p-3 text-left transition cursor-pointer ${
                  active
                    ? 'border-indigo-500 bg-indigo-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-900 line-clamp-2">
                    {proj.title}
                  </div>
                  {fairness !== null && fairness !== undefined && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${fairnessBadge}`}
                    >
                      {fairness}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 truncate">{proj.course_name}</div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                  <span>{proj.member_count} members</span>
                  <span>·</span>
                  <span>{proj.file_count} Drive files</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeProject && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h3 className="font-display text-sm font-bold text-slate-900">Group Roster</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddMember((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <UserPlus className="h-3 w-3" />
              Add
            </button>
          </div>

          {showAddMember && (
            <form
              onSubmit={handleAddMemberSubmit}
              className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <input
                type="text"
                placeholder="Student Name"
                value={newMember.user_name}
                onChange={(e) => setNewMember((p) => ({ ...p, user_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:py-1.5 sm:text-xs"
                required
              />
              <input
                type="email"
                placeholder="student@university.edu"
                value={newMember.user_email}
                onChange={(e) => setNewMember((p) => ({ ...p, user_email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:py-1.5 sm:text-xs"
                required
              />
              <input
                type="text"
                placeholder="Assigned section (e.g., Evaluation)"
                value={newMember.assigned_section}
                onChange={(e) => setNewMember((p) => ({ ...p, assigned_section: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:py-1.5 sm:text-xs"
              />
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={newMember.is_leader}
                    onChange={(e) => setNewMember((p) => ({ ...p, is_leader: e.target.checked }))}
                  />
                  Team Leader
                </label>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  {addingMember ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-3 space-y-2">
            {activeProject.members.map((member) => (
              <div
                key={member.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-slate-900">
                      {member.user_name}
                    </span>
                    {member.is_leader && (
                      <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" title="Team Leader" />
                    )}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">{member.user_email}</div>
                  <div className="mt-0.5 text-[10px] font-medium text-indigo-700">
                    {member.assigned_section}
                  </div>
                </div>
                {!member.is_leader && activeProject.members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(member.id)}
                    title="Remove teammate"
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-2 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Create Project Workspace
                </h3>
                <p className="text-xs text-slate-500">
                  Import directly from Google Classroom or set up a manual group workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close modal"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="shrink-0 border-b border-slate-100 px-4 pt-2.5 sm:px-6 sm:pt-3">
              <div className="flex gap-3 overflow-x-auto whitespace-nowrap sm:gap-4">
                <button
                  type="button"
                  onClick={() => setCreateTab('classroom')}
                  className={`border-b-2 pb-2.5 text-xs font-semibold transition cursor-pointer ${
                    createTab === 'classroom'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Import from Google Classroom
                </button>
                <button
                  type="button"
                  onClick={() => setCreateTab('manual')}
                  className={`border-b-2 pb-2.5 text-xs font-semibold transition cursor-pointer ${
                    createTab === 'manual'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Manual Project Details
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6">
              {createTab === 'classroom' && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <BookOpen className="h-4 w-4 shrink-0 text-indigo-600" />
                      Available Google Classroom Courses
                    </span>
                    {classroomLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-600" />}
                  </div>

                  {classroomNote && (
                    <p className="rounded-lg bg-white px-3 py-2 text-[11px] text-slate-600 border border-slate-200">
                      {classroomNote}
                    </p>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => handleSelectClassroomCourse(course)}
                        className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                          classroomCourseId === course.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-semibold text-slate-900">{course.name}</div>
                        {course.section && (
                          <div className="text-[11px] text-slate-500">{course.section}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Project / Assignment Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., CS 401 Final Architecture Deliverable"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Group Base Grade
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={baseGrade}
                    onChange={(e) => setBaseGrade(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Course Name</label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g., CS 401 — Software Engineering Capstone"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Group Members (Auto-populated or Manual Entry)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDraftRow}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    + Add Member Row
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {membersDraft.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-12"
                    >
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={row.user_name}
                        onChange={(e) => handleUpdateDraftRow(idx, 'user_name', e.target.value)}
                        className="min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:col-span-3 sm:py-1.5 sm:text-xs"
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={row.user_email}
                        onChange={(e) => handleUpdateDraftRow(idx, 'user_email', e.target.value)}
                        className="min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:col-span-4 sm:py-1.5 sm:text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Assigned section"
                        value={row.assigned_section}
                        onChange={(e) =>
                          handleUpdateDraftRow(idx, 'assigned_section', e.target.value)
                        }
                        className="min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:col-span-3 sm:py-1.5 sm:text-xs"
                      />
                      <div className="flex items-center justify-between gap-1 sm:col-span-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 sm:text-[11px]">
                          <input
                            type="checkbox"
                            checked={Boolean(row.is_leader)}
                            onChange={(e) =>
                              handleUpdateDraftRow(idx, 'is_leader', e.target.checked)
                            }
                          />
                          Lead
                        </label>
                        {membersDraft.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftRow(idx)}
                            className="rounded p-1.5 text-slate-400 hover:text-rose-600 sm:p-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:w-auto sm:py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 sm:w-auto sm:py-2 cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
