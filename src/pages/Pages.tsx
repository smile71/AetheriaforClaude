import { useEffect, useState } from "react";
import { Play, Pause, ChevronLeft, BadgeCheck, Trophy, Disc3, Flame, Clock, ListMusic, MoreVertical, Sparkles, Compass, Radio } from "lucide-react";
import { usePlayer, ICE_TOTAL } from "../store/player";
import { useUI } from "../store/ui";
import { TRACKS, addTracks, Track } from "../data";
import { deezerChart, getAudiusTrending, searchItunes } from "../library";
import { chartAlbums, chartPlaylists, collectionTracks, getRecent, Collection } from "../catalog";
import { useX } from "../i18n2";
import Cover from "../components/Cover";
import TrackRow, { fmt } from "../components/TrackRow";
import IceMelting, { iceLeft } from "../components/IceMelting";

const byId = (id: string) => TRACKS.find((t) => t.id === id);

/**
 * Главный интерактивный баннер "Моя Волна" и "Растопить настроение" прямо по центру (как в Aetheria Wave)
 */
function MyWaveHero() {
    const { playing, toggle, wave, cur } = usePlayer();
    const sec = usePlayer((s) => s.sessionTime);
    const melts = usePlayer((s) => s.melts);
    const resetIce = usePlayer((s) => s.resetIce);
    const x = useX();
    const currentTrack = cur();
    const isPlaying = playing && currentTrack.id !== "none";
    const p = Math.min(1, sec / ICE_TOTAL);
    const pct = Math.round(p * 100);

    return (
        <div className="relative overflow-hidden rounded-3xl p-8 mb-10 border border-white/10 shadow-2xl isolate"
            style={{
                background: "linear-gradient(135deg, rgba(20, 18, 42, 0.95) 0%, rgba(12, 10, 28, 0.98) 100%)",
                boxShadow: "0 20px 60px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
            }}
        >
            {/* Анимированный фоновый градиент Моей Волны (Аврора) */}
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Левая часть: Моя Волна и управление настроением */}
                <div className="flex-1 max-w-xl text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-cyan-300 mb-4 tracking-wide uppercase">
                        <Radio size={14} className="animate-spin text-cyan-400" style={{ animationDuration: "8s" }} />
                        Aetheria Wave · Персональный поток
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                        Растопите настроение
                    </h1>
                    
                    <p className="text-base text-slate-300/80 mb-6 leading-relaxed">
                        Бесконечный персональный поток под ваше настроение. Интерактивный 3D-лёд тает по мере прослушивания музыки — за 2 часа. Растопите его полностью!
                    </p>

                    {/* Кнопка запуска Моей Волны и переключатели настроений */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-6">
                        <button
                            onClick={() => {
                                if (isPlaying) toggle();
                                else wave();
                            }}
                            className="px-7 py-3.5 rounded-2xl font-bold text-base flex items-center gap-3 transition transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
                            style={{
                                background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                                color: "#001026",
                                boxShadow: "0 10px 25px -5px rgba(79, 172, 254, 0.5)",
                            }}
                        >
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                            {isPlaying ? "Пауза" : "Включить Мою Волну"}
                        </button>

                        {(["calm", "energetic", "dance"] as const).map((m) => {
                            const labels: Record<string, string> = { calm: "Спокойное", energetic: "Бодрое", dance: "Танцевальное" };
                            return (
                                <button
                                    key={m}
                                    onClick={() => wave(m)}
                                    className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-white/5 hover:bg-white/15 border border-white/10 transition cursor-pointer backdrop-blur-md"
                                >
                                    {labels[m] || x(m)}
                                </button>
                            );
                        })}
                    </div>

                    {/* Прогресс таяния льда на русском языке */}
                    <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center justify-between text-xs font-semibold mb-2 text-slate-300">
                            <span className="flex items-center gap-1.5 text-cyan-300">
                                <Sparkles size={14} /> Лёд растоплен на {pct}%
                            </span>
                            <span>Осталось слушать: {iceLeft(sec)}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden relative">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: pct + "%",
                                    background: "linear-gradient(90deg, #38ef7d 0%, #11998e 30%, #00f2fe 70%, #4facfe 100%)",
                                    boxShadow: "0 0 12px rgba(79, 172, 254, 0.8)",
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-400">
                            <span>Растоплено кубиков: {melts}</span>
                            {sec > 0 && (
                                <button
                                    onClick={resetIce}
                                    className="text-cyan-400 hover:text-cyan-200 transition underline cursor-pointer"
                                >
                                    Сбросить лёд
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Центр-Право: Огромный 3D кристалл льда как на фото */}
                <div className="relative flex flex-col items-center justify-center p-2">
                    <div className="relative cursor-grab active:cursor-grabbing">
                        <IceMelting size={270} />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400/80 mt-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                        Потяните мышью, чтобы покрутить 3D кристалл
                    </span>
                </div>
            </div>
        </div>
    );
}

function BigCard({ title, sub, seed, img, i = 0, onClick }: { title: string; sub: string; seed?: string; img?: string; i?: number; onClick: () => void }) {
    return (
        <div onClick={onClick} className="cursor-pointer group w-[185px] shrink-0 rise" style={{ animationDelay: Math.min(i, 10) * 45 + "ms" }}>
            <div className="relative w-[185px] h-[185px] overflow-hidden transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-2xl rounded-2xl bg-white/5">
                {img ? (
                    <img src={img} draggable={false} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                    <Cover seed={seed || title} size="100%" round={16} />
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="accent-bg absolute right-3 bottom-3 w-11 h-11 rounded-full grid place-items-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition duration-300 shadow-xl">
                    <Play size={20} fill="currentColor" />
                </div>
            </div>
            <div className="mt-2.5 font-bold text-sm truncate text-slate-100">{title}</div>
            <div className="text-xs text-white/50 truncate mt-0.5">{sub}</div>
        </div>
    );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: any }) {
    return (
        <div className="rise mb-8">
            <h2 className="text-2xl font-extrabold flex items-center gap-3 mb-4 text-slate-100">
                <Icon size={22} className="text-cyan-400" />
                {title}
            </h2>
            {children}
        </div>
    );
}

const Row = ({ children }: { children: any }) => (
    <div className="flex gap-5 overflow-x-auto pb-4 pt-1" style={{ scrollbarWidth: "none" }}>{children}</div>
);

function MiniRow({ t, list, i }: { t: Track; list: string[]; i: number }) {
    const play = usePlayer((s) => s.play);
    const menu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        useUI.getState().openMenu(e.clientX, e.clientY, t);
    };
    return (
        <div
            onClick={() => play(t.id, list)}
            onContextMenu={menu}
            className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/10 transition rise group"
            style={{ animationDelay: i * 35 + "ms" }}
        >
            <div className="relative rounded-lg overflow-hidden shrink-0">
                <Cover seed={t.id} size={48} round={8} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="truncate font-semibold text-sm group-hover:text-cyan-300 transition">{t.title}</div>
                <div className="truncate text-xs text-white/50">{t.artist}</div>
            </div>
            <span className="text-xs text-white/40 font-mono">{fmt(t.fullSec || t.duration)}</span>
            <MoreVertical size={16} onClick={menu} className="text-white/40 hover:text-white" />
        </div>
    );
}

export function Home() {
    const { play } = usePlayer();
    const x = useX();
    const [chart, setChart] = useState<string[]>([]);
    const [fullTracks, setFullTracks] = useState<string[]>([]);
    const [albums, setAlbums] = useState<Collection[]>([]);
    const [lists, setLists] = useState<Collection[]>([]);
    const [recent, setRecent] = useState<string[]>([]);

    useEffect(() => {
        const rec = getRecent();
        addTracks(rec);
        setRecent(rec.map((r) => r.id));

        // 1. Загружаем полноценные треки Audius (полные песни без ограничений!)
        getAudiusTrending(30).then((au) => {
            if (au.length) {
                addTracks(au);
                setFullTracks(au.map((y) => y.id));
            }
        }).catch(() => {});

        // 2. Загружаем мировой топ чарт
        deezerChart(30)
            .catch(() => searchItunes("top hits", 25))
            .then((l) => {
                addTracks(l);
                setChart(l.map((y) => y.id));
            })
            .catch(() => {});

        // 3. Альбомы и плейлисты
        chartAlbums(20).then(setAlbums).catch(() => {});
        chartPlaylists(20).then(setLists).catch(() => {});
    }, []);

    const open = async (c: Collection) => {
        useUI.getState().say(x("loadingMix"));
        try {
            const l = await collectionTracks(c);
            if (l.length) play(l[0].id, l.map((y) => y.id));
        } catch {
            useUI.getState().say(x("nothing"));
        }
    };

    const local = TRACKS.filter((y) => y.id.startsWith("loc"));
    const panelIds = chart.slice(0, 10);

    return (
        <div className="p-8 pt-10 max-w-7xl mx-auto">
            {/* Интерактивный баннер Моей Волны и 3D льда */}
            <MyWaveHero />

            {/* Недавние треки */}
            {recent.length > 0 && (
                <Section icon={Clock} title="Продолжить прослушивание">
                    <Row>
                        {recent.map((id, i) => {
                            const y = byId(id);
                            return y ? <BigCard key={id} i={i} title={y.title} sub={y.artist} seed={id} onClick={() => play(id, recent)} /> : null;
                        })}
                    </Row>
                </Section>
            )}

            {/* Полноценные треки высокой четкости без 30-секундного ограничения */}
            {fullTracks.length > 0 && (
                <Section icon={Compass} title="Полноценные хиты (Полные треки)">
                    <Row>
                        {fullTracks.slice(0, 20).map((id, i) => {
                            const y = byId(id);
                            return y ? <BigCard key={id} i={i} title={y.title} sub={y.artist} seed={id} onClick={() => play(id, fullTracks)} /> : null;
                        })}
                    </Row>
                </Section>
            )}

            {/* Мировой топ-чарт */}
            {chart.length > 0 && (
                <Section icon={Trophy} title="Самые прослушиваемые треки">
                    <Row>
                        {chart.slice(0, 20).map((id, i) => {
                            const y = byId(id);
                            return y ? <BigCard key={id} i={i} title={y.title} sub={y.artist} seed={id} onClick={() => play(id, chart)} /> : null;
                        })}
                    </Row>
                </Section>
            )}

            {/* Альбомы */}
            {albums.length > 0 && (
                <Section icon={Disc3} title="Топ альбомов">
                    <Row>
                        {albums.map((c, i) => <BigCard key={c.id} i={i} title={c.title} sub={c.sub} img={c.cover} onClick={() => open(c)} />)}
                    </Row>
                </Section>
            )}

            {/* Тренды списком */}
            {panelIds.length > 0 && (
                <Section icon={Flame} title="Сейчас слушают">
                    <div className="p-3 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                        {panelIds.map((id, i) => {
                            const y = byId(id);
                            return y ? <MiniRow key={id} i={i} t={y} list={chart} /> : null;
                        })}
                    </div>
                </Section>
            )}

            {/* Плейлисты */}
            {lists.length > 0 && (
                <Section icon={ListMusic} title="Популярные плейлисты">
                    <Row>
                        {lists.map((c, i) => <BigCard key={c.id} i={i} title={c.title} sub={c.sub} img={c.cover} onClick={() => open(c)} />)}
                    </Row>
                </Section>
            )}

            {/* Локальные файлы */}
            {local.length > 0 && (
                <Section icon={ListMusic} title="Мои загруженные треки">
                    <Row>
                        {local.map((y, i) => <BigCard key={y.id} i={i} title={y.title} sub={y.artist} seed={y.id} onClick={() => play(y.id, local.map((l) => l.id))} />)}
                    </Row>
                </Section>
            )}
        </div>
    );
}

