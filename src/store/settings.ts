import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "auto" | "dark" | "light";
export type Lang = "ru" | "en" | "de" | "es" | "fr" | "it" | "pt" | "pl" | "tr" | "uk" | "ja";

export type Dc = {
    format: "artist" | "track" | "app";
    progress: boolean;
    cover: boolean;
    artistImg: boolean;
    pause: boolean;
    buttons: boolean;
};

export const DEFAULT_DC: Dc = { format: "artist", progress: true, cover: true, artistImg: true, pause: true, buttons: false };

export const LANGS: [Lang, string][] = [
    ["ru", "Русский"], ["en", "English"], ["de", "Deutsch"], ["es", "Español"], ["fr", "Français"], ["it", "Italiano"],
    ["pt", "Português"], ["pl", "Polski"], ["tr", "Türkçe"], ["uk", "Українська"], ["ja", "日本語"],
];

export const LOGOS = [
    { id: "main", name: "Main" },
    { id: "v1", name: "1" }, { id: "v2", name: "2" }, { id: "v3", name: "3" }, { id: "v4", name: "4" }, { id: "v5", name: "5" },
    { id: "v6", name: "6" }, { id: "v7", name: "7" }, { id: "v8", name: "8" }, { id: "v9", name: "9" }, { id: "v10", name: "10" },
];

export const DEFAULT_KEYS: Record<string, string> = {
    play: "Control+Alt+Space",
    next: "Control+Alt+Right",
    prev: "Control+Alt+Left",
    like: "Control+Alt+L",
};

const loadBg = () => {
    try { return localStorage.getItem("aetheria-bg") || ""; } catch { return ""; }
};

type S = {
    theme: Theme; lang: Lang; appLogo: string; taskbarLogo: string;
    bg: string; bgDim: number; ambient: boolean;
    hotkeys: Record<string, string>; discordOn: boolean; discordId: string; dc: Dc;
    setTheme: (t: Theme) => void; setLang: (l: Lang) => void;
    setAppLogo: (l: string) => void; setTaskbarLogo: (l: string) => void;
    setBg: (b: string) => boolean; setBgDim: (d: number) => void; setAmbient: (a: boolean) => void;
    setHotkey: (action: string, key: string) => void; resetHotkeys: () => void;
    setDiscordOn: (v: boolean) => void; setDiscordId: (v: string) => void; setDc: (p: Partial<Dc>) => void;
};

export const useSettings = create<S>()(
    persist(
        (set) => ({
            theme: "auto", lang: "ru", appLogo: "main", taskbarLogo: "main",
            bg: loadBg(), bgDim: 0.55, ambient: true,
            hotkeys: { ...DEFAULT_KEYS }, discordOn: false, discordId: "", dc: { ...DEFAULT_DC },
            setTheme: (theme) => set({ theme }),
            setLang: (lang) => set({ lang }),
            setAppLogo: (appLogo) => set({ appLogo }),
            setTaskbarLogo: (taskbarLogo) => set({ taskbarLogo }),
            setBg: (bg) => {
                set({ bg });
                try {
                    if (bg) localStorage.setItem("aetheria-bg", bg);
                    else localStorage.removeItem("aetheria-bg");
                    return true;
                } catch {
                    return false;
                }
            },
            setBgDim: (bgDim) => set({ bgDim }),
            setAmbient: (ambient) => set({ ambient }),
            setHotkey: (action, key) => set((s) => ({ hotkeys: { ...s.hotkeys, [action]: key } })),
            resetHotkeys: () => set({ hotkeys: { ...DEFAULT_KEYS } }),
            setDiscordOn: (discordOn) => set({ discordOn }),
            setDiscordId: (discordId) => set({ discordId }),
            setDc: (p) => set((s) => ({ dc: { ...s.dc, ...p } })),
        }),
        {
            name: "aetheria-settings",
            partialize: (s) => ({
                theme: s.theme, lang: s.lang, appLogo: s.appLogo, taskbarLogo: s.taskbarLogo,
                bgDim: s.bgDim, ambient: s.ambient, hotkeys: s.hotkeys,
                discordOn: s.discordOn, discordId: s.discordId, dc: s.dc,
            }),
        }
    )
);