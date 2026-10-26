export type Mood = "calm" | "energetic" | "dance";

export type Track = {
    id: string;
    title: string;
    artist: string;
    duration: number;
    url?: string;
    cover?: string;
    genre?: string;
    album?: string;
    artistImg?: string;
    preview?: boolean;
    src?: string;
    fullSec?: number;
    tried?: boolean;
};

export const LOCAL_ARTIST = "Local file";
export const TRACKS: Track[] = [];

export function addTracks(list: Track[]) {
    for (const t of list) {
        if (TRACKS.some((x) => x.id === t.id)) continue;
        if (!t.id.startsWith("loc") && t.url && t.url.startsWith("blob:")) {
            t.url = undefined;
            t.preview = true;
        }
        t.tried = false;
        TRACKS.push(t);
    }
}

export function moodOf(t: Track): Mood | undefined {
    const g = (t.genre || "").toLowerCase();
    if (!g) return undefined;
    if (/(dance|electro|house|techno|hip|rap|r&b|trap|phonk|disco)/.test(g)) return "dance";
    if (/(rock|metal|punk|pop|alternative|indie|reggae|latin|country)/.test(g)) return "energetic";
    return "calm";
}