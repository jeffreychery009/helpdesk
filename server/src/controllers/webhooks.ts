import type { Request, Response } from "express";
import { inboundEmailSchema } from "core/schemas/ticket";
import prisma from "../lib/prisma";
import { enqueueClassifyTicket } from "../workers/classify-ticket";

export async function inboundEmail(req: Request, res: Response) {
  try {
    const parsed = inboundEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { subject, body, senderEmail, senderName } = parsed.data;

    const ticket = await prisma.ticket.create({
      data: { subject, body, senderEmail, senderName },
    });

    await enqueueClassifyTicket({
      ticketId: ticket.id,
      subject: ticket.subject,
      body: ticket.body,
    });

    res.json({ ticket });
  } catch {
    res.status(500).json({ error: "Failed to process email" });
  }
}
