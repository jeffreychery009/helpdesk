import type { Request, Response } from "express";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { inboundEmailSchema, ticketCategories } from "core/schemas/ticket";
import type { TicketCategory } from "core/schemas/ticket";
import type { Ticket } from "../generated/prisma/client";
import prisma from "../lib/prisma";

const VALID_CATEGORIES = new Set<string>(ticketCategories);

async function classifyTicket(ticket: Pick<Ticket, "id" | "subject" | "body">) {
  try {
    const { text } = await generateText({
      model: openai("gpt-4.1-nano"),
      system:
        "You are a ticket classifier. Given a support ticket's subject and body, " +
        "classify it into exactly one of these categories: GENERAL_QUESTION, TECHNICAL_QUESTION, REFUND_REQUEST. " +
        "Return only the category name, nothing else.",
      prompt: `Subject: ${ticket.subject}\n\nBody: ${ticket.body}`,
    });

    const category = text.trim();
    if (!VALID_CATEGORIES.has(category)) return;

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { category: category as TicketCategory },
    });
  } catch (err) {
    console.error("Auto-classify ticket error:", err);
  }
}

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

    // Fire-and-forget: classify in the background without blocking the response
    classifyTicket(ticket);

    res.json({ ticket });
  } catch {
    res.status(500).json({ error: "Failed to process email" });
  }
}
