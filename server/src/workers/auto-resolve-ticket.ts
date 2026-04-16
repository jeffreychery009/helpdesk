import * as Sentry from "@sentry/node";
import { readFileSync } from "fs";
import { resolve } from "path";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import prisma from "../lib/prisma";
import boss from "../lib/queue";

const QUEUE_NAME = "auto-resolve-ticket";

const knowledgeBase = readFileSync(
  resolve(process.cwd(), "knowledge-base.md"),
  "utf-8",
);

export interface AutoResolveTicketData {
  ticketId: string;
  subject: string;
  body: string;
}

const AI_AGENT_EMAIL = "ai@system.internal";

let aiAgentId: string | null = null;

async function getAiAgentId(): Promise<string | null> {
  if (aiAgentId) return aiAgentId;
  const agent = await prisma.user.findUnique({
    where: { email: AI_AGENT_EMAIL },
    select: { id: true },
  });
  aiAgentId = agent?.id ?? null;
  return aiAgentId;
}

export async function registerAutoResolveTicketWorker() {
  await boss.createQueue(QUEUE_NAME);

  await boss.work<AutoResolveTicketData>(QUEUE_NAME, async ([job]) => {
    const { ticketId, subject, body } = job.data;
    const agentId = await getAiAgentId();

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "PROCESSING", assignedToId: agentId },
    });

    try {
      const { text } = await generateText({
        model: openai("gpt-4.1-nano"),
        system:
          "You are a support agent for Code with Mosh. You have access to the following knowledge base:\n\n" +
          knowledgeBase +
          "\n\n" +
          "Given a customer support ticket, determine if you can fully answer the question using ONLY the knowledge base above.\n\n" +
          "IMPORTANT: You MUST escalate to a human agent if:\n" +
          "- The user threatens legal action\n" +
          "- The user requests a refund outside the 30-day window\n" +
          "- The user disputes a charge or mentions a chargeback\n" +
          "- The issue involves account security concerns\n" +
          "- The question cannot be fully answered by the knowledge base\n\n" +
          "Respond in JSON format ONLY:\n" +
          '{ "canResolve": true, "answer": "your helpful answer here" } if you can answer from the KB\n' +
          '{ "canResolve": false } if the ticket needs human attention',
        prompt: `Subject: ${subject}\n\nBody: ${body}`,
      });

      let parsed: { canResolve: boolean; answer?: string };
      try {
        parsed = JSON.parse(text);
      } catch {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "OPEN", assignedToId: null },
        });
        return;
      }

      if (parsed.canResolve && parsed.answer) {
        await prisma.$transaction([
          prisma.ticket.update({
            where: { id: ticketId },
            data: { status: "RESOLVED", resolvedAt: new Date() },
          }),
          prisma.ticketReply.create({
            data: {
              ticketId,
              body: parsed.answer,
              senderType: "AGENT",
              authorId: null,
              isAiGenerated: true,
            },
          }),
        ]);
      } else {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "OPEN", assignedToId: null },
        });
      }
    } catch (err) {
      console.error("Auto-resolve ticket error:", err);
      Sentry.captureException(err);
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "OPEN", assignedToId: null },
      });
    }
  });
}

export async function enqueueAutoResolveTicket(data: AutoResolveTicketData) {
  await boss.send(QUEUE_NAME, data);
}
