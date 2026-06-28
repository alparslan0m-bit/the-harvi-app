import { useMemo, useState } from "react";
import { UserStats } from "@/types";

export type FilterKey = "all" | "strong" | "improving" | "weak";

export function masteryTier(m: number): FilterKey {
  if (m >= 80) return "strong";
  if (m >= 50) return "improving";
  return "weak";
}

export function useMasteryFilter(allData: UserStats["subject_mastery"]) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(() => ({
    strong:    allData.filter((i) => i.mastery >= 80).length,
    improving: allData.filter((i) => i.mastery >= 50 && i.mastery < 80).length,
    weak:      allData.filter((i) => i.mastery < 50).length,
  }), [allData]);

  const overallAvg = allData.length
    ? Math.round(allData.reduce((s, i) => s + i.mastery, 0) / allData.length)
    : 0;

  const items = useMemo(() => {
    return allData.filter((item) => {
      const matchSearch = search === "" || item.subject.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || masteryTier(item.mastery) === filter;
      return matchSearch && matchFilter;
    });
  }, [allData, search, filter]);

  return {
    search,
    setSearch,
    filter,
    setFilter,
    counts,
    overallAvg,
    items,
  };
}
