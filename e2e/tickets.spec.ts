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
