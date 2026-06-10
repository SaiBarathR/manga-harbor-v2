"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpenCheck, Heart, Download, X } from "lucide-react";
import {
  listDownloads,
  listFavorites,
  listRecentReads,
  removeFavorite,
} from "@/lib/db/library";
import { Cover } from "./cover";
import { StatusPill } from "./status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { formatBytes, formatRelative } from "@/lib/utils";
import type { MangaStatus } from "@/lib/mangadex/types";

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
      <div className="opacity-50">{icon}</div>
      <p className="max-w-xs text-sm">{text}</p>
    </div>
  );
}

export function LibraryView() {
  const reads = useLiveQuery(() => listRecentReads(), [], []);
  const favorites = useLiveQuery(() => listFavorites(), [], []);
  const downloads = useLiveQuery(() => listDownloads(), [], []);

  return (
    <div className="mx-auto max-w-[1760px] px-4 pb-24 pt-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Library</h1>

      <Tabs defaultValue="reading">
        <TabsList>
          <TabsTrigger value="reading">
            <BookOpenCheck className="size-4" /> Continue Reading
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Heart className="size-4" /> Favorites
          </TabsTrigger>
          <TabsTrigger value="downloads">
            <Download className="size-4" /> Downloads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reading">
          {reads.length === 0 ? (
            <EmptyState
              icon={<BookOpenCheck className="size-10" />}
              text="Chapters you read will show up here so you can pick up where you left off."
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {reads.map((r) => (
                <Link
                  key={r.mangaId}
                  href={`/read/${r.chapterId}`}
                  className="group block"
                >
                  <div className="overflow-hidden rounded-xl border border-border/60 transition-all group-hover:-translate-y-1 group-hover:shadow-glow">
                    <Cover src={r.coverUrl} alt={r.mangaTitle} rounded="rounded-none" />
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-sm font-medium">
                    {r.mangaTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {r.chapterNumber ? `Ch ${r.chapterNumber}` : "Read"} ·{" "}
                    {formatRelative(r.at)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites">
          {favorites.length === 0 ? (
            <EmptyState
              icon={<Heart className="size-10" />}
              text="Tap the heart on any manga to keep it here for quick access."
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {favorites.map((f) => (
                <div key={f.mangaId} className="group relative">
                  <Link href={`/manga/${f.mangaId}`} className="block">
                    <div className="overflow-hidden rounded-xl border border-border/60 transition-all group-hover:-translate-y-1 group-hover:shadow-glow">
                      <Cover src={f.coverUrl} alt={f.title} rounded="rounded-none" />
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-sm font-medium">
                      {f.title}
                    </h3>
                    <StatusPill
                      status={(f.status as MangaStatus) ?? null}
                      className="mt-1"
                    />
                  </Link>
                  <button
                    onClick={() => removeFavorite(f.mangaId)}
                    title="Remove favorite"
                    className="absolute right-2 top-2 rounded-md bg-black/50 p-1 text-white opacity-0 backdrop-blur-sm transition hover:bg-destructive group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="downloads">
          {downloads.length === 0 ? (
            <EmptyState
              icon={<Download className="size-10" />}
              text="Your downloaded chapters and volumes will be listed here."
            />
          ) : (
            <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-surface/40">
              {downloads.map((d) => (
                <li key={d.id} className="flex items-center gap-3 p-3">
                  <div className="w-10 shrink-0">
                    <Cover src={d.coverUrl} alt="" rounded="rounded-md" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/manga/${d.mangaId}`}
                      className="truncate text-sm font-medium hover:text-primary"
                    >
                      {d.mangaTitle}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.label} · {formatBytes(d.bytes)} · {formatRelative(d.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
