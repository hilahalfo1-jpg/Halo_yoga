"use client";

import { useState, useEffect } from "react";

type SiteContent = Record<string, Record<string, string>>;

let cachedContent: SiteContent | null = null;
let fetchPromise: Promise<SiteContent> | null = null;

function fetchSiteContent(): Promise<SiteContent> {
  if (cachedContent) return Promise.resolve(cachedContent);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/site-content", { cache: "no-store" })
    .then((r) => r.json())
    .then((json) => {
      cachedContent = json.data || {};
      fetchPromise = null;
      return cachedContent!;
    })
    .catch(() => {
      fetchPromise = null;
      return {} as SiteContent;
    });

  return fetchPromise;
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(cachedContent || {});
  const [loaded, setLoaded] = useState(!!cachedContent);

  useEffect(() => {
    fetchSiteContent().then((data) => {
      setContent(data);
      setLoaded(true);
    });
  }, []);

  /** Get a value for section.key with a fallback default */
  const t = (section: string, key: string, fallback: string): string => {
    return content[section]?.[key] ?? fallback;
  };

  return { content, loaded, t };
}
