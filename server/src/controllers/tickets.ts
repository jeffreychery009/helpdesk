import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import {
  ticketQuerySchema,
  ticketStatuses,
  ticketCategories,
} from "core/schemas/ticket";
import type { TicketStatus, TicketCategory } from "core/schemas/ticket";

const VALID_STATUSES = new Set<string>(ticketStatuses);
const VALID_CATEGORIES = new Set<string>(ticketCategories);

export async function getTickets(req: Request, res: Response) {
  try {
    const result = ticketQuerySchema.safeParse(req.query);
    const {
      sortBy,
      sortOrder,
      status,
      category,
      search,
      page,
      pageSize,
    } = result.success
      ? result.data
      : {
          sortBy: "createdAt" as const,
          sortOrder: "desc" as const,
          status: undefined,
          category: undefined,
          search: undefined,
          page: 1,
          pageSize: 20,
        };

    const statusList = status
      ? (status.split(",").filter((s) => VALID_STATUSES.has(s)) as TicketStatus[])
      : [];
    const categoryList = category
      ? (category.split(",").filter((c) => VALID_CATEGORIES.has(c)) as TicketCategory[])
      : [];

    const where = {
      ...(statusList.length ? { status: { in: statusList } } : {}),
      ...(categoryList.length ? { category: { in: categoryList } } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: "insensitive" as const } },
              { senderName: { contains: search, mode: "insensitive" as const } },
              { senderEmail: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [tickets, total] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({ tickets, total, page, pageSize });
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
