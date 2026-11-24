export function toLetterGrade(score) {
  const s = Number(score);
  if (s >= 93) return 'A';
  if (s >= 90) return 'A-';
  if (s >= 87) return 'B+';
  if (s >= 83) return 'B';
  if (s >= 80) return 'B-';
  if (s >= 77) return 'C+';
  if (s >= 73) return 'C';
  if (s >= 70) return 'C-';
  if (s >= 65) return 'D';
  return 'F';
}

export function calculateFairIndividualGrades(
  groupBaseGrade,
  evaluationMembers = [],
  mode = 'multiplier'
) {
  const base = Math.min(100, Math.max(0, Number(groupBaseGrade) || 0));
  if (!evaluationMembers || evaluationMembers.length === 0) return [];

  return evaluationMembers.map((member) => {
    const multiplier = Number(member.suggested_grade_multiplier) || 1.0;
    let rawAdjusted = base * multiplier;

    if (mode === 'capped') {
      rawAdjusted = Math.min(base + 10, Math.max(base - 18, rawAdjusted));
    }

    const adjusted = Number(Math.min(100, Math.max(0, rawAdjusted)).toFixed(1));
    const delta = Number((adjusted - base).toFixed(1));

    return {
      email: member.email,
      name: member.name,
      contribution_percentage: Number(member.contribution_percentage) || 0,
      effort_tier: member.effort_tier,
      suggested_grade_multiplier: multiplier,
      unadjusted_grade: Number(base.toFixed(1)),
      adjusted_grade: adjusted,
      delta,
      letter_grade: toLetterGrade(adjusted)
    };
  });
}

export function buildGradeAuditCsv(project, gradeRows, evaluation) {
  const headers = [
    'Project',
    'Course',
    'Student Name',
    'Email',
    'Effort Tier',
    'Contribution %',
    'Suggested Multiplier',
    'Unadjusted Group Grade',
    'Fair Adjusted Grade',
    'Delta',
    'Letter Grade'
  ];

  const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of gradeRows) {
    lines.push(
      [
        project.title,
        project.course_name,
        row.name,
        row.email,
        row.effort_tier,
        `${row.contribution_percentage}%`,
        `${row.suggested_grade_multiplier.toFixed(2)}x`,
        row.unadjusted_grade,
        row.adjusted_grade,
        row.delta >= 0 ? `+${row.delta}` : row.delta,
        row.letter_grade
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  if (evaluation?.evaluation_json?.instructor_audit_summary) {
    lines.push('');
    lines.push(
      [
        'AI Fairness Audit Summary',
        evaluation.evaluation_json.instructor_audit_summary
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  return lines.join('\n');
}
