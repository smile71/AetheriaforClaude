import { useEffect, useState } from "react";
import { Music, Sparkles } from "lucide-react";
import { usePlayer } from "../store/player";
import { LOCAL_ARTIST } from "../data";

type Line = { t: number; text: string };
type Ver = { synced: Line[]; plain: string };
type Res = Ver[] | "none" | "loading";
const cache = new Map<string, Res>();

function parseLrc(lrc: string): Line[] {
    const out: Line[] = [];
    for (const raw of lrc.split("\n")) {
        const m = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/.exec(raw.trim());
        if (m) out.push({ t: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
    }
    return out;
}

async function fetchLyrics(artist: string, title: string): Promise<Res> {
    const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, "").replace(/\b(feat|ft|remix|edit|hardtekk|prod|slowed)\b.*/i, "").trim();
    const queries = [
        { a: artist, t: title },
        { a: artist, t: cleanTitle },
        { a: "", t: cleanTitle || title },
    ];

    for (const q of queries) {
        try {
            let url = "https://lrclib.net/api/search?track_name=" + encodeURIComponent(q.t);
            if (q.a) url += "&artist_name=" + encodeURIComponent(q.a);
            const res = await fetch(url);
            const arr = await res.json();
            if (Array.isArray(arr) && arr.length > 0) {
                const vers: Ver[] = arr
                    .filter((h: any) => h.syncedLyrics || h.plainLyrics)
                    .map((h: any) => ({ synced: h.syncedLyrics ? parseLrc(h.syncedLyrics) : [], plain: h.plainLyrics || "" }));
                vers.sort((a, b) => (b.synced.length > 0 ? 1 : 0) - (a.synced.length > 0 ? 1 : 0));
                if (vers.length) return vers.slice(0, 6);
            }
        } catch {
            continue;
        }
    }

    return "none";
}

let ref = { p: 0, t: 0 };

function smoothPos(): number {
    const s = usePlayer.getState();
    const now = performance.now();
    if (s.position !== ref.p) ref = { p: s.position, t: now };
    return s.playing ? ref.p + Math.min(0.35, ((now - ref.t) / 1000) * s.rate) : ref.p;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

function ActiveLine({ line, end, big, offset }: { line: Line; end: number; big: boolean; offset: number }) {
    const [pos, setPos] = useState(0);

    useEffect(() => {
        let raf = 0;
        const loop = () => {
            setPos(smoothPos() + offset);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [offset]);

    const words = line.text.split(" ");
    const total = Math.max(1, line.text.replace(/ /g, "").length);
    const len = Math.max(0.5, end - line.t);
    const col = (a: number) => (big ? "rgba(255,255,255," + a + ")" : "rgb(var(--accent) / " + a + ")");
    let acc = 0;

    return (
        <div className="flex flex-wrap gap-x-3">
            {words.map((w, wi) => (
                <span key={wi} style={{ display: "inline-flex" }}>
                    {Array.from(w).map((ch, ci) => {
                        const s0 = line.t + (acc / total) * len;
                        const e0 = line.t + ((acc + 1) / total) * len;
                        acc += 1;
                        const p = clamp((pos - s0) / Math.max(0.08, e0 - s0));
                        const wave = Math.sin(Math.PI * clamp((pos - s0) / 0.5));
                        const style = {
                            display: "inline-block",
                            color: col(0.35 + 0.65 * p),
                            transform: "translateY(" + -wave * (big ? 9 : 4) + "px) scale(" + (1 + wave * 0.08) + ")",
                            textShadow: big && p > 0 ? "0 0 " + 24 * p + "px rgba(100,220,255," + 0.8 * p + "), 0 0 10px rgba(255,255,255,0.9)" : "none",
                        };
                        return <span key={ci} style={style}>{ch}</span>;
                    })}
                </span>
            ))}
        </div>
    );
}

export default function Lyrics({ big = false, offset = 0, ver = 0, onCount }: { big?: boolean; offset?: number; ver?: number; onCount?: (n: number) => void }) {
    const t = usePlayer((s) => s.cur());
    const [res, setRes] = useState<Res>("loading");
    const [active, setActive] = useState(-1);

    useEffect(() => {
        const done = (r: Res) => {
            setRes(r);
            if (onCount) onCount(Array.isArray(r) ? r.length : 0);
        };
        if (t.id === "none") { done("none"); return; }
        const c = cache.get(t.id);
        if (c) { done(c); return; }
        setRes("loading");
        let live = true;
        const artist = t.artist === LOCAL_ARTIST ? "" : t.artist;
        fetchLyrics(artist, t.title).then((r) => {
            cache.set(t.id, r);
            if (live) done(r);
        });
        return () => { live = false; };
    }, [t.id, t.title, t.artist]);

    const v: Ver | null = Array.isArray(res) ? res[Math.min(ver, res.length - 1)] : null;
    const synced = !!v && v.synced.length > 0;

    useEffect(() => {
        if (!synced || !v) { setActive(-1); return; }
        let raf = 0;
        const loop = () => {
            const pos = smoothPos() + offset;
            let a = -1;
            for (let i = 0; i < v.synced.length; i++) if (v.synced[i].t <= pos) a = i;
            setActive(a);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [synced, v, offset]);

    useEffect(() => {
        if (active >= 0) document.getElementById("ly" + active)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [active]);

    if (res === "loading") {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-white/60">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span className="text-sm font-medium">Поиск текста песни...</span>
            </div>
        );
    }

    if (!v || res === "none") {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white/[0.03] backdrop-blur-md rounded-3xl border border-white/5 max-w-lg mx-auto shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 grid place-items-center mb-4 text-cyan-300">
                    <Music size={32} />
                </div>
                <h3 className="text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-cyan-200">
                    Инструментальный трек
                </h3>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                    Синхронизированный текст для этого трека пока не найден. Наслаждайтесь чистым звучанием музыки!
                </p>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-cyan-300 font-semibold">
                    <Sparkles size={14} /> Включите 3D Лёд настроения вверху экрана
                </div>
            </div>
        );
    }

    if (!synced) {
        const text = v.plain || v.synced.map((l) => l.text).join("\n");
        return (
            <div className="max-w-2xl mx-auto">
                <div className="whitespace-pre-wrap leading-relaxed text-2xl font-medium tracking-wide text-white/80">
                    {text}
                </div>
            </div>
        );
    }

    const lines = v.synced;
    const size = big ? "text-4xl leading-snug tracking-tight" : "text-2xl";

    return (
        <div className={"flex flex-col " + (big ? "gap-9" : "gap-4")} style={big ? { color: "#fff" } : undefined}>
            {lines.map((l, i) => {
                const click = () => usePlayer.getState().seek(Math.max(0, l.t - offset));
                if (i !== active) {
                    const d = Math.abs(i - active);
                    const style = big
                        ? { opacity: Math.max(0.12, 0.45 - d * 0.08), filter: "blur(" + Math.min(2.5, d * 0.5) + "px)", transition: "all .45s ease" }
                        : { opacity: i === active + 1 ? 0.5 : 0.3, transition: "opacity .3s" };
                    return (
                        <div id={"ly" + i} key={i} onClick={click} className={size + " font-black cursor-pointer hover:opacity-80 transition"} style={style}>
                            {l.text || "♪ ♪ ♪"}
                        </div>
                    );
                }
                const end = i + 1 < lines.length ? lines[i + 1].t : l.t + 4;
                return (
                    <div id={"ly" + i} key={i} onClick={click} className={size + " font-black cursor-pointer"} style={{ transform: big ? "scale(1.06)" : "none", transformOrigin: "left center", transition: "transform .4s" }}>
                        <ActiveLine line={l} end={end} big={big} offset={offset} />
                    </div>
                );
            })}
        </div>
    );
}
