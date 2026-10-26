import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { TRACKS } from "../data";

function hue(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
}

export default function Cover({ seed, size = 48, round = 10 }: { seed: string; size?: number | string; round?: number }) {
    const t = TRACKS.find((x) => x.id === seed);
    const [imgErr, setImgErr] = useState(false);
    const [fetchedCover, setFetchedCover] = useState<string | null>(null);

    // Если у трека нет обложки, пробуем быстро подтянуть обложку из iTunes Search API
    useEffect(() => {
        setImgErr(false);
        if (t && !t.cover && t.artist && t.title && t.id !== "none") {
            const query = encodeURIComponent(`${t.artist} ${t.title}`);
            fetch(`https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${query}`)
                .then((r) => r.json())
                .then((data) => {
                    if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
                        const highRes = data.results[0].artworkUrl100.replace("100x100", "400x400");
                        t.cover = highRes;
                        setFetchedCover(highRes);
                    }
                })
                .catch(() => {});
        }
    }, [seed, t]);

    const coverUrl = (t && t.cover) || fetchedCover;

    if (coverUrl && !imgErr) {
        return (
            <img
                src={coverUrl}
                alt="Обложка трека"
                draggable={false}
                onError={() => setImgErr(true)}
                style={{
                    width: size,
                    height: size,
                    borderRadius: round,
                    objectFit: "cover",
                    flexShrink: 0,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
            />
        );
    }

    // Стильный стеклянный абстрактный плейсхолдер с нотой, если обложки вообще нет
    const h = hue(seed);
    const bg = `linear-gradient(135deg, hsl(${h} 65% 55%), hsl(${(h + 70) % 360} 75% 25%))`;

    return (
        <div
            className="flex items-center justify-center relative overflow-hidden shadow-md"
            style={{
                width: size,
                height: size,
                background: bg,
                borderRadius: round,
                flexShrink: 0,
            }}
        >
            <div className="absolute inset-0 bg-black/20" />
            <Music2 size={typeof size === "number" ? Math.max(16, size * 0.42) : 24} className="text-white/80 relative z-10" />
        </div>
    );
}
