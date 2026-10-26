import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { usePlayer } from "./store/player";
import { useSettings } from "./store/settings";

export const ACTIONS = ["play", "next", "prev", "like"] as const;
type Action = (typeof ACTIONS)[number];

function run(a: Action) {
    const s = usePlayer.getState();
    if (a === "play") s.toggle();
    if (a === "next") s.next();
    if (a === "prev") s.prev();
    if (a === "like") s.like(s.cur().id);
}

async function reg(key: string, a: Action) {
    try {
        await register(key, (e) => {
            if (e.state === "Pressed") run(a);
        });
    } catch (e) {
        console.warn("hotkey", key, e);
    }
}

export async function applyHotkeys() {
    try { await unregisterAll(); } catch { /* ignore */ }
    const keys = useSettings.getState().hotkeys;
    for (const a of ACTIONS) {
        if (keys[a]) await reg(keys[a], a);
    }
    await reg("MediaPlayPause", "play");
    await reg("MediaTrackNext", "next");
    await reg("MediaTrackPrevious", "prev");
    await reg("MediaTrackPrev", "prev");
}

let started = false;
export function startHotkeys() {
    if (started) return;
    started = true;
    applyHotkeys();
    useSettings.subscribe((s, p) => {
        if (s.hotkeys !== p.hotkeys) applyHotkeys();
    });
}

export function toAccelerator(e: KeyboardEvent): string | null {
    const skip = ["ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"];
    if (skip.includes(e.code)) return null;
    const mods: string[] = [];
    if (e.ctrlKey) mods.push("Control");
    if (e.altKey) mods.push("Alt");
    if (e.shiftKey) mods.push("Shift");
    if (e.metaKey) mods.push("Super");
    if (!mods.length) return null;
    let key = e.code;
    if (key.startsWith("Key")) key = key.slice(3);
    else if (key.startsWith("Digit")) key = key.slice(5);
    else if (key.startsWith("Arrow")) key = key.slice(5);
    return mods.concat(key).join("+");
}