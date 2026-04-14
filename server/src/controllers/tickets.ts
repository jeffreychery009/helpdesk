import type { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function getTickets(_req: Request, res: Response) {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
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
