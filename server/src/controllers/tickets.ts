import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import {
  ticketQuerySchema,
  assignTicketSchema,
  updateTicketSchema,
  createReplySchema,
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

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json({ ticket });
  } catch {
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
}

export async function updateTicket(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const parsed = updateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: parsed.data,
      include: {
        assignedTo: {
          select: { id: true, name: true },
        },
        replies: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    res.json({ ticket });
  } catch {
    res.status(500).json({ error: "Failed to update ticket" });
  }
}

export async function assignTicket(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const parsed = assignTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { assignedToId } = parsed.data;

    if (assignedToId) {
      const user = await prisma.user.findUnique({
        where: { id: assignedToId, deletedAt: null },
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { assignedToId },
      include: {
        assignedTo: {
          select: { id: true, name: true },
        },
        replies: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    res.json({ ticket });
  } catch {
    res.status(500).json({ error: "Failed to assign ticket" });
  }
}

export async function createReply(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const parsed = createReplySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        body: parsed.data.body,
        senderType: "AGENT",
        authorId: req.user!.id,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({ reply });
  } catch {
    res.status(500).json({ error: "Failed to create reply" });
  }
}

export async function getAssignees(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    res.json({ users });
  } catch {
    res.status(500).json({ error: "Failed to fetch assignees" });
  }
}
