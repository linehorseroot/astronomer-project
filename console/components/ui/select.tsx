import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-border bg-card px-2 text-sm outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary aria-[invalid=true]:border-status-failed",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";
