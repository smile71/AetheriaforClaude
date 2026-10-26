import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import RightPanel from "./components/RightPanel";
import WindowControls from "./components/WindowControls";
import NowPlaying from "./components/NowPlaying";
import SearchOverlay from "./components/SearchOverlay";
import Dialogs from "./components/Dialogs";
import { Home, Artist } from "./pages/Pages";
import { LibraryPage, PlaylistPage } from "./pages/Library";
import SettingsPage, { applyTaskbarIcon } from "./pages/Settings";
import { ImportPage, AiPage } from "./pages/Extra";
import { usePlayer } from "./store/player";
import { useSettings } from "./store/settings";
import { useUI } from "./store/ui";
import { usePalette } from "./colors";
import { loadLocal } from "./library";
import { startHotkeys } from "./hotkeys";
import { startDiscord } from "./discord";

const pages = {
    home: Home, search: Home, artist: Artist, library: LibraryPage,
    settings: SettingsPage, import: ImportPage, ai: AiPage, playlist: PlaylistPage,
};

export default function App() {
    const page = usePlayer((s) => s.page);
    const full = useUI((s) => s.full);
    const pal = usePalette();
    const { theme, bg, bgDim, ambient } = useSettings();
    const Page = pages[page];

    useEffect(() => {
        const apply = () => {
            const h = new Date().getHours();
            const light = theme === "light" || (theme === "auto" && h >= 7 && h < 19);
            document.documentElement.classList.toggle("light", light);
        };
        apply();
        const id = setInterval(apply, 60000);
        return () => clearInterval(id);
    }, [theme]);

    useEffect(() => {
        applyTaskbarIcon(useSettings.getState().taskbarLogo);
        loadLocal().then(() => usePlayer.setState({}));
        startHotkeys();
        startDiscord();
    }, []);

    useEffect(() => {
        let prevVol = 0.8;
        const key = (e: KeyboardEvent) => {
            if (e.code === "Escape") {
                useUI.getState().setFull(false);
                useUI.getState().setSearch(false);
            }
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            const s = usePlayer.getState();
            const t = s.cur();
            const has = t.id !== "none";
            if (e.code === "Space") { e.preventDefault(); s.toggle(); }
            else if (e.code === "ArrowRight") {
                e.preventDefault();
                if (e.ctrlKey) s.next();
                else if (has) s.seek(Math.min(t.duration || 0, s.position + 5));
            } else if (e.code === "ArrowLeft") {
                e.preventDefault();
                if (e.ctrlKey) s.prev();
                else if (has) s.seek(Math.max(0, s.position - 5));
            } else if (e.code === "ArrowUp") { e.preventDefault(); s.setVolume(Math.min(1, s.volume + 0.05)); }
            else if (e.code === "ArrowDown") { e.preventDefault(); s.setVolume(Math.max(0, s.volume - 0.05)); }
            else if (e.code === "KeyM") {
                if (s.volume > 0) { prevVol = s.volume; s.setVolume(0); } else s.setVolume(prevVol || 0.8);
            } else if (e.code === "KeyL") { if (has) s.like(t.id); }
            else if (e.code === "KeyQ") s.setPanel("queue");
            else if (e.code === "KeyF") { const u = useUI.getState(); u.setFull(!u.full); }
            else if (e.code === "Slash") { e.preventDefault(); useUI.getState().setSearch(true); }
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, []);

    return (
        <div className="h-full flex gap-2 p-2 relative isolate">
            {bg && (
                <>
                    <div className="absolute inset-0 -z-10 pointer-events-none" style={{ backgroundImage: "url(" + bg + ")", backgroundSize: "cover", backgroundPosition: "center" }} />
                    <div className="absolute inset-0 -z-10 pointer-events-none" style={{ background: "rgb(0 0 0 / " + bgDim + ")" }} />
                </>
            )}
            {ambient && (
                <AnimatePresence>
                    <motion.div key={pal.join()} className="absolute inset-0 -z-10 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}
                        style={{ background: "radial-gradient(circle at 12% 98%, " + pal[0] + ", transparent 50%), radial-gradient(circle at 92% 6%, " + (pal[1] || pal[0]) + ", transparent 45%)", opacity: 0.38 }} />
                </AnimatePresence>
            )}
            <WindowControls />
            <Sidebar />
            <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="flex-1 flex gap-2 min-h-0">
                    <main className="panel flex-1 overflow-y-auto min-w-0">
                        <AnimatePresence mode="wait">
                            <motion.div key={page} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
                                <Page />
                            </motion.div>
                        </AnimatePresence>
                    </main>
                    <RightPanel />
                </div>
                <PlayerBar />
            </div>
            <AnimatePresence>{full && <NowPlaying key="np" />}</AnimatePresence>
            <SearchOverlay />
            <Dialogs />
        </div>
    );
}