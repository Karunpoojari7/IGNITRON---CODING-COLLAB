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
  isReady?: boolean;
  questionId?: string;
  arenaType?: 'MCQ' | 'BUG_HUNT' | 'ANALYTICS' | 'WORKSPACE';
}

const RETRY_QUEUE_KEY = 'ignitron_proctoring_retry_queue';
const MAX_RETRY_AGE_MS = 5 * 60 * 1000;

interface QueuedProctoringEvent extends RecordProctoringEventDto {
  queuedAt?: number;
}

function readRetryQueue(): QueuedProctoringEvent[] {
  try {
    const raw = localStorage.getItem(RETRY_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRetryQueue(queue: QueuedProctoringEvent[]) {
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
  isReady = true,
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
  const inFlightSendRef = useRef<Promise<void> | null>(null);
  const armedRef = useRef<boolean>(false);
  const lastVisibilityStateRef = useRef<DocumentVisibilityState>(
    typeof document !== 'undefined' ? document.visibilityState : 'visible',
  );

  const flushRetryQueue = useCallback(async () => {
    const now = Date.now();
    const queue = readRetryQueue().filter(
      (item) => !item.queuedAt || now - item.queuedAt <= MAX_RETRY_AGE_MS,
    );
    if (queue.length === 0) {
      writeRetryQueue([]);
      return;
    }

    const remaining: QueuedProctoringEvent[] = [];
    for (const item of queue) {
      // Only replay events belonging to the active round
      if (item.roundNumber !== roundNumber) {
        continue;
      }
      try {
        const { queuedAt: _queuedAt, ...dto } = item;
        const res = await proctoringService.recordEventKeepAlive(dto);
        if (res.lockStatus === 'LOCKED_PENDING_REVIEW' || res.lockStatus === 'BLOCKED') {
          setLockStatus(res.lockStatus);
          setLockReason(res.message);
        }
      } catch {
        remaining.push(item);
      }
    }
    writeRetryQueue(remaining);
  }, [roundNumber]);

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

      const sendPromise = (async () => {
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
          queue.push({ ...payload, queuedAt: Date.now() });
          writeRetryQueue(queue);
        }
      })();

      inFlightSendRef.current = sendPromise;
      await sendPromise;
      if (inFlightSendRef.current === sendPromise) {
        inFlightSendRef.current = null;
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

  // Attach browser visibility, blur/focus, online, and copy listeners only after round + page initialization are ready
  useEffect(() => {
    armedRef.current = false;
    if (!isRoundActive || isSubmitted || isConcluded || !isReady) {
      return;
    }

    let armTimer: ReturnType<typeof setTimeout> | null = null;
    const armWhenVisible = () => {
      if (armTimer) clearTimeout(armTimer);
      if (document.visibilityState === 'visible') {
        armTimer = setTimeout(() => {
          if (document.visibilityState === 'visible') {
            lastVisibilityStateRef.current = 'visible';
            armedRef.current = true;
          }
        }, 800);
      }
    };

    armWhenVisible();

    const syncOnReturn = async () => {
      if (inFlightSendRef.current) {
        await inFlightSendRef.current.catch(() => {});
      }
      await flushRetryQueue();
      await refreshStatus();
      if (pendingWarningRef.current) {
        setFocusWarning(pendingWarningRef.current);
        pendingWarningRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      const currentState = document.visibilityState;
      const prevState = lastVisibilityStateRef.current;
      lastVisibilityStateRef.current = currentState;

      if (!armedRef.current) {
        if (currentState === 'visible') {
          armWhenVisible();
        }
        return;
      }

      if (prevState === 'visible' && currentState === 'hidden') {
        sendEvent('TAB_SWITCH', 'Browser tab hidden or minimized');
      } else if (currentState === 'visible') {
        void syncOnReturn();
      }
    };

    const handleWindowBlur = () => {
      if (!armedRef.current) return;
      sendEvent('WINDOW_BLUR', 'Window lost focus');
    };

    const handleWindowFocus = () => {
      if (!armedRef.current) return;
      void syncOnReturn();
    };

    const handleCopy = () => {
      if (!armedRef.current) return;
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
      armedRef.current = false;
      if (armTimer) clearTimeout(armTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('copy', handleCopy);
      window.removeEventListener('online', handleOnline);
    };
  }, [sendEvent, flushRetryQueue, refreshStatus, isRoundActive, isSubmitted, isConcluded, isReady]);

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
