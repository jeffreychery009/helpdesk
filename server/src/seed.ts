import "dotenv/config";
import crypto from "crypto";
import prisma from "./lib/prisma";
import { Role } from "./generated/prisma/client";
import { hashPassword } from "better-auth/crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  process.exit(1);
}

async function seed() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL! },
  });

  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    return;
  }

  const hashed = await hashPassword(ADMIN_PASSWORD!);

  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Admin",
      email: ADMIN_EMAIL!,
      emailVerified: true,
      role: Role.ADMIN,
      accounts: {
        create: {
          id: crypto.randomUUID(),
          providerId: "credential",
          accountId: ADMIN_EMAIL!,
          password: hashed,
        },
      },
    },
  });

  console.log(`Admin user created: ${user.email}`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
