/**
 * @file hierarchyRepository.ts
 * @description Read/write over the four normalized hierarchy tables
 * (plan.md §4, §6.1). Bulk writes chunk through expo-sqlite transactions;
 * assembly into the Year[] tree mirrors `hierarchyService.buildHierarchyFromRemote`.
 */
import type { RepositoryDatabase } from "./types";
import type { Lecture, Module, Subject, Year } from "@/src/shared/types/schemas";

interface YearRow {
  id: string;
  name: string;
  order: number;
}
interface ModuleRow extends YearRow {
  year_id: string;
  external_price_id: string | null;
}
interface SubjectRow {
  id: string;
  name: string;
  module_id: string;
  order: number;
}
interface LectureRow {
  id: string;
  name: string;
  external_id: string;
  subject_id: string;
  question_count: number | null;
  is_free: number | null;
  order: number | null;
}

export class HierarchyRepository {
  constructor(private readonly db: RepositoryDatabase) {}

  /**
   * Replaces the entire hierarchy inside one transaction (delete-all + insert).
   */
  async replaceAll(years: Year[]): Promise<void> {
    await this.db.$client.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("DELETE FROM hierarchy_lectures");
      await txn.runAsync("DELETE FROM hierarchy_subjects");
      await txn.runAsync("DELETE FROM hierarchy_modules");
      await txn.runAsync("DELETE FROM hierarchy_years");

      for (const year of years) {
        await txn.runAsync(
          'INSERT OR REPLACE INTO hierarchy_years (id, name, "order") VALUES (?, ?, ?)',
          year.id,
          year.name,
          year.order,
        );
        for (const mod of year.modules) {
          await txn.runAsync(
            'INSERT OR REPLACE INTO hierarchy_modules (id, name, year_id, "order", external_price_id) VALUES (?, ?, ?, ?, ?)',
            mod.id,
            mod.name,
            year.id,
            mod.order,
            mod.external_price_id ?? null,
          );
          for (const sub of mod.subjects) {
            await txn.runAsync(
              'INSERT OR REPLACE INTO hierarchy_subjects (id, name, module_id, "order") VALUES (?, ?, ?, ?)',
              sub.id,
              sub.name,
              mod.id,
              sub.order,
            );
            for (const lec of sub.lectures) {
              await txn.runAsync(
                'INSERT OR REPLACE INTO hierarchy_lectures (id, name, external_id, subject_id, question_count, is_free, "order") VALUES (?, ?, ?, ?, ?, ?, ?)',
                lec.id,
                lec.name,
                lec.external_id,
                sub.id,
                lec.question_count ?? null,
                lec.is_free == null ? null : lec.is_free ? 1 : 0,
                lec.order ?? 0,
              );
            }
          }
        }
      }
    });
  }

  /**
   * Reads the full hierarchy and assembles it into the Year[] tree shape.
   * Returns null when the cache is empty.
   */
  async getAll(): Promise<Year[] | null> {
    const years = await this.db.$client.getAllAsync<YearRow>(
      'SELECT id, name, "order" FROM hierarchy_years ORDER BY "order"',
    );
    if (years.length === 0) return null;

    const modules = await this.db.$client.getAllAsync<ModuleRow>(
      'SELECT id, name, year_id, "order", external_price_id FROM hierarchy_modules ORDER BY "order"',
    );
    const subjects = await this.db.$client.getAllAsync<SubjectRow>(
      "SELECT id, name, module_id, \"order\" FROM hierarchy_subjects ORDER BY \"order\"",
    );
    const lectures = await this.db.$client.getAllAsync<LectureRow>(
      'SELECT id, name, external_id, subject_id, question_count, is_free, "order" FROM hierarchy_lectures ORDER BY "order"',
    );

    const lecturesBySubject = new Map<string, Lecture[]>();
    for (const lec of lectures) {
      const list = lecturesBySubject.get(lec.subject_id) ?? [];
      list.push({
        id: lec.id,
        name: lec.name,
        external_id: lec.external_id,
        subject_id: lec.subject_id,
        question_count: lec.question_count ?? undefined,
        is_free: lec.is_free == null ? undefined : lec.is_free === 1,
        order: lec.order ?? undefined,
      });
      lecturesBySubject.set(lec.subject_id, list);
    }

    const subjectsByModule = new Map<string, SubjectRow[]>();
    for (const sub of subjects) {
      const list = subjectsByModule.get(sub.module_id) ?? [];
      list.push(sub);
      subjectsByModule.set(sub.module_id, list);
    }

    const modulesByYear = new Map<string, ModuleRow[]>();
    for (const mod of modules) {
      const list = modulesByYear.get(mod.year_id) ?? [];
      list.push(mod);
      modulesByYear.set(mod.year_id, list);
    }

    return years.map((year) => ({
      id: year.id,
      name: year.name,
      order: year.order,
      modules: (modulesByYear.get(year.id) ?? []).map((mod): Module => ({
        id: mod.id,
        name: mod.name,
        year_id: mod.year_id,
        order: mod.order,
        external_price_id: mod.external_price_id,
        subjects: (subjectsByModule.get(mod.id) ?? []).map(
          (sub): Subject => ({
            id: sub.id,
            name: sub.name,
            module_id: sub.module_id,
            order: sub.order,
            lectures: lecturesBySubject.get(sub.id) ?? [],
          }),
        ),
      })),
    }));
  }

  /**
   * Clears all four tables (cache-version bump / fresh assembly).
   */
  async clearAll(): Promise<void> {
    await this.db.$client.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("DELETE FROM hierarchy_lectures");
      await txn.runAsync("DELETE FROM hierarchy_subjects");
      await txn.runAsync("DELETE FROM hierarchy_modules");
      await txn.runAsync("DELETE FROM hierarchy_years");
    });
  }
}