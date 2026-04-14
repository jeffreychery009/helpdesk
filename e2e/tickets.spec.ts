import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = "http://localhost:3001/api";

const ADMIN_EMAIL = "testadmin@example.com";
const ADMIN_PASSWORD = "TestPassword123!";

const WEBHOOK_PAYLOAD = {
  subject: "E2E Test Ticket",
  body: "This is a test ticket created by the E2E suite.",
  senderEmail: "e2e-sender@example.com",
  senderName: "E2E Sender",
};

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

test.describe("POST /api/webhooks/inbound-email", () => {
  test("returns 200 and a ticket object for a valid payload", async ({
    request,
  }) => {
    const response = await request.post(
      `${API_BASE}/webhooks/inbound-email`,
      { data: WEBHOOK_PAYLOAD }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("ticket");

    const { ticket } = body;
    expect(ticket).toMatchObject({
      subject: WEBHOOK_PAYLOAD.subject,
      senderEmail: WEBHOOK_PAYLOAD.senderEmail,
      senderName: WEBHOOK_PAYLOAD.senderName,
      body: WEBHOOK_PAYLOAD.body,
      status: expect.any(String),
    });
    expect(ticket.id).toBeTruthy();
    expect(ticket.createdAt).toBeTruthy();
    expect(ticket.updatedAt).toBeTruthy();
  });

  test("returns 400 when senderEmail is missing", async ({ request }) => {
    const { senderEmail: _omitted, ...payloadWithoutEmail } = WEBHOOK_PAYLOAD;

    const response = await request.post(
      `${API_BASE}/webhooks/inbound-email`,
      { data: payloadWithoutEmail }
    );

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  test("returns 400 when body field is missing", async ({ request }) => {
    const { body: _omitted, ...payloadWithoutBody } = WEBHOOK_PAYLOAD;

    const response = await request.post(
      `${API_BASE}/webhooks/inbound-email`,
      { data: payloadWithoutBody }
    );

    expect(response.status()).toBe(400);

    const responseBody = await response.json();
    expect(responseBody).toHaveProperty("error");
    expect(typeof responseBody.error).toBe("string");
    expect(responseBody.error.length).toBeGreaterThan(0);
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
