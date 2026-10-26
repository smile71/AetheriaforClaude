import { MouseEvent } from "react";
import { Heart, MoreVertical } from "lucide-react";
import Cover from "./Cover";
import { Track } from "../data";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";

export const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const x = Math.floor(s % 60);
    return m + ":" + (x < 10 ? "0" + x : x);
};

export default function TrackRow({ t, list, n }: { t: Track; list: string[]; n?: number }) {
    const { play, like, liked, playing, cur, openArtist } = usePlayer();
    const active = cur().id === t.id;
    const menu = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        useUI.getState().openMenu(e.clientX, e.clientY, t);
    };
    return (
        <div onClick={() => play(t.id, list)} onContextMenu={menu} className="chip flex items-center gap-3 p-2 cursor-pointer" style={{ background: active ? "rgb(255 255 255 / 0.1)" : undefined }}>
            {n !== undefined && <span className="w-5 text-center text-sm text-white/40">{n}</span>}
            <Cover seed={t.id} size={44} />
            <div className="flex-1 min-w-0">
                <div className={"truncate " + (active ? "accent-text" : "")}>{t.title}</div>
                <div onClick={(e) => { e.stopPropagation(); openArtist(t.artist); }} className="text-sm text-white/50 truncate hover:underline w-fit">{t.artist}</div>
            </div>
            {t.preview && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">30s</span>}
            {active && playing && (
                <div className="flex items-end gap-0.5 h-4">
                    {[0, 0.2, 0.4].map((d) => <span key={d} className="eq-bar" style={{ animationDelay: d + "s" }} />)}
                </div>
            )}
            <Heart size={16} onClick={(e) => { e.stopPropagation(); like(t.id); }} className={liked.includes(t.id) ? "accent-text" : "text-white/40"} fill={liked.includes(t.id) ? "currentColor" : "none"} />
            <span className="text-sm text-white/50 w-10 text-right">{fmt(t.duration)}</span>
            <MoreVertical size={16} onClick={menu} className="text-white/40 hover:text-white" />
        </div>
    );
}