import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Play, Pause, SkipBack, SkipForward, Minus, Plus, Shuffle, Repeat, Repeat1, Volume2, Sparkles } from "lucide-react";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { usePalette } from "../colors";
import { fmt } from "./TrackRow";
import Cover from "./Cover";
import Lyrics from "./Lyrics";
import IceMelting from "./IceMelting";

const SOFT = { color: "rgba(255,255,255,0.65)" };
const PILL = { background: "rgba(0,0,0,0.45)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" };
const MASK = "linear-gradient(to bottom, transparent 0, #000 16%, #000 84%, transparent 100%)";

export default function NowPlaying() {
    const s = usePlayer();
    const setFull = useUI((u) => u.setFull);
    const pal = usePalette();
    const t = s.cur();
    const [offset, setOffset] = useState(0);
    const [ver, setVer] = useState(0);
    const [count, setCount] = useState(0);
    const [showIce, setShowIce] = useState(false);
    const step = (d: number) => setOffset((o) => Math.round((o + d) * 10) / 10);
    const RepeatIcon = s.repeat === "one" ? Repeat1 : Repeat;
    const on = (v: boolean) => ({ cursor: "pointer", opacity: v ? 1 : 0.45 });

    useEffect(() => { setVer(0); setOffset(0); }, [t.id]);

    const blob = (extra: object) => ({ position: "absolute" as const, borderRadius: "50%", filter: "blur(130px)", ...extra });

    return (
        <motion.div
            className="absolute inset-0 z-30 overflow-hidden"
            style={{ background: "#08070d", color: "#fff" }}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
        >
            {/* Динамический живой градиентный фон в такт цветам обложки */}
            <AnimatePresence>
                <motion.div key={pal.join()} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
                    <div style={blob({ left: "-12%", top: "-8%", width: "70%", height: "80%", background: pal[0], opacity: 0.65, animation: "drift1 20s ease-in-out infinite" })} />
                    <div style={blob({ right: "-18%", bottom: "-12%", width: "65%", height: "75%", background: pal[1] || pal[0], opacity: 0.55, animation: "drift2 24s ease-in-out infinite" })} />
                    <div style={blob({ left: "28%", top: "30%", width: "50%", height: "55%", background: pal[2] || pal[0], opacity: 0.4, animation: "drift1 28s ease-in-out infinite reverse" })} />
                </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.75) 100%)" }} />

            {/* Кнопка закрытия полноэкранного режима */}
            <button onClick={() => setFull(false)} className="absolute top-6 left-6 z-40 p-2.5 rounded-2xl cursor-pointer hover:scale-105 transition shadow-lg" style={PILL}>
                <ChevronDown size={22} />
            </button>

            {/* Переключатель синхронизации и 3D кристалла */}
            <div className="absolute top-6 z-40 flex items-center gap-3" style={{ left: "62%", transform: "translateX(-50%)" }}>
                <button
                    onClick={() => setShowIce(!showIce)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer hover:scale-105 transition"
                    style={{ ...PILL, borderColor: showIce ? "rgba(100, 200, 255, 0.6)" : "rgba(255,255,255,0.15)" }}
                >
                    <Sparkles size={14} className="text-cyan-300" />
                    {showIce ? "Показать караоке" : "3D Лёд настроения"}
                </button>
                {count > 0 && !showIce && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs" style={PILL}>
                        <ChevronLeft size={14} className="cursor-pointer" onClick={() => setVer((v) => Math.max(0, v - 1))} />
                        <span className="font-semibold">{"Слова " + (Math.min(ver, count - 1) + 1) + "/" + count}</span>
                        <ChevronRight size={14} className="cursor-pointer" onClick={() => setVer((v) => Math.min(count - 1, v + 1))} />
                    </div>
                )}
                {!showIce && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs" style={PILL}>
                        <Minus size={14} className="cursor-pointer" onClick={() => step(-0.1)} />
                        <span className="w-12 text-center font-semibold font-mono">{offset.toFixed(1) + "с"}</span>
                        <Plus size={14} className="cursor-pointer" onClick={() => step(0.1)} />
                    </div>
                )}
            </div>

            {/* Основной контент (Обложка + Плеер слева, Караоке или 3D Лёд справа) */}
            <div className="relative h-full grid gap-12 px-12" style={{ gridTemplateColumns: "minmax(320px, 420px) 1fr" }}>
                <motion.div className="flex flex-col items-center justify-center gap-5" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
                    <motion.div
                        className="relative"
                        animate={{ scale: s.playing ? 1.02 : 0.95 }}
                        transition={{ type: "spring", stiffness: 140, damping: 15 }}
                        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 50px rgba(var(--accent) / 0.3)", borderRadius: 24 }}
                    >
                        <Cover seed={t.id} size={320} round={24} />
                        <button onClick={() => t.id !== "none" && useUI.getState().openPicker(t)} className="absolute left-4 bottom-4 w-10 h-10 rounded-full grid place-items-center cursor-pointer hover:scale-110 transition shadow-xl" style={PILL}>
                            <Plus size={20} />
                        </button>
                    </motion.div>

                    <div className="text-center max-w-full">
                        <div className="text-2xl font-black truncate tracking-tight">{t.title}</div>
                        <div className="truncate text-base font-medium mt-1 cursor-pointer hover:underline" style={SOFT} onClick={() => s.openArtist(t.artist)}>{t.artist}</div>
                    </div>

                    {/* Шкала перемотки */}
                    <div className="w-full">
                        <input type="range" min={0} max={t.duration || 1} step={0.1} value={Math.min(s.position, t.duration || 1)} onChange={(e) => s.seek(Number(e.target.value))} className="w-full h-1.5 cursor-pointer" style={{ accentColor: "#fff" }} />
                        <div className="flex justify-between text-xs font-mono mt-1" style={SOFT}><span>{fmt(s.position)}</span><span>{fmt(t.duration)}</span></div>
                    </div>

                    {/* Кнопки плеера */}
                    <div className="flex items-center gap-7">
                        <Shuffle size={20} onClick={s.toggleShuffle} style={on(s.shuffle)} />
                        <SkipBack size={26} className="cursor-pointer hover:scale-110 transition" onClick={s.prev} fill="currentColor" />
                        <button onClick={s.toggle} className="w-16 h-16 rounded-full grid place-items-center hover:scale-105 transition cursor-pointer shadow-2xl" style={{ background: "#fff", color: "#000" }}>
                            {s.playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                        </button>
                        <SkipForward size={26} className="cursor-pointer hover:scale-110 transition" onClick={s.next} fill="currentColor" />
                        <RepeatIcon size={20} onClick={s.cycleRepeat} style={on(s.repeat !== "off")} />
                    </div>

                    <div className="flex items-center gap-3 w-4/5" style={SOFT}>
                        <Volume2 size={18} />
                        <input type="range" min={0} max={1} step={0.01} value={s.volume} onChange={(e) => s.setVolume(Number(e.target.value))} className="flex-1 cursor-pointer" style={{ accentColor: "#fff" }} />
                    </div>
                </motion.div>

                {/* Правая часть: либо Пословный караоке с неоновым свечением, либо Центральный 3D куб льда */}
                <motion.div className="h-full flex items-center justify-center relative overflow-hidden" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
                    {showIce ? (
                        <div className="flex flex-col items-center justify-center gap-4 rise">
                            <IceMelting size={380} />
                            <div className="text-center bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
                                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400">
                                    Кристалл вашего настроения
                                </h3>
                                <p className="text-xs text-slate-300 mt-1">
                                    Вращайте мышкой в 3D. Лёд полностью тает за 2 часа прослушивания музыки.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full overflow-y-auto" style={{ scrollbarWidth: "none", maskImage: MASK, WebkitMaskImage: MASK }}>
                            <div className="pr-8" style={{ paddingTop: "40vh", paddingBottom: "40vh" }}>
                                <Lyrics big offset={offset} ver={ver} onCount={setCount} />
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}

