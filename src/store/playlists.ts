import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addTracks, Track } from "../data";

export type Playlist = { id: string; name: string; ids: string[] };

// Moves `id` into the slot currently held by `target` (drag-and-drop "take its place").
export function reorder(arr: string[], id: string, target: string): string[] {
    const from = arr.indexOf(id);
    const to = arr.indexOf(target);
    if (from === -1 || to === -1 || from === to) return arr;
    const out = arr.slice();
    out.splice(from, 1);
    out.splice(to, 0, id);
    return out;
}

type S = {
    lists: Playlist[];
    snap: Record<string, Track>;
    remember: (t: Track) => void;
    create: (name: string) => string;
    remove: (id: string) => void;
    addTo: (pl: string, t: Track) => void;
    removeFrom: (pl: string, id: string) => void;
    move: (pl: string, id: string, target: string) => void;
};

export const usePlaylists = create<S>()(
    persist(
        (set, get) => ({
            lists: [],
            snap: {},
            remember: (t) => {
                if (t.id.startsWith("loc")) return;
                set((s) => ({ snap: { ...s.snap, [t.id]: t } }));
            },
            create: (name) => {
                const id = "pl" + Date.now();
                set((s) => ({ lists: [...s.lists, { id, name, ids: [] }] }));
                return id;
            },
            remove: (id) => set((s) => ({ lists: s.lists.filter((l) => l.id !== id) })),
            addTo: (pl, t) => {
                get().remember(t);
                set((s) => ({
                    lists: s.lists.map((l) => (l.id === pl && !l.ids.includes(t.id) ? { ...l, ids: [...l.ids, t.id] } : l)),
                }));
            },
            removeFrom: (pl, id) =>
                set((s) => ({ lists: s.lists.map((l) => (l.id === pl ? { ...l, ids: l.ids.filter((x) => x !== id) } : l)) })),
            move: (pl, id, target) =>
                set((s) => ({ lists: s.lists.map((l) => (l.id === pl ? { ...l, ids: reorder(l.ids, id, target) } : l)) })),
        }),
        {
            name: "aetheria-playlists",
            onRehydrateStorage: () => (state) => {
                if (state) addTracks(Object.values(state.snap));
            },
        }
    )
);