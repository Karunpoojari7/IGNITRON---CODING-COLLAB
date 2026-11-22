// Utility to trigger Google-style dual-burst confetti and championship victory animations

declare global {
  interface Window {
    confetti?: (options: {
      particleCount?: number;
      angle?: number;
      spread?: number;
      startVelocity?: number;
      decay?: number;
      gravity?: number;
      drift?: number;
      ticks?: number;
      origin?: { x: number; y: number };
      colors?: string[];
      shapes?: ('square' | 'circle' | 'star')[];
      scalar?: number;
      zIndex?: number;
      disableForReducedMotion?: boolean;
    }) => Promise<null> | null;
  }
}

/**
 * Standard Google-Style Congratulations dual confetti burst.
 * Simultaneous bursts from bottom-left and bottom-right corners.
 */
export const triggerGoogleCelebrationConfetti = (zIndex = 1000) => {
  if (typeof window === 'undefined') return;

  const runBursts = () => {
    const confetti = window.confetti;
    if (typeof confetti !== 'function') return;

    // Right side burst
    confetti({
      particleCount: 300,
      spread: 90,
      origin: { x: 1, y: 0.9 },
      colors: ['#4285F4', '#EA4335', '#FBBC05', '#34A853'],
      zIndex,
    });

    // Left side burst
    confetti({
      particleCount: 300,
      spread: 90,
      origin: { x: 0, y: 0.9 },
      colors: ['#4285F4', '#EA4335', '#FBBC05', '#34A853'],
      zIndex,
    });
  };

  if (typeof window.confetti === 'function') {
    runBursts();
  } else {
    // If CDN script is still hydrating, retry briefly
    setTimeout(runBursts, 150);
  }
};

/**
 * Round 3 Grand Final Victory Confetti:
 * Extra luxurious championship fireworks stream + golden stars & dual Google burst.
 */
export const triggerGrandChampionConfetti = (zIndex = 1000) => {
  triggerGoogleCelebrationConfetti(zIndex);

  if (typeof window === 'undefined') return;
  const confetti = window.confetti;
  if (typeof confetti !== 'function') return;

  // Center golden star explosion
  setTimeout(() => {
    confetti({
      particleCount: 150,
      spread: 120,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.65 },
      colors: ['#FFD700', '#FFA500', '#4285F4', '#34A853'],
      zIndex,
    });
  }, 250);

  // Extended cascading victory shower
  const duration = 2500;
  const animationEnd = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors: ['#FFD700', '#4285F4', '#FBBC05'],
      zIndex,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      colors: ['#FFD700', '#EA4335', '#34A853'],
      zIndex,
    });

    if (Date.now() < animationEnd) {
      requestAnimationFrame(frame);
    }
  };

  requestAnimationFrame(frame);
};
