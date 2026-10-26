import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

export default function WindowControls() {
    const w = getCurrentWindow();
    return (
        <>
            <div data-tauri-drag-region className="absolute top-0 left-0 right-0 h-8 z-40" />
            <div className="absolute top-3 right-3 z-50 flex gap-1 panel px-2 py-1" style={{ borderRadius: 12 }}>
                <button onClick={() => w.minimize()} className="p-1.5 hover:bg-white/10 rounded-md"><Minus size={13} /></button>
                <button onClick={() => w.toggleMaximize()} className="p-1.5 hover:bg-white/10 rounded-md"><Square size={11} /></button>
                <button onClick={() => w.close()} className="p-1.5 hover:bg-red-500/70 rounded-md"><X size={13} /></button>
            </div>
        </>
    );
}