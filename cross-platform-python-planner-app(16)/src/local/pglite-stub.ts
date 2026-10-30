/* Browser-bundle stand-in for "@electric-sql/pglite" (mobile build only, see next.config.ts).
   The real PGlite runtime is loaded at runtime from /pglite/index.js (see src/local/db.ts), because
   bundling PGlite breaks its internal `import.meta.url` asset lookups. drizzle-orm/pglite imports
   `PGlite` only to construct a client when given a string — we always pass a ready client. */
export class PGlite {
  constructor() {
    throw new Error("PGlite must be loaded at runtime via getLocalDb()");
  }
}

/** PostgreSQL type OIDs that drizzle-orm/pglite reads to configure its result parsers. */
export const types = {
  BOOL: 16,
  BYTEA: 17,
  INT8: 20,
  JSON: 114,
  DATE: 1082,
  TIME: 1083,
  TIMESTAMP: 1114,
  TIMESTAMPTZ: 1184,
  INTERVAL: 1186,
  TIMETZ: 1266,
  NUMERIC: 1700,
  UUID: 2950,
  JSONB: 3802,
} as const;
