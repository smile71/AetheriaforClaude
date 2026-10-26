import { create } from "zustand";
import { TRACKS, moodOf, Track } from "../data";
import { usePlaylists, reorder } from "./playlists";
import { resolveFull } from "../sources";

type Repeat = "off" | "all" | "one";
type Page = "home" | "search" | "library" | "settings" | "artist" | "import" | "ai" | "playlist";
type Panel = "none" | "queue" | "lyrics";

// Per-day listening log: total seconds, seconds per artist, seconds per track id.
export type DayLog = { s: number; a: Record<string, number>; t: Record<string, number> };
export type Stats = { days: Record<string, DayLog>; info: Record<string, [string, string]>; plays: Record<string, number> };

// Seconds of listening it takes to fully melt the ice (2 hours).
export const ICE_TOTAL = 7200;

const EMPTY: Track = { id: "none", title: "Nothing is playing", artist: "Search for music", duration: 0 };
const SKEY = "aetheria-stats";
const IKEY = "aetheria-ice";
const LAKEY = "aetheria-liked-at";

const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
export const dayKey = (d = new Date()) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

function loadLiked(): string[] {
    try { return JSON.parse(localStorage.getItem("aetheria-liked") || "[]"); } catch { return []; }
}

function loadLikedAt(): Record<string, number> {
    try { return JSON.parse(localStorage.getItem(LAKEY) || "{}"); } catch { return {}; }
}

function loadStats(): Stats {
    const empty: Stats = { days: {}, info: {}, plays: {} };
    try {
        const s = { ...empty, ...JSON.parse(localStorage.getItem(SKEY) || "{}") } as Stats;
        // Keep the log small: drop days older than 60 days.
        const cut = new Date();
        cut.setDate(cut.getDate() - 60);
        const min = dayKey(cut);
        for (const k of Object.keys(s.days)) if (k < min) delete s.days[k];
        return s;
    } catch {
        return empty;
    }
}

function loadIce(): { sec: number; melts: number } {
    try {
        const v = JSON.parse(localStorage.getItem(IKEY) || "{}");
        return { sec: Math.min(ICE_TOTAL - 1, Number(v.sec) || 0), melts: Number(v.melts) || 0 };
    } catch {
        return { sec: 0, melts: 0 };
    }
}

const ice0 = loadIce();

const audio = new Audio();
audio.volume = 0.8;
(audio as any).preservesPitch = true;

type S = {
    queue: string[]; index: number; playing: boolean; position: number;
    volume: number; repeat: Repeat; shuffle: boolean; liked: string[];
    rate: number; n: number;
    page: Page; artist: string; history: Page[]; panel: Panel;
    cur: () => Track;
    toggle: () => void; next: () => void; prev: () => void;
    play: (id: string, queue?: string[]) => void;
    enqueue: (id: string, next: boolean) => void;
    seek: (s: number) => void; setVolume: (v: number) => void; setRate: (r: number) => void;
    cycleRepeat: () => void; toggleShuffle: () => void; like: (id: string) => void;
    go: (p: Page) => void; openArtist: (a: string) => void; back: () => void;
    setPanel: (p: Panel) => void; wave: (mood?: string, ids?: string[]) => void;
    // Listening time that melts the ice; resets to 0 after each full melt (melts counts them).
    sessionTime: number; melts: number; stats: Stats; likedAt: Record<string, number>;
    waveMood: string;
    resetIce: () => void;
    moveLiked: (id: string, target: string) => void;
};

export const usePlayer = create<S>((set, get) => ({
    queue: [], index: 0, playing: false, position: 0,
    volume: 0.8, repeat: "off", shuffle: false, liked: loadLiked(),
    rate: 1, n: 0,
    page: "home", artist: "", history: [], panel: "none",
    sessionTime: ice0.sec, melts: ice0.melts, stats: loadStats(), likedAt: loadLikedAt(),
    waveMood: "",
    resetIce: () => { set({ sessionTime: 0 }); persist(); },
    moveLiked: (id, target) =>
        set((s) => {
            const liked = reorder(s.liked, id, target);
            try { localStorage.setItem("aetheria-liked", JSON.stringify(liked)); } catch { /* ignore */ }
            return { liked };
        }),
    cur: () => TRACKS.find((t) => t.id === get().queue[get().index]) || EMPTY,
    toggle: () => {
        if (!get().cur().url) return;
        set((s) => ({ playing: !s.playing }));
    },
    next: () => {
        const s = get();
        if (!s.queue.length) return;
        if (s.shuffle) return set({ index: Math.floor(Math.random() * s.queue.length), position: 0, n: s.n + 1 });
        const last = s.index === s.queue.length - 1;
        if (last && s.repeat === "off") {
            audio.currentTime = 0;
            return set({ playing: false, position: 0 });
        }
        set({ index: last ? 0 : s.index + 1, position: 0, n: s.n + 1 });
    },
    prev: () => {
        const s = get();
        if (!s.queue.length) return;
        if (s.position > 3) {
            audio.currentTime = 0;
            return set({ position: 0 });
        }
        set({ index: s.index === 0 ? s.queue.length - 1 : s.index - 1, position: 0, n: s.n + 1 });
    },
    play: (id, queue) => {
        const s = get();
        const q = queue || s.queue;
        const i = q.indexOf(id);
        set({ queue: i === -1 ? [id] : q, index: i === -1 ? 0 : i, position: 0, playing: true, n: s.n + 1, waveMood: "" });
    },
    enqueue: (id, next) => {
        const s = get();
        if (!s.queue.length) return get().play(id, [id]);
        const at = next ? s.index + 1 : s.queue.length;
        set({ queue: [...s.queue.slice(0, at), id, ...s.queue.slice(at)] });
    },
    seek: (position) => {
        audio.currentTime = position;
        set({ position });
    },
    setVolume: (volume) => set({ volume }),
    setRate: (rate) => set({ rate }),
    cycleRepeat: () => set((s) => ({ repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })),
    toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
    like: (id) =>
        set((s) => {
            const adding = !s.liked.includes(id);
            if (adding) {
                const t = TRACKS.find((x) => x.id === id);
                if (t) usePlaylists.getState().remember(t);
            }
            const liked = adding ? [...s.liked, id] : s.liked.filter((x) => x !== id);
            const likedAt = { ...s.likedAt };
            if (adding) likedAt[id] = Date.now(); else delete likedAt[id];
            try {
                localStorage.setItem("aetheria-liked", JSON.stringify(liked));
                localStorage.setItem(LAKEY, JSON.stringify(likedAt));
            } catch { /* ignore */ }
            return { liked, likedAt };
        }),
    go: (page) => set((s) => ({ page, history: [...s.history, s.page] })),
    openArtist: (artist) => set((s) => ({ artist, page: "artist", history: [...s.history, s.page] })),
    back: () =>
        set((s) => {
            const h = [...s.history];
            const page = h.pop() || "home";
            return { page, history: h };
        }),
    setPanel: (p) => set((s) => ({ panel: s.panel === p ? "none" : p })),
    wave: (mood, ids) => {
        const s = get();
        const fav = s.liked.map((id) => TRACKS.find((t) => t.id === id)?.artist);
        let pool = ids
            ? (ids.map((id) => TRACKS.find((t) => t.id === id)).filter(Boolean) as Track[])
            : TRACKS.filter((t) => !mood || moodOf(t) === mood);
        if (!pool.length) pool = TRACKS.slice();
        if (!pool.length) return;
        const order = pool
            .map((t) => ({ id: t.id, w: (fav.includes(t.artist) ? 2 : 0) + Math.random() }))
            .sort((a, b) => b.w - a.w)
            .map((x) => x.id);
        set({ queue: order, index: 0, position: 0, playing: true, n: s.n + 1, waveMood: mood || "all" });
    },
}));

