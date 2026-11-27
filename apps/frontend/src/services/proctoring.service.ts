import { apiClient } from './api';
import {
  ProctoringStatusDto,
  RecordProctoringEventDto,
  ProctoringRecordResultDto,
  ProctoringPolicyDto,
  AdminProctoringSummaryItemDto,
  ProctoringAuditLogDto,
  AdminProctoringActionDto,
  ProctoringLockStatus,
} from '@ignitron/shared';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const proctoringService = {
  async getStatus(roundNumber?: number): Promise<ProctoringStatusDto> {
    const q = roundNumber ? `?roundNumber=${roundNumber}` : '';
    const res = await apiClient<ApiResponseWrapper<ProctoringStatusDto>>(`/proctoring/status${q}`);
    return res.data;
  },

  /**
   * Uses fetch with keepalive: true so page-hidden / tab-switch events have the best chance
   * of reaching the backend before the browser suspends the tab.
   * Falls back to standard apiClient fetch if keepalive is rejected by browser CORS preflight.
   */
  async recordEventKeepAlive(dto: RecordProctoringEventDto): Promise<ProctoringRecordResultDto> {
    try {
      const response = await fetch(`${API_BASE_URL}/proctoring/event`, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Proctoring event failed (${response.status}): ${text}`);
      }
      const json = (await response.json()) as ApiResponseWrapper<ProctoringRecordResultDto>;
      return json.data;
    } catch (keepAliveErr) {
      // Fallback to standard fetch (without keepalive) in case cross-origin keepalive+preflight was blocked
      const res = await apiClient<ApiResponseWrapper<ProctoringRecordResultDto>>(
        '/proctoring/event',
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    }
  },

  // ---------------------------------------------------------------------------
  // ADMIN PROCTORING APIS
  // ---------------------------------------------------------------------------

  async listIncidents(filters?: {
    roundNumber?: number;
    teamId?: string;
    participantId?: string;
    lockStatus?: string;
    date?: string;
  }): Promise<AdminProctoringSummaryItemDto[]> {
    const params = new URLSearchParams();
    if (filters?.roundNumber) params.append('roundNumber', String(filters.roundNumber));
    if (filters?.teamId) params.append('teamId', filters.teamId);
    if (filters?.participantId) params.append('participantId', filters.participantId);
    if (filters?.lockStatus && filters.lockStatus !== 'ALL') {
      params.append('lockStatus', filters.lockStatus);
    }
    if (filters?.date) params.append('date', filters.date);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient<ApiResponseWrapper<AdminProctoringSummaryItemDto[]>>(
      `/proctoring/incidents${qs}`,
    );
    return res.data;
  },

  async listAuditLogs(teamId?: string): Promise<ProctoringAuditLogDto[]> {
    const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    const res = await apiClient<ApiResponseWrapper<ProctoringAuditLogDto[]>>(
      `/proctoring/audit-logs${qs}`,
    );
    return res.data;
  },

  async getPolicy(): Promise<ProctoringPolicyDto> {
    const res = await apiClient<ApiResponseWrapper<ProctoringPolicyDto>>('/proctoring/policy');
    return res.data;
  },

  async updatePolicy(policy: Partial<ProctoringPolicyDto>): Promise<ProctoringPolicyDto> {
    const res = await apiClient<ApiResponseWrapper<ProctoringPolicyDto>>('/proctoring/policy', {
      method: 'PUT',
      body: JSON.stringify(policy),
    });
    return res.data;
  },

  async performAction(
    dto: AdminProctoringActionDto,
  ): Promise<{ success: boolean; lockStatus: ProctoringLockStatus; message: string }> {
    const res = await apiClient<
      ApiResponseWrapper<{ success: boolean; lockStatus: ProctoringLockStatus; message: string }>
    >('/proctoring/actions', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  getAdminEventsSseUrl(): string {
    return `${API_BASE_URL}/proctoring/events`;
  },
};