export function Artist() {
    const { artist, back, play } = usePlayer();
    const x = useX();
    const list = TRACKS.filter((y) => y.artist === artist).map((y) => y.id);
    return (
        <div>
            <div className="relative h-72 flex flex-col justify-end p-8" style={{ background: "linear-gradient(to top, rgb(16 16 24), transparent), linear-gradient(135deg, rgb(var(--accent) / 0.5), #1a1030)" }}>
                <button onClick={back} className="absolute top-3 left-5 z-50 chip flex items-center gap-1 px-3 py-1.5 text-sm cursor-pointer"><ChevronLeft size={16} />{x("back")}</button>
                <h1 className="text-6xl font-extrabold flex items-center gap-3 rise" style={{ color: "#fff" }}>{artist}<BadgeCheck className="text-sky-400" size={32} /></h1>
                <button onClick={() => list.length && play(list[0], list)} className="bg-white text-black mt-4 w-fit px-6 py-2 rounded-xl font-semibold flex items-center gap-2 cursor-pointer hover:scale-105 transition"><Play size={16} fill="currentColor" />{x("playBtn")}</button>
            </div>
            <div className="p-8 pt-4">
                <h2 className="text-2xl font-bold mb-3">{x("songs")}</h2>
                <div className="flex flex-col gap-1">
                    {list.map((id, i) => { const y = byId(id); return y ? <TrackRow key={id} t={y} list={list} n={i + 1} /> : null; })}
                </div>
            </div>
        </div>
    );
}
