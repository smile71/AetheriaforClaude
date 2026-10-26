import { useEffect, useState } from "react";
import { ListPlus, ListEnd, Play, User, Heart, Download, Plus } from "lucide-react";
import { LOCAL_ARTIST, TRACKS } from "../data";
import { usePlayer } from "../store/player";
import { usePlaylists } from "../store/playlists";
import { useUI } from "../store/ui";
import { downloadTrack } from "../library";
import { useT } from "../i18n";

function Item({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
    return (
        <div onClick={onClick} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/10 text-sm">
            <Icon size={16} /> {label}
        </div>
    );
}

export default function Dialogs() {
    const { menu, picker, closeMenu, closePicker, openPicker, toast, say } = useUI();
    const player = usePlayer();
    const lists = usePlaylists((s) => s.lists);
    const t = useT();
    const [name, setName] = useState("");

    useEffect(() => {
        const k = (e: KeyboardEvent) => {
            if (e.code === "Escape") {
                useUI.getState().closeMenu();
                useUI.getState().closePicker();
            }
        };
        window.addEventListener("keydown", k);
        return () => window.removeEventListener("keydown", k);
    }, []);

    const track = menu ? menu.t : null;
    const done = track ? TRACKS.some((x) => x.src === track.id) : false;
    const can = track ? track.id.startsWith("au") && !done : false;

    const download = () => {
        if (!track) return;
        const tr = track;
        closeMenu();
        say(t("downloading"));
        downloadTrack(tr)
            .then(() => { say(t("downloaded")); usePlayer.setState({}); })
            .catch(() => say(t("dlError")));
    };

    const addTo = (id: string) => {
        if (!picker) return;
        usePlaylists.getState().addTo(id, picker);
        say(t("added"));
        closePicker();
    };

    const createAndAdd = () => {
        if (!picker || !name.trim()) return;
        const id = usePlaylists.getState().create(name.trim());
        setName("");
        addTo(id);
    };

    return (
        <>
            {menu && track && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={closeMenu} onContextMenu={(e) => { e.preventDefault(); closeMenu(); }} />
                    <div className="panel fixed z-[61] p-1.5 w-60" style={{ left: Math.min(menu.x, window.innerWidth - 250), top: Math.min(menu.y, window.innerHeight - 290), background: "rgb(24 24 34 / 0.97)", color: "#fff" }}>
                        <Item icon={Play} label={t("playNext")} onClick={() => { player.enqueue(track.id, true); closeMenu(); }} />
                        <Item icon={ListEnd} label={t("addToQueue")} onClick={() => { player.enqueue(track.id, false); closeMenu(); }} />
                        <Item icon={ListPlus} label={t("addToPlaylist")} onClick={() => openPicker(track)} />
                        <Item icon={Heart} label={player.liked.includes(track.id) ? t("unlike") : t("like")} onClick={() => { player.like(track.id); closeMenu(); }} />
                        {track.artist !== LOCAL_ARTIST && <Item icon={User} label={t("goArtist")} onClick={() => { player.openArtist(track.artist); closeMenu(); }} />}
                        {can && <Item icon={Download} label={t("download")} onClick={download} />}
                        {done && <div className="px-3 py-2 text-sm" style={{ opacity: 0.5 }}>{t("downloaded")}</div>}
                    </div>
                </>
            )}

            {picker && (
                <div className="fixed inset-0 z-[62] grid place-items-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={closePicker}>
                    <div className="panel p-5 w-96 max-h-[80%] overflow-y-auto" style={{ background: "rgb(24 24 34 / 0.98)", color: "#fff" }} onClick={(e) => e.stopPropagation()}>
                        <div className="font-bold text-lg mb-1">{t("addToPlaylist")}</div>
                        <div className="text-sm mb-4 truncate" style={{ opacity: 0.6 }}>{picker.title + " - " + picker.artist}</div>
                        <div className="flex flex-col gap-1 mb-4">
                            {lists.map((l) => (
                                <div key={l.id} onClick={() => addTo(l.id)} className="chip px-3 py-2 cursor-pointer flex justify-between">
                                    <span className="truncate">{l.name}</span>
                                    <span style={{ opacity: 0.5 }}>{l.ids.length}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createAndAdd()} placeholder={t("playlistName")} className="chip px-3 py-2 flex-1 outline-none text-sm" />
                            <button onClick={createAndAdd} className="accent-bg px-3 rounded-xl font-semibold text-sm flex items-center gap-1"><Plus size={14} />{t("create")}</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-full text-sm" style={{ background: "rgb(30 30 42)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}>
                    {toast}
                </div>
            )}
        </>
    );
}