function persist() {
    const s = usePlayer.getState();
    try {
        localStorage.setItem(SKEY, JSON.stringify(s.stats));
        localStorage.setItem(IKEY, JSON.stringify({ sec: s.sessionTime, melts: s.melts }));
    } catch { /* ignore */ }
}

// Seconds heard of the current playthrough; a play counts once it passes 10 seconds.
let heard = 0;
let dirty = 0;

setInterval(() => {
    const s = usePlayer.getState();
    if (!s.playing || audio.paused) return;
    const t = s.cur();
    if (t.id === "none") return;
    const k = dayKey();
    const old = s.stats.days[k] || { s: 0, a: {}, t: {} };
    const day: DayLog = {
        s: old.s + 1,
        a: { ...old.a, [t.artist]: (old.a[t.artist] || 0) + 1 },
        t: { ...old.t, [t.id]: (old.t[t.id] || 0) + 1 },
    };
    heard++;
    const stats: Stats = {
        days: { ...s.stats.days, [k]: day },
        info: s.stats.info[t.id] ? s.stats.info : { ...s.stats.info, [t.id]: [t.title, t.artist] },
        plays: heard === 10 ? { ...s.stats.plays, [t.id]: (s.stats.plays[t.id] || 0) + 1 } : s.stats.plays,
    };
    let sessionTime = s.sessionTime + 1;
    let melts = s.melts;
    if (sessionTime >= ICE_TOTAL) { sessionTime = 0; melts++; }
    usePlayer.setState({ stats, sessionTime, melts });
    if (++dirty >= 5 || melts !== s.melts) { dirty = 0; persist(); }
}, 1000);

window.addEventListener("beforeunload", persist);

let loading = false;

function load(n: number) {
    const t0 = usePlayer.getState().cur();

    const start = () => {
        const now = usePlayer.getState();
        if (now.n !== n) return;
        loading = false;
        const cur = now.cur();
        if (cur.url) {
            audio.src = cur.url;
            audio.playbackRate = now.rate;
            if (now.playing) audio.play().catch(() => { });
        } else {
            audio.removeAttribute("src");
        }
        usePlayer.setState({});
        const nxt = TRACKS.find((x) => x.id === now.queue[now.index + 1]);
        if (nxt && nxt.preview && !nxt.tried) {
            resolveFull(nxt).then(() => usePlayer.setState({})).catch(() => { });
        }
    };

    audio.pause();
    if (t0.preview && !t0.tried) {
        loading = true;
        Promise.race([resolveFull(t0), new Promise((r) => setTimeout(r, 2500))]).then(start, start);
    } else {
        loading = false;
        start();
    }
}

usePlayer.subscribe((s, p) => {
    if (s.n !== p.n) {
        heard = 0;
        load(s.n);
    } else if (s.playing !== p.playing) {
        if (s.playing && audio.src && !loading) audio.play().catch(() => { });
        else if (!s.playing) audio.pause();
    }
    if (s.volume !== p.volume) audio.volume = s.volume;
    if (s.rate !== p.rate) audio.playbackRate = s.rate;
});

audio.ontimeupdate = () => usePlayer.setState({ position: audio.currentTime });
audio.onloadedmetadata = () => {
    const s = usePlayer.getState();
    const t = TRACKS.find((x) => x.id === s.cur().id);
    if (t && isFinite(audio.duration)) {
        t.duration = audio.duration;
        usePlayer.setState({ n: s.n });
    }
};
audio.onended = () => {
    const s = usePlayer.getState();
    if (s.repeat === "one") {
        heard = 0;
        audio.currentTime = 0;
        audio.play().catch(() => { });
    } else {
        s.next();
    }
};
audio.onerror = () => usePlayer.setState({ playing: false });