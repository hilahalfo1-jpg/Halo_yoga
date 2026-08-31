"use client";

import { createCachedFetchHook } from "@/lib/hooks/createCachedFetchHook";
import { WORKING_HOURS } from "@/lib/constants";

interface WorkingHoursItem {
  day: string;
  hours: string;
}

const useWorkingHoursData = createCachedFetchHook<WorkingHoursItem[]>(
  "/api/working-hours",
  // An empty rules list is intentionally not cached (pick → null): the hook
  // serves the constants fallback and refetches on the next mount
  (json) => (json?.data?.length ? json.data : null)
);

/** Weekly working hours derived from availability rules; constants as fallback while loading/on error. */
export function useWorkingHours() {
  const { data } = useWorkingHoursData();
  return { workingHours: data ?? WORKING_HOURS };
}
