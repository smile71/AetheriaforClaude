import { useMemo, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Heart, Volume2, VolumeX, Mic, ListMusic } from "lucide-react";
import Cover from "./Cover";
import { fmt } from "./TrackRow";
import { IceIndicator } from "./IceMelting";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";

const RATES = [0.75, 1, 1.25, 1.5, 2];
const BARS = 64;

function waveOf(id: string) {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const out: number[] = [];
    for (let i = 0; i < BARS; i++) {
        h = (h * 1103515245 + 12345) >>> 0;
        const env = 0.55 + 0.45 * Math.sin((i / BARS) * Math.PI);
        out.push(0.25 + 0.75 * env * ((h % 1000) / 1000));
    }
    return out;
}

function SeekBar({ pos, dur, id, playing, onSeek }: { pos: number; dur: number; id: string; playing: boolean; onSeek: (s: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<number | null>(null);
    const [drag, setDrag] = useState<number | null>(null);
    const wave = useMemo(() => waveOf(id), [id]);
    const shown = drag ?? (dur ? pos / dur : 0);
    const pct = Math.max(0, Math.min(1, shown)) * 100;

    const at = (clientX: number) => {
        const r = ref.current!.getBoundingClientRect();
        return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    };
    const down = (e: React.PointerEvent) => {
        if (!dur) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDrag(at(e.clientX));
    };
    const move = (e: React.PointerEvent) => {
        const f = at(e.clientX);
        setHover(f);
        if (drag !== null) setDrag(f);
    };
    const up = (e: React.PointerEvent) => {
        if (drag === null) return;
        onSeek(at(e.clientX) * dur);
        setDrag(null);
    };
    const key = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowRight") { e.stopPropagation(); onSeek(Math.min(dur, pos + 5)); }
        if (e.key === "ArrowLeft") { e.stopPropagation(); onSeek(Math.max(0, pos - 5)); }
    };

    return (
        <div ref={ref} role="slider" tabIndex={0} aria-label="Перемотка" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(pos)} aria-valuetext={fmt(pos)}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={() => setHover(null)} onKeyDown={key}
            className="seek group relative flex-1 h-7 flex items-center cursor-pointer outline-none">
            {/* Анимированные звуковые волны */}
            <div className={"absolute inset-x-0 h-6 flex items-center gap-[2px] " + (playing ? "wave-live" : "")}>
                {wave.map((v, i) => (
                    <span key={i} className="flex-1 rounded-full wave-bar" style={{
                        height: v * 100 + "%",
                        background: (i / BARS) * 100 < pct ? "rgb(var(--accent) / 0.55)" : "rgb(255 255 255 / 0.1)",
                        animationDelay: (i % 8) * 0.09 + "s",
                    }} />
                ))}
            </div>
            {/* Линия прогресса с неоновым свечением */}
            <div className="relative w-full h-1 group-hover:h-1.5 rounded-full transition-all" style={{ background: "rgb(255 255 255 / 0.15)" }}>
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct + "%", background: "linear-gradient(90deg, rgb(var(--accent) / 0.7), rgb(var(--accent)), #fff)", boxShadow: "0 0 10px rgb(var(--accent) / 0.6)" }} />
                {hover !== null && <div className="absolute inset-y-0 left-0 rounded-full pointer-events-none" style={{ width: hover * 100 + "%", background: "rgb(255 255 255 / 0.12)" }} />}
                <div className={"absolute top-1/2 w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full bg-white shadow transition-transform " + (drag !== null ? "scale-100" : "scale-0 group-hover:scale-100 group-focus-visible:scale-100")} style={{ left: pct + "%", boxShadow: "0 0 0 4px rgb(var(--accent) / 0.3)" }} />
            </div>
            {hover !== null && dur > 0 && (
                <div className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded-md text-[11px] font-semibold pointer-events-none glass-strong" style={{ left: hover * 100 + "%" }}>
                    {fmt(hover * dur)}
                </div>
            )}
        </div>
    );
}

