import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Page layout: one page at a time, two-page spread, or continuous webtoon strip. */
export type ReaderMode = "single" | "double" | "strip";
/** Page-turn direction for paged modes (ignored by the vertical strip). */
export type ReaderDirection = "ltr" | "rtl";
/** How each page is scaled to the viewport. */
export type ReaderFit = "contain" | "width" | "height" | "original";

export interface ReaderSettingsState {
  mode: ReaderMode;
  direction: ReaderDirection;
  fit: ReaderFit;
  /** Add spacing between pages in webtoon (strip) mode. */
  gap: boolean;
  /** Treat the first page as a standalone cover in double-page mode. */
  doubleCover: boolean;
  update: (patch: Partial<Omit<ReaderSettingsState, "update">>) => void;
}

export const useReaderSettings = create<ReaderSettingsState>()(
  persist(
    (set) => ({
      mode: "single",
      direction: "ltr",
      fit: "contain",
      gap: true,
      doubleCover: true,
      update: (patch) => set(patch),
    }),
    { name: "harbor-reader" },
  ),
);
