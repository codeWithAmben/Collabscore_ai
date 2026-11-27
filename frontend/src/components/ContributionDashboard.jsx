import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Flame,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { api } from '../api/client.js';

const CHART_COLORS = ['#4f46e5', '#10b981', '#0ea5e9', '#f43f5e', '#f59e0b', '#8b5cf6'];

function tierBadgeStyle(tier) {
  switch (tier) {
    case 'Core Driver':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'Consistent Contributor':
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    case 'Minimal Contributor':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'Free-Rider Risk':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

export default function ContributionDashboard({
  project,
  onProjectUpdated,
  onShowToast
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [lastRunMeta, setLastRunMeta] = useState(null);

  const evaluation = project?.latest_evaluation?.evaluation_json || null;
  const evalMembers = evaluation?.members || [];
  const stats = project?.member_drive_stats || [];

  const handleRunAudit = async (forceRefresh = true) => {
    setAnalyzing(true);
    try {
      const res = await api.analyzeProject(project.id, forceRefresh);
      onProjectUpdated(res.project);
      setLastRunMeta({ cached: res.cached });
      onShowToast(
        res.cached ? 'Loaded cached contribution audit.' : 'Contribution audit complete!',
        'success'
      );
    } catch (error) {
      onShowToast(error.message, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const chartData = useMemo(() => {
    if (stats.length === 0) return [];

    // Calculate claimed peer rating share (preferring self-rating if provided so self-inflation contrast is visible)
    const claimedScores = stats.map((s) => Number(s.self_rating ?? s.peer_rating_avg ?? 3));
    const claimedSum = claimedScores.reduce((a, b) => a + b, 0) || 1;
    const evalMap = new Map(evalMembers.map((m) => [m.email.toLowerCase(), m]));

    return stats.map((stat, idx) => {
      const aiMember = evalMap.get(stat.email.toLowerCase());
      const claimedShare = Number(((claimedScores[idx] / claimedSum) * 100).toFixed(1));
      const driveShare = Number(stat.revision_share_pct || 0);
      const aiShare = Number(aiMember?.contribution_percentage ?? driveShare);

      return {
        name: stat.name.split(' ')[0],
        fullName: stat.name,
        email: stat.email,
        claimedPeerPct: claimedShare,
        driveEffortPct: driveShare,
        aiFinalPct: aiShare,
        color: CHART_COLORS[idx % CHART_COLORS.length]
      };
    });
  }, [stats, evalMembers]);

  const totalRevisions = stats.reduce((sum, s) => sum + (s.total_revisions || 0), 0);
  const totalKb = (stats.reduce((sum, s) => sum + (s.total_bytes_added || 0), 0) / 1000).toFixed(1);
  const fairnessScore = evaluation?.overall_fairness_score ?? null;

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900">
                AI Contribution Breakdown
              </h2>
              {project.latest_evaluation && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                  <Sparkles className="h-3 w-3" />
                  {lastRunMeta?.cached === false ? 'Fresh Audit' : 'Cached Audit'}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              75% Objective Google Drive Revisions + 25% Peer Check-Ins · Eliminates popularity bias
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleRunAudit(true)}
            disabled={analyzing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 sm:w-auto cursor-pointer"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {analyzing
              ? 'Running Contribution Audit...'
              : evaluation
                ? 'Re-run Audit'
                : 'Run Contribution Audit'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">
              Overall Fairness Score
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`font-display text-xl font-extrabold tabular-nums sm:text-2xl ${
                  fairnessScore === null
                    ? 'text-slate-400'
                    : fairnessScore >= 80
                      ? 'text-emerald-600'
                      : fairnessScore >= 60
                        ? 'text-amber-600'
                        : 'text-rose-600'
                }`}
              >
                {fairnessScore !== null ? `${fairnessScore} / 100` : 'Pending'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">
              Tracked Drive Edits
            </div>
            <div className="mt-1 font-display text-xl font-extrabold text-slate-900 tabular-nums sm:text-2xl">
              {totalRevisions}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">
              Net Content Delta
            </div>
            <div className="mt-1 font-display text-xl font-extrabold text-slate-900 tabular-nums sm:text-2xl">
              +{totalKb} KB
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">
              Free-Rider Risk Flags
            </div>
            <div className="mt-1 font-display text-xl font-extrabold text-slate-900 tabular-nums sm:text-2xl">
              {stats.filter((s) => s.cramming_risk).length}
            </div>
          </div>
        </div>
      </div>

      {!evaluation ? (
        <div className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/40 p-6 text-center sm:p-10">
          <Sparkles className="mx-auto h-8 w-8 text-indigo-600" />
          <h3 className="mt-3 font-display text-base font-bold text-slate-900">
            Ready to Run Your First AI Contribution Audit
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-600">
            Attach Google Docs/Slides above and click &ldquo;Run Contribution Audit&rdquo; to
            generate individual contribution shares and evidence notes.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 lg:col-span-7">
              <div className="mb-3">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Claimed Peer Rating vs. Actual Drive Revision Effort
                </h3>
                <p className="text-xs text-slate-500">
                  Detects discrepancies between self/peer claims and verified Drive authorship
                </p>
              </div>
              <div className="h-[270px] w-full sm:h-[290px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={60}
                      tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 600 }}
                    />
                    <Tooltip
                      formatter={(val) => `${val}%`}
                      contentStyle={{
                        borderRadius: '12px',
                        borderColor: '#e2e8f0',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar
                      dataKey="claimedPeerPct"
                      name="Claimed Rating Share"
                      fill="#cbd5e1"
                      radius={[0, 4, 4, 0]}
                      barSize={10}
                    />
                    <Bar
                      dataKey="driveEffortPct"
                      name="Actual Drive Revisions"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                      barSize={10}
                    />
                    <Bar
                      dataKey="aiFinalPct"
                      name="AI Weighted Share"
                      fill="#4f46e5"
                      radius={[0, 4, 4, 0]}
                      barSize={10}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 lg:col-span-5">
              <div className="mb-3">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Final AI Contribution Split (100%)
                </h3>
                <p className="text-xs text-slate-500">
                  Normalized contribution percentage across all group members
                </p>
              </div>
              <div className="h-[280px] w-full sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="aiFinalPct"
                      nameKey="fullName"
                      cx="50%"
                      cy="42%"
                      innerRadius="45%"
                      outerRadius="70%"
                      paddingAngle={3}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.email} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => `${val}%`}
                      contentStyle={{
                        borderRadius: '12px',
                        borderColor: '#e2e8f0',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {evalMembers.map((member, idx) => {
              const stat =
                stats.find((s) => s.email.toLowerCase() === member.email.toLowerCase()) || {};
              const sparkData =
                stat.timeline?.length > 0
                  ? stat.timeline
                  : [{ date: 'Day 1', edits: stat.total_revisions || 0 }];

              return (
                <div
                  key={member.email}
                  className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h4 className="font-display text-base font-bold text-slate-900 break-words">
                            {member.name}
                          </h4>
                          {stat.is_leader && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                              <Crown className="h-3 w-3" />
                              Leader
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-slate-500">{member.email}</div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="font-display text-xl font-extrabold text-indigo-600 tabular-nums sm:text-2xl">
                          {member.contribution_percentage}%
                        </div>
                        <span
                          className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tierBadgeStyle(
                            member.effort_tier
                          )}`}
                        >
                          {member.effort_tier}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700 tabular-nums">
                        {stat.total_revisions ?? 0} revisions
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700 tabular-nums">
                        +{((stat.total_bytes_added ?? 0) / 1000).toFixed(1)} KB
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700 tabular-nums">
                        {stat.active_days ?? 0} active days
                      </span>
                      {stat.cramming_risk ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 border border-rose-200">
                          <Flame className="h-3 w-3" />
                          Late Cramming Flag
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Steady Cadence
                        </span>
                      )}
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <span>Revision Timeline Sparkline</span>
                        <span>Multiplier: {Number(member.suggested_grade_multiplier).toFixed(2)}x</span>
                      </div>
                      <div className="h-[64px] w-full">
                        <ResponsiveContainer width="100%" height={64}>
                          <AreaChart data={sparkData}>
                            <Area
                              type="monotone"
                              dataKey="edits"
                              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                              fill={CHART_COLORS[idx % CHART_COLORS.length]}
                              fillOpacity={0.18}
                              strokeWidth={2}
                            />
                            <Tooltip
                              formatter={(v) => [`${v} edits`, 'Activity']}
                              labelFormatter={(l) => `Date: ${l}`}
                              contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Contribution Evidence
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {(member.ai_evidence_notes || []).map((note, nIdx) => (
                          <li key={nIdx} className="flex items-start gap-2 text-xs text-slate-700">
                            {member.effort_tier === 'Free-Rider Risk' ? (
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                            ) : (
                              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                            )}
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
