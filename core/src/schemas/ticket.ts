import { z } from "zod";

export const inboundEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  senderEmail: z.string().email("Invalid sender email"),
  senderName: z.string().min(1, "Sender name is required"),
});

export type InboundEmailPayload = z.infer<typeof inboundEmailSchema>;
