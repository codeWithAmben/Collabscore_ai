import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  Loader2,
  Presentation,
  Shield,
  Square,
  X
} from 'lucide-react';
import { api } from '../api/client.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const GOOGLE_APP_ID = import.meta.env.VITE_GOOGLE_APP_ID || '';

const PICKER_MIME_TYPES = [
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.spreadsheet',
  'application/pdf'
].join(',');

const DEMO_DRIVE_CATALOG = [
  {
    google_file_id: 'sim-gdoc-architecture-notes',
    file_name: 'CS401_System_Architecture_Notes.gdoc',
    mime_type: 'application/vnd.google-apps.document',
    web_view_link: 'https://docs.google.com/document/d/sim-gdoc-architecture-notes/edit',
    description: 'Shared technical spec & database ERD writeup'
  },
  {
    google_file_id: 'sim-gslides-sprint-review',
    file_name: 'CS401_Midterm_Sprint_Review.gslides',
    mime_type: 'application/vnd.google-apps.presentation',
    web_view_link: 'https://docs.google.com/presentation/d/sim-gslides-sprint-review/edit',
    description: '18-slide milestone presentation deck'
  },
  {
    google_file_id: 'sim-gsheet-carbon-model',
    file_name: 'Transit_Emissions_Benchmark_Sheet.gsheet',
    mime_type: 'application/vnd.google-apps.spreadsheet',
    web_view_link: 'https://docs.google.com/spreadsheets/d/sim-gsheet-carbon-model/edit',
    description: 'Model evaluation & route calculation tables'
  },
  {
    google_file_id: 'sim-pdf-irb-ethics',
    file_name: 'Campus_User_Study_Consent_Report.pdf',
    mime_type: 'application/pdf',
    web_view_link: 'https://drive.google.com/file/d/sim-pdf-irb-ethics/view',
    description: 'Approved survey methodology PDF'
  }
];

function getMimeIcon(mime) {
  if (mime?.includes('presentation')) return <Presentation className="h-4 w-4 text-amber-600" />;
  if (mime?.includes('spreadsheet')) return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
  return <FileText className="h-4 w-4 text-indigo-600" />;
}

