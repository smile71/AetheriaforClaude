import { create } from "zustand";
import { Track } from "../data";
import { usePlayer } from "./player";

const HKEY = "aetheria-search-history";

function loadHist(): string[] {
    try { return JSON.parse(localStorage.getItem(HKEY) || "[]"); } catch { return []; }
}
function saveHist(h: string[]) {
    try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch { /* ignore */ }
}

type S = {
    full: boolean; setFull: (v: boolean) => void;
    search: boolean; setSearch: (v: boolean) => void;
    history: string[]; addHistory: (q: string) => void; removeHistory: (q: string) => void; clearHistory: () => void;
    menu: { x: number; y: number; t: Track } | null;
    picker: Track | null;
    pl: string;
    toast: string;
    dcState: string; setDcState: (s: string) => void;
    openMenu: (x: number, y: number, t: Track) => void;
    closeMenu: () => void;
    openPicker: (t: Track) => void;
    closePicker: () => void;
    openPlaylist: (id: string) => void;
    say: (m: string) => void;
};

let timer: ReturnType<typeof setTimeout> | undefined;

export const useUI = create<S>((set, get) => ({
    full: false,
    setFull: (full) => set({ full }),
    search: false,
    setSearch: (search) => set({ search }),
    history: loadHist(),
    addHistory: (q) => {
        const h = [q, ...get().history.filter((x) => x !== q)].slice(0, 12);
        saveHist(h);
        set({ history: h });
    },
    removeHistory: (q) => {
        const h = get().history.filter((x) => x !== q);
        saveHist(h);
        set({ history: h });
    },
    clearHistory: () => {
        saveHist([]);
        set({ history: [] });
    },
    menu: null,
    picker: null,
    pl: "",
    toast: "",
    dcState: "off",
    setDcState: (dcState) => set({ dcState }),
    openMenu: (x, y, t) => set({ menu: { x, y, t } }),
    closeMenu: () => set({ menu: null }),
    openPicker: (t) => set({ picker: t, menu: null }),
    closePicker: () => set({ picker: null }),
    openPlaylist: (pl) => {
        set({ pl });
        usePlayer.getState().go("playlist");
    },
    say: (toast) => {
        set({ toast });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => set({ toast: "" }), 2500);
    },
}));