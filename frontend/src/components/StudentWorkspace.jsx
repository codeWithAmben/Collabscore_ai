import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessageSquarePlus,
  Presentation,
  RefreshCw,
  Star,
  Trash2
} from 'lucide-react';
import { api } from '../api/client.js';
import GoogleDrivePicker from './GoogleDrivePicker.jsx';

function formatRelativeTime(iso) {
  if (!iso) return 'Not synced yet';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Recently synced';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function FileTypeIcon({ mime }) {
  if (mime?.includes('presentation')) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
        <Presentation className="h-4 w-4" />
      </div>
    );
  }
  if (mime?.includes('spreadsheet')) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
        <FileSpreadsheet className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
      <FileText className="h-4 w-4" />
    </div>
  );
}

export default function StudentWorkspace({
  user,
  project,
  onProjectUpdated,
  onShowToast
}) {
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingFileId, setSyncingFileId] = useState(null);
  const [attaching, setAttaching] = useState(false);

  const members = project?.members || [];
  const [reviewerEmail, setReviewerEmail] = useState(user?.email || '');
  const [revieweeEmail, setRevieweeEmail] = useState('');
  const [ownedTask, setOwnedTask] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!members.length) return;
    const defaultReviewer =
      members.find((m) => m.user_email.toLowerCase() === user?.email?.toLowerCase())?.user_email ||
      members[0].user_email;
    const defaultReviewee =
      members.find((m) => m.user_email !== defaultReviewer)?.user_email || members[0].user_email;

    setReviewerEmail(defaultReviewer);
    setRevieweeEmail(defaultReviewee);
  }, [project?.id, user?.email]);

  const handleFilesPicked = async (pickedFiles) => {
    setAttaching(true);
    try {
      const { project: updated } = await api.attachFiles(project.id, pickedFiles);
      onProjectUpdated(updated);
      onShowToast(
        `Attached ${pickedFiles.length} Drive file(s) and extracted revision logs.`,
        'success'
      );
    } catch (error) {
      onShowToast(error.message, 'error');
    } finally {
      setAttaching(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const { project: updated } = await api.syncAllFiles(project.id);
      onProjectUpdated(updated);
      onShowToast('All Drive file revision histories synced.', 'success');
    } catch (error) {
      onShowToast(error.message, 'error');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncSingle = async (fileId) => {
    setSyncingFileId(fileId);
    try {
      const { project: updated } = await api.syncFile(project.id, fileId);
      onProjectUpdated(updated);
      onShowToast('File revisions refreshed.', 'success');
    } catch (error) {
      onShowToast(error.message, 'error');
    } finally {
      setSyncingFileId(null);
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      const { project: updated } = await api.removeFile(project.id, fileId);
      onProjectUpdated(updated);
      onShowToast('File detached from workspace.', 'info');
    } catch (error) {
      onShowToast(error.message, 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!revieweeEmail || !ownedTask.trim()) {
      onShowToast('Select a teammate and describe their owned task.', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      const { project: updated } = await api.submitPeerReview(project.id, {
        reviewer_email: reviewerEmail,
        reviewee_email: revieweeEmail,
        owned_task: ownedTask.trim(),
        rating,
        comment: comment.trim()
      });
      onProjectUpdated(updated);
      setOwnedTask('');
      setComment('');
      onShowToast('Peer check-in saved.', 'success');
    } catch (error) {
      onShowToast(error.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getMemberName = (email) =>
    members.find((m) => m.user_email.toLowerCase() === email?.toLowerCase())?.user_name || email;

  return (
    <div className="grid gap-4 sm:gap-6 xl:grid-cols-12">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 xl:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-slate-900">
              Attached Google Drive Deliverables
            </h3>
            <p className="text-xs text-slate-500">
              Sync revision timestamps, edit sessions, and net byte deltas per contributor.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={syncingAll || attaching || project.files.length === 0}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncingAll ? 'animate-spin text-indigo-600' : ''}`} />
              {syncingAll ? 'Syncing...' : 'Sync All Revisions'}
            </button>
            <GoogleDrivePicker
              user={user}
              onFilesPicked={handleFilesPicked}
              disabled={attaching}
              onShowToast={onShowToast}
              buttonClassName="w-full justify-center sm:w-auto"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {project.files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center sm:p-8">
              <p className="text-sm font-medium text-slate-700">No Drive files attached yet.</p>
              <p className="mt-1 text-xs text-slate-500">
                Use &ldquo;Pick Google Docs / Slides&rdquo; to attach shared project deliverables.
              </p>
            </div>
          ) : (
            project.files.map((file) => (
              <div
                key={file.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 transition hover:border-slate-300 sm:p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
                    <FileTypeIcon mime={file.mime_type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5 sm:items-center sm:gap-2">
                        <span className="break-all text-sm font-semibold text-slate-900 sm:break-words">
                          {file.file_name}
                        </span>
                        {file.web_view_link && (
                          <a
                            href={file.web_view_link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 sm:mt-0"
                            title="Open in Google Drive"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        Last synced: {formatRelativeTime(file.last_synced_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleSyncSingle(file.id)}
                      disabled={syncingFileId === file.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {syncingFileId === file.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Sync
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.id)}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      title="Detach file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {file.revisions?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                    {file.revisions.map((rev) => (
                      <span
                        key={`${file.id}-${rev.contributor_email}`}
                        className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 tabular-nums"
                      >
                        <span className="font-semibold">{rev.contributor_name}</span>
                        <span className="text-slate-400">·</span>
                        <span>{rev.revision_count} edits</span>
                        <span className="text-emerald-700 font-medium">
                          +{(rev.bytes_added / 1000).toFixed(1)} KB
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 xl:col-span-5">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-indigo-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Peer Contribution Check-In
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Accounts for 25% of AI weighting—document task ownership and teammate reliability.
          </p>
        </div>

        <form onSubmit={handleReviewSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Reviewer</label>
              <select
                value={reviewerEmail}
                onChange={(e) => setReviewerEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none sm:py-2 sm:text-xs"
              >
                {members.map((m) => (
                  <option key={m.user_email} value={m.user_email}>
                    {m.user_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700">
                Teammate Evaluated
              </label>
              <select
                value={revieweeEmail}
                onChange={(e) => setRevieweeEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none sm:py-2 sm:text-xs"
              >
                {members.map((m) => (
                  <option key={m.user_email} value={m.user_email}>
                    {m.user_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700">
              Specific Task Owned
            </label>
            <input
              type="text"
              required
              value={ownedTask}
              onChange={(e) => setOwnedTask(e.target.value)}
              placeholder="e.g., Telemetry pipeline & benchmark section"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none sm:py-2 sm:text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700">
              Effort Rating (1 = Minimal, 5 = Core Driver)
            </label>
            <div className="mt-1.5 flex items-center gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setRating(score)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-bold transition sm:py-2 cursor-pointer ${
                    rating === score
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Star className={`h-3 w-3 ${rating === score ? 'fill-white' : ''}`} />
                  {score}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700">
              Evidence / Context Comment
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional note on milestone reliability or missed check-ins..."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none sm:py-2 sm:text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submittingReview}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submittingReview ? 'Saving Check-In...' : 'Submit Peer Check-In'}
          </button>
        </form>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Submitted Check-Ins ({project.peer_reviews?.length || 0})
          </div>
          <div className="mt-2.5 max-h-56 space-y-2 overflow-y-auto pr-1">
            {(project.peer_reviews || []).map((rev) => {
              const isSelf = rev.reviewer_email === rev.reviewee_email;
              return (
                <div
                  key={rev.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-1.5">
                    <span className="min-w-0 font-semibold text-slate-800 break-words">
                      {getMemberName(rev.reviewer_email)} → {getMemberName(rev.reviewee_email)}
                      {isSelf && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          Self-Rating
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-bold text-indigo-700 tabular-nums">
                      {rev.rating}/5
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-600 break-words">
                    Task: {rev.owned_task}
                  </div>
                  {rev.comment && (
                    <p className="mt-1 text-[11px] text-slate-500 italic break-words">&ldquo;{rev.comment}&rdquo;</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
