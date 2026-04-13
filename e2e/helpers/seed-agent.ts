import { execSync } from "child_process";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env.test") });

export const AGENT_EMAIL = "testagent@example.com";
export const AGENT_PASSWORD = "AgentPassword123!";

const serverDir = path.resolve(__dirname, "..", "..", "server");

export async function seedAgent(): Promise<void> {
  execSync("bunx tsx src/seed-agent.ts", {
    cwd: serverDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
      AGENT_EMAIL,
      AGENT_PASSWORD,
    },
  });
}

export async function cleanupAgent(): Promise<void> {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    await client.query(
      `DELETE FROM account WHERE "accountId" = $1`,
      [AGENT_EMAIL]
    );
    await client.query(
      `DELETE FROM "user" WHERE email = $1`,
      [AGENT_EMAIL]
    );
  } finally {
    await client.end();
  }
}
