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

export const ticketFilterSchema = z.object({
  // Comma-separated lists, e.g. "OPEN,RESOLVED"
  status: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
});

export const ticketPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export const ticketQuerySchema = ticketSortSchema
  .merge(ticketFilterSchema)
  .merge(ticketPaginationSchema);

export type TicketQueryParams = z.infer<typeof ticketQuerySchema>;

export type InboundEmailPayload = z.infer<typeof inboundEmailSchema>;

export const ticketStatuses = ["OPEN", "RESOLVED", "CLOSED"] as const;
export const ticketCategories = [
  "GENERAL_QUESTION",
  "TECHNICAL_QUESTION",
  "REFUND_REQUEST",
] as const;

export type TicketStatus = (typeof ticketStatuses)[number];
export type TicketCategory = (typeof ticketCategories)[number];

export const ticketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  senderName: z.string(),
  senderEmail: z.string(),
  status: z.enum(ticketStatuses),
  category: z.enum(ticketCategories),
  assignedToId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const assignTicketSchema = z.object({
  assignedToId: z.string().nullable(),
});

export const updateTicketSchema = z.object({
  status: z.enum(ticketStatuses).optional(),
  category: z.enum(ticketCategories).optional(),
});

export const replySenderTypes = ["AGENT", "CUSTOMER"] as const;
export type ReplySenderType = (typeof replySenderTypes)[number];

export const createReplySchema = z.object({
  body: z.string().min(1, "Reply body is required"),
});

export const polishReplySchema = z.object({
  body: z.string().min(1, "Reply body is required"),
});

export type TicketReply = {
  id: string;
  body: string;
  senderType: ReplySenderType;
  authorId: string | null;
  author: { id: string; name: string } | null;
  isAiGenerated: boolean;
  createdAt: string;
};
