import { useState, useEffect, useRef, useCallback } from 'react';
import { proctoringService } from '../services/proctoring.service';
import {
  FocusEventResultDto,
  ProctoringLockStatus,
  ProctoringEventType,
  RecordProctoringEventDto,
} from '@ignitron/shared';

interface UseParticipantMonitoringOptions {
  roundNumber: number;
  isRoundActive: boolean;
  isSubmitted: boolean;
  isConcluded?: boolean;
  questionId?: string;
  arenaType?: 'MCQ' | 'BUG_HUNT' | 'ANALYTICS' | 'WORKSPACE';
}

const RETRY_QUEUE_KEY = 'ignitron_proctoring_retry_queue';

function readRetryQueue(): RecordProctoringEventDto[] {
  try {
    const raw = localStorage.getItem(RETRY_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRetryQueue(queue: RecordProctoringEventDto[]) {
  try {
    localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue.slice(-20)));
  } catch {
    // Ignore storage quota errors
  }
}

function makeIdempotencyKey(roundNumber: number, eventType: ProctoringEventType): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${roundNumber}_${eventType}_${Date.now()}_${rand}`;
}

export const useParticipantMonitoring = ({
  roundNumber,
  isRoundActive,
  isSubmitted,
  isConcluded = false,
  questionId,
  arenaType,
}: UseParticipantMonitoringOptions) => {
  const [lockStatus, setLockStatus] = useState<ProctoringLockStatus>('ACTIVE');
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [focusWarning, setFocusWarning] = useState<FocusEventResultDto | null>(null);

  const lastPrimaryEventTimeRef = useRef<number>(0);
  const lastBlurEventTimeRef = useRef<number>(0);
  const lastCopyEventTimeRef = useRef<number>(0);
  const pendingWarningRef = useRef<FocusEventResultDto | null>(null);

  const flushRetryQueue = useCallback(async () => {
    const queue = readRetryQueue();
    if (queue.length === 0) return;

    const remaining: RecordProctoringEventDto[] = [];
    for (const item of queue) {
      try {
        const res = await proctoringService.recordEventKeepAlive(item);
        if (res.lockStatus === 'LOCKED_PENDING_REVIEW' || res.lockStatus === 'BLOCKED') {
          setLockStatus(res.lockStatus);
          setLockReason(res.message);
        }
      } catch {
        remaining.push(item);
      }
    }
    writeRetryQueue(remaining);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await proctoringService.getStatus(roundNumber);
      setLockStatus(status.lockStatus);
      setIsDisqualified(status.isDisqualified);
      setLockReason(status.lockReason || null);
      setWarningCount(status.warningCount);
      setIncidentCount(status.incidentCount);
      return status;
    } catch {
      return null;
    }
  }, [roundNumber]);

  const sendEvent = useCallback(
    async (eventType: ProctoringEventType, details?: string) => {
      if (!isRoundActive || isSubmitted || isConcluded) {
        return;
      }

      const now = Date.now();
      if (eventType === 'TAB_SWITCH' || eventType === 'PAGE_HIDDEN') {
        if (now - lastPrimaryEventTimeRef.current < 1500) return;
        lastPrimaryEventTimeRef.current = now;
      } else if (eventType === 'WINDOW_BLUR') {
        // Suppress supplementary blur if visibilitychange already fired in the last 1.5s
        if (
          now - lastPrimaryEventTimeRef.current < 1500 ||
          now - lastBlurEventTimeRef.current < 3000
        ) {
          return;
        }
        lastBlurEventTimeRef.current = now;
      } else if (eventType === 'COPY_EVENT') {
        if (now - lastCopyEventTimeRef.current < 2000) return;
        lastCopyEventTimeRef.current = now;
      }

      const payload: RecordProctoringEventDto = {
        roundNumber,
        eventType,
        idempotencyKey: makeIdempotencyKey(roundNumber, eventType),
        questionId,
        arenaType,
        details,
      };

      try {
        const res = await proctoringService.recordEventKeepAlive(payload);
        if (res.recorded) {
          setLockStatus(res.lockStatus);
          setWarningCount(res.warningCount);
          setIncidentCount(res.incidentCount);
          if (res.lockStatus === 'LOCKED_PENDING_REVIEW' || res.lockStatus === 'BLOCKED') {
            setLockReason(res.message);
          } else if (eventType === 'TAB_SWITCH' || eventType === 'PAGE_HIDDEN') {
            pendingWarningRef.current = {
              recorded: true,
              violationCount: res.warningCount,
              threshold: 3,
              revoked: false,
              lockStatus: res.lockStatus,
              message: res.message,
            };
          }
        }
      } catch {
        // Network failure: enqueue for automatic retry when connection returns
        const queue = readRetryQueue();
        queue.push(payload);
        writeRetryQueue(queue);
      }
    },
    [roundNumber, isRoundActive, isSubmitted, isConcluded, questionId, arenaType],
  );

  // Initial status fetch & retry flush on mount
  useEffect(() => {
    refreshStatus();
    flushRetryQueue();
  }, [refreshStatus, flushRetryQueue]);

  // Poll status while locked so admin unlock immediately restores workspace
  useEffect(() => {
    if (lockStatus === 'ACTIVE' && !isDisqualified) return;
    const interval = setInterval(() => {
      refreshStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [lockStatus, isDisqualified, refreshStatus]);

  // Attach browser visibility, blur/focus, online, and copy listeners during active round
  useEffect(() => {
    if (!isRoundActive || isSubmitted || isConcluded) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' || document.hidden) {
        sendEvent('TAB_SWITCH', 'Browser tab hidden or minimized');
      } else {
        flushRetryQueue();
        refreshStatus();
        if (pendingWarningRef.current) {
          setFocusWarning(pendingWarningRef.current);
          pendingWarningRef.current = null;
        }
      }
    };

    const handleWindowBlur = () => {
      sendEvent('WINDOW_BLUR', 'Window lost focus');
    };

    const handleWindowFocus = () => {
      flushRetryQueue();
      refreshStatus();
      if (pendingWarningRef.current) {
        setFocusWarning(pendingWarningRef.current);
        pendingWarningRef.current = null;
      }
    };

    const handleCopy = () => {
      // Only logs context — NEVER reads clipboard contents
      sendEvent('COPY_EVENT', 'Copy event inside competition workspace');
    };

    const handleOnline = () => {
      flushRetryQueue();
      refreshStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('copy', handleCopy);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('copy', handleCopy);
      window.removeEventListener('online', handleOnline);
    };
  }, [sendEvent, flushRetryQueue, refreshStatus, isRoundActive, isSubmitted, isConcluded]);

  const clearWarning = () => {
    setFocusWarning(null);
  };

  return {
    lockStatus,
    isLockedByProctoring: lockStatus === 'LOCKED_PENDING_REVIEW' || lockStatus === 'BLOCKED' || isDisqualified,
    isDisqualified,
    lockReason,
    warningCount,
    incidentCount,
    focusWarning,
    isRevoked: lockStatus === 'BLOCKED' || isDisqualified,
    clearWarning,
    refreshStatus,
  };
};
