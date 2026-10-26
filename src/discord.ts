import { invoke } from "@tauri-apps/api/core";
import { usePlayer } from "./store/player";
import { useSettings } from "./store/settings";
import { useUI } from "./store/ui";

const pad = (s: string) => (s.length < 2 ? s + " " : s.slice(0, 120));

function build() {
    const st = useSettings.getState();
    const p = usePlayer.getState();
    const t = p.cur();
    const dc = st.dc;
    const paused = !p.playing;
    const now = Math.floor(Date.now() / 1000);
    const start = now - Math.floor(p.position);

    const a: any = {
        type: 2,
        status_display_type: dc.format === "track" ? 2 : dc.format === "app" ? 0 : 1,
        details: pad(t.title),
        state: pad(paused ? t.artist + " (Paused)" : t.artist),
    };

    if (paused) a.timestamps = { start };
    else if (dc.progress && t.duration) a.timestamps = { start, end: start + Math.floor(t.duration) };

    const assets: any = { large_text: pad(t.album || t.title) };
    if (dc.cover && t.cover && t.cover.startsWith("http")) assets.large_image = t.cover;
    if (dc.artistImg && t.artistImg && t.artistImg.startsWith("http")) {
        assets.small_image = t.artistImg;
        assets.small_text = pad(t.artist);
    }
    a.assets = assets;

    if (dc.buttons && t.id.startsWith("dz")) {
        a.buttons = [{ label: "Open on Deezer", url: "https://www.deezer.com/track/" + t.id.slice(2) }];
    }
    return a;
}

async function stop(idle = false) {
    try { await invoke("discord_stop"); } catch { /* ignore */ }
    useUI.getState().setDcState(idle ? "idle" : "off");
}

async function push() {
    const st = useSettings.getState();
    const ui = useUI.getState();
    if (!st.discordOn) { await stop(); return; }
    if (!st.discordId.trim()) { ui.setDcState("need"); return; }
    const p = usePlayer.getState();
    const t = p.cur();
    if (t.id === "none" || (!p.playing && !st.dc.pause)) { await stop(true); return; }
    try {
        await invoke("discord_set", { clientId: st.discordId.trim(), activity: build() });
        ui.setDcState("ok");
    } catch (e) {
        ui.setDcState("err:" + String(e));
    }
}

let timer: ReturnType<typeof setTimeout> | undefined;
let lastSent = 0;

function schedule() {
    const wait = Math.max(0, 4000 - (Date.now() - lastSent));
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        lastSent = Date.now();
        push();
    }, wait);
}

let started = false;

export function startDiscord() {
    if (started) return;
    started = true;

    let lastKey = "";
    let exp = { pos: 0, at: Date.now() };

    usePlayer.subscribe((s) => {
        const key = s.cur().id + "|" + s.playing + "|" + s.n + "|" + s.rate;
        if (key !== lastKey) {
            lastKey = key;
            exp = { pos: s.position, at: Date.now() };
            schedule();
            return;
        }
        const predicted = exp.pos + (s.playing ? ((Date.now() - exp.at) / 1000) * s.rate : 0);
        if (Math.abs(s.position - predicted) > 2.5) {
            exp = { pos: s.position, at: Date.now() };
            schedule();
        }
    });

    useSettings.subscribe((s, p) => {
        if (s.discordOn === p.discordOn && s.discordId === p.discordId && s.dc === p.dc) return;
        if (!s.discordOn) {
            if (timer) clearTimeout(timer);
            stop();
        } else {
            schedule();
        }
    });

    setInterval(() => {
        const st = useSettings.getState();
        if (st.discordOn && usePlayer.getState().playing) schedule();
    }, 20000);

    if (useSettings.getState().discordOn) schedule();
}