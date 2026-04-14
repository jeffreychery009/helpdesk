import { describe, it, expect } from "vitest";
import { inboundEmailSchema } from "core/schemas/ticket";

const VALID_PAYLOAD = {
  subject: "Test subject",
  body: "Test body",
  senderEmail: "sender@example.com",
  senderName: "Test Sender",
};

describe("inboundEmailSchema", () => {
  it("accepts a valid payload", () => {
    const result = inboundEmailSchema.safeParse(VALID_PAYLOAD);
    expect(result.success).toBe(true);
  });

  it.each([
    ["subject", { ...VALID_PAYLOAD, subject: undefined }],
    ["body", { ...VALID_PAYLOAD, body: undefined }],
    ["senderEmail", { ...VALID_PAYLOAD, senderEmail: undefined }],
    ["senderName", { ...VALID_PAYLOAD, senderName: undefined }],
  ])("fails when %s is missing", (_field, payload) => {
    const result = inboundEmailSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it.each([
    ["subject", { ...VALID_PAYLOAD, subject: "" }, "Subject is required"],
    ["body", { ...VALID_PAYLOAD, body: "" }, "Body is required"],
    ["senderEmail", { ...VALID_PAYLOAD, senderEmail: "not-an-email" }, "Invalid sender email"],
    ["senderName", { ...VALID_PAYLOAD, senderName: "" }, "Sender name is required"],
  ])("fails with correct message when %s is invalid", (_field, payload, expectedMessage) => {
    const result = inboundEmailSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(expectedMessage);
    }
  });
});
