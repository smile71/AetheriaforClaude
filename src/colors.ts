import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TRACKS } from "./data";
import { usePlayer } from "./store/player";

const cache = new Map<string, string[]>();

function hueOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function fallbackPalette(id: string): string[] {
  const h = hueOf(id);
  return [
    "hsl(" + h + " 70% 45%)",
    "hsl(" + ((h + 40) % 360) + " 65% 35%)",
    "hsl(" + ((h + 320) % 360) + " 60% 30%)",
  ];
}

async function sample(url: string): Promise<string[]> {
  const buf = url.startsWith("http")
    ? await invoke<ArrayBuffer>("fetch_bytes", { url })
    : await (await fetch(url)).arrayBuffer();
  const bmp = await createImageBitmap(new Blob([buf]));
  const c = document.createElement("canvas");
  c.width = 40;
  c.height = 40;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(bmp, 0, 0, 40, 40);
  const d = ctx.getImageData(0, 0, 40, 40).data;

  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = (r + g + b) / 765;
    if (lum < 0.07 || lum > 0.96) continue;
    const w = sat * (1 - Math.abs(lum - 0.5)) + 0.04;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const e = buckets.get(key) || { w: 0, r: 0, g: 0, b: 0 };
    e.w += w;
    e.r += r * w;
    e.g += g * w;
    e.b += b * w;
    buckets.set(key, e);
  }

  const sorted = Array.from(buckets.values()).sort((a, b) => b.w - a.w);
  const picked: number[][] = [];
  for (const e of sorted) {
    const col = [e.r / e.w, e.g / e.w, e.b / e.w];
    const far = picked.every((p) => Math.abs(p[0] - col[0]) + Math.abs(p[1] - col[1]) + Math.abs(p[2] - col[2]) > 110);
    if (far) picked.push(col);
    if (picked.length === 3) break;
  }
  if (!picked.length) throw new Error("no colors");
  return picked.map((p) => "rgb(" + Math.round(p[0]) + "," + Math.round(p[1]) + "," + Math.round(p[2]) + ")");
}

export function usePalette(): string[] {
  const t = usePlayer((s) => s.cur());
  const [p, setP] = useState<string[]>(fallbackPalette(t.id));

  useEffect(() => {
    const tr = TRACKS.find((x) => x.id === t.id);
    const url = tr && tr.cover;
    if (!url) { setP(fallbackPalette(t.id)); return; }
    const c = cache.get(url);
    if (c) { setP(c); return; }
    let live = true;
    sample(url)
      .then((r) => { cache.set(url, r); if (live) setP(r); })
      .catch(() => { if (live) setP(fallbackPalette(t.id)); });
    return () => { live = false; };
  }, [t.id]);

  return p;
}