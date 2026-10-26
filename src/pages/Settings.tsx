import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { Keyboard, Palette, MessageCircle, Database, Info, Search } from "lucide-react";
import { useSettings, LOGOS, LANGS, DEFAULT_KEYS, Dc } from "../store/settings";
import { ACTIONS, toAccelerator } from "../hotkeys";
import { clearDownloads, storageInfo } from "../storage";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { useX } from "../i18n2";
import Logo from "../components/Logo";

export async function applyTaskbarIcon(id: string) {
    try {
        const buf = await (await fetch("/logos/" + id + ".png")).arrayBuffer();
        await getCurrentWindow().setIcon(new Uint8Array(buf));
    } catch (e) {
        console.warn("icon", e);
    }
}

const setVar = (k: string, v: string) => document.documentElement.style.setProperty(k, v);

const PALETTES: [string, string][] = [
    ["Cyber Neon", "139 92 246"], ["Neon Cyan", "34 211 238"], ["Sunset", "249 115 22"],
    ["Sunset Pink", "236 72 153"], ["Midnight Emerald", "16 185 129"], ["Gold", "234 179 8"], ["Spotify", "34 197 94"],
];

type Sec = "hotkeys" | "appearance" | "discord" | "memory" | "about";
const NAV: [string, Sec[]][] = [["gPlayer", ["hotkeys"]], ["gUI", ["appearance"]], ["gInt", ["discord"]], ["gApp", ["memory", "about"]]];
const ICON = { hotkeys: Keyboard, appearance: Palette, discord: MessageCircle, memory: Database, about: Info };
const LABEL: Record<Sec, string> = { hotkeys: "secHotkeys", appearance: "secAppearance", discord: "secDiscord", memory: "secMemory", about: "secAbout" };
const SUB: Record<Sec, string> = { hotkeys: "subHotkeys", appearance: "subAppearance", discord: "subDiscord", memory: "subMemory", about: "subAbout" };

function Toggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
    return (
        <button onClick={() => set(!on)} className="relative shrink-0 rounded-full transition" style={{ width: 48, height: 28, background: on ? "rgb(var(--accent))" : "rgb(255 255 255 / 0.15)" }}>
            <span className="absolute rounded-full bg-white transition-all duration-200" style={{ top: 4, width: 20, height: 20, left: on ? 24 : 4 }} />
        </button>
    );
}

function RowItem({ title, desc, right }: { title: string; desc?: string; right: any }) {
    return (
        <div className="chip flex items-center justify-between gap-4 px-4 py-3 mb-2">
            <div className="min-w-0">
                <div className="font-medium">{title}</div>
                {desc && <div className="text-xs text-white/50">{desc}</div>}
            </div>
            {right}
        </div>
    );
}

function Seg({ items, value, on }: { items: [string, string][]; value: string; on: (v: string) => void }) {
    return (
        <div className="flex gap-2 mb-6 flex-wrap">
            {items.map(([k, label]) => (
                <button key={k} onClick={() => on(k)} className={"chip px-4 py-1.5 text-sm " + (value === k ? "accent-text" : "")}>{label}</button>
            ))}
        </div>
    );
}

