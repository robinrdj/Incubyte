import { useDebouncedValue } from "@mantine/hooks";
import type { CompensationReportDto, GroupBy } from "@salary/shared";
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext.js";
import { GROUP_OPTIONS } from "../components/analytics/group-options.js";
import { useAsync } from "./useAsync.js";

/** Avoids a flash of "Updating" on instant, cached switches. */
const UPDATING_DELAY_MS = 150;

/** Cached per grouping and date, and prefetches the other groupings. */
export function useCompensationReport(
  groupBy: GroupBy,
  asOf: string,
): {
  report: CompensationReportDto | undefined;
  loading: boolean;
  updating: boolean;
  error: unknown;
} {
  const { api } = useAuth();
  const cache = useRef(new Map<string, Promise<CompensationReportDto>>());

  const load = useCallback(
    (group: GroupBy, date: string): Promise<CompensationReportDto> => {
      const key = `${group}|${date}`;
      const cached = cache.current.get(key);
      if (cached !== undefined) return cached;
      const request = api.compensation(group, date === "" ? undefined : date);
      cache.current.set(key, request);
      request.catch(() => cache.current.delete(key));
      return request;
    },
    [api],
  );

  const result = useAsync(load, [groupBy, asOf]);

  const firstLoaded = result.data !== undefined;
  useEffect(() => {
    if (!firstLoaded) return;
    for (const option of GROUP_OPTIONS) {
      load(option.value, asOf).catch(() => undefined);
    }
  }, [firstLoaded, asOf, load]);

  const [slow] = useDebouncedValue(result.loading, UPDATING_DELAY_MS);

  return {
    report: result.data,
    loading: result.loading,
    updating: result.loading && slow && result.data !== undefined,
    error: result.error,
  };
}
