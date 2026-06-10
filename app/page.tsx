import { Flame, Clock, Trophy, Sparkles } from "lucide-react";
import { Rail } from "@/components/rail";
import { BrowseExplorer } from "@/components/browse-explorer";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1760px] space-y-12 px-4 pb-20 pt-8 sm:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface/30 px-6 py-12 sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 size-72 rounded-full bg-secondary/15 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Powered by MangaDex · downloads as CBZ
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Your harbor for{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              manga
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-balance text-muted-foreground">
            Browse the catalogue, read in a distraction-free reader, and download
            whole volumes or chapters as clean CBZ files — straight to your disk.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Press{" "}
            <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[11px]">
              ⌘K
            </kbd>{" "}
            to search.
          </p>
        </div>
      </section>

      <Rail
        title="Popular Now"
        icon={<Flame className="size-5 text-primary" />}
        params={{ order: "popular", limit: 20 }}
        priority
      />
      <Rail
        title="Latest Updates"
        icon={<Clock className="size-5 text-secondary" />}
        params={{ order: "latest", limit: 20 }}
      />
      <Rail
        title="Top Rated"
        icon={<Trophy className="size-5 text-accent" />}
        params={{ order: "rating", limit: 20 }}
      />

      <BrowseExplorer />
    </div>
  );
}
