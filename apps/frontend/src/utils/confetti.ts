// Utility to trigger rich, long-distance multi-color celebration confetti showers

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

// 14+ vibrant, festive celebration colors (Google + Royal + Neon Palette)
export const VIBRANT_CONFETTI_COLORS = [
  '#4285F4', // Google Blue
  '#EA4335', // Google Red
  '#FBBC05', // Google Amber/Yellow
  '#34A853', // Google Emerald
  '#9C27B0', // Royal Violet
  '#E91E63', // Vivid Fuchsia
  '#00BCD4', // Cyan
  '#FF9800', // Sunburst Orange
  '#00E676', // Neon Green
  '#FFD700', // Brilliant Gold
  '#FF4081', // Neon Pink
  '#7C4DFF', // Electric Purple
  '#00E5FF', // Bright Turquoise
  '#FF5722', // Fiery Coral
];

/**
 * Supercharged dual-burst celebration confetti.
 * Shoots wide, high-velocity fountain streams from both bottom corners
 * with 14+ colors, long lifespan (ticks: 450, low gravity: 0.65), and multi-wave bursts.
 */
export const triggerGoogleCelebrationConfetti = (zIndex = 1000) => {
  if (typeof window === 'undefined') return;

  const runBursts = () => {
    const confetti = window.confetti;
    if (typeof confetti !== 'function') return;

    // Wave 1: Massive initial high-range fountain blast from both bottom corners
    // Left side burst (arcs towards top right)
    confetti({
      particleCount: 350,
      angle: 60,
      spread: 100,
      startVelocity: 68,
      decay: 0.92,
      gravity: 0.68,
      ticks: 450, // Long lifespan - stays floating on screen
      origin: { x: 0, y: 0.92 },
      colors: VIBRANT_CONFETTI_COLORS,
      shapes: ['square', 'circle'],
      scalar: 1.15,
      zIndex,
    });

    // Right side burst (arcs towards top left)
    confetti({
      particleCount: 350,
      angle: 120,
      spread: 100,
      startVelocity: 68,
      decay: 0.92,
      gravity: 0.68,
      ticks: 450, // Long lifespan
      origin: { x: 1, y: 0.92 },
      colors: VIBRANT_CONFETTI_COLORS,
      shapes: ['square', 'circle'],
      scalar: 1.15,
      zIndex,
    });

    // Wave 2 (after 250ms): High-altitude stratosphere booster covering center & upper ceiling
    setTimeout(() => {
      confetti({
        particleCount: 200,
        angle: 55,
        spread: 95,
        startVelocity: 78,
        decay: 0.93,
        gravity: 0.65,
        ticks: 450,
        origin: { x: 0.05, y: 0.88 },
        colors: VIBRANT_CONFETTI_COLORS,
        zIndex,
      });

      confetti({
        particleCount: 200,
        angle: 125,
        spread: 95,
        startVelocity: 78,
        decay: 0.93,
        gravity: 0.65,
        ticks: 450,
        origin: { x: 0.95, y: 0.88 },
        colors: VIBRANT_CONFETTI_COLORS,
        zIndex,
      });
    }, 250);

    // Wave 3 (after 600ms): Secondary flutter shower for continuous magical cascade
    setTimeout(() => {
      confetti({
        particleCount: 150,
        angle: 70,
        spread: 110,
        startVelocity: 55,
        decay: 0.91,
        gravity: 0.6,
        ticks: 400,
        origin: { x: 0.15, y: 0.95 },
        colors: VIBRANT_CONFETTI_COLORS,
        zIndex,
      });

      confetti({
        particleCount: 150,
        angle: 110,
        spread: 110,
        startVelocity: 55,
        decay: 0.91,
        gravity: 0.6,
        ticks: 400,
        origin: { x: 0.85, y: 0.95 },
        colors: VIBRANT_CONFETTI_COLORS,
        zIndex,
      });
    }, 600);
  };

  if (typeof window.confetti === 'function') {
    runBursts();
  } else {
    setTimeout(runBursts, 120);
  }
};

/**
 * Grand Champion Final Victory Confetti (Round 3 Final):
 * Multi-wave fireworks + golden star explosion + continuous celebration cascade.
 */
export const triggerGrandChampionConfetti = (zIndex = 1000) => {
  triggerGoogleCelebrationConfetti(zIndex);

  if (typeof window === 'undefined') return;
  const confetti = window.confetti;
  if (typeof confetti !== 'function') return;

  // Center golden star explosion
  setTimeout(() => {
    confetti({
      particleCount: 220,
      spread: 140,
      startVelocity: 52,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FFFFFF', '#4285F4', '#00E676', '#E91E63'],
      ticks: 450,
      gravity: 0.65,
      zIndex,
    });
  }, 400);

  // Extended cascading victory shower (lasts 3.5 seconds)
  const duration = 3500;
  const animationEnd = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 60,
      startVelocity: 50,
      origin: { x: 0, y: 0.8 },
      colors: VIBRANT_CONFETTI_COLORS,
      ticks: 350,
      gravity: 0.65,
      zIndex,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 60,
      startVelocity: 50,
      origin: { x: 1, y: 0.8 },
      colors: VIBRANT_CONFETTI_COLORS,
      ticks: 350,
      gravity: 0.65,
      zIndex,
    });

    if (Date.now() < animationEnd) {
      requestAnimationFrame(frame);
    }
  };

  requestAnimationFrame(frame);
};
