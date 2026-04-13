import "dotenv/config";
import crypto from "crypto";
import prisma from "./lib/prisma";
import { Role } from "./generated/prisma/client";
import { hashPassword } from "better-auth/crypto";

const AGENT_EMAIL = process.env.AGENT_EMAIL || "testagent@example.com";
const AGENT_PASSWORD = process.env.AGENT_PASSWORD || "AgentPassword123!";
const AGENT_NAME = "Test Agent";

async function seedAgent() {
  const existing = await prisma.user.findUnique({
    where: { email: AGENT_EMAIL },
  });

  if (existing) {
    console.log(`Agent user already exists: ${AGENT_EMAIL}`);
    return;
  }

  const hashed = await hashPassword(AGENT_PASSWORD);

  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: AGENT_NAME,
      email: AGENT_EMAIL,
      emailVerified: true,
      role: Role.AGENT,
      accounts: {
        create: {
          id: crypto.randomUUID(),
          providerId: "credential",
          accountId: AGENT_EMAIL,
          password: hashed,
        },
      },
    },
  });

  console.log(`Agent user created: ${user.email}`);
}

seedAgent()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