function Logos({ value, onPick }: { value: string; onPick: (id: string) => void }) {
    return (
        <div className="flex flex-wrap gap-3 mb-6">
            {LOGOS.map((l) => (
                <img key={l.id} src={"/logos/" + l.id + ".png"} title={l.name} onClick={() => onPick(l.id)}
                    className="w-14 h-14 rounded-2xl object-cover cursor-pointer transition hover:scale-105"
                    style={{ outline: value === l.id ? "2px solid rgb(var(--accent))" : "2px solid transparent" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.15"; }} />
            ))}
        </div>
    );
}

const Key = ({ children }: { children: string }) => (
    <span className="px-2.5 py-1 rounded-lg text-xs font-mono" style={{ background: "rgb(255 255 255 / 0.1)" }}>{children}</span>
);

function Hotkeys() {
    const x = useX();
    const keys = useSettings((s) => s.hotkeys);
    const [tab, setTab] = useState<"app" | "global">("app");
    const [rec, setRec] = useState<string | null>(null);

    useEffect(() => {
        if (!rec) return;
        const fn = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.code === "Escape") { setRec(null); return; }
            const acc = toAccelerator(e);
            if (acc) {
                useSettings.getState().setHotkey(rec, acc);
                setRec(null);
            }
        };
        window.addEventListener("keydown", fn, true);
        return () => window.removeEventListener("keydown", fn, true);
    }, [rec]);

    const appKeys: [string, string][] = [
        ["Space", "hkplay"], ["Ctrl+Right", "hknext"], ["Ctrl+Left", "hkprev"], ["Right", "hkSeekF"], ["Left", "hkSeekB"],
        ["Up", "hkVolUp"], ["Down", "hkVolDown"], ["M", "hkMute"], ["/", "hkSearch"], ["Q", "hkQueue"], ["F", "hkFull"], ["L", "hklike"],
    ];

    return (
        <div>
            <div className="flex gap-2 mb-4">
                {([["app", "hkApp", appKeys.length], ["global", "hkGlobal", ACTIONS.length]] as const).map(([k, l, n]) => (
                    <button key={k} onClick={() => setTab(k)} className="px-4 py-1.5 rounded-xl text-sm font-semibold" style={tab === k ? { background: "#fff", color: "#000" } : { background: "rgb(255 255 255 / 0.1)" }}>{x(l) + " " + n}</button>
                ))}
                <button onClick={() => useSettings.getState().resetHotkeys()} className="chip px-3 py-1.5 text-sm ml-auto">{x("reset")}</button>
            </div>
            {tab === "app" && appKeys.map(([k, l]) => <RowItem key={l} title={x(l)} desc={x("hkApp")} right={<Key>{k}</Key>} />)}
            {tab === "global" && (
                <>
                    {ACTIONS.map((a) => (
                        <RowItem key={a} title={x("hk" + a)} desc={x("hkGlobal")}
                            right={<button onClick={() => setRec(a)} className="text-sm accent-text font-mono">{rec === a ? x("pressKeys") : keys[a] || DEFAULT_KEYS[a]}</button>} />
                    ))}
                    <div className="text-xs text-white/40 mt-2">{x("hkMedia")}</div>
                </>
            )}
        </div>
    );
}

function Appearance() {
    const x = useX();
    const s = useSettings();
    const [note, setNote] = useState("");
    const pickBg = (f?: File) => {
        if (!f) return;
        const r = new FileReader();
        r.onload = () => setNote(s.setBg(String(r.result)) ? "" : x("bgBig"));
        r.readAsDataURL(f);
    };
    return (
        <div>
            <div className="mb-2 text-white/60 text-sm">{x("theme")}</div>
            <Seg value={s.theme} on={(v) => s.setTheme(v as "auto" | "dark" | "light")} items={[["auto", "Auto 19:00-07:00"], ["dark", "Dark"], ["light", "Light"]]} />
            <div className="mb-2 text-white/60 text-sm">{x("language")}</div>
            <Seg value={s.lang} on={(v) => s.setLang(v as typeof s.lang)} items={LANGS} />
            <div className="mb-2 text-white/60 text-sm">{x("palette")}</div>
            <div className="flex gap-3 mb-6 flex-wrap">
                {PALETTES.map(([n, c]) => (
                    <button key={n} title={n} onClick={() => setVar("--accent", c)} className="w-9 h-9 rounded-full border-2 border-white/20 hover:scale-110 transition" style={{ background: "rgb(" + c + ")" }} />
                ))}
            </div>
            <RowItem title={x("bgCustom")} desc={note} right={
                <div className="flex gap-2">
                    <label className="chip px-3 py-1.5 text-sm cursor-pointer">{x("bgChoose")}<input type="file" accept="image/*" className="hidden" onChange={(e) => pickBg(e.target.files?.[0])} /></label>
                    {s.bg && <button onClick={() => { s.setBg(""); setNote(""); }} className="chip px-3 py-1.5 text-sm">{x("bgRemove")}</button>}
                </div>
            } />
            <RowItem title={x("bgDim")} right={<input type="range" min={0} max={0.9} step={0.01} value={s.bgDim} onChange={(e) => s.setBgDim(Number(e.target.value))} className="w-40" />} />
            <RowItem title={x("ambient")} right={<Toggle on={s.ambient} set={s.setAmbient} />} />
            <RowItem title={x("alpha")} right={<input type="range" min={0.3} max={0.95} step={0.01} defaultValue={0.78} onChange={(e) => setVar("--glass-alpha", e.target.value)} className="w-40" />} />
            <RowItem title={x("blur")} right={<input type="range" min={0} max={40} defaultValue={24} onChange={(e) => setVar("--blur", e.target.value + "px")} className="w-40" />} />
            <div className="mt-6 mb-2 text-white/60 text-sm">{x("logoApp")}</div>
            <Logos value={s.appLogo} onPick={s.setAppLogo} />
            <div className="mb-2 text-white/60 text-sm">{x("logoTask")}</div>
            <Logos value={s.taskbarLogo} onPick={(id) => { s.setTaskbarLogo(id); applyTaskbarIcon(id); }} />
        </div>
    );
}

