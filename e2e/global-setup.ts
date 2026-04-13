import { execSync } from "child_process";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.resolve(__dirname, "..", ".env.test") });

const TEST_DB = "helpdesk_test";

export default async function globalSetup() {
  const serverDir = path.resolve(__dirname, "..", "server");

  // 1. Create the test database if it doesn't exist
  const client = new pg.Client({
    connectionString:
      "postgresql://postgres:Esmirla33024@localhost:5432/postgres",
  });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TEST_DB]
    );
    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE ${TEST_DB}`);
      console.log(`[e2e] Database "${TEST_DB}" created`);
    } else {
      console.log(`[e2e] Database "${TEST_DB}" already exists`);
    }
  } catch (error) {
    console.error("[e2e] Failed to create test database:", error);
    throw error;
  } finally {
    await client.end();
  }

  // 2. Run Prisma migrations against the test database
  try {
    execSync("bunx prisma migrate deploy", {
      cwd: serverDir,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
    console.log("[e2e] Migrations applied");
  } catch (error) {
    console.error("[e2e] Failed to run migrations:", error);
    throw error;
  }

  // 3. Seed the test admin user
  try {
    execSync("bun run seed", {
      cwd: serverDir,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
    console.log("[e2e] Test admin user seeded");
  } catch (error) {
    console.error("[e2e] Failed to seed test data:", error);
    throw error;
  }
}
