import { AnimatePresence, motion } from "framer-motion";
import { Shuffle, Repeat, Repeat1 } from "lucide-react";
import { usePlayer } from "../store/player";
import { TRACKS } from "../data";
import { useX } from "../i18n2";
import TrackRow from "./TrackRow";
import Lyrics from "./Lyrics";
import Visualizer from "./Visualizer";

export default function RightPanel() {
    const { panel, queue, shuffle, repeat, toggleShuffle, cycleRepeat } = usePlayer();
    const x = useX();
    const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;
    const on = (v: boolean) => "cursor-pointer " + (v ? "accent-text" : "text-white/60 hover:text-white");
    return (
        <AnimatePresence>
            {panel !== "none" && (
                <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 360, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="panel overflow-hidden shrink-0">
                    <div className="w-[360px] h-full overflow-y-auto p-5 pt-14">
                        {panel === "queue" ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="font-bold text-lg">{x("queue")}</div>
                                        <div className="text-xs text-white/50">{queue.length + " " + x("tracksN")}</div>
                                    </div>
                                    <div className="chip flex items-center gap-4 px-4 py-2">
                                        <Shuffle size={16} onClick={toggleShuffle} className={on(shuffle)} />
                                        <RepeatIcon size={16} onClick={cycleRepeat} className={on(repeat !== "off")} />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    {queue.map((id) => {
                                        const t = TRACKS.find((y) => y.id === id);
                                        return t ? <TrackRow key={id} t={t} list={queue} /> : null;
                                    })}
                                </div>
                            </>
                        ) : (
                            <>
                                <Visualizer />
                                <h3 className="font-bold text-lg my-4">{x("lyricsVer")}</h3>
                                <Lyrics />
                            </>
                        )}
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}