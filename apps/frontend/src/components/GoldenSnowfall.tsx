import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  opacity: number;
  baseOpacity: number;
  pulseSpeed: number;
  pulsePhase: number;
  color: string;
}

interface GoldenTrail {
  x: number;
  y: number;
  length: number;
  width: number;
  opacity: number;
  speed: number;
  hasBead: boolean;
  beadRadius: number;
}

interface GoldenBokeh {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  driftX: number;
  driftY: number;
}

const GOLD_PALETTE = [
  '#ffd700', // Classic gold
  '#ffdf6d', // Light gold
  '#f6c445', // Warm gold
  '#f59e0b', // Amber-gold
  '#ffeb99', // Bright champagne
  '#eab308', // Radiant yellow gold
];

export const GoldenSnowfall: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number = 0;
    let isRunning = false;
    let lastTimestamp = 0;
    let time = 0;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // Detect prefers-reduced-motion
    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    let isReducedMotion = mediaQuery ? mediaQuery.matches : false;

    // Particle storage
    let particles: Particle[] = [];
    let trails: GoldenTrail[] = [];
    let bokehs: GoldenBokeh[] = [];

    const setupDimensions = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const initPools = () => {
      // Normal motion: Rich, lush atmospheric snowfall
      // Reduced motion: Gentle, non-intrusive lower density
      const particleCount = isReducedMotion
        ? Math.min(60, Math.max(25, Math.floor(width / 30)))
        : Math.min(130, Math.max(50, Math.floor(width / 14)));

      const trailCount = isReducedMotion
        ? Math.min(12, Math.max(6, Math.floor(width / 130)))
        : Math.min(26, Math.max(12, Math.floor(width / 60)));

      const bokehCount = isReducedMotion
        ? Math.min(8, Math.max(4, Math.floor(width / 180)))
        : Math.min(18, Math.max(8, Math.floor(width / 90)));

      // 1. Falling Golden Snow Particles
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        const baseOpacity = isReducedMotion
          ? 0.25 + Math.random() * 0.45
          : 0.35 + Math.random() * 0.55;

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: isReducedMotion
            ? 0.8 + Math.random() * 2.0
            : 0.9 + Math.random() * 2.6,
          speedY: 0.45 + Math.random() * 1.6,
          speedX: (Math.random() - 0.5) * 0.35,
          opacity: baseOpacity,
          baseOpacity,
          pulseSpeed: 0.015 + Math.random() * 0.03,
          pulsePhase: Math.random() * Math.PI * 2,
          color: GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)],
        });
      }

      // 2. Subtle Vertical Golden Light Trails
      trails = [];
      for (let i = 0; i < trailCount; i++) {
        trails.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.45),
          length: 25 + Math.random() * 90,
          width: 0.75 + Math.random() * 1.25,
          opacity: isReducedMotion
            ? 0.1 + Math.random() * 0.3
            : 0.15 + Math.random() * 0.45,
          speed: 0.2 + Math.random() * 0.6,
          hasBead: Math.random() > 0.3,
          beadRadius: 1.5 + Math.random() * 2.2,
        });
      }

      // 3. Ambient Golden Bokeh Halos
      bokehs = [];
      for (let i = 0; i < bokehCount; i++) {
        bokehs.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.4),
          radius: 8 + Math.random() * 22,
          opacity: isReducedMotion
            ? 0.03 + Math.random() * 0.12
            : 0.05 + Math.random() * 0.18,
          driftX: (Math.random() - 0.5) * 0.1,
          driftY: (Math.random() - 0.5) * 0.1,
        });
      }
    };

    setupDimensions();
    initPools();

    const handleResize = () => {
      setupDimensions();
      // Reposition any out-of-bound elements
      for (const p of particles) {
        if (p.x > width) p.x = Math.random() * width;
        if (p.y > height) p.y = Math.random() * height;
      }
      for (const t of trails) {
        if (t.x > width) t.x = Math.random() * width;
      }
      for (const b of bokehs) {
        if (b.x > width) b.x = Math.random() * width;
      }
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
      initPools();
    };

    window.addEventListener('resize', handleResize);
    if (mediaQuery) {
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleMotionChange);
      } else if ((mediaQuery as any).addListener) {
        (mediaQuery as any).addListener(handleMotionChange);
      }
    }

    const render = (currentTimestamp: number) => {
      if (!isRunning) return;

      if (!lastTimestamp) {
        lastTimestamp = currentTimestamp;
      }
      const elapsed = currentTimestamp - lastTimestamp;
      lastTimestamp = currentTimestamp;

      // Delta time normalized to 60fps (16.67ms). Guard against large step jumps.
      const dt = Math.min(Math.max(elapsed / 16.667, 0.1), 2.0);
      time += 0.016 * dt;

      ctx.clearRect(0, 0, width, height);

      // Behavior adaptations based on reduced motion:
      // Reduced motion: Slower, calming speed (0.35x), subtle drift, reduced glow
      // Normal motion: Full velocity (1.0x), full organic drift and glow
      const speedFactor = isReducedMotion ? 0.35 : 1.0;
      const glowMultiplier = isReducedMotion ? 0.5 : 1.0;
      const pulseAmp = isReducedMotion ? 0.08 : 0.22;
      const pulseFreq = isReducedMotion ? 1.2 : 3.0;
      const driftAmp = isReducedMotion ? 0.08 : 0.25;

      // --- 1. Draw Ambient Golden Bokeh Discs ---
      for (const b of bokehs) {
        b.x += b.driftX * speedFactor * dt;
        b.y += b.driftY * speedFactor * dt;
        if (b.x < 0) b.x = width;
        if (b.x > width) b.x = 0;
        if (b.y < 0) b.y = height * 0.45;
        if (b.y > height * 0.45) b.y = 0;

        const bOpacity = isReducedMotion ? b.opacity * 0.75 : b.opacity;
        const gradient = ctx.createRadialGradient(
          b.x,
          b.y,
          0,
          b.x,
          b.y,
          b.radius,
        );
        gradient.addColorStop(0, `rgba(251, 191, 36, ${bOpacity * 1.2})`);
        gradient.addColorStop(0.5, `rgba(245, 158, 11, ${bOpacity * 0.6})`);
        gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 2. Draw Vertical Golden Light Trails ---
      for (const t of trails) {
        t.y += t.speed * speedFactor * dt;
        if (t.y - t.length > height * 0.6) {
          t.y = -t.length;
          t.x = Math.random() * width;
        }

        const tOpacity = isReducedMotion ? t.opacity * 0.75 : t.opacity;
        const trailGrad = ctx.createLinearGradient(
          t.x,
          t.y - t.length,
          t.x,
          t.y,
        );
        trailGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
        trailGrad.addColorStop(0.7, `rgba(251, 191, 36, ${tOpacity * 0.5})`);
        trailGrad.addColorStop(1, `rgba(254, 240, 138, ${tOpacity})`);

        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = t.width;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y - t.length);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();

        // Luminous glowing bead at the tip
        if (t.hasBead) {
          ctx.save();
          ctx.shadowBlur = (isReducedMotion ? 4 : 10) * glowMultiplier;
          ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
          ctx.fillStyle = `rgba(254, 240, 138, ${Math.min(1, tOpacity * (isReducedMotion ? 1.2 : 1.5))})`;
          ctx.beginPath();
          ctx.arc(
            t.x,
            t.y,
            isReducedMotion ? t.beadRadius * 0.85 : t.beadRadius,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.restore();
        }
      }

      // --- 3. Draw Dynamic Falling Golden Snow Particles ---
      for (const p of particles) {
        p.y += p.speedY * speedFactor * dt;
        p.x += (p.speedX * speedFactor + Math.sin(time + p.pulsePhase) * driftAmp) * dt;

        // Wrap around top when falling past bottom
        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Shimmering alpha pulse
        p.opacity =
          p.baseOpacity + Math.sin(time * pulseFreq + p.pulsePhase) * pulseAmp;
        const baseAlpha = Math.max(0.12, Math.min(1, p.opacity));
        const safeAlpha = isReducedMotion ? baseAlpha * 0.8 : baseAlpha;

        ctx.save();
        ctx.shadowBlur = p.radius * (isReducedMotion ? 2 : 4) * glowMultiplier;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = safeAlpha;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const startAnimation = () => {
      if (isRunning) return;
      isRunning = true;
      lastTimestamp = 0;
      animationFrameId = requestAnimationFrame(render);
    };

    const pauseAnimation = () => {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
    };

    // Pause animation when tab is hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseAnimation();
      } else {
        startAnimation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Automatically start animation on mount
    startAnimation();

    return () => {
      pauseAnimation();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (mediaQuery) {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleMotionChange);
        } else if ((mediaQuery as any).removeListener) {
          (mediaQuery as any).removeListener(handleMotionChange);
        }
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-10 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
