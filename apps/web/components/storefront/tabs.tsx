"use client";

import { type ReactNode } from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultValue: string;
  children: ReactNode;
  className?: string;
}

/**
 * spec: storefront/showcase - "Showcase page presents offers, about, and
 * location as tabs", "Tab count does not vary by breakpoint": the same tab
 * list renders identically at every breakpoint, so this has no separate
 * mobile/desktop variant.
 */
export function Tabs({ tabs, defaultValue, children, className }: TabsProps) {
  return (
    <RadixTabs.Root defaultValue={defaultValue} className={cn("flex flex-col gap-5", className)}>
      <RadixTabs.List className="flex gap-1 border-b border-sf-border" aria-label="Seções do perfil">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "-mb-px border-b-2 border-transparent px-4 py-2.5 font-mono text-[12px] tracking-[.08em] text-sf-fg-muted transition-colors",
              "data-[state=active]:border-sf-accent data-[state=active]:text-sf-fg",
              "hover:text-sf-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sf-accent",
            )}
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export function TabPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixTabs.Content value={value} className={className}>
      {children}
    </RadixTabs.Content>
  );
}
