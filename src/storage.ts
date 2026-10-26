import { get, set } from "idb-keyval";
import { TRACKS } from "./data";

const KEY = "aetheria-local";
type Saved = { id: string; file: Blob; src?: string };

export async function storageInfo() {
    try {
        const saved = ((await get(KEY)) as Saved[]) || [];
        let local = 0;
        let dl = 0;
        for (const s of saved) {
            if (s.src) dl += s.file.size;
            else local += s.file.size;
        }
        return { local, dl, n: saved.length };
    } catch {
        return { local: 0, dl: 0, n: 0 };
    }
}

export async function clearDownloads() {
    const saved = ((await get(KEY)) as Saved[]) || [];
    const keep = saved.filter((s) => !s.src);
    const drop = saved.filter((s) => s.src);
    await set(KEY, keep);
    for (const d of drop) {
        const i = TRACKS.findIndex((t) => t.id === d.id);
        if (i >= 0) TRACKS.splice(i, 1);
    }
}