export default function PlayerBar() {
    const s = usePlayer();
    const setFull = useUI((u) => u.setFull);
    const t = s.cur();
    const has = t.id !== "none";
    const RepeatIcon = s.repeat === "one" ? Repeat1 : Repeat;
    const on = (v: boolean) => "cursor-pointer transition " + (v ? "accent-text" : "text-white/60 hover:text-white");
    const nextRate = () => s.setRate(RATES[(RATES.indexOf(s.rate) + 1) % RATES.length]);
    const isLiked = s.liked.includes(t.id);

    return (
        <footer className="panel player-glow relative h-[88px] grid grid-cols-[1fr_minmax(320px,1.4fr)_1fr] gap-4 items-center px-5">
            {/* Инфо о треке */}
            <div className="relative flex items-center gap-3 min-w-0">
                <div onClick={() => has && setFull(true)} title="Полноэкранный режим (F)" className="relative cursor-pointer group shrink-0">
                    <div className={"transition duration-300 group-hover:scale-105 " + (s.playing ? "cover-breathe" : "")}>
                        <Cover seed={t.id} size={54} round={10} />
                    </div>
                </div>
                <div className="min-w-0">
                    <div onClick={() => has && setFull(true)} className="font-semibold truncate link-hover cursor-pointer" title={t.title}>
                        {t.title}
                    </div>
                    <div onClick={() => has && s.openArtist(t.artist)} className="text-sm text-white/50 truncate cursor-pointer link-hover w-fit max-w-full" title={t.artist}>
                        {t.artist}
                    </div>
                </div>
                <button
                    onClick={() => has && s.like(t.id)}
                    className={"p-2 rounded-xl transition hover:bg-white/5 cursor-pointer " + (isLiked ? "text-rose-500" : "text-white/50 hover:text-white")}
                    title={isLiked ? "Удалить из любимых" : "Нравится"}
                >
                    <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                </button>
                <IceIndicator onClick={() => s.go("home")} />
            </div>

            {/* Элементы управления воспроизведением */}
            <div className="relative flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-5">
                    <button onClick={s.toggleShuffle} title="Перемешать" className={on(s.shuffle) + " p-1.5 rounded-lg hover:bg-white/5"}>
                        <Shuffle size={17} />
                    </button>
                    <button onClick={s.prev} title="Предыдущий трек" className="cursor-pointer hover:scale-110 transition p-1.5 rounded-lg hover:bg-white/5 text-white/80 hover:text-white">
                        <SkipBack size={21} fill="currentColor" />
                    </button>
                    <button
                        onClick={s.toggle}
                        title={s.playing ? "Пауза" : "Играть"}
                        className="ripple bg-white text-black w-11 h-11 rounded-full grid place-items-center hover:scale-105 transition shadow-lg cursor-pointer"
                    >
                        {s.playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button onClick={s.next} title="Следующий трек" className="cursor-pointer hover:scale-110 transition p-1.5 rounded-lg hover:bg-white/5 text-white/80 hover:text-white">
                        <SkipForward size={21} fill="currentColor" />
                    </button>
                    <button onClick={s.cycleRepeat} title="Повтор" className={on(s.repeat !== "off") + " p-1.5 rounded-lg hover:bg-white/5"}>
                        <RepeatIcon size={17} />
                    </button>
                </div>
                <div className="flex items-center gap-3 w-full text-[11px] text-white/50 tabular-nums">
                    <span className="w-9 text-right font-mono">{fmt(s.position)}</span>
                    <SeekBar pos={s.position} dur={t.duration} id={t.id} playing={s.playing} onSeek={s.seek} />
                    <span className="w-9 font-mono">{fmt(t.duration)}</span>
                </div>
            </div>

            {/* Громкость, скорость, караоке и очередь */}
            <div className="relative flex items-center justify-end gap-3">
                <button onClick={nextRate} title="Скорость воспроизведения" className={"text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer " + (s.rate !== 1 ? "accent-text" : "text-white/60")}>
                    {s.rate}x
                </button>
                <button onClick={() => s.setPanel("lyrics")} title="Текст песни" className={"p-2 rounded-xl hover:bg-white/5 cursor-pointer " + on(s.panel === "lyrics")}>
                    <Mic size={18} />
                </button>
                <button onClick={() => s.setPanel("queue")} title="Очередь воспроизведения" className={"p-2 rounded-xl hover:bg-white/5 cursor-pointer " + on(s.panel === "queue")}>
                    <ListMusic size={18} />
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={() => s.setVolume(s.volume === 0 ? 0.8 : 0)} title="Звук" className="text-white/60 hover:text-white p-1">
                        {s.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input type="range" aria-label="Громкость" min={0} max={1} step={0.01} value={s.volume} onChange={(e) => s.setVolume(Number(e.target.value))} className="w-24 vol" style={{ ["--v" as any]: s.volume * 100 + "%" }} />
                </div>
            </div>
        </footer>
    );
}
