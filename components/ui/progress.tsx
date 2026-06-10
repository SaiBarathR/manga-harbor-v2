"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    value?: number;
    indeterminate?: boolean;
  }
>(({ className, value = 0, indeterminate = false, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2",
      className,
    )}
    value={indeterminate ? undefined : value}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "size-full flex-1 rounded-full bg-gradient-to-r from-primary to-secondary transition-transform duration-300",
        indeterminate && "animate-pulse",
      )}
      style={{
        transform: indeterminate
          ? "translateX(-60%)"
          : `translateX(-${100 - Math.min(100, Math.max(0, value))}%)`,
      }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";
