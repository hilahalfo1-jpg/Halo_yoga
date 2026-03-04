"use client";

import { useState, useEffect } from "react";

interface SiteImageData {
  imagePath: string;
  alt: string;
}

interface SiteImages {
  logo?: SiteImageData;
  logo_dark?: SiteImageData;
  about?: SiteImageData;
  services_bg?: SiteImageData;
  hero?: SiteImageData[];
  [key: string]: SiteImageData | SiteImageData[] | undefined;
}

let cachedImages: SiteImages | null = null;
let fetchPromise: Promise<SiteImages> | null = null;

function fetchSiteImages(): Promise<SiteImages> {
  if (cachedImages) return Promise.resolve(cachedImages);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/site-images", { cache: "no-store" })
    .then((r) => r.json())
    .then((json) => {
      cachedImages = json.data || {};
      fetchPromise = null;
      return cachedImages!;
    })
    .catch(() => {
      fetchPromise = null;
      return {} as SiteImages;
    });

  return fetchPromise;
}

export function useSiteImages() {
  const [images, setImages] = useState<SiteImages>(cachedImages || {});
  const [loaded, setLoaded] = useState(!!cachedImages);

  useEffect(() => {
    fetchSiteImages().then((data) => {
      setImages(data);
      setLoaded(true);
    });
  }, []);

  return { images, loaded };
}
