"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Heart } from "lucide-react";
import { addFavorite, isFavorite, removeFavorite } from "@/lib/db/library";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import type { MangaDetail } from "@/lib/mangadex/types";

export function FavoriteButton({ manga }: { manga: MangaDetail }) {
  const fav = useLiveQuery(() => isFavorite(manga.id), [manga.id], false);

  async function toggle() {
    if (fav) {
      await removeFavorite(manga.id);
    } else {
      await addFavorite({
        mangaId: manga.id,
        title: manga.title,
        coverUrl: manga.coverThumbUrl ?? manga.coverUrl,
        status: manga.status,
        at: Date.now(),
      });
    }
  }

  return (
    <Button variant={fav ? "secondary" : "outline"} onClick={toggle}>
      <Heart className={cn(fav && "fill-primary text-primary")} />
      {fav ? "Favorited" : "Favorite"}
    </Button>
  );
}
