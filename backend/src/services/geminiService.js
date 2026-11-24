import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/env.js';

const EFFORT_TIERS = [
  'Core Driver',
  'Consistent Contributor',
  'Minimal Contributor',
  'Free-Rider Risk'
];

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overall_fairness_score: {
      type: Type.INTEGER,
      description:
        'Integer from 0 to 100 indicating overall group workload equity (100 = balanced collaboration, lower = severe free-riding).'
    },
    members: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          email: { type: Type.STRING },
          name: { type: Type.STRING },
          contribution_percentage: {
            type: Type.NUMBER,
            description: 'Contribution share for this student. All members MUST sum to 100.'
          },
          effort_tier: {
            type: Type.STRING,
            enum: EFFORT_TIERS
          },
          objective_metrics_summary: { type: Type.STRING },
          ai_evidence_notes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 to 3 concise evidence bullets combining Drive metrics and peer reviews.'
          },
          suggested_grade_multiplier: {
            type: Type.NUMBER,
            description: 'Recommended individual grade multiplier centered around 1.00 (range 0.55 to 1.12).'
          }
        },
        required: [
          'email',
          'name',
          'contribution_percentage',
          'effort_tier',
          'objective_metrics_summary',
          'ai_evidence_notes',
          'suggested_grade_multiplier'
        ]
      }
    },
    instructor_audit_summary: {
      type: Type.STRING,
      description: 'Concise, objective paragraph for the instructor settling potential grade disputes.'
    }
  },
  required: ['overall_fairness_score', 'members', 'instructor_audit_summary']
};

const SYSTEM_INSTRUCTION = `You are CollabScore AI, an impartial academic group-project fairness auditor for college instructors.
Evaluate each student's true contribution using a strict 75% / 25% evidence weighting:
- 75% Weight: Objective Google Drive / Docs / Slides revision telemetry (total edit sessions, net bytes added, active editing days, number of files touched, and timeline spread vs. last-minute cramming).
- 25% Weight: Structured peer check-in ratings and task ownership comments from teammates.

Anti-bias rules:
1. Never let inflated self-ratings override low Drive edit volume or single-day cramming.
2. Flag "cramming_risk" when a member has minimal activity or concentrates edits into a single late session.
3. Ensure "contribution_percentage" across all listed members sums to EXACTLY 100.
4. Keep "ai_evidence_notes" factual, specific to numbers provided, and 2-3 bullets per member.
5. Assign "suggested_grade_multiplier" fairly: Core Drivers taking on extra load ~1.04-1.10; Consistent Contributors ~0.97-1.03; Minimal Contributors ~0.82-0.92; Free-Rider Risk ~0.58-0.78.`;

function normalizePercentagesTo100(members) {
  if (members.length === 0) return members;
  const rawSum = members.reduce((sum, m) => sum + Math.max(0, Number(m.contribution_percentage) || 0), 0);
  if (rawSum <= 0) {
    const even = Math.floor(100 / members.length);
    const remainder = 100 - even * members.length;
    return members.map((m, idx) => ({
      ...m,
      contribution_percentage: idx === 0 ? even + remainder : even
    }));
  }

  const scaled = members.map((m) => ({
    ...m,
    contribution_percentage: Math.round((Math.max(0, Number(m.contribution_percentage) || 0) / rawSum) * 100)
  }));

  const currentSum = scaled.reduce((sum, m) => sum + m.contribution_percentage, 0);
  const diff = 100 - currentSum;
  if (diff !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < scaled.length; i += 1) {
      if (scaled[i].contribution_percentage > scaled[maxIdx].contribution_percentage) {
        maxIdx = i;
      }
    }
    scaled[maxIdx].contribution_percentage = Math.max(0, scaled[maxIdx].contribution_percentage + diff);
  }
  return scaled;
}

