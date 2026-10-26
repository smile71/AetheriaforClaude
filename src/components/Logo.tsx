import { useSettings } from "../store/settings";

const HUES: Record<string, string> = {
    main: "none",
    v1: "hue-rotate(45deg) saturate(1.5)",
    v2: "hue-rotate(90deg) saturate(1.6)",
    v3: "hue-rotate(140deg) saturate(1.8)",
    v4: "hue-rotate(180deg) saturate(2)",
    v5: "hue-rotate(220deg) saturate(1.5)",
    v6: "hue-rotate(270deg) saturate(1.8)",
    v7: "hue-rotate(310deg) saturate(1.6)",
    v8: "invert(0.9) hue-rotate(180deg)",
    v9: "hue-rotate(60deg) brightness(1.2)",
    v10: "hue-rotate(330deg) brightness(1.3) saturate(2)",
};

export default function Logo({ size = 40 }: { size?: number }) {
    const id = useSettings((s) => s.appLogo);
    const filter = HUES[id] || "none";

    return (
        <div
            className="relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg"
            style={{
                width: size,
                height: size,
                borderRadius: size * 0.28,
                background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
            }}
        >
            <img
                src={"/logos/" + id + ".png"}
                width={size}
                height={size}
                alt="Aetheria"
                style={{
                    filter,
                    borderRadius: size * 0.28,
                    objectFit: "cover",
                    transition: "filter 0.4s ease",
                }}
                onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    if (el.src.includes("/logos/main.png")) {
                        el.style.opacity = "0.2";
                    } else {
                        el.src = "/logos/main.png";
                    }
                }}
            />
        </div>
    );
}
