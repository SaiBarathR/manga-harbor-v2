"use client";

import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/store/settings";
import { CONTENT_RATINGS, type ContentRating } from "@/lib/mangadex/types";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
  { code: "es", label: "Spanish" },
  { code: "es-la", label: "Spanish (LA)" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt-br", label: "Portuguese (BR)" },
  { code: "ru", label: "Russian" },
  { code: "pl", label: "Polish" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
];

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsDialog() {
  const {
    language,
    contentRating,
    dataSaver,
    concurrency,
    splitByChapter,
    update,
  } = useSettings();

  function toggleRating(r: ContentRating) {
    const has = contentRating.includes(r);
    const next = has
      ? contentRating.filter((x) => x !== r)
      : [...contentRating, r];
    // Never allow an empty set (would break search).
    update({ contentRating: next.length ? next : [r] });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Settings">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Preferences are saved on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border/60">
          <Row label="Translation language" hint="Used for chapters & reading">
            <select
              value={language}
              onChange={(e) => update({ language: e.target.value })}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/60"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </Row>

          <div className="py-3">
            <p className="text-sm font-medium">Content rating</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Which ratings appear in search & browse
            </p>
            <div className="flex flex-wrap gap-2">
              {CONTENT_RATINGS.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleRating(r)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                    contentRating.includes(r)
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-surface/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <Row
            label="Data saver"
            hint="Download/read compressed images (smaller, lower quality)"
          >
            <Switch
              checked={dataSaver}
              onCheckedChange={(v) => update({ dataSaver: v })}
            />
          </Row>

          <Row
            label="Split into per-chapter CBZ"
            hint="Volume/all downloads become one CBZ per chapter"
          >
            <Switch
              checked={splitByChapter}
              onCheckedChange={(v) => update({ splitByChapter: v })}
            />
          </Row>

          <Row label="Download concurrency" hint={`${concurrency} images at a time`}>
            <input
              type="range"
              min={1}
              max={8}
              value={concurrency}
              onChange={(e) => update({ concurrency: Number(e.target.value) })}
              className="w-32 accent-[var(--color-primary)]"
            />
          </Row>
        </div>
      </DialogContent>
    </Dialog>
  );
}