function normalizeEvaluation(rawEval, project) {
  const stats = project.member_drive_stats || [];
  const rawMap = new Map(
    (rawEval?.members || []).map((m) => [(m.email || '').toLowerCase(), m])
  );

  const normalizedMembers = stats.map((stat) => {
    const aiMember = rawMap.get(stat.email.toLowerCase()) || {};
    const tier = EFFORT_TIERS.includes(aiMember.effort_tier)
      ? aiMember.effort_tier
      : 'Consistent Contributor';
    const multiplier = Math.min(
      1.15,
      Math.max(0.5, Number(aiMember.suggested_grade_multiplier) || 1.0)
    );
    const notes =
      Array.isArray(aiMember.ai_evidence_notes) && aiMember.ai_evidence_notes.length > 0
        ? aiMember.ai_evidence_notes.slice(0, 3)
        : [
            `Logged ${stat.total_revisions} revisions (+${(stat.total_bytes_added / 1000).toFixed(1)} KB) across ${stat.active_days} active days.`,
            stat.peer_rating_avg
              ? `Average teammate check-in rating: ${stat.peer_rating_avg}/5.`
              : 'No peer check-ins submitted yet for this member.'
          ];

    return {
      email: stat.email,
      name: aiMember.name || stat.name,
      contribution_percentage: Number(aiMember.contribution_percentage) || 0,
      effort_tier: tier,
      objective_metrics_summary:
        aiMember.objective_metrics_summary ||
        `${stat.total_revisions} revisions across ${stat.files_touched} files, +${(
          stat.total_bytes_added / 1000
        ).toFixed(1)} KB, ${stat.active_days} active days.`,
      ai_evidence_notes: notes,
      suggested_grade_multiplier: Number(multiplier.toFixed(2))
    };
  });

  const fixedMembers = normalizePercentagesTo100(normalizedMembers);
  const fairness = Math.min(
    100,
    Math.max(0, Math.round(Number(rawEval?.overall_fairness_score) || 75))
  );

  return {
    overall_fairness_score: fairness,
    members: fixedMembers,
    instructor_audit_summary:
      rawEval?.instructor_audit_summary ||
      'Contribution percentages reflect a 75% weighting of verified Google Drive revision telemetry and a 25% weighting of structured peer check-ins.'
  };
}

export function computeDeterministicEvaluation(project, fallbackReason = null) {
  const stats = project.member_drive_stats || [];
  if (stats.length === 0) {
    return {
      modelUsed: `${config.geminiModel} (offline-heuristic-fallback)`,
      fallbackReason,
      evaluation: {
        overall_fairness_score: 100,
        members: [],
        instructor_audit_summary: 'No project members found to evaluate.'
      }
    };
  }

  const maxRevs = Math.max(1, ...stats.map((s) => s.total_revisions));
  const maxBytes = Math.max(1, ...stats.map((s) => s.total_bytes_added));
  const maxDays = Math.max(1, ...stats.map((s) => s.active_days));

  const rawScores = stats.map((s) => {
    const revNorm = s.total_revisions / maxRevs;
    const byteNorm = s.total_bytes_added / maxBytes;
    const dayNorm = s.active_days / maxDays;
    let driveScore = revNorm * 0.5 + byteNorm * 0.3 + dayNorm * 0.2;
    if (s.cramming_risk) {
      driveScore *= 0.72;
    }
    const peerScore = (s.peer_rating_avg || 3) / 5;
    const combined = driveScore * 0.75 + peerScore * 0.25;
    return Math.max(0.03, combined);
  });

  const scoreSum = rawScores.reduce((a, b) => a + b, 0);
  const equalShare = 100 / stats.length;

  const prelimMembers = stats.map((s, idx) => {
    const pct = (rawScores[idx] / scoreSum) * 100;
    const ratio = pct / equalShare;
    let tier = 'Consistent Contributor';
    let multiplier = 1.0;

    if (ratio >= 1.4) {
      tier = 'Core Driver';
      multiplier = 1.07;
    } else if (ratio >= 0.75) {
      tier = 'Consistent Contributor';
      multiplier = Number((0.97 + (ratio - 0.75) * 0.1).toFixed(2));
    } else if (ratio >= 0.45) {
      tier = 'Minimal Contributor';
      multiplier = 0.86;
    } else {
      tier = 'Free-Rider Risk';
      multiplier = 0.68;
    }

    const kb = (s.total_bytes_added / 1000).toFixed(1);
    const notes = [
      `Recorded ${s.total_revisions} Drive revisions (+${kb} KB) across ${s.active_days} active editing day(s) in ${s.files_touched} file(s).`,
      s.cramming_risk
        ? 'Flagged for late/concentrated editing pattern compared to multi-day team cadence.'
        : 'Demonstrated steady multi-day revision cadence aligned with project milestones.',
      s.peer_rating_avg !== null
        ? `Teammate check-in rating averaged ${s.peer_rating_avg}/5${
            s.self_rating ? ` (self-rating: ${s.self_rating}/5)` : ''
          }.`
        : 'Evaluated primarily from Drive activity pending teammate check-in submissions.'
    ];

    return {
      email: s.email,
      name: s.name,
      contribution_percentage: Number(pct.toFixed(1)),
      effort_tier: tier,
      objective_metrics_summary: `${s.total_revisions} revisions across ${s.files_touched} file(s), +${kb} KB net content, ${s.active_days} active day(s).`,
      ai_evidence_notes: notes,
      suggested_grade_multiplier: multiplier
    };
  });

  const normalizedMembers = normalizePercentagesTo100(prelimMembers);
  const avgDeviation =
    normalizedMembers.reduce(
      (sum, m) => sum + Math.abs(m.contribution_percentage - equalShare),
      0
    ) / normalizedMembers.length;
  const fairnessScore = Math.round(Math.max(25, Math.min(99, 100 - avgDeviation * 2.1)));

  const top = [...normalizedMembers].sort(
    (a, b) => b.contribution_percentage - a.contribution_percentage
  )[0];
  const low = [...normalizedMembers].sort(
    (a, b) => a.contribution_percentage - b.contribution_percentage
  )[0];

  const summary =
    fairnessScore >= 82
      ? `Across ${project.files.length} synced Drive artifact(s), team collaboration is well balanced (fairness score ${fairnessScore}/100). ${top.name} (${top.contribution_percentage}%) and ${low.name} (${low.contribution_percentage}%) fall within normal variance under the 75% Drive / 25% peer weighting.`
      : `Weighted telemetry (75% Google Drive revisions, 25% peer check-ins) identifies an equitable gap in ${project.title} (fairness score ${fairnessScore}/100). ${top.name} led execution at ${top.contribution_percentage}%, whereas ${low.name} logged ${low.contribution_percentage}% (${low.effort_tier}), supporting an evidence-backed individual grade adjustment from the ${project.group_base_grade} group base score.`;

  return {
    modelUsed: `${config.geminiModel} (offline-heuristic-fallback)`,
    fallbackReason,
    evaluation: {
      overall_fairness_score: fairnessScore,
      members: normalizedMembers,
      instructor_audit_summary: summary
    }
  };
}

