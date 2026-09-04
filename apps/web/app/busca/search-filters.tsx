"use client";

import { useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * spec: storefront/discovery - "Discovery search filters by city and
 * category". City/category live in the URL's search params, not client
 * state (nextjs-frontend-conventions - "a per-user selection that changes
 * what a page shows belongs in the URL"), so the Server Component parent
 * re-fetches with the new filter values.
 */
export function SearchFilters({ city, category }: { city: string; category: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [cityValue, setCityValue] = useState(city);
  const [categoryValue, setCategoryValue] = useState(category);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (cityValue.trim()) params.set("city", cityValue.trim());
    else params.delete("city");
    if (categoryValue.trim()) params.set("category", categoryValue.trim());
    else params.delete("category");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Input
        label="Cidade"
        name="city"
        value={cityValue}
        onChange={(e) => setCityValue(e.target.value)}
        placeholder="São Paulo"
      />
      <Input
        label="Categoria"
        name="category"
        value={categoryValue}
        onChange={(e) => setCategoryValue(e.target.value)}
        placeholder="Bar"
      />
      <Button type="submit" isLoading={isPending}>
        Buscar
      </Button>
    </form>
  );
}
