import crypto from "crypto";
import type { Request, Response } from "express";
import { hashPassword } from "better-auth/crypto";
import { createUserSchema } from "core/schemas/user";
import prisma from "../lib/prisma";

export async function getUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ users });
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email,
        emailVerified: false,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            providerId: "credential",
            accountId: email,
            password: hashed,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({ user });
  } catch {
    res.status(500).json({ error: "Failed to create user" });
  }
}
