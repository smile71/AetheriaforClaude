import { TRACKS, Track, LOCAL_ARTIST } from "./data";
import { searchAudius } from "./library";

const STOP = /\b(feat|ft|featuring|remastered|remaster|radio edit|edit|version|official|audio|video|lyrics)\b/g;

function norm(s: string) {
    return (s || "")
        .toLowerCase()
        .replace(/\(.*?\)|\[.*?\]/g, " ")
        .replace(STOP, " ")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

function apply(t: Track, url: string, dur: number) {
    t.url = url;
    t.preview = false; // Отмечаем, что теперь это полноценный стрим!
    if (dur) t.duration = dur;
}

export async function resolveFull(t: Track): Promise<boolean> {
    // Если уже не превью или уже есть прямой стрим
    if (!t.preview && t.url && !t.url.includes("audio-ssl.itunes.apple.com")) return true;

    try {
        // 1. Проверяем локальные сохраненные файлы пользователя
        for (const c of TRACKS) {
            if (!c.id.startsWith("loc") || !c.url) continue;
            const artist = c.artist === LOCAL_ARTIST ? t.artist : c.artist;
            if (norm(c.title) === norm(t.title) && norm(artist) === norm(t.artist)) {
                apply(t, c.url, c.duration);
                return true;
            }
        }

        // 2. Полноценная бесплатная база Audius (полные песни без ограничений в 30 секунд!)
        const query = (t.artist === LOCAL_ARTIST ? "" : t.artist + " ") + t.title;
        const audiusTracks = await searchAudius(query, 5);

        if (audiusTracks.length > 0) {
            // Ищем наилучшее совпадение по названию
            const targetTitle = norm(t.title);
            const match = audiusTracks.find((a) => norm(a.title).includes(targetTitle) || targetTitle.includes(norm(a.title))) || audiusTracks[0];
            
            if (match && match.url) {
                apply(t, match.url, match.duration || t.duration);
                if (match.cover && !t.cover) t.cover = match.cover;
                return true;
            }
        }
    } catch (e) {
        console.warn("Full audio resolve error:", e);
    }

    return false;
}
