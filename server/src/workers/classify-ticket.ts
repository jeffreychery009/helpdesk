import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { ticketCategories } from "core/schemas/ticket";
import type { TicketCategory } from "core/schemas/ticket";
import prisma from "../lib/prisma";
import boss from "../lib/queue";

const QUEUE_NAME = "classify-ticket";
const VALID_CATEGORIES = new Set<string>(ticketCategories);

export interface ClassifyTicketData {
  ticketId: string;
  subject: string;
  body: string;
}

export async function registerClassifyTicketWorker() {
  await boss.createQueue(QUEUE_NAME);

  await boss.work<ClassifyTicketData>(QUEUE_NAME, async ([job]) => {
    const { ticketId, subject, body } = job.data;

    const { text } = await generateText({
      model: openai("gpt-4.1-nano"),
      system:
        "You are a ticket classifier. Given a support ticket's subject and body, " +
        "classify it into exactly one of these categories: GENERAL_QUESTION, TECHNICAL_QUESTION, REFUND_REQUEST. " +
        "Return only the category name, nothing else.",
      prompt: `Subject: ${subject}\n\nBody: ${body}`,
    });

    const category = text.trim();
    if (!VALID_CATEGORIES.has(category)) return;

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { category: category as TicketCategory },
    });
  });
}

export async function enqueueClassifyTicket(data: ClassifyTicketData) {
  await boss.send(QUEUE_NAME, data);
}
