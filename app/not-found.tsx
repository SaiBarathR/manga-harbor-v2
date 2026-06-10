import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-4 py-32 text-center">
      <p className="text-6xl font-bold text-primary/30">404</p>
      <h1 className="text-xl font-semibold">Lost at sea</h1>
      <p className="text-sm text-muted-foreground">
        That page drifted away. Let’s get you back to the harbor.
      </p>
      <Button asChild>
        <Link href="/">
          <Compass /> Back to Discover
        </Link>
      </Button>
    </div>
  );
}
