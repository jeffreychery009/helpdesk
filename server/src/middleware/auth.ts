import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import prisma from "../lib/prisma";

type Session = typeof auth.$Infer.Session;

declare global {
  namespace Express {
    interface Request {
      user: Session["user"];
      session: Session["session"];
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await auth.api.getSession({
    headers: req.headers as unknown as Headers,
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletedAt: true },
  });

  if (user?.deletedAt) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = session.user;
  req.session = session.session;
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
