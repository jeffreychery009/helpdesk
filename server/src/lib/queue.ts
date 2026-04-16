import { PgBoss } from "pg-boss";
import * as Sentry from "@sentry/node";

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL!,
  schema: "pgboss",
});

boss.on("error", (err) => {
  console.error("pg-boss error:", err);
  Sentry.captureException(err);
});

export default boss;
