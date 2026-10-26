import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { addTracks } from "../data";
import { searchItunes } from "../library";
import { usePlayer } from "../store/player";

export function ImportPage() {
    const [url, setUrl] = useState("");
    const [msg, setMsg] = useState("");
    const play = usePlayer((s) => s.play);

    const run = async () => {
        const u = url.trim();
        const sp = /open\.spotify\.com\/(track|playlist|album)\/([A-Za-z0-9]+)/.exec(u);
        const sc = /soundcloud\.com\/([^/]+)\/([^/?]+)/.exec(u);
        if (!sp && !sc) return setMsg("Нужна ссылка на Spotify или SoundCloud");
        setMsg("Читаю ссылку…");
        let title = sc ? sc[2].replace(/-/g, " ") : "";
        let artist = sc ? sc[1] : "";
        try {
            const api = sp ? "https://open.spotify.com/oembed?url=" : "https://soundcloud.com/oembed?format=json&url=";
            const j = await (await fetch(api + encodeURIComponent(u))).json();
            if (j.title) title = j.title;
            if (j.author_name && sc) artist = j.author_name;
        } catch (e) {
            console.warn("oembed", e);
        }
        if (!title) return setMsg("Не удалось прочитать ссылку");
        try {
            const found = await searchItunes((artist + " " + title).trim(), 5);
            if (!found.length) return setMsg("Не нашёл «" + title + "» в каталоге");
            addTracks(found);
            play(found[0].id, found.map((x) => x.id));
            setMsg("Играет: " + found[0].title + " (фрагмент 30 с)");
        } catch {
            setMsg("Нет соединения с каталогом");
        }
    };

    return (
        <div className="p-8 pt-12 max-w-xl">
            <h1 className="text-3xl font-bold mb-2">Импорт по ссылке</h1>
            <p className="text-white/50 mb-5">Вставь ссылку на трек Spotify или SoundCloud: прочитаю название и найду трек в каталоге.</p>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://open.spotify.com/track/..." className="w-full chip px-5 py-3 outline-none mb-3" />
            <button onClick={run} className="accent-bg px-6 py-2 rounded-xl font-semibold">Найти и играть</button>
            {msg && <div className="mt-4 text-white/70">{msg}</div>}
        </div>
    );
}

export function AiPage() {
    const [p, setP] = useState("");
    return (
        <div className="p-8 pt-12 max-w-xl">
            <h1 className="text-3xl font-bold mb-2">AI Studio</h1>
            <p className="text-white/50 mb-5">Опиши трек: промпт скопируется, а Suno откроется в браузере. Открытого API у Suno нет, поэтому генерация идёт на их сайте.</p>
            <textarea value={p} onChange={(e) => setP(e.target.value)} rows={5} placeholder="Мечтательный синтвейв, женский вокал, 90 BPM, про ночной город" className="w-full chip px-5 py-3 outline-none mb-3 resize-none" />
            <button onClick={() => { navigator.clipboard.writeText(p); openUrl("https://suno.com/create"); }} className="accent-bg px-6 py-2 rounded-xl font-semibold">Скопировать и открыть Suno</button>
        </div>
    );
}