function Discord() {
    const x = useX();
    const s = useSettings();
    const st = useUI((u) => u.dcState);
    const dc = s.dc;
    const dim = s.discordOn ? undefined : { opacity: 0.45, pointerEvents: "none" as const };
    const status = !s.discordOn ? "" : st === "ok" ? x("dcOk") : st === "need" ? x("dcNeedId") : st.startsWith("err:") ? x("dcErr") + st.slice(4) : "";

    return (
        <div>
            <RowItem title="Discord Rich Presence" desc={status || x("discordHelp")} right={<Toggle on={s.discordOn} set={s.setDiscordOn} />} />
            <div style={dim} className="transition-opacity">
                <RowItem title={x("dcIdTitle")} right={<input value={s.discordId} onChange={(e) => s.setDiscordId(e.target.value)} placeholder="123456789012345678" className="chip px-3 py-1.5 text-sm outline-none w-56" />} />

                <div className="text-sm font-semibold text-white/60 mt-5 mb-2 px-1">{x("dcDisplay")}</div>
                <RowItem title={x("dcFormat")} desc={x("dcFormatDesc")} right={
                    <select value={dc.format} onChange={(e) => s.setDc({ format: e.target.value as Dc["format"] })} className="chip px-3 py-1.5 text-sm outline-none" style={{ colorScheme: "dark" }}>
                        <option value="artist">{x("dcArtist")}</option>
                        <option value="track">{x("dcTrack")}</option>
                        <option value="app">{x("dcApp")}</option>
                    </select>
                } />
                <RowItem title={x("dcTimeline")} desc={x("dcTimelineDesc")} right={<Toggle on={dc.progress} set={(v) => s.setDc({ progress: v })} />} />
                <RowItem title={x("dcCover")} right={<Toggle on={dc.cover} set={(v) => s.setDc({ cover: v })} />} />
                <RowItem title={x("dcArtistImg")} desc={x("dcArtistImgDesc")} right={<Toggle on={dc.artistImg} set={(v) => s.setDc({ artistImg: v })} />} />
                <RowItem title={x("dcPause")} desc={x("dcPauseDesc")} right={<Toggle on={dc.pause} set={(v) => s.setDc({ pause: v })} />} />

                <div className="text-sm font-semibold text-white/60 mt-5 mb-2 px-1">{x("dcButtons")}</div>
                <RowItem title={x("dcBtnTrack")} desc={x("dcBtnTrackDesc")} right={<Toggle on={dc.buttons} set={(v) => s.setDc({ buttons: v })} />} />
            </div>
        </div>
    );
}

const size = (b: number) => (b > 1e9 ? (b / 1e9).toFixed(1) + " GB" : b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : (b / 1e3).toFixed(0) + " KB");

