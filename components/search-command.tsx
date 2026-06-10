"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { Search, CornerDownLeft, Loader2 } from "lucide-react";
import { api, proxyUrl } from "@/lib/api";
import { useSettings } from "@/lib/store/settings";
import { cn } from "@/lib/utils";
import { RatingBadge } from "./rating-badge";
import { StatusPill } from "./status-pill";

export function SearchCommand({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRating = useSettings((s) => s.contentRating);

  // Global ⌘K / Ctrl+K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounce the query (matches the old app's 300ms feel).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced, contentRating],
    queryFn: ({ signal }) =>
      api.browse(
        { q: debounced, order: "relevance", limit: 8, contentRating },
        signal,
      ),
    enabled: open && debounced.length > 0,
    staleTime: 30_000,
  });

  const results = data?.items ?? [];

  function go(id: string) {
    setOpen(false);
    setQuery("");
    router.push(`/manga/${id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 text-sm text-muted-foreground transition-colors hover:border-ring/40 hover:bg-surface",
          className,
        )}
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search manga…</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              inputRef.current?.focus();
            }}
            className="fixed left-1/2 top-[12vh] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <Dialog.Title className="sr-only">Search manga</Dialog.Title>
            <Command shouldFilter={false} className="flex flex-col">
              <div className="flex items-center gap-2 border-b border-border px-4">
                {isFetching ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="size-4 text-muted-foreground" />
                )}
                <Command.Input
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search for a manga…"
                  className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                {debounced.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Type to search the MangaDex catalogue.
                  </p>
                )}
                {debounced.length > 0 && !isFetching && results.length === 0 && (
                  <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No manga found for “{debounced}”.
                  </Command.Empty>
                )}
                {results.map((m) => (
                  <Command.Item
                    key={m.id}
                    value={m.id}
                    onSelect={() => go(m.id)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-surface-2"
                  >
                    {m.coverThumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proxyUrl(m.coverThumbUrl)}
                        alt=""
                        className="h-12 w-9 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-9 shrink-0 rounded bg-surface-2" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.title}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StatusPill status={m.status} year={m.year} />
                        <RatingBadge rating={m.rating} />
                      </div>
                    </div>
                    <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground opacity-0 data-[selected=true]:opacity-100" />
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
