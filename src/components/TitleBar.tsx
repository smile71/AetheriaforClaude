import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

export default function TitleBar() {
    const w = getCurrentWindow();
    return (
        <div data-tauri-drag-region className="h-10 flex items-center justify-end gap-1 px-3">
            <button onClick={() => w.minimize()} className="p-2 hover:bg-white/10 rounded-lg">
                <Minus size={14} />
            </button>
            <button onClick={() => w.toggleMaximize()} className="p-2 hover:bg-white/10 rounded-lg">
                <Square size={12} />
            </button>
            <button onClick={() => w.close()} className="p-2 hover:bg-red-500/60 rounded-lg">
                <X size={14} />
            </button>
        </div>
    );
}