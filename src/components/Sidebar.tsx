import { Home, Search, Library, Settings, Download, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Logo from "./Logo";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { useT } from "../i18n";

const items = [
    { id: "home", icon: Home },
    { id: "search", icon: Search },
    { id: "library", icon: Library },
    { id: "import", icon: Download },
    { id: "ai", icon: Sparkles },
] as const;

export default function Sidebar() {
    const { page, go } = usePlayer();
    const search = useUI((s) => s.search);
    const t = useT();

    const Btn = ({ id, icon: Icon, active, onClick }: { id: string; icon: any; active: boolean; onClick: () => void }) => (
        <button title={t(id)} onClick={onClick} className="relative w-11 h-11 rounded-xl grid place-items-center" style={{ color: active ? "#fff" : undefined }}>
            {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl" style={{ background: "rgb(255 255 255 / 0.15)" }} transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
            <span className={"relative " + (active ? "" : "text-white/50 hover:text-white")}><Icon size={20} /></span>
        </button>
    );

    return (
        <aside className="panel w-[68px] py-4 flex flex-col items-center gap-2">
            <div className="mb-4"><Logo size={40} /></div>
            {items.map(({ id, icon }) => (
                <Btn
                    key={id}
                    id={id}
                    icon={icon}
                    active={id === "search" ? search : page === id && !search}
                    onClick={() => (id === "search" ? useUI.getState().setSearch(!search) : go(id))}
                />
            ))}
            <div className="flex-1" />
            <Btn id="settings" icon={Settings} active={page === "settings" && !search} onClick={() => go("settings")} />
        </aside>
    );
}