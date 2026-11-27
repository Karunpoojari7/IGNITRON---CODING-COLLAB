import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Lock,
  Ban,
  AlertTriangle,
  History,
  RefreshCw,
  Sliders,
  X,
  Radio,
  Search,
} from 'lucide-react';
import { AdminNav } from '../../components/AdminNav';
import { proctoringService } from '../../services/proctoring.service';
import {
  AdminProctoringSummaryItemDto,
  ProctoringAuditLogDto,
  ProctoringPolicyDto,
  ProctoringAdminActionType,
} from '@ignitron/shared';

export const ProctoringMonitoringPage: React.FC = () => {
  const [summaries, setSummaries] = useState<AdminProctoringSummaryItemDto[]>([]);
  const [auditLogs, setAuditLogs] = useState<ProctoringAuditLogDto[]>([]);
  const [policy, setPolicy] = useState<ProctoringPolicyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // Filters
  const [filterRound, setFilterRound] = useState<string>('ALL');
  const [filterLockStatus, setFilterLockStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // History modal
  const [historyItem, setHistoryItem] = useState<AdminProctoringSummaryItemDto | null>(null);

  // Action confirmation modal
  const [actionModal, setActionModal] = useState<{
    item: AdminProctoringSummaryItemDto;
    action: ProctoringAdminActionType;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Policy edit state
  const [savingPolicy, setSavingPolicy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [incData, auditData, policyData] = await Promise.all([
        proctoringService.listIncidents({
          roundNumber: filterRound !== 'ALL' ? Number(filterRound) : undefined,
          lockStatus: filterLockStatus !== 'ALL' ? filterLockStatus : undefined,
          date: filterDate || undefined,
        }),
        proctoringService.listAuditLogs(),
        proctoringService.getPolicy(),
      ]);
      setSummaries(incData);
      setAuditLogs(auditData);
      setPolicy(policyData);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Failed to load proctoring data.' });
    } finally {
      setLoading(false);
    }
  }, [filterRound, filterLockStatus, filterDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time SSE connection for immediate admin notifications
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const es = new EventSource(proctoringService.getAdminEventsSseUrl(), {
      withCredentials: true,
    });

    es.onopen = () => {
      setSseConnected(true);
    };

    es.addEventListener('NEW_INCIDENT', (ev: any) => {
      try {
        const parsed = JSON.parse(ev.data);
        const inc = parsed?.payload;
        if (inc) {
          setLiveAlert(
            `New incident: ${inc.participantName || 'Participant'} (${inc.teamName || 'Team'}) triggered ${inc.eventType} in Round ${inc.roundNumber} [${inc.lockStatusAtEvent}]`,
          );
        }
      } catch {
        setLiveAlert('New proctoring incident detected.');
      }
      fetchData();
    });

    es.addEventListener('ACTION_TAKEN', () => {
      fetchData();
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
    };
  }, [fetchData]);

  const handleSavePolicy = async (updated: Partial<ProctoringPolicyDto>) => {
    try {
      setSavingPolicy(true);
      const res = await proctoringService.updatePolicy(updated);
      setPolicy(res);
      setActionMsg({ type: 'success', text: 'Anti-cheat monitoring policy updated.' });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Failed to update policy.' });
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    const restrictive = ['KEEP_LOCKED', 'BLOCK_PARTICIPANT', 'DISQUALIFY_TEAM'];
    if (restrictive.includes(actionModal.action) && !actionReason.trim()) {
      setActionMsg({
        type: 'error',
        text: 'Please provide a documented reason for this restrictive action.',
      });
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await proctoringService.performAction({
        teamId: actionModal.item.teamId,
        participantId: actionModal.item.participantId,
        sessionId: actionModal.item.sessionId || undefined,
        roundNumber: actionModal.item.latestIncident?.roundNumber,
        action: actionModal.action,
        reason: actionReason.trim() || undefined,
      });

      setActionMsg({ type: 'success', text: res.message });
      setActionModal(null);
      setActionReason('');
      await fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Failed to execute action.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredSummaries = summaries.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.participantName.toLowerCase().includes(q) ||
      s.participantEmail.toLowerCase().includes(q) ||
      s.teamName.toLowerCase().includes(q) ||
      s.teamCode.toLowerCase().includes(q)
    );
  });

  const lockedCount = summaries.filter(
    (s) => s.lockStatus === 'LOCKED_PENDING_REVIEW' || s.lockStatus === 'BLOCKED',
  ).length;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12">
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
              <h1 className="text-2xl font-black text-emerald-950 tracking-tight">
                Anti-Cheat &amp; Proctoring Monitor
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  sseConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                <Radio className={`w-3 h-3 ${sseConnected ? 'animate-pulse text-emerald-600' : ''}`} />
                {sseConnected ? 'LIVE SSE CONNECTED' : 'POLLING / RECONNECTING'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Real-time tab-switch, visibility, and session lock enforcement across Rounds 1, 2, and 3.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Incidents</span>
          </button>
        </div>

        {/* Live Incident Alert */}
        {liveAlert && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{liveAlert}</span>
            </div>
            <button onClick={() => setLiveAlert(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Feedback */}
        {actionMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              actionMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <span className="font-semibold">{actionMsg.text}</span>
            <button onClick={() => setActionMsg(null)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary & Policy Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Stats Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Monitoring Snapshot
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500 font-semibold">Flagged Participants</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{summaries.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-[11px] text-rose-700 font-semibold">Currently Locked / Blocked</div>
                <div className="text-2xl font-black text-rose-700 mt-0.5">{lockedCount}</div>
              </div>
            </div>
          </div>

          {/* Configurable Policy Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>Configurable Anti-Cheat Policy</span>
              </div>
              {savingPolicy && (
                <span className="text-[11px] text-emerald-600 font-mono">Saving...</span>
              )}
            </div>

            {policy && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <label className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-800">Strict Mode</div>
                    <div className="text-[10px] text-slate-500">Lock on first hidden tab</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policy.strictModeEnabled}
                    onChange={(e) => handleSavePolicy({ strictModeEnabled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </label>

                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="font-bold text-slate-800 mb-1">Lock After (Incidents)</div>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={policy.maxWarningsBeforeLock}
                    onChange={(e) =>
                      handleSavePolicy({ maxWarningsBeforeLock: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                  />
                </div>

                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="font-bold text-slate-800 mb-1">Revoke Threshold</div>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={policy.autoRevokeThreshold}
                    onChange={(e) =>
                      handleSavePolicy({ autoRevokeThreshold: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                  />
                </div>

                <label className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-800">Copy Logging</div>
                    <div className="text-[10px] text-slate-500">Log copy events (no text)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policy.monitorCopyEvents}
                    onChange={(e) => handleSavePolicy({ monitorCopyEvents: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search team or participant..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <select
            value={filterRound}
            onChange={(e) => setFilterRound(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
          >
            <option value="ALL">All Rounds</option>
            <option value="1">Round 1 (MCQ Arena)</option>
            <option value="2">Round 2 (Bug Hunt)</option>
            <option value="3">Round 3 (Final Coding)</option>
          </select>

          <select
            value={filterLockStatus}
            onChange={(e) => setFilterLockStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
          >
            <option value="ALL">All Lock Statuses</option>
            <option value="LOCKED_PENDING_REVIEW">Locked Pending Review</option>
            <option value="BLOCKED">Blocked / Disqualified</option>
            <option value="ACTIVE">Active (Unlocked)</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        {/* Incidents Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3">Participant &amp; Team</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Incidents</th>
                  <th className="px-4 py-3">Latest Event</th>
                  <th className="px-4 py-3">Lock Status</th>
                  <th className="px-4 py-3 text-right">Admin Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      {loading
                        ? 'Loading proctoring incidents...'
                        : 'No monitoring incidents match the current filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((item) => (
                    <tr
                      key={`${item.teamId}-${item.participantId}`}
                      className="hover:bg-slate-50/70 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.participantName}</div>
                        <div className="text-[11px] text-slate-500">{item.participantEmail}</div>
                        <div className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
                          {item.teamName} ({item.teamCode})
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.sessionStatus || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">
                        Round {item.latestIncident?.roundNumber || '-'}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className="font-bold text-rose-700">{item.incidentCount}</span>
                        <span className="text-slate-400"> total</span>
                      </td>
                      <td className="px-4 py-3">
                        {item.latestIncident && (
                          <div>
                            <span className="font-mono font-bold text-slate-800">
                              {item.latestIncident.eventType}
                            </span>
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                              {item.latestIncident.confidence}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(item.latestIncident.createdAt).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            item.isDisqualified
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : item.lockStatus === 'LOCKED_PENDING_REVIEW'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : item.lockStatus === 'BLOCKED'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {item.isDisqualified ? 'DISQUALIFIED' : item.lockStatus}
                        </span>
                        {item.latestIncident?.reviewStatus && (
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            Review: {item.latestIncident.reviewStatus}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            onClick={() => setHistoryItem(item)}
                            className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="View incident history"
                          >
                            <History className="w-3 h-3" />
                            <span>History</span>
                          </button>
                          <button
                            onClick={() => setActionModal({ item, action: 'ISSUE_WARNING' })}
                            className="px-2 py-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold cursor-pointer"
                          >
                            Warn
                          </button>
                          <button
                            onClick={() => setActionModal({ item, action: 'UNLOCK' })}
                            className="px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Unlock</span>
                          </button>
                          <button
                            onClick={() => setActionModal({ item, action: 'KEEP_LOCKED' })}
                            className="px-2 py-1 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Keep Locked</span>
                          </button>
                          <button
                            onClick={() => setActionModal({ item, action: 'BLOCK_PARTICIPANT' })}
                            className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Block</span>
                          </button>
                          <button
                            onClick={() => setActionModal({ item, action: 'DISQUALIFY_TEAM' })}
                            className="px-2 py-1 rounded-lg border border-red-300 bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
                          >
                            Disqualify
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Immutable Admin Audit Trail */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Administrative Review Audit Trail</span>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500">No administrative review actions recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-mono font-bold text-emerald-800 mr-2">{log.action}</span>
                    <span className="font-semibold text-slate-900">{log.teamName}</span>
                    {log.participantName && (
                      <span className="text-slate-600"> ({log.participantName})</span>
                    )}
                    <span className="text-slate-500 ml-2 font-mono text-[11px]">
                      [{log.previousState} → {log.newState}]
                    </span>
                    {log.reason && (
                      <div className="text-slate-600 mt-0.5">Reason: {log.reason}</div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono shrink-0">
                    {log.adminEmail || 'Admin'} • {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* INCIDENT HISTORY MODAL */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Incident History: {historyItem.participantName}
                </h3>
                <p className="text-xs text-slate-500">
                  Team: {historyItem.teamName} ({historyItem.teamCode})
                </p>
              </div>
              <button onClick={() => setHistoryItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {historyItem.incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-slate-900">
                      {inc.eventType} ({inc.confidence})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(inc.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Round {inc.roundNumber} • Arena: {inc.arenaType || 'N/A'} • Lock Status:{' '}
                    <strong>{inc.lockStatusAtEvent}</strong> • Review: <strong>{inc.reviewStatus}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION ACTION MODAL */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmAction}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Action: {actionModal.action.replace(/_/g, ' ')}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                Target Participant: <strong>{actionModal.item.participantName}</strong>
              </p>
              <p>
                Team: <strong>{actionModal.item.teamName}</strong> ({actionModal.item.teamCode})
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Documented Reason{' '}
                {['KEEP_LOCKED', 'BLOCK_PARTICIPANT', 'DISQUALIFY_TEAM'].includes(actionModal.action)
                  ? '(Required)'
                  : '(Optional)'}
              </label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter official review notes or justification..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                required={['KEEP_LOCKED', 'BLOCK_PARTICIPANT', 'DISQUALIFY_TEAM'].includes(
                  actionModal.action,
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {submittingAction ? 'Applying...' : 'Confirm & Record'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
