import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none",
        "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary",
        "aria-[invalid=true]:border-status-failed",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
