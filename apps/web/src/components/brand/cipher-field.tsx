import { useEffect, useRef } from "react";

/*
 * Decorative "cipher field": a grid of hexadecimal glyphs that slowly re-encrypt,
 * evoking ciphertext without depicting any real data. Dependency-free canvas.
 *
 * Interaction: glyphs near the pointer gently "decipher" (brighter, faster changes),
 * a quiet invitation to explore that never sits behind the form (masked in CSS).
 *
 * Performance & accessibility:
 * - ~12 updates per second, only a small fraction of cells redrawn per tick;
 * - device pixel ratio capped at 2, paused when the tab is hidden;
 * - a single static frame, no pointer effect, when reduced motion is preferred.
 */

const GLYPHS = "0123456789abcdef";
const CELL = 26; // px between glyphs
const TICK_MS = 80;
const MUTATION_RATE = 0.008; // share of cells re-encrypted per tick
const ACCENT_RATE = 0.005; // share of glyphs drawn in brand orange
const POINTER_RADIUS = 140; // px

type Cell = { glyph: string; alpha: number; accent: boolean };
type Point = { x: number; y: number };

function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "0";
}

function randomCell(): Cell {
  return {
    glyph: randomGlyph(),
    alpha: 0.05 + Math.random() * 0.09,
    accent: Math.random() < ACCENT_RATE,
  };
}

export function CipherField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const styles = getComputedStyle(document.documentElement);
    const ink = styles.getPropertyValue("--cachkey-ink").trim() || "#1a1a1a";
    const orange = styles.getPropertyValue("--cachkey-orange").trim() || "#f97316";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let columns = 0;
    let rows = 0;
    let cells: Cell[] = [];
    let timer: number | undefined;
    let pointer: Point | null = null;
    let previousPointer: Point | null = null;

    /** 0 far from the pointer, up to 1 right under it. */
    function proximity(index: number, point: Point | null): number {
      if (!point) return 0;
      const x = (index % columns) * CELL + CELL / 2;
      const y = Math.floor(index / columns) * CELL + CELL / 2;
      const distance = Math.hypot(x - point.x, y - point.y);
      return Math.max(0, 1 - distance / POINTER_RADIUS);
    }

    function drawCell(index: number) {
      if (!context) return;
      const cell = cells[index];
      if (!cell) return;
      const x = (index % columns) * CELL;
      const y = Math.floor(index / columns) * CELL;
      const near = proximity(index, pointer);
      context.clearRect(x, y, CELL, CELL);
      context.globalAlpha = cell.accent ? 0.5 : cell.alpha + near * 0.55;
      context.fillStyle = cell.accent || near > 0.7 ? orange : ink;
      context.fillText(cell.glyph, x + CELL / 2, y + CELL / 2);
    }

    /** Indices of the cells inside the pointer radius around a point. */
    function cellsAround(point: Point): number[] {
      const span = Math.ceil(POINTER_RADIUS / CELL);
      const column = Math.floor(point.x / CELL);
      const row = Math.floor(point.y / CELL);
      const indices: number[] = [];
      for (let r = Math.max(0, row - span); r <= Math.min(rows - 1, row + span); r++) {
        for (let c = Math.max(0, column - span); c <= Math.min(columns - 1, column + span); c++) {
          indices.push(r * columns + c);
        }
      }
      return indices;
    }

    function resize() {
      if (!canvas || !context) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.font = `12px "Geist Mono", ui-monospace, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      columns = Math.ceil(width / CELL);
      rows = Math.ceil(height / CELL);
      cells = Array.from({ length: columns * rows }, randomCell);
      context.clearRect(0, 0, width, height);
      for (let index = 0; index < cells.length; index++) drawCell(index);
    }

    function tick() {
      const mutations = Math.max(1, Math.floor(cells.length * MUTATION_RATE));
      for (let n = 0; n < mutations; n++) {
        const index = Math.floor(Math.random() * cells.length);
        cells[index] = randomCell();
        drawCell(index);
      }

      // Redraw the area the pointer left and the area it is in; glyphs close to it
      // change faster, as if being deciphered.
      const touched = new Set<number>();
      if (previousPointer) for (const index of cellsAround(previousPointer)) touched.add(index);
      if (pointer) for (const index of cellsAround(pointer)) touched.add(index);
      for (const index of touched) {
        const cell = cells[index];
        if (cell && Math.random() < proximity(index, pointer) * 0.25) cell.glyph = randomGlyph();
        drawCell(index);
      }
      previousPointer = pointer;
    }

    function start() {
      if (reducedMotion || timer !== undefined) return;
      timer = window.setInterval(tick, TICK_MS);
    }

    function stop() {
      window.clearInterval(timer);
      timer = undefined;
    }

    function onVisibilityChange() {
      if (document.hidden) stop();
      else start();
    }

    function onPointerMove(event: PointerEvent) {
      if (!canvas || event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function onPointerLeave() {
      pointer = null;
    }

    resize();
    start();
    // Redraw once the web font is available so glyphs use Geist Mono.
    void document.fonts?.ready.then(resize);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
