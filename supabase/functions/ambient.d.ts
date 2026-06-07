/**
 * Minimal types for Edge Functions when workspace TypeScript is not Deno-aware.
 * HTTPS / mapped imports are stubbed here so IDE + `tsc` can analyze these files.
 */
declare const Deno: {
  env: { get(key: string): string | undefined };
};

declare module "std/http/server.ts" {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare module "supabase" {
  // Actual shape is `@supabase/supabase-js`; `any` keeps these files error-free under plain tsc.
  // deno/supabase-deploy still type-checks via Deno where configured.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createClient(...args: any[]): any;
}
