import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Check,
  Copy,
  Download,
  GraduationCap,
  Save,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client.js';
import {
  buildGradeAuditCsv,
  calculateFairIndividualGrades
} from '../utils/gradeCalculator.js';

export default function InstructorGradeView({
  project,
  onProjectUpdated,
  onShowToast
}) {
  const [groupGradeInput, setGroupGradeInput] = useState(
    Number(project?.group_base_grade ?? 90)
  );
  const [calcMode, setCalcMode] = useState('multiplier');
  const [savingGrade, setSavingGrade] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setGroupGradeInput(Number(project?.group_base_grade ?? 90));
  }, [project?.id, project?.group_base_grade]);

  const evaluation = project?.latest_evaluation || null;
  const evalJson = evaluation?.evaluation_json || null;
  const evalMembers = evalJson?.members || [];

  const gradeRows = useMemo(
    () => calculateFairIndividualGrades(groupGradeInput, evalMembers, calcMode),
    [groupGradeInput, evalMembers, calcMode]
  );

  const handleSaveGroupGrade = async () => {
    const num = Number(groupGradeInput);
    if (Number.isNaN(num) || num < 0 || num > 100) {
      onShowToast('Group grade must be between 0 and 100.', 'error');
      return;
    }
    setSavingGrade(true);
    try {
      const { project: updated } = await api.updateBaseGrade(project.id, num);
      onProjectUpdated(updated);
      onShowToast(`Saved group base grade (${num}/100).`, 'success');
    } catch (error) {
      onShowToast(error.message, 'error');
    } finally {
      setSavingGrade(false);
    }
  };

  const handleCopySummary = async () => {
    if (!evalJson?.instructor_audit_summary) return;
    try {
      await navigator.clipboard.writeText(evalJson.instructor_audit_summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onShowToast('Copy failed; select the audit paragraph manually.', 'info');
    }
  };

  const handleExportCsv = () => {
    const csv = buildGradeAuditCsv(project, gradeRows, evaluation);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collabscore-grade-audit-project-${project.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Exported gradebook audit CSV.', 'success');
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-4 text-white shadow-lg sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-indigo-200">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Instructor Fairness Audit Summary
            </div>
            <h2 className="mt-3 font-display text-lg font-bold">
              Evidence-Backed Dispute Resolution Note
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              {evalJson?.instructor_audit_summary ||
                'Run the contribution audit below to generate an evidence-backed grading summary.'}
            </p>
          </div>

          {evalJson?.instructor_audit_summary && (
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20 sm:w-auto cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Audit Note'}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 sm:pb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 shrink-0 text-indigo-600" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Instructor Fair Grade Calculator
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Input the overall Google Classroom group score to dynamically preview fair individual
              grades.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select
              value={calcMode}
              onChange={(e) => setCalcMode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none sm:w-auto"
            >
              <option value="multiplier">Policy: AI Suggested Multiplier</option>
              <option value="capped">Policy: Bounded (+10 / -18 pt cap)</option>
            </select>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={gradeRows.length === 0}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:mt-5 sm:p-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 shrink-0 text-indigo-600" />
            <label htmlFor="groupBaseGrade" className="text-xs font-semibold text-slate-800">
              Classroom Group Grade (0–100):
            </label>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <input
              id="groupBaseGrade"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={groupGradeInput}
              onChange={(e) => setGroupGradeInput(e.target.value)}
              className="w-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none sm:w-24"
            />

            <input
              type="range"
              min="50"
              max="100"
              step="1"
              value={Math.min(100, Math.max(50, Number(groupGradeInput) || 90))}
              onChange={(e) => setGroupGradeInput(Number(e.target.value))}
              className="h-2 min-w-[120px] flex-1 accent-indigo-600 cursor-pointer lg:w-44 lg:flex-none"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveGroupGrade}
            disabled={savingGrade}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 lg:ml-auto lg:w-auto lg:py-2 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            {savingGrade ? 'Saving...' : 'Save Base Grade'}
          </button>
        </div>

        {gradeRows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
            Run an AI Contribution Audit first to calculate individual grade multipliers.
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-3 md:hidden">
              {gradeRows.map((row) => (
                <div
                  key={row.email}
                  className="rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-slate-900 break-words">
                        {row.name}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">{row.email}</div>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-display text-base font-extrabold text-slate-900">
                          {row.adjusted_grade}
                        </span>
                        <span className="text-sm font-bold text-indigo-700">
                          {row.letter_grade}
                        </span>
                      </div>
                      <span
                        className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          row.delta > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : row.delta < 0
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.delta >= 0 ? `+${row.delta}` : row.delta} vs group
                      </span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        row.effort_tier === 'Core Driver'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : row.effort_tier === 'Consistent Contributor'
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                            : row.effort_tier === 'Minimal Contributor'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}
                    >
                      {row.effort_tier}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 text-center text-[11px] tabular-nums">
                    <div>
                      <div className="text-[10px] font-medium uppercase text-slate-500">
                        Share
                      </div>
                      <div className="font-bold text-slate-900">
                        {row.contribution_percentage}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase text-slate-500">
                        Multiplier
                      </div>
                      <div className="font-mono font-semibold text-slate-700">
                        {row.suggested_grade_multiplier.toFixed(2)}x
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase text-slate-500">
                        Group Base
                      </div>
                      <div className="font-semibold text-slate-700">{row.unadjusted_grade}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Effort Tier</th>
                    <th className="px-4 py-3 font-semibold text-right">Contribution</th>
                    <th className="px-4 py-3 font-semibold text-right">Multiplier</th>
                    <th className="px-4 py-3 font-semibold text-right">Unadjusted Group</th>
                    <th className="px-4 py-3 font-semibold text-right">Fair Individual Grade</th>
                    <th className="pl-4 py-3 font-semibold text-right">Letter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeRows.map((row) => (
                    <tr key={row.email} className="hover:bg-slate-50/70">
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-slate-900">{row.name}</div>
                        <div className="text-[11px] text-slate-500">{row.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                            row.effort_tier === 'Core Driver'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : row.effort_tier === 'Consistent Contributor'
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                : row.effort_tier === 'Minimal Contributor'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          {row.effort_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 tabular-nums">
                        {row.contribution_percentage}%
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                        {row.suggested_grade_multiplier.toFixed(2)}x
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-500 tabular-nums">
                        {row.unadjusted_grade}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <span className="font-display text-sm font-extrabold text-slate-900">
                          {row.adjusted_grade}
                        </span>
                        <span
                          className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            row.delta > 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : row.delta < 0
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {row.delta >= 0 ? `+${row.delta}` : row.delta}
                        </span>
                      </td>
                      <td className="pl-4 py-3.5 text-right font-bold text-indigo-700">
                        {row.letter_grade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
