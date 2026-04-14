import { z } from "zod";

export const inboundEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  senderEmail: z.string().email("Invalid sender email"),
  senderName: z.string().min(1, "Sender name is required"),
});

export const ticketSortableColumns = [
  "subject",
  "senderName",
  "category",
  "status",
  "createdAt",
] as const;

export type TicketSortableColumn = (typeof ticketSortableColumns)[number];

export const ticketSortSchema = z.object({
  sortBy: z.enum(ticketSortableColumns).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type TicketSortParams = z.infer<typeof ticketSortSchema>;

export type InboundEmailPayload = z.infer<typeof inboundEmailSchema>;

export type TicketStatus = "OPEN" | "RESOLVED" | "CLOSED";

export type TicketCategory =
  | "GENERAL_QUESTION"
  | "TECHNICAL_QUESTION"
  | "REFUND_REQUEST";

export const ticketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  senderName: z.string(),
  senderEmail: z.string(),
  status: z.enum(["OPEN", "RESOLVED", "CLOSED"]),
  category: z.enum(["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST"]),
  assignedToId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Ticket = z.infer<typeof ticketSchema>;
