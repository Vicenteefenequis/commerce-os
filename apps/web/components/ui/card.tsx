import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface p-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description }: { title: string; description?: string }): ReactNode {
  return (
    <div className="mb-4 flex flex-col gap-1">
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      {description && <p className="text-sm text-fg-muted">{description}</p>}
    </div>
  );
}
