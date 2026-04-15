import { PgBoss } from "pg-boss";

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL!,
  schema: "pgboss",
});

boss.on("error", (err) => console.error("pg-boss error:", err));

export default boss;
