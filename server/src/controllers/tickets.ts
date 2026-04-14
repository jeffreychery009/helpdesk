import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { ticketSortSchema } from "core/schemas/ticket";

export async function getTickets(req: Request, res: Response) {
  try {
    const result = ticketSortSchema.safeParse(req.query);
    const { sortBy, sortOrder } = result.success
      ? result.data
      : { sortBy: "createdAt" as const, sortOrder: "desc" as const };

    const tickets = await prisma.ticket.findMany({
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
