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
    <section className="space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Audit Note'}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-indigo-600" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Instructor Fair Grade Calculator
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Input the overall Google Classroom group score to dynamically preview fair individual
              grades.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={calcMode}
              onChange={(e) => setCalcMode(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="multiplier">Policy: AI Suggested Multiplier</option>
              <option value="capped">Policy: Bounded (+10 / -18 pt cap)</option>
            </select>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={gradeRows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-600" />
            <label htmlFor="groupBaseGrade" className="text-xs font-semibold text-slate-800">
              Classroom Group Grade (0–100):
            </label>
          </div>

          <input
            id="groupBaseGrade"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={groupGradeInput}
            onChange={(e) => setGroupGradeInput(e.target.value)}
            className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none"
          />

          <input
            type="range"
            min="50"
            max="100"
            step="1"
            value={Math.min(100, Math.max(50, Number(groupGradeInput) || 90))}
            onChange={(e) => setGroupGradeInput(Number(e.target.value))}
            className="h-2 w-44 accent-indigo-600 cursor-pointer"
          />

          <button
            type="button"
            onClick={handleSaveGroupGrade}
            disabled={savingGrade}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
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
          <div className="mt-5 overflow-x-auto">
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
        )}
      </div>
    </section>
  );
}
