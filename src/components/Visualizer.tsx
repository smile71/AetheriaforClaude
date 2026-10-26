import { useEffect, useRef } from "react";
import { usePlayer } from "../store/player";

export default function Visualizer({ height = 90 }: { height?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = ref.current!;
        const ctx = c.getContext("2d")!;
        let raf = 0;
        const draw = (t: number) => {
            const w = (c.width = c.clientWidth);
            const h = (c.height = height);
            ctx.clearRect(0, 0, w, h);
            const on = usePlayer.getState().playing;
            const n = 32;
            const bw = w / n;
            ctx.fillStyle = "rgb(" + getComputedStyle(document.documentElement).getPropertyValue("--accent") + ")";
            ctx.globalAlpha = 0.85;
            for (let i = 0; i < n; i++) {
                const v = on ? 0.25 + 0.75 * Math.abs(Math.sin(t / 380 + i * 0.7) * Math.cos(t / 610 + i * 0.3)) : 0.08;
                ctx.fillRect(i * bw + 2, h - v * h, bw - 4, v * h);
            }
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [height]);
    return <canvas ref={ref} style={{ width: "100%", height }} />;
}