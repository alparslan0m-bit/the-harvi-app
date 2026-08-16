/**
 * @file hierarchyService.ts
 * @description Handles fetching, caching, and assembling the learning hierarchy 
 * (Years -> Modules -> Subjects -> Lectures) from Supabase.
 * Includes dynamic foreign key detection to adapt to various database schemas.
 */
import NetInfo from "@react-native-community/netinfo";

import { supabase } from "@/src/shared/services/supabase";
import { isDeviceOnline } from "@/src/shared/utils/netInfo";
import {
  Lecture,
  Module,
  Subject,
  Year,
} from "@/src/shared/types/schemas";
import { getDb } from "@/src/db/client";
import { HierarchyRepository } from "@/src/db/repositories/hierarchyRepository";

const YEAR_FK_CANDIDATES = [
  "year_id",
  "course_id",
  "level_id",
  "stage_id",
  "parent_id",
];
const MODULE_FK_CANDIDATES = [
  "module_id",
  "subject_group_id",
  "section_id",
  "category_id",
  "parent_id",
  "unit_id",
];
const SUBJECT_FK_CANDIDATES = [
  "subject_id",
  "topic_id",
  "section_id",
  "lesson_group_id",
  "parent_id",
  "module_id",
];

function str(v: unknown): string {
  return String(v ?? "");
}
function num(v: unknown): number {
  return Number(v ?? 0);
}

/**
 * Dynamically detects the foreign key column name used in a database row
 * by matching it against a list of known candidates.
 * 
 * @param row - A single record returned from Supabase
 * @param candidates - An array of possible foreign key column names
 * @param table - The name of the table (used for error logging)
 * @returns The resolved foreign key column name
 * @throws {Error} If no matching candidate is found in the row
 */
function detectFK(
  row: Record<string, unknown>,
  candidates: string[],
  table: string,
): string {
  for (const col of candidates) {
    if (col in row) return col;
  }
  console.error(
    `[Hierarchy] Schema error in ${table}: No valid foreign key found. Expected one of: ${candidates.join(", ")}`,
  );
  throw new Error(
    `Schema mismatch in ${table}: Could not detect foreign key column.`,
  );
}

/**
 * Reads the locally cached hierarchy, assembled from the four normalized
 * tables via `HierarchyRepository`.
 *
 * @returns A Promise resolving to the cached hierarchy, or null if empty/invalid
 */
async function readCachedHierarchy(): Promise<Year[] | null> {
  try {
    return await new HierarchyRepository(await getDb()).getAll();
  } catch {
    return null;
  }
}

/**
 * Persists the fully assembled hierarchy for offline access by writing the
 * four normalized tables in one transaction.
 *
 * @param data - The complete Year array to cache
 */
async function writeCachedHierarchy(data: Year[]): Promise<void> {
  try {
    await new HierarchyRepository(await getDb()).replaceAll(data);
  } catch {
    // best-effort
  }
}

/**
 * Fetches all hierarchy tables from Supabase concurrently and assembles them 
 * into a deeply nested tree structure (Year -> Module -> Subject -> Lecture).
 * 
 * Includes a strict 10-second timeout to prevent infinite loading states on poor networks.
 * 
 * @returns A Promise resolving to the fully constructed and sorted hierarchy tree
 * @throws {Error} If the network request times out or a Supabase error occurs
 */
