"use client";

import { createCachedFetchHook } from "@/lib/hooks/createCachedFetchHook";

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

const EMPTY_IMAGES: SiteImages = {};

const useSiteImagesData = createCachedFetchHook<SiteImages>(
  "/api/site-images",
  (json) => json?.data ?? null
);

export function useSiteImages() {
  const { data, loaded } = useSiteImagesData();
  return { images: data ?? EMPTY_IMAGES, loaded };
}
