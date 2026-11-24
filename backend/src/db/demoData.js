function daysAgoIso(daysAgo, hour = 16) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(hour, 15, 0, 0);
  return date.toISOString();
}

function dateLabel(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function buildTimeline(points) {
  return points.map(([daysAgo, edits, bytes]) => ({
    date: dateLabel(daysAgo),
    edits,
    bytes
  }));
}

export const DEMO_USER = {
  google_id: 'demo-google-maya-lin-001',
  email: 'maya.lin@university.edu',
  name: 'Maya Lin',
  avatar_url: 'https://ui-avatars.com/api/?name=Maya+Lin&background=4f46e5&color=fff',
  role: 'STUDENT'
};

export const DEMO_PROJECTS = [
  {
    title: 'CS 401 Capstone: Smart Campus Transit & Carbon Tracker',
    course_name: 'CS 401 — Software Engineering Capstone',
    classroom_course_id: 'classroom-cs401-fall',
    group_base_grade: 92.0,
    status: 'ACTIVE',
    members: [
      {
        user_email: 'maya.lin@university.edu',
        user_name: 'Maya Lin',
        assigned_section: 'Architecture, API Integration & Final Synthesis',
        is_leader: true
      },
      {
        user_email: 'daniel.okafor@university.edu',
        user_name: 'Daniel Okafor',
        assigned_section: 'Methodology, Telemetry Pipeline & Evaluation',
        is_leader: false
      },
      {
        user_email: 'sofia.reyes@university.edu',
        user_name: 'Sofia Reyes',
        assigned_section: 'UX Research, Slide Deck & Accessibility Audit',
        is_leader: false
      },
      {
        user_email: 'jordan.brooks@university.edu',
        user_name: 'Jordan Brooks',
        assigned_section: 'Literature Review & Cost Appendix',
        is_leader: false
      }
    ],
    files: [
      {
        google_file_id: 'demo-gdoc-cs401-report',
        file_name: 'CS401_Final_Capstone_Report.gdoc',
        mime_type: 'application/vnd.google-apps.document',
        web_view_link: 'https://docs.google.com/document/d/demo-gdoc-cs401-report/edit',
        last_synced_at: daysAgoIso(0, 14),
        revisions: [
          {
            contributor_email: 'maya.lin@university.edu',
            contributor_name: 'Maya Lin',
            revision_count: 37,
            bytes_added: 32400,
            active_days: 10,
            last_edit_at: daysAgoIso(0, 13),
            raw_timeline_json: buildTimeline([
              [13, 3, 2800],
              [12, 4, 3400],
              [10, 5, 4200],
              [9, 3, 2600],
              [7, 4, 3900],
              [6, 3, 3100],
              [4, 4, 3600],
              [3, 4, 3500],
              [1, 4, 3300],
              [0, 3, 2000]
            ])
          },
          {
            contributor_email: 'daniel.okafor@university.edu',
            contributor_name: 'Daniel Okafor',
            revision_count: 24,
            bytes_added: 21200,
            active_days: 7,
            last_edit_at: daysAgoIso(1, 18),
            raw_timeline_json: buildTimeline([
              [12, 2, 1900],
              [10, 3, 2900],
              [8, 4, 3600],
              [6, 4, 3500],
              [4, 4, 3400],
              [2, 4, 3300],
              [1, 3, 2600]
            ])
          },
          {
            contributor_email: 'sofia.reyes@university.edu',
            contributor_name: 'Sofia Reyes',
            revision_count: 11,
            bytes_added: 9600,
            active_days: 5,
            last_edit_at: daysAgoIso(1, 15),
            raw_timeline_json: buildTimeline([
              [11, 2, 1700],
              [8, 2, 1800],
              [5, 3, 2400],
              [3, 2, 1900],
              [1, 2, 1800]
            ])
          },
          {
            contributor_email: 'jordan.brooks@university.edu',
            contributor_name: 'Jordan Brooks',
            revision_count: 3,
            bytes_added: 1450,
            active_days: 1,
            last_edit_at: daysAgoIso(0, 11),
            raw_timeline_json: buildTimeline([[0, 3, 1450]])
          }
        ]
      },
      {
        google_file_id: 'demo-gslides-cs401-deck',
        file_name: 'CS401_Defense_Presentation_Deck.gslides',
        mime_type: 'application/vnd.google-apps.presentation',
        web_view_link: 'https://docs.google.com/presentation/d/demo-gslides-cs401-deck/edit',
        last_synced_at: daysAgoIso(0, 14),
        revisions: [
          {
            contributor_email: 'maya.lin@university.edu',
            contributor_name: 'Maya Lin',
            revision_count: 15,
            bytes_added: 11800,
            active_days: 6,
            last_edit_at: daysAgoIso(0, 14),
            raw_timeline_json: buildTimeline([
              [9, 2, 1600],
              [7, 2, 1900],
              [5, 3, 2300],
              [3, 3, 2100],
              [1, 3, 2200],
              [0, 2, 1700]
            ])
          },
          {
            contributor_email: 'daniel.okafor@university.edu',
            contributor_name: 'Daniel Okafor',
            revision_count: 8,
            bytes_added: 6400,
            active_days: 4,
            last_edit_at: daysAgoIso(1, 19),
            raw_timeline_json: buildTimeline([
              [6, 2, 1500],
              [4, 2, 1700],
              [2, 2, 1600],
              [1, 2, 1600]
            ])
          },
          {
            contributor_email: 'sofia.reyes@university.edu',
            contributor_name: 'Sofia Reyes',
            revision_count: 16,
            bytes_added: 13500,
            active_days: 6,
            last_edit_at: daysAgoIso(0, 12),
            raw_timeline_json: buildTimeline([
              [10, 2, 1700],
              [8, 3, 2500],
              [6, 3, 2600],
              [4, 3, 2400],
              [2, 3, 2400],
              [0, 2, 1900]
            ])
          },
          {
            contributor_email: 'jordan.brooks@university.edu',
            contributor_name: 'Jordan Brooks',
            revision_count: 1,
            bytes_added: 500,
            active_days: 1,
            last_edit_at: daysAgoIso(0, 11),
            raw_timeline_json: buildTimeline([[0, 1, 500]])
          }
        ]
      },
      {
        google_file_id: 'demo-pdf-transit-dataset',
        file_name: 'Transit_Carbon_Dataset_Summary.pdf',
        mime_type: 'application/pdf',
        web_view_link: 'https://drive.google.com/file/d/demo-pdf-transit-dataset/view',
        last_synced_at: daysAgoIso(1, 16),
        revisions: [
          {
            contributor_email: 'maya.lin@university.edu',
            contributor_name: 'Maya Lin',
            revision_count: 6,
            bytes_added: 4400,
            active_days: 2,
            last_edit_at: daysAgoIso(2, 17),
            raw_timeline_json: buildTimeline([
              [5, 3, 2200],
              [2, 3, 2200]
            ])
          },
          {
            contributor_email: 'daniel.okafor@university.edu',
            contributor_name: 'Daniel Okafor',
            revision_count: 2,
            bytes_added: 1800,
            active_days: 2,
            last_edit_at: daysAgoIso(3, 15),
            raw_timeline_json: buildTimeline([
              [6, 1, 900],
              [3, 1, 900]
            ])
          }
        ]
      }
    ],
    peer_reviews: [
      {
        reviewer_email: 'maya.lin@university.edu',
        reviewee_email: 'daniel.okafor@university.edu',
        owned_task: 'Telemetry ingestion pipeline & benchmark charts',
        rating: 5,
        comment: 'Reliable milestones every sprint; debugged data normalization ahead of deadline.'
      },
      {
        reviewer_email: 'maya.lin@university.edu',
        reviewee_email: 'sofia.reyes@university.edu',
        owned_task: 'UX interviews, slide architecture & formatting',
        rating: 4,
        comment: 'Strong visual polish on defense deck and user evaluation writeup.'
      },
      {
        reviewer_email: 'maya.lin@university.edu',
        reviewee_email: 'jordan.brooks@university.edu',
        owned_task: 'Literature review & cost appendix',
        rating: 1,
        comment: 'Missed three check-ins; Maya rewrote literature review 2 nights before submission.'
      },
      {
        reviewer_email: 'daniel.okafor@university.edu',
        reviewee_email: 'maya.lin@university.edu',
        owned_task: 'System architecture, integration & report synthesis',
        rating: 5,
        comment: 'Carried architectural design and absorbed missing appendix work.'
      },
      {
        reviewer_email: 'daniel.okafor@university.edu',
        reviewee_email: 'sofia.reyes@university.edu',
        owned_task: 'Presentation deck & usability testing',
        rating: 4,
        comment: 'Consistent contributor across all design reviews.'
      },
      {
        reviewer_email: 'daniel.okafor@university.edu',
        reviewee_email: 'jordan.brooks@university.edu',
        owned_task: 'Literature review',
        rating: 2,
        comment: 'Only pasted short bullet notes two hours before final lock.'
      },
      {
        reviewer_email: 'sofia.reyes@university.edu',
        reviewee_email: 'maya.lin@university.edu',
        owned_task: 'Lead coordination & technical sections',
        rating: 5,
        comment: 'Put in extra 8+ hours covering missing literature citations.'
      },
      {
        reviewer_email: 'sofia.reyes@university.edu',
        reviewee_email: 'jordan.brooks@university.edu',
        owned_task: 'Cost appendix',
        rating: 2,
        comment: 'Minimal presence until submission morning.'
      },
      {
        reviewer_email: 'jordan.brooks@university.edu',
        reviewee_email: 'jordan.brooks@university.edu',
        owned_task: 'Literature review, citations & cost appendix',
        rating: 4,
        comment: 'Completed final reference formatting and appendix proofreading.'
      }
    ],
    ai_evaluation: {
      model_used: 'gemini-3.8-flash',
      evaluation_json: {
        overall_fairness_score: 64,
        members: [
          {
            email: 'maya.lin@university.edu',
            name: 'Maya Lin',
            contribution_percentage: 44,
            effort_tier: 'Core Driver',
            objective_metrics_summary:
              '58 revisions across 3 Drive files, +48.6 KB net content, 11 active editing days over 2 weeks.',
            ai_evidence_notes: [
              'Sustained steady authoring across 11 distinct days in both the capstone report (37 edits) and defense slides (15 edits).',
              'Authored 47.1% of total tracked document bytes while coordinating dataset summaries and absorbing the missing literature review.',
              'Peer evaluations unanimously confirm 5/5 leadership and extra coverage hours.'
            ],
            suggested_grade_multiplier: 1.07
          },
          {
            email: 'daniel.okafor@university.edu',
            name: 'Daniel Okafor',
            contribution_percentage: 28,
            effort_tier: 'Consistent Contributor',
            objective_metrics_summary:
              '34 revisions across 3 Drive files, +29.4 KB net content, 8 active editing days with balanced cadence.',
            ai_evidence_notes: [
              'Delivered 24 iterative report revisions (+21.2 KB) covering methodology and telemetry evaluation across 7 separate days.',
              'Contributed 8 revisions to the defense slide deck and verified benchmark figures without last-minute spikes.',
              'Peer feedback corroborates strong technical reliability (avg 5.0/5).'
            ],
            suggested_grade_multiplier: 1.02
          },
          {
            email: 'sofia.reyes@university.edu',
            name: 'Sofia Reyes',
            contribution_percentage: 23,
            effort_tier: 'Consistent Contributor',
            objective_metrics_summary:
              '27 revisions across 2 Drive files, +23.1 KB net content, 7 active editing days led by slide design.',
            ai_evidence_notes: [
              'Drove the defense presentation deck with 16 revisions (+13.5 KB) across 6 distinct working days.',
              'Added UX research and accessibility audit sections (11 revisions, +9.6 KB) to the primary report.',
              'Consistent 4.0/5 teammate rating aligns cleanly with objective 22.4% byte share.'
            ],
            suggested_grade_multiplier: 0.99
          },
          {
            email: 'jordan.brooks@university.edu',
            name: 'Jordan Brooks',
            contribution_percentage: 5,
            effort_tier: 'Free-Rider Risk',
            objective_metrics_summary:
              '4 revisions across 2 Drive files, +1.95 KB net content, 1 active day (100% last-minute cramming).',
            ai_evidence_notes: [
              'Recorded zero Drive edits during the first 13 days; all 4 revisions (+1.95 KB) occurred in a single late session right before submission.',
              'Self-reported 4/5 effort is contradicted by 1.9% net content share and 1.67/5 average teammate rating.',
              'Evidence confirms assigned Literature Review had to be absorbed by the team leader.'
            ],
            suggested_grade_multiplier: 0.68
          }
        ],
        instructor_audit_summary:
          'Objective Google Drive revision telemetry (75% weight) and corroborated peer check-ins (25% weight) show a clear workload imbalance in CS 401 Capstone. Maya Lin (44%) carried core synthesis and absorbed missing literature work, while Daniel Okafor (28%) and Sofia Reyes (23%) maintained steady multi-week output. Jordan Brooks (5%) contributed only 1.95 KB in a single last-minute burst despite a 4/5 self-rating, justifying a downward individual adjustment from the 92 group score.'
      }
    }
  },
  {
    title: 'ECON 312: Urban Housing Market Econometrics',
    course_name: 'ECON 312 — Applied Econometrics',
    classroom_course_id: 'classroom-econ312-fall',
    group_base_grade: 89.0,
    status: 'ACTIVE',
    members: [
      {
        user_email: 'maya.lin@university.edu',
        user_name: 'Maya Lin',
        assigned_section: 'Panel Regression Models & Robustness Checks',
        is_leader: true
      },
      {
        user_email: 'priya.nair@university.edu',
        user_name: 'Priya Nair',
        assigned_section: 'Census Data Cleaning & Spatial Joins',
        is_leader: false
      },
      {
        user_email: 'lucas.bennett@university.edu',
        user_name: 'Lucas Bennett',
        assigned_section: 'Policy Discussion & Executive Summary',
        is_leader: false
      },
      {
        user_email: 'hannah.kim@university.edu',
        user_name: 'Hannah Kim',
        assigned_section: 'Visualization Figures & Presentation Deck',
        is_leader: false
      }
    ],
    files: [
      {
        google_file_id: 'demo-gdoc-econ312-paper',
        file_name: 'ECON312_Urban_Housing_Paper.gdoc',
        mime_type: 'application/vnd.google-apps.document',
        web_view_link: 'https://docs.google.com/document/d/demo-gdoc-econ312-paper/edit',
        last_synced_at: daysAgoIso(1, 10),
        revisions: [
          {
            contributor_email: 'maya.lin@university.edu',
            contributor_name: 'Maya Lin',
            revision_count: 19,
            bytes_added: 16400,
            active_days: 6,
            last_edit_at: daysAgoIso(1, 9),
            raw_timeline_json: buildTimeline([
              [10, 3, 2600],
              [8, 3, 2700],
              [6, 4, 3400],
              [4, 3, 2700],
              [2, 3, 2600],
              [1, 3, 2400]
            ])
          },
          {
            contributor_email: 'priya.nair@university.edu',
            contributor_name: 'Priya Nair',
            revision_count: 17,
            bytes_added: 15100,
            active_days: 6,
            last_edit_at: daysAgoIso(1, 11),
            raw_timeline_json: buildTimeline([
              [11, 3, 2500],
              [9, 3, 2600],
              [7, 3, 2600],
              [5, 3, 2500],
              [3, 3, 2600],
              [1, 2, 2300]
            ])
          },
          {
            contributor_email: 'lucas.bennett@university.edu',
            contributor_name: 'Lucas Bennett',
            revision_count: 16,
            bytes_added: 13900,
            active_days: 5,
            last_edit_at: daysAgoIso(1, 14),
            raw_timeline_json: buildTimeline([
              [9, 3, 2700],
              [7, 3, 2800],
              [5, 4, 3200],
              [3, 3, 2700],
              [1, 3, 2500]
            ])
          },
          {
            contributor_email: 'hannah.kim@university.edu',
            contributor_name: 'Hannah Kim',
            revision_count: 14,
            bytes_added: 12600,
            active_days: 5,
            last_edit_at: daysAgoIso(1, 16),
            raw_timeline_json: buildTimeline([
              [8, 3, 2500],
              [6, 3, 2600],
              [4, 3, 2600],
              [2, 3, 2500],
              [1, 2, 2400]
            ])
          }
        ]
      }
    ],
    peer_reviews: [
      {
        reviewer_email: 'maya.lin@university.edu',
        reviewee_email: 'priya.nair@university.edu',
        owned_task: 'Census tract data cleaning & spatial merge',
        rating: 5,
        comment: 'Clean reproducible tables delivered ahead of schedule.'
      },
      {
        reviewer_email: 'priya.nair@university.edu',
        reviewee_email: 'maya.lin@university.edu',
        owned_task: 'Panel regressions & appendix diagnostics',
        rating: 5,
        comment: 'Well-organized Git & Docs milestones across all two weeks.'
      },
      {
        reviewer_email: 'lucas.bennett@university.edu',
        reviewee_email: 'hannah.kim@university.edu',
        owned_task: 'Econometric figures & layout',
        rating: 5,
        comment: 'Publication-ready charts and clean citations.'
      },
      {
        reviewer_email: 'hannah.kim@university.edu',
        reviewee_email: 'lucas.bennett@university.edu',
        owned_task: 'Policy discussion & synthesis',
        rating: 4,
        comment: 'Strong policy interpretation and edits.'
      }
    ],
    ai_evaluation: {
      model_used: 'gemini-3.8-flash',
      evaluation_json: {
        overall_fairness_score: 94,
        members: [
          {
            email: 'maya.lin@university.edu',
            name: 'Maya Lin',
            contribution_percentage: 28,
            effort_tier: 'Consistent Contributor',
            objective_metrics_summary: '19 revisions, +16.4 KB net content, 6 active days.',
            ai_evidence_notes: [
              'Authored econometric regression sections steadily across 6 days.',
              'Peer reviews confirm strong coordination without overload.'
            ],
            suggested_grade_multiplier: 1.02
          },
          {
            email: 'priya.nair@university.edu',
            name: 'Priya Nair',
            contribution_percentage: 26,
            effort_tier: 'Consistent Contributor',
            objective_metrics_summary: '17 revisions, +15.1 KB net content, 6 active days.',
            ai_evidence_notes: [
              'Consistent data cleaning & spatial join documentation across 6 days.',
              'Top 5/5 peer feedback on dataset reliability.'
            ],
            suggested_grade_multiplier: 1.01
          },
          {
            email: 'lucas.bennett@university.edu',
            name: 'Lucas Bennett',
            contribution_percentage: 24,
            effort_tier: 'Consistent Contributor',
            objective_metrics_summary: '16 revisions, +13.9 KB net content, 5 active days.',
            ai_evidence_notes: [
              'Delivered policy discussion section over 5 distinct days.',
              'Balanced participation matched by peer ratings.'
            ],
            suggested_grade_multiplier: 0.99
          },
          {
            email: 'hannah.kim@university.edu',
            name: 'Hannah Kim',
            contribution_percentage: 22,
            effort_tier: 'Consistent Contributor',
            objective_metrics_summary: '14 revisions, +12.6 KB net content, 5 active days.',
            ai_evidence_notes: [
              'Produced figures and formatting edits over 5 steady sessions.',
              'Zero cramming indicators; equitable contribution within healthy range.'
            ],
            suggested_grade_multiplier: 0.98
          }
        ],
        instructor_audit_summary:
          'ECON 312 demonstrates highly balanced collaboration (fairness score 94/100). All four students maintained 5–6 active editing days and contributed 22%–28% of the final paper, requiring negligible grade variance.'
      }
    }
  }
];
