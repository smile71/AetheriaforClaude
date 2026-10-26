import { useState } from "react";
import { Heart, Trash2, ChevronLeft, X, LayoutGrid, List, Search, Plus, Play, ArrowUpDown } from "lucide-react";
import { TRACKS, LOCAL_ARTIST, Track } from "../data";
import { usePlayer } from "../store/player";
import { usePlaylists } from "../store/playlists";
import { useUI } from "../store/ui";
import { addFiles } from "../library";
import { useX } from "../i18n2";
import TrackRow from "../components/TrackRow";
import Cover from "../components/Cover";

const byId = (id: string) => TRACKS.find((y) => y.id === id);

type Entry = { key: string; title: string; sub: string; seed: string; heart?: boolean; onClick: () => void; onDelete?: () => void };
type Tab = "all" | "full" | "playlists" | "artists" | "albums" | "files";
type SortMode = "default" | "title" | "artist" | "duration";

function Art({ e, size }: { e: Entry; size: number | string }) {
    if (e.heart) {
        return (
            <div className="w-full h-full grid place-items-center shadow-lg" style={{ background: "linear-gradient(135deg, #e11d48, #4c0519)", color: "rgba(255,255,255,0.9)", borderRadius: 16 }}>
                <Heart size={56} fill="currentColor" />
            </div>
        );
    }
    return <Cover seed={e.seed} size={size} round={16} />;
}

