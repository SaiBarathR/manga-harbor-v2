import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingBadge({
  rating,
  className,
}: {
  rating: number | null;
  className?: string;
}) {
  if (rating == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-0.5 text-xs font-semibold text-accent backdrop-blur-sm",
        className,
      )}
    >
      <Star className="size-3 fill-accent" />
      {rating.toFixed(2)}
    </span>
  );
}
