import { useEffect, useRef } from "react";

interface DotFieldProps {
  /** Dot spacing in px */
  spacing?: number;
  /** Influence radius in px */
  radius?: number;
  /** 0..1, base opacity of resting dots */
  baseOpacity?: number;
  /** Multiplier for hover-scale */
  intensity?: number;
  className?: string;
}

/**
 * GuardEngine signature background — interactive dot grid that brightens
 * and shifts toward the brand accent near the cursor.
 */
export function DotField({
  spacing = 28,
  radius = 140,
  baseOpacity = 0.22,
  intensity = 1,
  className,
}: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;

    // Resting dot color (muted slate) and accent (brand teal/blue)
    const baseColor = { r: 148, g: 163, b: 184 }; // slate-400
    const accentColor = { r: 94, g: 234, b: 212 }; // teal-300

    // Cursor state with smoothing
    const cursor = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: 0 };

    // Per-dot brightness (eased)
    let energy = new Float32Array(0);

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / spacing) + 1;
      rows = Math.ceil(height / spacing) + 1;
      energy = new Float32Array(cols * rows);
    }

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      cursor.tx = e.clientX - rect.left;
      cursor.ty = e.clientY - rect.top;
      cursor.active = 1;
    }
    function onLeave() {
      cursor.active = 0;
      cursor.tx = -9999;
      cursor.ty = -9999;
    }
    function onTouch(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      const rect = canvas!.getBoundingClientRect();
      cursor.tx = t.clientX - rect.left;
      cursor.ty = t.clientY - rect.top;
      cursor.active = 1;
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onLeave);

    const r2 = radius * radius;
    let raf = 0;

    function frame() {
      // Smooth cursor
      cursor.x += (cursor.tx - cursor.x) * 0.18;
      cursor.y += (cursor.ty - cursor.y) * 0.18;

      ctx!.clearRect(0, 0, width, height);

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * spacing;
          const y = j * spacing;
          const dx = x - cursor.x;
          const dy = y - cursor.y;
          const d2 = dx * dx + dy * dy;

          let target = 0;
          if (d2 < r2 && cursor.active) {
            const falloff = 1 - d2 / r2;
            target = falloff * falloff;
          }

          const idx = j * cols + i;
          const prev = energy[idx];
          // ease in fast, ease out slow
          const ease = target > prev ? 0.25 : 0.06;
          const e = prev + (target - prev) * ease;
          energy[idx] = e;

          const baseR = 1.1;
          const r = baseR + e * 2.2 * intensity;
          const op = baseOpacity + e * (0.85 - baseOpacity);

          const cr = Math.round(baseColor.r + (accentColor.r - baseColor.r) * e);
          const cg = Math.round(baseColor.g + (accentColor.g - baseColor.g) * e);
          const cb = Math.round(baseColor.b + (accentColor.b - baseColor.b) * e);

          ctx!.beginPath();
          ctx!.fillStyle = `rgba(${cr},${cg},${cb},${op})`;
          ctx!.arc(x, y, r, 0, Math.PI * 2);
          ctx!.fill();

          if (e > 0.35) {
            ctx!.beginPath();
            ctx!.fillStyle = `rgba(${cr},${cg},${cb},${e * 0.18})`;
            ctx!.arc(x, y, r * 3, 0, Math.PI * 2);
            ctx!.fill();
          }
        }
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onLeave);
    };
  }, [spacing, radius, baseOpacity, intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={
        "pointer-events-none absolute inset-0 h-full w-full " + (className ?? "")
      }
    />
  );
}