function Memory() {
    const x = useX();
    const [info, setInfo] = useState({ local: 0, dl: 0, n: 0 });
    const refresh = () => storageInfo().then(setInfo);
    useEffect(() => { refresh(); }, []);

    const total = info.local + info.dl;
    const C = 2 * Math.PI * 52;
    const pl = total ? (info.local / total) * C : 0;
    const pd = total ? (info.dl / total) * C : 0;
    const mb = (total / 1e6).toFixed(1);

    const clear = async () => {
        await clearDownloads();
        usePlayer.setState({});
        refresh();
    };

    return (
        <div>
            <div className="chip flex items-center justify-between p-5 mb-3">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full" style={{ background: "#8b5cf6" }} /><span className="w-40">{x("lLocal")}</span><span className="text-white/60">{size(info.local)}</span></div>
                    <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full" style={{ background: "rgb(var(--accent))" }} /><span className="w-40">{x("lDl")}</span><span className="text-white/60">{size(info.dl)}</span></div>
                </div>
                <svg width="150" height="150" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="12" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#8b5cf6" strokeWidth="12" strokeDasharray={pl + " " + C} transform="rotate(-90 60 60)" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(var(--accent))" strokeWidth="12" strokeDasharray={pd + " " + C} strokeDashoffset={-pl} transform="rotate(-90 60 60)" />
                    <text x="60" y="62" textAnchor="middle" fill="currentColor" fontSize="20" fontWeight="700">{mb}</text>
                    <text x="60" y="78" textAnchor="middle" fill="currentColor" fontSize="9" opacity="0.6">MB</text>
                </svg>
            </div>
            <button onClick={clear} className="w-full py-3 rounded-xl font-semibold" style={{ background: "#fff", color: "#000" }}>{x("clearDl") + " (" + size(info.dl) + ")"}</button>
        </div>
    );
}

function About() {
    const x = useX();
    return (
        <div className="chip p-6 flex items-center gap-5">
            <Logo size={72} />
            <div>
                <div className="text-2xl font-bold">Aetheria</div>
                <div className="text-white/50 text-sm">{x("version") + " 0.1.0"}</div>
                <div className="text-white/50 text-sm">{x("aboutStack")}</div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const x = useX();
    const [sec, setSec] = useState<Sec>("appearance");
    const [q, setQ] = useState("");
    const Icon = ICON[sec];

    return (
        <div className="flex gap-6 p-6 pt-12 items-start">
            <div className="w-60 shrink-0 sticky top-4">
                <div className="chip flex items-center gap-2 px-3 py-2 mb-4">
                    <Search size={14} className="text-white/50" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x("setSearch")} className="bg-transparent outline-none text-sm w-full" />
                </div>
                {NAV.map(([g, secs]) => {
                    const shown = secs.filter((k) => x(LABEL[k]).toLowerCase().includes(q.toLowerCase()));
                    if (!shown.length) return null;
                    return (
                        <div key={g} className="mb-4">
                            <div className="text-xs text-white/50 font-semibold px-1 mb-2">{x(g)}</div>
                            <div className="chip p-1.5 flex flex-col gap-1" style={{ borderRadius: 16 }}>
                                {shown.map((k) => {
                                    const I = ICON[k];
                                    return (
                                        <button key={k} onClick={() => setSec(k)} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left transition" style={sec === k ? { background: "rgb(255 255 255 / 0.15)", fontWeight: 600 } : { opacity: 0.75 }}>
                                            <I size={16} />{x(LABEL[k])}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex-1 min-w-0 rise" key={sec}>
                <h1 className="text-3xl font-bold flex items-center gap-3"><Icon size={26} />{x(LABEL[sec])}</h1>
                <p className="text-white/50 text-sm mb-6 mt-1">{x(SUB[sec])}</p>
                {sec === "hotkeys" && <Hotkeys />}
                {sec === "appearance" && <Appearance />}
                {sec === "discord" && <Discord />}
                {sec === "memory" && <Memory />}
                {sec === "about" && <About />}
            </div>
        </div>
    );
}
