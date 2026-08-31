"use client";

import { createCachedFetchHook } from "@/lib/hooks/createCachedFetchHook";

type SiteContent = Record<string, Record<string, string>>;

const EMPTY_CONTENT: SiteContent = {};

const useSiteContentData = createCachedFetchHook<SiteContent>(
  "/api/site-content",
  (json) => json?.data ?? null
);

export function useSiteContent() {
  const { data, loaded } = useSiteContentData();
  const content = data ?? EMPTY_CONTENT;

  /** Get a value for section.key with a fallback default */
  const t = (section: string, key: string, fallback: string): string => {
    // Empty/whitespace values count as unset — legacy "" rows must fall back (hiding-by-emptying was never a feature)
    const v = content[section]?.[key];
    return v && v.trim() ? v : fallback;
  };

  return { content, loaded, t };
}
