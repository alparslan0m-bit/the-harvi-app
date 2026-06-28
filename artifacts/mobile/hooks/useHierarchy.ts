import { useQuery } from "@tanstack/react-query";

import { fetchHierarchy } from "@/services/hierarchyService";

export function useHierarchy() {
  return useQuery({
    queryKey: ["hierarchy"],
    queryFn: fetchHierarchy,
    staleTime: 1000 * 60 * 10,       // consider fresh for 10 min
    gcTime: 1000 * 60 * 60 * 24,     // keep in memory 24 h
    networkMode: "offlineFirst",      // attempt even without network
    retry: 1,
  });
}
