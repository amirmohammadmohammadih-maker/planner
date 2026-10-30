import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/** The Drizzle instance type used throughout the app.
 *  node-postgres and PGlite instances are structurally compatible for our usage
 *  (select/insert/update/delete/execute/transaction); PGlite instances are cast to this type. */
export type Db = NodePgDatabase;