async function buildHierarchyFromRemote(): Promise<Year[]> {
  const queries = Promise.all([
    supabase.from("years").select("*"),
    supabase.from("modules").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("lectures").select("*"),
  ]);

  const timeoutPromise = new Promise<any>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 10000),
  );

  const [
    { data: years, error: yearsErr },
    { data: modules, error: modulesErr },
    { data: subjects, error: subjectsErr },
    { data: lectures, error: lecturesErr },
  ] = await Promise.race([queries, timeoutPromise]);

  if (yearsErr)
    throw new Error(`years: ${yearsErr.message} (${yearsErr.code})`);
  if (modulesErr)
    throw new Error(`modules: ${modulesErr.message} (${modulesErr.code})`);
  if (subjectsErr)
    throw new Error(`subjects: ${subjectsErr.message} (${subjectsErr.code})`);
  if (lecturesErr)
    throw new Error(`lectures: ${lecturesErr.message} (${lecturesErr.code})`);

  const toRec = (v: unknown): Record<string, unknown> =>
    typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

  const firstModule = (modules ?? [])[0];
  const firstSubject = (subjects ?? [])[0];
  const firstLecture = (lectures ?? [])[0];

  const yearFk = firstModule
    ? detectFK(toRec(firstModule), YEAR_FK_CANDIDATES, "modules")
    : "year_id";
  const moduleFk = firstSubject
    ? detectFK(toRec(firstSubject), MODULE_FK_CANDIDATES, "subjects")
    : "module_id";
  const subjectFk = firstLecture
    ? detectFK(toRec(firstLecture), SUBJECT_FK_CANDIDATES, "lectures")
    : "subject_id";

  const lecturesBySubject: Record<string, Lecture[]> = {};
  for (const lec of lectures ?? []) {
    const r = toRec(lec);
    const key = str(r[subjectFk]);
    if (!lecturesBySubject[key]) lecturesBySubject[key] = [];
    lecturesBySubject[key]!.push({
      id: str(r["id"]),
      name: str(r["name"] ?? r["title"]),
      external_id: str(r["external_id"] ?? r["id"]),
      subject_id: key,
      question_count: num(r["question_count"]),
      is_free: r["is_free"] ? Boolean(r["is_free"]) : undefined,
    });
  }

  const subjectsByModule: Record<string, Subject[]> = {};
  for (const sub of subjects ?? []) {
    const r = toRec(sub);
    const key = str(r[moduleFk]);
    if (!subjectsByModule[key]) subjectsByModule[key] = [];
    subjectsByModule[key]!.push({
      id: str(r["id"]),
      name: str(r["name"] ?? r["title"]),
      module_id: key,
      order: num(r["order"] ?? r["sort_order"]),
      lectures: lecturesBySubject[str(r["id"])] ?? [],
    });
  }

  const modulesByYear: Record<string, Module[]> = {};
  for (const mod of modules ?? []) {
    const r = toRec(mod);
    const key = str(r[yearFk]);
    if (!modulesByYear[key]) modulesByYear[key] = [];
    modulesByYear[key]!.push({
      id: str(r["id"]),
      name: str(r["name"] ?? r["title"]),
      year_id: key,
      order: num(r["order"] ?? r["sort_order"]),
      external_price_id: r["external_price_id"]
        ? str(r["external_price_id"])
        : null,
      subjects: (subjectsByModule[str(r["id"])] ?? []).sort(
        (a, b) => a.order - b.order,
      ),
    });
  }

  const getYearOrder = (r: Record<string, unknown>) => {
    const ord = num(r["order"] ?? r["sort_order"]);
    if (ord === 0) {
      const name = str(r["name"] ?? r["title"]);
      const match = name.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
    return ord;
  };

  const sortedYears = [...(years ?? [])].sort(
    (a, b) => getYearOrder(toRec(a)) - getYearOrder(toRec(b)),
  );

  return sortedYears.map((y) => {
    const r = toRec(y);
    return {
      id: str(r["id"]),
      name: str(r["name"] ?? r["title"]),
      order: getYearOrder(r),
      modules: (modulesByYear[str(r["id"])] ?? []).sort(
        (a, b) => a.order - b.order,
      ),
    };
  });
}

/**
 * Main entry point for fetching the course hierarchy.
 * Orchestrates the offline-first fallback logic:
 * 1. If offline, serves immediately from local cache.
 * 2. If online, attempts a network fetch and caches the result.
 * 3. If online but the network request fails/times out, falls back to the cache.
 * 
 * @returns A Promise resolving to the complete learning hierarchy
 * @throws {Error} If the device is offline and no cache exists, or if a fetch fails with no cache
 */
export async function fetchHierarchy(): Promise<Year[]> {
  const net = await NetInfo.fetch();
  const isOnline = isDeviceOnline(net);

  if (!isOnline) {
    const cached = await readCachedHierarchy();
    if (cached) return cached;
    throw new Error("You are offline.");
  }

  try {
    const data = await buildHierarchyFromRemote();
    // Persist fresh data for offline use
    writeCachedHierarchy(data);
    return data;
  } catch (err) {
    // Network unavailable — serve stale cache rather than an error screen
    const cached = await readCachedHierarchy();
    if (cached) return cached;
    throw err;
  }
}
