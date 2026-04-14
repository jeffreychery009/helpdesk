import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { ticketQuerySchema } from "core/schemas/ticket";
import type { TicketStatus, TicketCategory } from "core/schemas/ticket";

const VALID_STATUSES = new Set<string>(["OPEN", "RESOLVED", "CLOSED"]);
const VALID_CATEGORIES = new Set<string>([
  "GENERAL_QUESTION",
  "TECHNICAL_QUESTION",
  "REFUND_REQUEST",
]);

export async function getTickets(req: Request, res: Response) {
  try {
    const result = ticketQuerySchema.safeParse(req.query);
    const { sortBy, sortOrder, status, category, search } = result.success
      ? result.data
      : { sortBy: "createdAt" as const, sortOrder: "desc" as const, status: undefined, category: undefined, search: undefined };

    const statusList = status
      ? (status.split(",").filter((s) => VALID_STATUSES.has(s)) as TicketStatus[])
      : [];
    const categoryList = category
      ? (category.split(",").filter((c) => VALID_CATEGORIES.has(c)) as TicketCategory[])
      : [];

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(statusList.length ? { status: { in: statusList } } : {}),
        ...(categoryList.length ? { category: { in: categoryList } } : {}),
        ...(search
          ? {
              OR: [
                { subject: { contains: search, mode: "insensitive" } },
                { senderName: { contains: search, mode: "insensitive" } },
                { senderEmail: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { [sortBy]: sortOrder },
    });

    res.json({ tickets });
  } catch {
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
}

export async function getTicket(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json({ ticket });
  } catch {
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
}
