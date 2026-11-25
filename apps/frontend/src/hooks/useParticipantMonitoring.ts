import { useState, useEffect, useRef, useCallback } from 'react';
import { questionAndArenaService } from '../services/question-and-arena.service';
import { FocusEventResultDto } from '@ignitron/shared';

interface UseParticipantMonitoringOptions {
  roundNumber: number;
  isRoundActive: boolean;
  isSubmitted: boolean;
  isConcluded?: boolean;
}

export const useParticipantMonitoring = ({
  roundNumber,
  isRoundActive,
  isSubmitted,
  isConcluded = false,
}: UseParticipantMonitoringOptions) => {
  const [focusWarning, setFocusWarning] = useState<FocusEventResultDto | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);
  const lastEventTimeRef = useRef<number>(0);
  const pendingWarningRef = useRef<FocusEventResultDto | null>(null);

  const reportEvent = useCallback(
    async (eventType: 'FOCUS_LOST' | 'TAB_SWITCH' | 'WINDOW_BLUR') => {
      // Safeguard: only monitor when round is genuinely active and team hasn't submitted/concluded
      if (!isRoundActive || isSubmitted || isConcluded) {
        return;
      }

      const now = Date.now();
      // Debounce rapid events within 2 seconds
      if (now - lastEventTimeRef.current < 2000) {
        return;
      }
      lastEventTimeRef.current = now;

      try {
        const res = await questionAndArenaService.recordFocusEvent(roundNumber, eventType);
        if (res.revoked) {
          setIsRevoked(true);
        } else if (res.recorded) {
          pendingWarningRef.current = res;
        }
      } catch (err) {
        console.warn('Failed to record focus event:', err);
      }
    },
    [roundNumber, isRoundActive, isSubmitted, isConcluded],
  );

  useEffect(() => {
    if (!isRoundActive || isSubmitted || isConcluded) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportEvent('TAB_SWITCH');
      } else {
        // User returned to tab: if a warning was recorded, display it!
        if (pendingWarningRef.current) {
          setFocusWarning(pendingWarningRef.current);
          pendingWarningRef.current = null;
        }
      }
    };

    const handleWindowBlur = () => {
      reportEvent('WINDOW_BLUR');
    };

    const handleWindowFocus = () => {
      if (pendingWarningRef.current) {
        setFocusWarning(pendingWarningRef.current);
        pendingWarningRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [reportEvent, isRoundActive, isSubmitted, isConcluded]);

  const clearWarning = () => {
    setFocusWarning(null);
  };

  return {
    focusWarning,
    isRevoked,
    clearWarning,
  };
};
