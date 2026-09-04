import { type ReactNode, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="block w-full border-collapse text-sm sm:table">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="hidden bg-bg-subtle sm:table-header-group">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="block divide-y-0 sm:table-row-group sm:divide-y sm:divide-border">{children}</tbody>
  );
}

export function TableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="mb-3 block rounded-md border border-border p-3 last:mb-0 sm:mb-0 sm:table-row sm:rounded-none sm:border-0 sm:p-0 sm:hover:bg-bg-subtle">
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn("px-4 py-2.5 text-left font-medium text-fg-muted", className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
  label,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { label?: string }) {
  return (
    <td
      data-label={label}
      className={cn(
        "text-fg",
        label
          ? "flex items-center justify-between gap-4 py-1.5 before:font-medium before:text-fg-muted before:content-[attr(data-label)]"
          : "block py-1.5",
        "sm:table-cell sm:px-4 sm:py-2.5 sm:before:content-none",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}
