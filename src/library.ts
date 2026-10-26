import { get, set } from "idb-keyval";
import { invoke } from "@tauri-apps/api/core";
import { addTracks, LOCAL_ARTIST, Track } from "./data";

type Saved = { id: string; title: string; artist: string; file: Blob; cover?: string; src?: string };
const KEY = "aetheria-local";
const APP = "Aetheria";

export async function getJson(url: string): Promise<any> {
    const buf = await invoke<ArrayBuffer>("fetch_bytes", { url });
    return JSON.parse(new TextDecoder().decode(buf));
}

export function fromDeezer(x: any): Track {
    return {
        id: "dz" + x.id,
        title: x.title,
        artist: x.artist ? x.artist.name : "",
        duration: x.duration || 180,
        fullSec: x.duration || 180,
        url: x.preview,
        cover: x.album ? x.album.cover_xl || x.album.cover_big || x.album.cover_medium : undefined,
        album: x.album ? x.album.title : undefined,
        artistImg: x.artist ? x.artist.picture_medium : undefined,
        preview: true,
    };
}

// Полноценный поиск по миллионам треков Audius (полные песни без лимита 30 сек)
export async function searchAudius(q: string, limit = 30): Promise<Track[]> {
    try {
        const r = await fetch(
            "https://api.audius.co/v1/tracks/search?app_name=" + APP + "&limit=" + limit + "&query=" + encodeURIComponent(q)
        );
        const j = await r.json();
        return (j.data || [])
            .filter((x: any) => x.is_streamable !== false)
            .map((x: any) => ({
                id: "au" + x.id,
                title: x.title,
                artist: x.user && x.user.name ? x.user.name : "Audius Artist",
                duration: x.duration || 0,
                fullSec: x.duration || 0,
                url: "https://api.audius.co/v1/tracks/" + x.id + "/stream?app_name=" + APP,
                cover: x.artwork ? x.artwork["480x480"] || x.artwork["150x150"] : undefined,
                artistImg: x.user && x.user.profile_picture ? x.user.profile_picture["150x150"] : undefined,
                genre: x.genre,
                preview: false, // ПОЛНЫЙ ТРЕК!
            }));
    } catch {
        return [];
    }
}

// Трендовые полные треки Audius для главной библиотеки (как в Spotify)
export async function getAudiusTrending(limit = 40): Promise<Track[]> {
    try {
        const r = await fetch(
            "https://api.audius.co/v1/tracks/trending?app_name=" + APP + "&limit=" + limit
        );
        const j = await r.json();
        return (j.data || [])
            .filter((x: any) => x.is_streamable !== false)
            .map((x: any) => ({
                id: "au" + x.id,
                title: x.title,
                artist: x.user && x.user.name ? x.user.name : "Audius Artist",
                duration: x.duration || 0,
                fullSec: x.duration || 0,
                url: "https://api.audius.co/v1/tracks/" + x.id + "/stream?app_name=" + APP,
                cover: x.artwork ? x.artwork["480x480"] || x.artwork["150x150"] : undefined,
                artistImg: x.user && x.user.profile_picture ? x.user.profile_picture["150x150"] : undefined,
                genre: x.genre,
                preview: false, // ПОЛНЫЙ ТРЕК!
            }));
    } catch {
        return [];
    }
}

export async function searchDeezer(q: string, limit = 25): Promise<Track[]> {
    try {
        const j = await getJson("https://api.deezer.com/search?limit=" + limit + "&q=" + encodeURIComponent(q));
        return (j.data || []).map(fromDeezer);
    } catch {
        return [];
    }
}

export async function deezerChart(limit = 40): Promise<Track[]> {
    try {
        const j = await getJson("https://api.deezer.com/chart/0/tracks?limit=" + limit);
        return (j.data || []).map(fromDeezer);
    } catch {
        return [];
    }
}

export async function searchItunes(q: string, limit = 25): Promise<Track[]> {
    try {
        const r = await fetch(
            "https://itunes.apple.com/search?media=music&entity=song&limit=" + limit + "&term=" + encodeURIComponent(q)
        );
        const j = await r.json();
        return (j.results || [])
            .map((x: any) => ({
                id: "it" + x.trackId,
                title: x.trackName,
                artist: x.artistName,
                duration: x.trackTimeMillis ? Math.round(x.trackTimeMillis / 1000) : 180,
                fullSec: x.trackTimeMillis ? Math.round(x.trackTimeMillis / 1000) : 180,
                url: x.previewUrl,
                cover: String(x.artworkUrl100 || "").replace("100x100", "400x400"),
                album: x.collectionName,
                genre: x.primaryGenreName,
                preview: true,
            }));
    } catch {
        return [];
    }
}

// Комбинированный глобальный поиск: сначала полные треки, затем мировой каталог
export async function searchAll(q: string): Promise<{ full: Track[]; previews: Track[] }> {
    const [audRes, dzRes] = await Promise.allSettled([searchAudius(q, 30), searchDeezer(q, 30)]);
    const full = audRes.status === "fulfilled" ? audRes.value : [];
    let previews = dzRes.status === "fulfilled" ? dzRes.value : [];
    if (!previews.length) {
        try { previews = await searchItunes(q, 25); } catch { /* offline */ }
    }
    return { full, previews };
}

function parseName(name: string) {
    const base = name.replace(/\.[^.]+$/, "");
    const i = base.indexOf(" - ");
    if (i > 0) return { artist: base.slice(0, i).trim(), title: base.slice(i + 3).trim() };
    return { artist: LOCAL_ARTIST, title: base };
}

function probe(url: string): Promise<number> {
    return new Promise((res) => {
        const a = new Audio();
        a.preload = "metadata";
        a.onloadedmetadata = () => res(isFinite(a.duration) ? a.duration : 0);
        a.onerror = () => res(0);
        a.src = url;
    });
}

async function build(saved: Saved[]): Promise<Track[]> {
    const list: Track[] = saved.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        duration: 0,
        cover: s.cover,
        src: s.src,
        url: URL.createObjectURL(s.file),
    }));
    await Promise.all(list.map(async (t) => { t.duration = await probe(t.url as string); }));
    addTracks(list);
    return list;
}

export async function loadLocal(): Promise<Track[]> {
    try {
        const saved = ((await get(KEY)) as Saved[]) || [];
        return await build(saved);
    } catch (e) {
        console.warn("library", e);
        return [];
    }
}

export async function addFiles(files: File[]): Promise<Track[]> {
    const audio = files.filter((f) => f.type.startsWith("audio/") || /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(f.name));
    const saved: Saved[] = audio.map((f, i) => {
        const p = parseName(f.name);
        return { id: "loc" + Date.now() + "-" + i, title: p.title, artist: p.artist, file: f };
    });
    try {
        const old = ((await get(KEY)) as Saved[]) || [];
        await set(KEY, [...old, ...saved]);
    } catch (e) {
        console.warn("save", e);
    }
    return build(saved);
}

export async function downloadTrack(t: Track): Promise<void> {
    if (!t.url) throw new Error("no url");
    const buf = await invoke<ArrayBuffer>("fetch_bytes", { url: t.url });
    const saved: Saved = {
        id: "loc" + Date.now() + "-dl",
        title: t.title,
        artist: t.artist,
        file: new Blob([buf], { type: "audio/mpeg" }),
        cover: t.cover,
        src: t.id,
    };
    const old = ((await get(KEY)) as Saved[]) || [];
    await set(KEY, [...old, saved]);
    await build([saved]);
}
