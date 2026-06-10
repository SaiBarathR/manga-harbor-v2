import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_CONTENT_RATINGS,
  type ContentRating,
} from "@/lib/mangadex/types";

export interface SettingsState {
  /** Preferred chapter translation language. */
  language: string;
  /** Content ratings included in search/browse. */
  contentRating: ContentRating[];
  /** Download compressed (data-saver) images instead of originals. */
  dataSaver: boolean;
  /** Concurrent image fetches per download. */
  concurrency: number;
  /** Split volume/manga downloads into one CBZ per chapter. */
  splitByChapter: boolean;
  update: (patch: Partial<Omit<SettingsState, "update">>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en",
      contentRating: DEFAULT_CONTENT_RATINGS,
      dataSaver: false,
      concurrency: 4,
      splitByChapter: false,
      update: (patch) => set(patch),
    }),
    { name: "harbor-settings" },
  ),
);
