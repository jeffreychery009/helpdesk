import type { Request, Response } from "express";
import prisma from "../lib/prisma";

const AI_AGENT_EMAIL = "ai@system.internal";

export async function getStats(_req: Request, res: Response) {
  try {
    const aiAgent = await prisma.user.findUnique({
      where: { email: AI_AGENT_EMAIL },
      select: { id: true },
    });

    const visibleFilter = { status: { notIn: ["NEW" as const, "PROCESSING" as const] } };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalTickets, openTickets, aiResolvedTickets, avgResult, dailyTickets] =
      await prisma.$transaction([
        prisma.ticket.count({ where: visibleFilter }),
        prisma.ticket.count({ where: { status: "OPEN" } }),
        prisma.ticket.count({
          where: {
            status: "RESOLVED",
            ...(aiAgent ? { assignedToId: aiAgent.id } : {}),
          },
        }),
        prisma.$queryRaw<[{ avg_seconds: number | null }]>`
          SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))) as avg_seconds
          FROM ticket
          WHERE "resolvedAt" IS NOT NULL
        `,
        prisma.$queryRaw<{ date: Date | string; count: bigint }[]>`
          SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
          FROM ticket
          WHERE "createdAt" >= ${thirtyDaysAgo}
            AND status NOT IN ('NEW', 'PROCESSING')
          GROUP BY DATE("createdAt")
          ORDER BY date
        `,
      ]);

    const avgSeconds = avgResult[0]?.avg_seconds;
    const avgResolutionMinutes = avgSeconds ? Math.round(avgSeconds / 60) : null;

    const resolvedTickets = await prisma.ticket.count({
      where: { status: "RESOLVED" },
    });
    const aiResolvedPercent =
      resolvedTickets > 0
        ? Math.round((aiResolvedTickets / resolvedTickets) * 100)
        : 0;

    // Build a map of date -> count from the query results
    const countsByDate = new Map<string, number>();
    for (const row of dailyTickets) {
      const dateStr =
        row.date instanceof Date
          ? row.date.toISOString().split("T")[0]
          : String(row.date).split("T")[0];
      countsByDate.set(dateStr, Number(row.count));
    }

    // Fill in all 30 days (including zero-count days)
    const ticketsPerDay: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      ticketsPerDay.push({ date: key, count: countsByDate.get(key) ?? 0 });
    }

    res.json({
      totalTickets,
      openTickets,
      aiResolvedTickets,
      aiResolvedPercent,
      avgResolutionMinutes,
      ticketsPerDay,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
}
