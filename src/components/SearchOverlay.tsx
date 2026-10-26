import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Clock } from "lucide-react";
import { useUI } from "../store/ui";
import { usePlayer } from "../store/player";
import { TRACKS, addTracks } from "../data";
import { searchAll } from "../library";
import { useX } from "../i18n2";
import Cover from "./Cover";
import { fmt } from "./TrackRow";

export default function SearchOverlay() {
    const { search, setSearch, history, addHistory, removeHistory, clearHistory } = useUI();
    const play = usePlayer((s) => s.play);
    const x = useX();
    const [q, setQ] = useState("");
    const [full, setFull] = useState<string[]>([]);
    const [prev, setPrev] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (search) { setQ(""); setFull([]); setPrev([]); }
    }, [search]);

    useEffect(() => {
        if (q.trim().length < 2) { setFull([]); setPrev([]); setBusy(false); return; }
        let live = true;
        setBusy(true);
        const id = setTimeout(() => {
            searchAll(q.trim())
                .then((r) => {
                    if (!live) return;
                    addTracks(r.full);
                    addTracks(r.previews);
                    setFull(r.full.map((y) => y.id));
                    setPrev(r.previews.map((y) => y.id));
                })
                .finally(() => { if (live) setBusy(false); });
        }, 350);
        return () => { live = false; clearTimeout(id); };
    }, [q]);

    const qq = q.trim().toLowerCase();
    const local = qq
        ? TRACKS.filter((y) => y.id.startsWith("loc") && (y.title + " " + y.artist).toLowerCase().includes(qq)).slice(0, 4).map((y) => y.id)
        : [];

    const pick = (id: string, list: string[]) => {
        if (q.trim()) addHistory(q.trim());
        play(id, list);
        setSearch(false);
    };

    const Rows = ({ title, ids }: { title: string; ids: string[] }) => {
        if (!ids.length) return null;
        return (
            <div className="mb-2">
                <div className="text-xs font-semibold text-white/50 px-2 py-1.5">{title}</div>
                {ids.map((id) => {
                    const t = TRACKS.find((y) => y.id === id);
                    if (!t) return null;
                    return (
                        <div key={id} onClick={() => pick(id, ids)} className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition">
                            <Cover seed={id} size={36} round={6} />
                            <div className="flex-1 min-w-0">
                                <div className="truncate text-sm">{t.title}</div>
                                <div className="truncate text-xs text-white/50">{t.artist}</div>
                            </div>
                            {t.preview && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">30s</span>}
                            <span className="text-xs text-white/40 w-9 text-right">{fmt(t.fullSec || t.duration)}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <AnimatePresence>
            {search && (
                <motion.div key="so" className="fixed inset-0 z-[55]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={() => setSearch(false)} />
                    <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none">
                        <motion.div
                            className="panel pointer-events-auto w-[min(680px,92vw)] p-3"
                            initial={{ y: -24, opacity: 0, scale: 0.97 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -24, opacity: 0, scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        >
                            <div className="chip flex items-center gap-3 px-4 py-2.5">
                                <Search size={18} className="text-white/50" />
                                <input
                                    autoFocus
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) addHistory(q.trim()); }}
                                    placeholder={x("searchPh")}
                                    className="bg-transparent outline-none flex-1"
                                />
                                <X size={16} className="cursor-pointer text-white/50 hover:text-white" onClick={() => (q ? setQ("") : setSearch(false))} />
                            </div>

                            <div className="mt-3 max-h-[60vh] overflow-y-auto">
                                {!q.trim() && (
                                    history.length > 0 ? (
                                        <div>
                                            <div className="flex items-center justify-between px-2 py-1.5">
                                                <span className="text-xs font-semibold text-white/50">{x("searchRecent")}</span>
                                                <button onClick={clearHistory} className="text-xs text-white/50 hover:text-white">{x("clearAll")}</button>
                                            </div>
                                            {history.map((h) => (
                                                <div key={h} onClick={() => setQ(h)} className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition">
                                                    <Clock size={15} className="text-white/40" />
                                                    <span className="flex-1 text-sm truncate">{h}</span>
                                                    <X size={14} onClick={(e) => { e.stopPropagation(); removeHistory(h); }} className="text-white/40 hover:text-white" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-white/40 px-2 py-4">{x("searchHint")}</div>
                                    )
                                )}

                                {q.trim() && (
                                    <>
                                        <Rows title={x("mine")} ids={local} />
                                        <Rows title={x("fullTracks")} ids={full.slice(0, 6)} />
                                        <Rows title={x("previews")} ids={prev.slice(0, 8)} />
                                        {busy && <div className="text-sm text-white/40 px-2 py-3">{x("searching")}</div>}
                                        {!busy && q.trim().length >= 2 && !local.length && !full.length && !prev.length && (
                                            <div className="text-sm text-white/40 px-2 py-3">{x("nothing")}</div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}