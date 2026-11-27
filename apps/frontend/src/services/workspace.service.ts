import {
  WorkspaceDraftDto,
  SaveWorkspaceDraftDto,
  ApiResponse,
} from '@ignitron/shared';
import { API_BASE_URL, getAuthHeaders } from './api';

const API_BASE = `${API_BASE_URL}/workspace`;

export const workspaceService = {
  /**
   * Fetch the saved draft for the authenticated team
   */
  async getDraft(roundNumber?: number): Promise<WorkspaceDraftDto> {
    const query = roundNumber ? `?roundNumber=${roundNumber}` : '';
    const res = await fetch(`${API_BASE}/draft${query}`, {
      headers: getAuthHeaders({
        Accept: 'application/json',
      }),
      credentials: 'include',
    });

    const body: ApiResponse<{ draft: WorkspaceDraftDto }> = await res.json();

    if (!res.ok) {
      const errorMsg =
        (body as any)?.message ||
        (body as any)?.error?.message ||
        `Failed to load workspace draft (HTTP ${res.status})`;
      throw new Error(errorMsg);
    }

    return (body as any).draft;
  },

  /**
   * Save / Autosave workspace draft
   */
  async saveDraft(dto: SaveWorkspaceDraftDto): Promise<WorkspaceDraftDto> {
    const res = await fetch(`${API_BASE}/draft`, {
      method: 'PUT',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify(dto),
    });

    const body: ApiResponse<{ draft: WorkspaceDraftDto }> = await res.json();

    if (!res.ok) {
      const errorMsg =
        (body as any)?.message ||
        (body as any)?.error?.message ||
        `Failed to save draft (HTTP ${res.status})`;
      throw new Error(errorMsg);
    }

    return (body as any).draft;
  },
};
