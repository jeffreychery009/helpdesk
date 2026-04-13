import path from "path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.resolve(__dirname, "..", ".env.test") });

export default async function globalTeardown() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    await client.query(
      `TRUNCATE TABLE ticket_reply, ticket, verification, account, session, "user" CASCADE`
    );
    console.log("[e2e] Test data cleaned up");
  } catch (error) {
    // Non-fatal: the next global-setup will re-seed anyway
    console.error("[e2e] Warning: cleanup failed:", error);
  } finally {
    await client.end();
  }
}
