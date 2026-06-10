"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Library } from "lucide-react";
import { SearchCommand } from "./search-command";
import { SettingsDialog } from "./settings-dialog";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/library", label: "Library", icon: Library },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1760px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <span className="text-lg font-semibold tracking-tight">
            Manga Harbor
          </span>
        </Link>

        <div className="mx-auto w-full max-w-md">
          <SearchCommand />
        </div>

        <nav className="flex shrink-0 items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface text-foreground"
                    : "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
          <SettingsDialog />
        </nav>
      </div>
    </header>
  );
}