export function LibraryPage() {
    const { liked, play } = usePlayer();
    const lists = usePlaylists((s) => s.lists);
    const [, bump] = useState(0);
    const [tab, setTab] = useState<Tab>("all");
    const [grid, setGrid] = useState(true);
    const [q, setQ] = useState("");
    const [sort, setSort] = useState<SortMode>("default");
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");

    const onFiles = async (fl: FileList | null) => {
        if (!fl) return;
        await addFiles(Array.from(fl));
        bump((n) => n + 1);
    };

    const local = TRACKS.filter((y) => y.id.startsWith("loc"));
    const fullTracks = TRACKS.filter((y) => !y.preview);
    const likedList = liked.filter((id) => byId(id));

    const likedEntry: Entry = {
        key: "liked",
        title: "Любимые треки",
        sub: likedList.length + " треков",
        seed: "liked",
        heart: true,
        onClick: () => useUI.getState().openPlaylist("liked"),
    };

    const plEntries: Entry[] = lists.map((l) => ({
        key: l.id,
        title: l.name,
        sub: l.ids.length + " треков",
        seed: l.ids[0] || l.id,
        onClick: () => useUI.getState().openPlaylist(l.id),
        onDelete: () => usePlaylists.getState().remove(l.id),
    }));

    const fileEntries: Entry[] = local.map((y) => ({
        key: y.id,
        title: y.title,
        sub: y.artist,
        seed: y.id,
        onClick: () => usePlayer.getState().play(y.id, local.map((z) => z.id)),
    }));

    // Полноценные треки
    const fullEntries: Entry[] = fullTracks.map((y) => ({
        key: y.id,
        title: y.title,
        sub: y.artist,
        seed: y.id,
        onClick: () => usePlayer.getState().play(y.id, fullTracks.map((z) => z.id)),
    }));

    // Уникальные исполнители
    const names: string[] = [];
    for (const y of [...local, ...fullTracks, ...likedList.map(byId)]) {
        if (y && y.artist !== LOCAL_ARTIST && !names.includes(y.artist)) names.push(y.artist);
    }
    const artistEntries: Entry[] = names.map((a) => {
        const first = TRACKS.find((y) => y.artist === a);
        return { key: "a" + a, title: a, sub: "Исполнитель", seed: first ? first.id : a, onClick: () => usePlayer.getState().openArtist(a) };
    });

    // Уникальные альбомы
    const albumMap = new Map<string, Track[]>();
    for (const y of [...local, ...fullTracks, ...likedList.map(byId)]) {
        if (y && y.album) {
            const list = albumMap.get(y.album) || [];
            list.push(y);
            albumMap.set(y.album, list);
        }
    }
    const albumEntries: Entry[] = Array.from(albumMap.entries()).map(([alb, trs]) => ({
        key: "alb_" + alb,
        title: alb,
        sub: trs[0].artist + " · " + trs.length + " треков",
        seed: trs[0].id,
        onClick: () => play(trs[0].id, trs.map((t) => t.id)),
    }));

    let entries: Entry[] = [];
    if (tab === "all") entries = [likedEntry, ...plEntries, ...fullEntries, ...fileEntries];
    if (tab === "full") entries = fullEntries;
    if (tab === "playlists") entries = [likedEntry, ...plEntries];
    if (tab === "artists") entries = artistEntries;
    if (tab === "albums") entries = albumEntries;
    if (tab === "files") entries = fileEntries;

    // Фильтрация поиска
    entries = entries.filter((e) => (e.title + " " + e.sub).toLowerCase().includes(q.toLowerCase()));

    // Сортировка
    if (sort === "title") entries.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "artist") entries.sort((a, b) => a.sub.localeCompare(b.sub));

    const create = () => {
        if (!name.trim()) return;
        usePlaylists.getState().create(name.trim());
        setName("");
        setCreating(false);
    };

    const tabs: [Tab, string][] = [
        ["all", "Все"],
        ["full", "Полные треки"],
        ["playlists", "Плейлисты"],
        ["artists", "Исполнители"],
        ["albums", "Альбомы"],
        ["files", "Локальные"],
    ];
    const folderProps = { webkitdirectory: "" } as any;

    return (
        <div className="p-8 pt-10 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight mb-1 text-white">Моя Медиатека</h1>
                    <p className="text-sm text-slate-400">Ваши понравившиеся треки, плейлисты и исполнители</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCreating(!creating)}
                        className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg hover:scale-105"
                        style={{ background: "#fff", color: "#000" }}
                    >
                        <Plus size={16} /> Создать плейлист
                    </button>
                </div>
            </div>

            {/* Панель фильтров, табов и поиска */}
            <div className="flex items-center gap-2 flex-wrap mb-7 bg-white/[0.03] p-2 rounded-2xl border border-white/5 backdrop-blur-md">
                {tabs.map(([k, l]) => (
                    <button
                        key={k}
                        onClick={() => setTab(k)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            tab === k
                                ? "bg-white text-black shadow-lg"
                                : "text-slate-300 hover:text-white hover:bg-white/10"
                        }`}
                    >
                        {l}
                    </button>
                ))}

                <div className="flex-1" />

                {/* Поиск по библиотеке */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                    <Search size={14} className="text-white/40" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Поиск по библиотеке..."
                        className="bg-transparent outline-none text-xs w-36 sm:w-48 text-white placeholder-white/40"
                    />
                </div>

                {/* Сортировка */}
                <button
                    onClick={() => setSort(sort === "default" ? "title" : sort === "title" ? "artist" : "default")}
                    title={`Сортировка: ${sort === "title" ? "по названию" : sort === "artist" ? "по артисту" : "по умолчанию"}`}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white cursor-pointer"
                >
                    <ArrowUpDown size={15} />
                </button>

                {/* Переключатель сетка / список */}
                <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5">
                    <button onClick={() => setGrid(true)} className={`p-1.5 rounded-lg cursor-pointer ${grid ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}><LayoutGrid size={15} /></button>
                    <button onClick={() => setGrid(false)} className={`p-1.5 rounded-lg cursor-pointer ${!grid ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}><List size={15} /></button>
                </div>
            </div>

            {creating && (
                <div className="flex gap-2 mb-6 max-w-md bg-white/5 p-3 rounded-2xl border border-white/10">
                    <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="Название плейлиста" className="px-4 py-2 flex-1 outline-none text-sm bg-black/40 rounded-xl border border-white/10" />
                    <button onClick={create} className="accent-bg px-5 rounded-xl font-bold text-sm cursor-pointer shadow-md">Создать</button>
                </div>
            )}

            {tab === "files" && (
                <div className="flex gap-3 mb-6">
                    <label className="accent-bg px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-lg hover:scale-105 transition">
                        Добавить треки с ПК
                        <input type="file" multiple accept="audio/*" className="hidden" onChange={(e) => onFiles(e.target.files)} />
                    </label>
                    <label className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer transition">
                        Добавить папку
                        <input type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} {...folderProps} />
                    </label>
                </div>
            )}

            {grid ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 24 }}>
                    {entries.map((e) => (
                        <div key={e.key} className="group min-w-0 cursor-pointer" onClick={e.onClick}>
                            <div className="relative aspect-square w-full overflow-hidden transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl rounded-2xl bg-white/5">
                                <Art e={e} size="100%" />
                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="accent-bg absolute right-3 bottom-3 w-11 h-11 rounded-full grid place-items-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition duration-300 shadow-xl">
                                    <Play size={20} fill="currentColor" />
                                </div>
                                {e.onDelete && (
                                    <Trash2 size={18} onClick={(ev) => { ev.stopPropagation(); e.onDelete!(); }} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition text-rose-400 hover:text-rose-200" />
                                )}
                            </div>
                            <div className="mt-3 font-bold text-sm truncate text-slate-100 group-hover:text-cyan-300 transition">{e.title}</div>
                            <div className="text-xs text-white/50 truncate mt-0.5">{e.sub}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {entries.map((e) => (
                        <div key={e.key} onClick={e.onClick} className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer hover:bg-white/10 transition border border-transparent hover:border-white/5">
                            <div style={{ width: 52, height: 52 }} className="shrink-0"><Art e={e} size={52} /></div>
                            <div className="flex-1 min-w-0">
                                <div className="truncate font-semibold text-sm">{e.title}</div>
                                <div className="truncate text-xs text-white/50 mt-0.5">{e.sub}</div>
                            </div>
                            {e.onDelete && (
                                <Trash2 size={18} onClick={(ev) => { ev.stopPropagation(); e.onDelete!(); }} className="text-white/40 hover:text-rose-400 transition" />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {entries.length === 0 && (
                <div className="text-center py-16 text-white/40 text-sm">
                    {tab === "files" ? "Локальные файлы пока не добавлены" : "Ничего не найдено"}
                </div>
            )}
        </div>
    );
}

export function PlaylistPage() {
    const x = useX();
    const id = useUI((s) => s.pl);
    const lists = usePlaylists((s) => s.lists);
    const liked = usePlayer((s) => s.liked);
    const back = usePlayer((s) => s.back);
    const [q, setQ] = useState("");

    const isLiked = id === "liked";
    const pl = lists.find((l) => l.id === id);
    if (!isLiked && !pl) return <div className="p-8 pt-12 text-white/50">{x("empty")}</div>;

    const name = isLiked ? "Любимые треки" : pl!.name;
    const ids = (isLiked ? liked : pl!.ids).filter((tid) => byId(tid));
    const shown = ids.filter((tid) => {
        const tr = byId(tid);
        return tr ? (tr.title + " " + tr.artist).toLowerCase().includes(q.toLowerCase()) : false;
    });
    const remove = (tid: string) => (isLiked ? usePlayer.getState().like(tid) : usePlaylists.getState().removeFrom(id, tid));

    return (
        <div className="p-8 pt-10 max-w-7xl mx-auto">
            <button onClick={back} className="chip flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold mb-5 cursor-pointer hover:bg-white/10 transition">
                <ChevronLeft size={16} /> Назад
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 mb-8">
                <div className="w-44 h-44 rounded-2xl overflow-hidden shadow-2xl bg-white/5 shrink-0 flex items-center justify-center" style={{ background: isLiked ? "linear-gradient(135deg, #e11d48, #4c0519)" : undefined }}>
                    {isLiked ? <Heart size={64} className="text-white" fill="currentColor" /> : <Cover seed={ids[0] || id} size={176} round={16} />}
                </div>

                <div className="flex-1 min-w-0">
                    <span className="text-xs uppercase font-bold tracking-wider text-cyan-400">Плейлист</span>
                    <h1 className="text-4xl sm:text-5xl font-black mt-1 mb-2 text-white truncate">{name}</h1>
                    <div className="text-sm text-white/50">{ids.length} треков в плейлисте</div>
                </div>
            </div>

            <div className="flex gap-3 mb-6 items-center">
                <button
                    onClick={() => ids.length && usePlayer.getState().play(ids[0], ids)}
                    className="accent-bg px-7 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-pointer shadow-xl hover:scale-105 transition"
                >
                    <Play size={16} fill="currentColor" /> Слушать плейлист
                </button>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 w-full max-w-md">
                    <Search size={16} className="text-white/40" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск в плейлисте..." className="bg-transparent outline-none text-sm w-full text-white placeholder-white/40" />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                {shown.map((tid) => {
                    const tr = byId(tid);
                    return tr ? (
                        <div key={tid} className="flex items-center gap-3 group p-1 rounded-2xl hover:bg-white/[0.04] transition">
                            <div className="flex-1 min-w-0"><TrackRow t={tr} list={ids} /></div>
                            <button onClick={() => remove(tid)} className="p-2 text-white/30 hover:text-rose-400 transition cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                    ) : null;
                })}
            </div>
            {ids.length === 0 && <div className="text-white/40 py-8 text-center">Плейлист пока пуст</div>}
        </div>
    );
}