export async function runContributionAnalysis(project) {
  if (!config.geminiApiKey) {
    return computeDeterministicEvaluation(
      project,
      'GEMINI_API_KEY is not configured; using deterministic 75/25 local fallback.'
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const analysisInput = {
      project_title: project.title,
      course_name: project.course_name,
      group_base_grade: project.group_base_grade,
      attached_files: (project.files || []).map((f) => ({
        file_name: f.file_name,
        mime_type: f.mime_type,
        last_synced_at: f.last_synced_at
      })),
      objective_drive_metrics_by_member: (project.member_drive_stats || []).map((m) => ({
        email: m.email,
        name: m.name,
        assigned_section: m.assigned_section,
        is_leader: m.is_leader,
        total_revisions: m.total_revisions,
        total_bytes_added: m.total_bytes_added,
        active_days: m.active_days,
        files_touched: m.files_touched,
        revision_share_pct: m.revision_share_pct,
        bytes_share_pct: m.bytes_share_pct,
        cramming_risk: m.cramming_risk,
        last_edit_at: m.last_edit_at,
        daily_timeline: m.timeline
      })),
      peer_checkins: (project.peer_reviews || []).map((r) => ({
        reviewer_email: r.reviewer_email,
        reviewee_email: r.reviewee_email,
        owned_task: r.owned_task,
        rating_1_to_5: r.rating,
        comment: r.comment
      }))
    };

    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: `Analyze the following college group project contribution dataset and produce the structured JSON audit:\n\n${JSON.stringify(
        analysisInput,
        null,
        2
      )}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: {
          thinkingLevel: 'medium'
        },
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const parsed = JSON.parse(response.text);
    const normalized = normalizeEvaluation(parsed, project);

    return {
      modelUsed: config.geminiModel,
      fallbackReason: null,
      evaluation: normalized
    };
  } catch (error) {
    console.warn(`[GeminiService] Falling back to heuristic engine: ${error.message}`);
    return computeDeterministicEvaluation(
      project,
      `Gemini API fallback (${error.message})`
    );
  }
}