export default function GoogleDrivePicker({
  user,
  onFilesPicked,
  disabled,
  onShowToast
}) {
  const [pickerApiReady, setPickerApiReady] = useState(false);
  const [loadingLivePicker, setLoadingLivePicker] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [customFileName, setCustomFileName] = useState('');
  const [customMimeType, setCustomMimeType] = useState('application/vnd.google-apps.document');

  const isLivePickerConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY && GOOGLE_APP_ID);

  useEffect(() => {
    if (!isLivePickerConfigured) return;

    const timer = setInterval(() => {
      if (window.gapi) {
        window.gapi.load('picker', () => {
          setPickerApiReady(true);
        });
        clearInterval(timer);
      }
    }, 400);

    return () => clearInterval(timer);
  }, [isLivePickerConfigured]);

  const buildAndShowGooglePicker = (oauthToken) => {
    if (!window.google?.picker) {
      onShowToast('Google Picker script is still loading. Try again in a second.', 'info');
      return;
    }

    const docsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setMimeTypes(PICKER_MIME_TYPES)
      .setSelectFolderEnabled(false)
      .setIncludeFolders(false);

    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setAppId(GOOGLE_APP_ID)
      .setOAuthToken(oauthToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .addView(docsView)
      .setTitle('Select Project Google Docs, Slides, or PDFs (drive.file)')
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const picked = (data.docs || []).map((doc) => ({
            google_file_id: doc[window.google.picker.Document.ID],
            file_name: doc[window.google.picker.Document.NAME],
            mime_type: doc[window.google.picker.Document.MIME_TYPE] || 'application/vnd.google-apps.document',
            web_view_link: doc[window.google.picker.Document.URL] || null,
            simulated: false
          }));
          if (picked.length > 0) {
            onFilesPicked(picked);
          }
        }
      })
      .build();

    picker.setVisible(true);
  };

  const launchLiveGooglePicker = async () => {
    setLoadingLivePicker(true);
    try {
      if (user?.has_google_tokens) {
        try {
          const { access_token } = await api.getGooglePickerToken();
          if (access_token) {
            buildAndShowGooglePicker(access_token);
            return;
          }
        } catch {
          // Fall back to GIS token client below
        }
      }

      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services script is unavailable.');
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
          if (tokenResponse?.error || !tokenResponse?.access_token) {
            onShowToast('Google authorization was cancelled or denied.', 'error');
            return;
          }
          buildAndShowGooglePicker(tokenResponse.access_token);
        }
      });
      tokenClient.requestAccessToken({ prompt: '' });
    } catch (error) {
      onShowToast(error.message || 'Could not launch Google Drive Picker.', 'error');
      setShowDemoModal(true);
    } finally {
      setLoadingLivePicker(false);
    }
  };

  const handleOpenPickerClick = () => {
    if (isLivePickerConfigured && pickerApiReady && user?.has_google_tokens) {
      launchLiveGooglePicker();
      return;
    }
    setSelectedIds([]);
    setCustomFileName('');
    setShowDemoModal(true);
  };

  const toggleDemoSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAttachSelectedDemoFiles = () => {
    const picked = DEMO_DRIVE_CATALOG.filter((item) => selectedIds.includes(item.google_file_id)).map(
      (item) => ({
        ...item,
        simulated: true
      })
    );

    if (customFileName.trim()) {
      const slug = customFileName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 32);
      picked.push({
        google_file_id: `sim-custom-${slug}-${Date.now().toString().slice(-4)}`,
        file_name: customFileName.trim(),
        mime_type: customMimeType,
        web_view_link: 'https://docs.google.com',
        simulated: true
      });
    }

    if (picked.length === 0) {
      onShowToast('Select at least one Drive file or enter a custom file name.', 'info');
      return;
    }

    setShowDemoModal(false);
    onFilesPicked(picked);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenPickerClick}
        disabled={disabled || loadingLivePicker}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
      >
        {loadingLivePicker ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FolderPlus className="h-4 w-4" />
        )}
        Pick Google Docs / Slides
      </button>

      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Google Drive Picker
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                    <Shield className="h-3 w-3" />
                    drive.file scope
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Only user-selected project files are accessed—no restricted{' '}
                  <code className="font-mono">drive.readonly</code> permissions required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {isLivePickerConfigured && pickerApiReady && (
                <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <span className="text-xs font-medium text-indigo-800">
                    Google Picker API is configured in your environment.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDemoModal(false);
                      launchLiveGooglePicker();
                    }}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                  >
                    Open Live Google Picker
                  </button>
                </div>
              )}

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Demo Drive Files (Select to Attach &amp; Extract Revisions)
                </div>
                <div className="space-y-2">
                  {DEMO_DRIVE_CATALOG.map((item) => {
                    const checked = selectedIds.includes(item.google_file_id);
                    return (
                      <button
                        key={item.google_file_id}
                        type="button"
                        onClick={() => toggleDemoSelection(item.google_file_id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                          checked
                            ? 'border-indigo-500 bg-indigo-50/70'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {checked ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          {getMimeIcon(item.mime_type)}
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {item.file_name}
                            </div>
                            <div className="text-xs text-slate-500">{item.description}</div>
                          </div>
                        </div>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {item.mime_type.includes('presentation')
                            ? 'Slides'
                            : item.mime_type.includes('spreadsheet')
                              ? 'Sheets'
                              : item.mime_type.includes('pdf')
                                ? 'PDF'
                                : 'Docs'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Or attach a custom Drive artifact
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    placeholder="e.g., Week8_Lab_Report.gdoc"
                    className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                  <select
                    value={customMimeType}
                    onChange={(e) => setCustomMimeType(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="application/vnd.google-apps.document">Google Doc</option>
                    <option value="application/vnd.google-apps.presentation">Google Slides</option>
                    <option value="application/vnd.google-apps.spreadsheet">Google Sheet</option>
                    <option value="application/pdf">PDF Document</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAttachSelectedDemoFiles}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
              >
                Attach &amp; Sync Revisions
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
