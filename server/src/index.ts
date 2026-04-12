import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/auth";
import prisma from "./lib/prisma";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Better Auth handler must come before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

app.get("/api/health/me", requireAuth, (req, res) => {
  res.json({ user: req.user, session: req.session });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
