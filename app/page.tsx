import { Flame, Clock, Trophy } from "lucide-react";
import { Rail } from "@/components/rail";
import { HeroCarousel } from "@/components/hero-carousel";
import { BrowseExplorer } from "@/components/browse-explorer";

export default function HomePage() {
  return (
    <div className="space-y-12 pb-20">
      {/* Full-bleed billboard — spans the viewport edge to edge */}
      <HeroCarousel />

      <div className="mx-auto max-w-[1760px] space-y-12 px-4 sm:px-6">
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
    </div>
  );
}
