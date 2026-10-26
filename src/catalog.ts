import { addTracks, Track } from "./data";
import { getJson, fromDeezer } from "./library";
import { usePlayer } from "./store/player";

export type Collection = { id: string; title: string; sub: string; cover: string; kind: "album" | "playlist" };

export async function chartAlbums(limit = 20): Promise<Collection[]> {
    const j = await getJson("https://api.deezer.com/chart/0/albums?limit=" + limit);
    return (j.data || []).map((x: any) => ({
        id: String(x.id),
        title: x.title,
        sub: x.artist ? x.artist.name : "",
        cover: x.cover_big || x.cover_medium || "",
        kind: "album",
    }));
}

export async function chartPlaylists(limit = 20): Promise<Collection[]> {
    const j = await getJson("https://api.deezer.com/chart/0/playlists?limit=" + limit);
    return (j.data || []).map((x: any) => ({
        id: String(x.id),
        title: x.title,
        sub: x.user ? x.user.name : "Deezer",
        cover: x.picture_big || x.picture_medium || "",
        kind: "playlist",
    }));
}

export async function collectionTracks(c: Collection): Promise<Track[]> {
    const j = await getJson("https://api.deezer.com/" + c.kind + "/" + c.id + "/tracks?limit=100");
    const list: Track[] = (j.data || [])
        .filter((x: any) => x.preview)
        .map((x: any) => {
            const t = fromDeezer(x);
            if (c.kind === "album") {
                t.cover = c.cover;
                t.album = c.title;
            }
            return t;
        });
    addTracks(list);
    return list;
}

const KEY = "aetheria-recent";

export function getRecent(): Track[] {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

let last = "";
usePlayer.subscribe((s) => {
    if (!s.playing) return;
    const t = s.cur();
    if (t.id === "none" || t.id === last) return;
    last = t.id;
    if (t.id.startsWith("loc")) return;
    const snap = { ...t, tried: false };
    const list = [snap, ...getRecent().filter((x) => x.id !== t.id)].slice(0, 12);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
});