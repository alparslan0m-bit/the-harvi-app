import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { fetchContentAccess } from "@/services/accessService";

// Re-export for backward compatibility
export type { ContentAccessEntry } from "@/services/accessService";

export function useModuleAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content_access", user?.id],
    queryFn: () => fetchContentAccess(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,    // 5 min — invalidated after purchase
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    networkMode: "offlineFirst",
    retry: 0,
  });
}
