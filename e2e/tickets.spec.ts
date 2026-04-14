import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = "http://localhost:3001/api";

const ADMIN_EMAIL = "testadmin@example.com";
const ADMIN_PASSWORD = "TestPassword123!";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Authenticate against the Better Auth endpoint and return the session cookie
 * string so it can be passed in subsequent API requests.
 */
async function getAdminSessionCookie(
  request: import("@playwright/test").APIRequestContext
): Promise<string> {
  const response = await request.post(
    `${API_BASE}/auth/sign-in/email`,
    {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    }
  );
  expect(response.status()).toBe(200);

  const setCookieHeaders = response.headers()["set-cookie"];
  expect(setCookieHeaders).toBeTruthy();

  // Playwright returns multiple Set-Cookie headers as a single
  // newline-delimited string.  We extract the first token of each cookie
  // (name=value) and rejoin them for use in the Cookie header.
  const cookieValue = setCookieHeaders
    .split("\n")
    .map((line) => line.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  return cookieValue;
}

// ---------------------------------------------------------------------------
// Tests — Webhook endpoint (no auth required)
// ---------------------------------------------------------------------------

// A valid baseline payload reused across tests. Each test that mutates fields
// spreads a fresh copy so tests remain independent.
const VALID_PAYLOAD = {
  subject: "Test ticket subject",
  body: "Test ticket body",
  senderEmail: "sender@example.com",
  senderName: "Test Sender",
} as const;

test.describe("POST /api/webhooks/inbound-email", () => {
  test("creates a ticket and returns all fields with correct defaults", async ({
    request,
  }) => {
    const response = await request.post(`${API_BASE}/webhooks/inbound-email`, {
      data: { ...VALID_PAYLOAD },
    });

    expect(response.status()).toBe(200);

    const { ticket } = await response.json();

    // Echoed input fields
    expect(ticket).toMatchObject({
      subject: VALID_PAYLOAD.subject,
      body: VALID_PAYLOAD.body,
      senderEmail: VALID_PAYLOAD.senderEmail,
      senderName: VALID_PAYLOAD.senderName,
    });

    // Server-generated fields
    expect(typeof ticket.id).toBe("string");
    expect(ticket.id.length).toBeGreaterThan(0);
    expect(typeof ticket.createdAt).toBe("string");
    expect(typeof ticket.updatedAt).toBe("string");

    // Default values
    expect(ticket.status).toBe("OPEN");
    expect(ticket.category).toBe("GENERAL_QUESTION");
    expect(ticket.assignedToId).toBeNull();
  });

  // Missing required fields — each omission should yield a 400 with the
  // exact Zod error message defined in core/src/schemas/ticket.ts.
  // When a field is absent entirely, Zod produces a type-level error before
  // reaching the custom min/email messages.
  const MISSING_FIELD_ERROR = "Invalid input: expected string, received undefined";

  const missingFieldCases: Array<[string, Record<string, string>, string]> = [
    [
      "subject is missing",
      { body: VALID_PAYLOAD.body, senderEmail: VALID_PAYLOAD.senderEmail, senderName: VALID_PAYLOAD.senderName },
      MISSING_FIELD_ERROR,
    ],
    [
      "body is missing",
      { subject: VALID_PAYLOAD.subject, senderEmail: VALID_PAYLOAD.senderEmail, senderName: VALID_PAYLOAD.senderName },
      MISSING_FIELD_ERROR,
    ],
    [
      "senderEmail is missing",
      { subject: VALID_PAYLOAD.subject, body: VALID_PAYLOAD.body, senderName: VALID_PAYLOAD.senderName },
      MISSING_FIELD_ERROR,
    ],
    [
      "senderName is missing",
      { subject: VALID_PAYLOAD.subject, body: VALID_PAYLOAD.body, senderEmail: VALID_PAYLOAD.senderEmail },
      MISSING_FIELD_ERROR,
    ],
  ];

  for (const [description, payload, expectedError] of missingFieldCases) {
    test(`returns 400 when ${description}`, async ({ request }) => {
      const response = await request.post(`${API_BASE}/webhooks/inbound-email`, {
        data: payload,
      });

      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toBe(expectedError);
    });
  }

  // Invalid field values — present but failing Zod validation.
  const invalidValueCases: Array<[string, Record<string, string>, string]> = [
    [
      "subject is an empty string",
      { ...VALID_PAYLOAD, subject: "" },
      "Subject is required",
    ],
    [
      "body is an empty string",
      { ...VALID_PAYLOAD, body: "" },
      "Body is required",
    ],
    [
      "senderEmail is not a valid email address",
      { ...VALID_PAYLOAD, senderEmail: "not-an-email" },
      "Invalid sender email",
    ],
    [
      "senderName is an empty string",
      { ...VALID_PAYLOAD, senderName: "" },
      "Sender name is required",
    ],
  ];

  for (const [description, payload, expectedError] of invalidValueCases) {
    test(`returns 400 when ${description}`, async ({ request }) => {
      const response = await request.post(`${API_BASE}/webhooks/inbound-email`, {
        data: payload,
      });

      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toBe(expectedError);
    });
  }
});

// ---------------------------------------------------------------------------
// Tests — Tickets list endpoint (auth required)
// ---------------------------------------------------------------------------

test.describe("GET /api/tickets", () => {
  test("returns 401 when called without authentication", async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE}/tickets`);
    expect(response.status()).toBe(401);
  });

  test("returns 200 and a tickets array when authenticated as admin", async ({
    request,
  }) => {
    const sessionCookie = await getAdminSessionCookie(request);

    const response = await request.get(`${API_BASE}/tickets`, {
      headers: { Cookie: sessionCookie },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("tickets");
    expect(Array.isArray(body.tickets)).toBe(true);
  });

  test("ticket created via webhook appears in the authenticated list", async ({
    request,
  }) => {
    // 1. Create a ticket through the webhook (no auth needed)
    const webhookResponse = await request.post(
      `${API_BASE}/webhooks/inbound-email`,
      {
        data: {
          subject: "Auth List E2E Ticket",
          body: "Verifying the ticket shows up in the authenticated list.",
          senderEmail: "list-check@example.com",
          senderName: "List Check Sender",
        },
      }
    );
    expect(webhookResponse.status()).toBe(200);
    const { ticket: created } = await webhookResponse.json();

    // 2. Fetch the ticket list as an authenticated admin
    const sessionCookie = await getAdminSessionCookie(request);
    const listResponse = await request.get(`${API_BASE}/tickets`, {
      headers: { Cookie: sessionCookie },
    });

    expect(listResponse.status()).toBe(200);
    const { tickets } = await listResponse.json();
    expect(Array.isArray(tickets)).toBe(true);

    // 3. Confirm the newly created ticket is present
    const found = tickets.find(
      (t: { id: string }) => t.id === created.id
    );
    expect(found).toBeDefined();
    expect(found).toMatchObject({
      id: created.id,
      subject: "Auth List E2E Ticket",
      senderEmail: "list-check@example.com",
    });
  });
});
