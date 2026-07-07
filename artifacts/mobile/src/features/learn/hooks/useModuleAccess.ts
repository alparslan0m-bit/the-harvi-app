import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/src/shared/store/authStore";
import { fetchContentAccess } from "@/src/features/learn/services/accessService";



export function useModuleAccess() {
  const user = useAuth((s) => s.user);

  return useQuery({
    queryKey: ["content_access", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not logged in");
      return fetchContentAccess(user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,    // 5 min — invalidated after purchase
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    networkMode: "offlineFirst",
    retry: 0,
  });
}
