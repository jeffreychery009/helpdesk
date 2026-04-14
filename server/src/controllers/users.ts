import crypto from "crypto";
import type { Request, Response } from "express";
import { hashPassword } from "better-auth/crypto";
import { createUserSchema, updateUserSchema } from "core/schemas/user";
import prisma from "../lib/prisma";

export async function getUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
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

export async function updateUser(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const duplicate = await prisma.user.findUnique({ where: { email } });
    if (duplicate && duplicate.id !== id) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    if (password) {
      const hashed = await hashPassword(password);
      await prisma.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { password: hashed },
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name, email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.role === "ADMIN") {
      res.status(403).json({ error: "Admin users cannot be deleted" });
      return;
    }

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: id } }),
      prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);

    res.json({ message: "User deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete user" });
  }
}
