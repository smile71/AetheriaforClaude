import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayer, ICE_TOTAL } from "../store/player";

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function iceStage(p: number) {
    return p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3;
}

export function iceLeft(sec: number) {
    const left = Math.max(0, ICE_TOTAL - sec);
    const h = Math.floor(left / 3600);
    const m = Math.floor((left % 3600) / 60);
    return (h ? h + "ч " : "") + m + "м";
}

/** 
 * Интерактивный 3D-кубик льда, который тает по мере прослушивания (полностью за 2 часа)
 */
export default function IceMelting({ size = 260, interactive = true }: { size?: number; interactive?: boolean }) {
    const sec = usePlayer((s) => s.sessionTime);
    const melts = usePlayer((s) => s.melts);
    const playing = usePlayer((s) => s.playing);
    const p = clamp(sec / ICE_TOTAL);
    const stage = iceStage(p);

    const cubeRef = useRef<HTMLDivElement>(null);
    const rot = useRef({ x: -18, y: 32, z: -8, vx: 0, vy: 0 });
    const drag = useRef<{ x: number; y: number } | null>(null);
    const [grab, setGrab] = useState(false);

    // Плавная анимация вращения и инерции
    useEffect(() => {
        let raf = 0;
        const loop = () => {
            const r = rot.current;
            if (!drag.current) {
                // Мягкое парение и вращение
                r.y += r.vy + (playing ? 0.35 : 0.12);
                r.x += r.vx + Math.sin(Date.now() * 0.001) * 0.05;
                r.vx *= 0.93;
                r.vy *= 0.93;
            }
            if (cubeRef.current) {
                cubeRef.current.style.transform = `rotateX(${r.x}deg) rotateY(${r.y}deg) rotateZ(${r.z}deg)`;
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [playing]);

    // Обработка драга мышью для вращения 3D куба
    useEffect(() => {
        if (!grab || !interactive) return;
        const move = (e: MouseEvent) => {
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            const r = rot.current;
            r.y += dx * 0.6;
            r.x -= dy * 0.6;
            r.vy = dx * 0.3;
            r.vx = -dy * 0.3;
            drag.current = { x: e.clientX, y: e.clientY };
        };
        const up = () => {
            drag.current = null;
            setGrab(false);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
        return () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
        };
    }, [grab, interactive]);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!interactive) return;
        e.preventDefault();
        drag.current = { x: e.clientX, y: e.clientY };
        setGrab(true);
    };

    // Всплеск брызг при 100% растаивании
    const [burst, setBurst] = useState(0);
    const firstMelts = useRef(melts);
    useEffect(() => {
        if (melts !== firstMelts.current) setBurst(melts);
    }, [melts]);
    useEffect(() => {
        if (!burst) return;
        const id = setTimeout(() => setBurst(0), 1800);
        return () => clearTimeout(id);
    }, [burst]);

    const S = size * 0.58;
    const half = S / 2;
    const k = 1 - 0.75 * p; // уменьшение куба
    const sy = k * (1 - 0.25 * p);
    const round = S * (0.15 + 0.35 * p); // скругление граней от таяния

    // Грани куба
    const faces = [
        `translateZ(${half}px)`,
        `rotateY(180deg) translateZ(${half}px)`,
        `rotateY(90deg) translateZ(${half}px)`,
        `rotateY(-90deg) translateZ(${half}px)`,
        `rotateX(90deg) translateZ(${half}px)`,
        `rotateX(-90deg) translateZ(${half}px)`,
    ];

    const drips = p < 0.15 ? 0 : p < 0.4 ? 1 : p < 0.7 ? 3 : 5;
    const bottom = size / 2 + (S * sy) / 2 + 10;

    return (
        <div
            className="relative select-none isolate flex items-center justify-center"
            style={{ width: size, height: size, perspective: size * 3 }}
        >
            {/* Тень и лужица под кристаллом */}
            <div
                className="absolute pointer-events-none rounded-full transition-all duration-1000"
                style={{
                    bottom: size * 0.1,
                    width: S * (0.8 + 0.6 * p),
                    height: 24 + p * 20,
                    background: `radial-gradient(ellipse at center, rgba(130, 210, 255, ${0.45 + p * 0.35}) 0%, rgba(50, 140, 255, ${0.15 + p * 0.2}) 45%, transparent 75%)`,
                    filter: "blur(6px)",
                    transform: "scaleY(0.4)",
                }}
            />

            {/* Эффект свечения и хроматической аберрации вокруг кристалла */}
            <div
                className="absolute inset-0 pointer-events-none rounded-full"
                style={{
                    background: "radial-gradient(circle at 45% 45%, rgba(160,225,255,0.25) 0%, rgba(90,160,255,0.08) 50%, transparent 70%)",
                    filter: "blur(20px)",
                }}
            />

            {/* 3D Стеклянный куб льда */}
            <AnimatePresence mode="wait">
                {!burst && (
                    <motion.div
                        key={"ice" + melts}
                        className="relative grid place-items-center"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.2, opacity: 0, y: 40 }}
                        transition={{ type: "spring", stiffness: 180, damping: 18 }}
                        style={{
                            perspective: size * 4,
                            cursor: grab ? "grabbing" : "grab",
                            transformStyle: "preserve-3d",
                        }}
                        onMouseDown={onMouseDown}
                    >
                        <div
                            style={{
                                transform: `translateY(${(S * (1 - sy)) / 2}px) scale3d(${k}, ${sy}, ${k})`,
                                transition: "transform 1.2s cubic-bezier(0.2,0.8,0.2,1)",
                                transformStyle: "preserve-3d",
                            }}
                        >
                            <div
                                ref={cubeRef}
                                style={{
                                    width: S,
                                    height: S,
                                    position: "relative",
                                    transformStyle: "preserve-3d",
                                }}
                            >
                                {/* 6 граней стекла с призматическим блеском и внутренними отражениями */}
                                {faces.map((tf, i) => (
                                    <div
                                        key={i}
                                        className="absolute inset-0 overflow-hidden"
                                        style={{
                                            transform: tf,
                                            borderRadius: round,
                                            background: `linear-gradient(${135 + i * 45}deg, rgba(255, 255, 255, ${0.45 - p * 0.15}) 0%, rgba(180, 230, 255, ${0.25 - p * 0.08}) 35%, rgba(110, 190, 255, ${0.15 - p * 0.05}) 70%, rgba(255, 255, 255, 0.35) 100%)`,
                                            backdropFilter: "blur(12px) saturate(220%)",
                                            WebkitBackdropFilter: "blur(12px) saturate(220%)",
                                            border: `1.5px solid rgba(255, 255, 255, ${0.85 - p * 0.35})`,
                                            boxShadow: `inset 0 0 24px rgba(255, 255, 255, 0.6), inset 0 0 45px rgba(120, 205, 255, 0.35), 0 8px 32px rgba(40, 120, 255, 0.25)`,
                                            backfaceVisibility: "visible",
                                        }}
                                    >
                                        {/* Радужный градиент преломления света внутри льда */}
                                        <div
                                            className="absolute inset-0 pointer-events-none"
                                            style={{
                                                background: "linear-gradient(45deg, rgba(255, 120, 180, 0.2) 0%, rgba(100, 220, 255, 0.3) 40%, rgba(255, 235, 120, 0.2) 80%, rgba(140, 100, 255, 0.25) 100%)",
                                                mixBlendMode: "color-dodge",
                                                opacity: 0.85,
                                            }}
                                        />

                                        {/* Диагональные кристаллы и преломления */}
                                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: "overlay" }}>
                                            <polygon points="10,0 90,0 75,100 0,60" fill="rgba(255,255,255,0.18)" />
                                            <polygon points="0,20 100,80 85,100 0,100" fill="rgba(140,210,255,0.15)" />
                                            <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
                                            <line x1="20" y1="0" x2="100" y2="80" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                                        </svg>

                                        {/* Бегающий блик света */}
                                        <div className="absolute inset-0 ice-shine pointer-events-none" />
                                    </div>
                                ))}

                                {/* Центральное ядро льда с замерзшими пузырьками */}
                                <div
                                    className="absolute inset-4 rounded-2xl pointer-events-none"
                                    style={{
                                        transform: "translateZ(0px)",
                                        background: "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.7) 0%, rgba(180,230,255,0.4) 45%, rgba(60,150,255,0.1) 80%, transparent 100%)",
                                        filter: "blur(4px)",
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Стекающие капли воды */}
            {Array.from({ length: drips }).map((_, i) => (
                <span
                    key={i}
                    className="ice-drip absolute pointer-events-none"
                    style={{
                        left: size / 2 + (i - (drips - 1) / 2) * (S * k * 0.28),
                        top: bottom - 4,
                        width: 5 + stage,
                        height: 8 + stage * 2,
                        animationDuration: `${(2.2 - stage * 0.35 + (i % 3) * 0.4) * (playing ? 1 : 2.2)}s`,
                        animationDelay: `${i * 0.4}s`,
                    }}
                />
            ))}

            {/* Финальный всплеск при 100% растаивании */}
            {!!burst &&
                Array.from({ length: 32 }).map((_, i) => {
                    const a = (i / 32) * Math.PI * 2;
                    return (
                        <motion.span
                            key={"burst" + burst + i}
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                left: size / 2,
                                top: size / 2,
                                width: 8,
                                height: 10,
                                background: "radial-gradient(circle at 35% 30%, #fff, #90d4ff 55%, #3a8bff)",
                                boxShadow: "0 0 10px rgba(120,200,255,0.8)",
                            }}
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{
                                x: Math.cos(a) * size * 0.65,
                                y: [0, Math.sin(a) * size * 0.3 - 25, size * 0.95],
                                opacity: [1, 1, 0],
                                scale: [1, 1.2, 0.4],
                            }}
                            transition={{ duration: 1.4, ease: "easeIn", times: [0, 0.3, 1] }}
                        />
                    );
                })}
        </div>
    );
}

/** 
 * Компактная мини-иконка кристалла для навбара и панели плеера 
 */
export function IceIndicator({ onClick }: { size?: number; onClick?: () => void }) {
    const sec = usePlayer((s) => s.sessionTime);
    const p = clamp(sec / ICE_TOTAL);
    const pct = Math.round(p * 100);
    const leftStr = iceLeft(sec);

    return (
        <button
            onClick={onClick}
            title={`Растопить настроение: ${pct}% · Осталось: ${leftStr}`}
            className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10 hover:border-cyan-400/40"
        >
            <div className="relative w-5 h-5 flex items-center justify-center">
                <div
                    className="w-4 h-4 rounded-md transition-all duration-700 shadow-sm"
                    style={{
                        background: "linear-gradient(135deg, #e6f7ff 0%, #70c4ff 50%, #3088ff 100%)",
                        boxShadow: "0 0 8px rgba(100, 200, 255, 0.5)",
                        transform: `scale(${1 - 0.4 * p}) rotate(${p * 45}deg)`,
                        borderRadius: `${3 + p * 6}px`,
                    }}
                />
                {p > 0.2 && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                )}
            </div>
            <span className="text-xs font-semibold text-cyan-200 tabular-nums">{pct}%</span>
        </button>
    );
}

