import { test, expect, type Page } from "@playwright/test";

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

// ---------------------------------------------------------------------------
// Helper — log in via the browser UI and land on a post-login page
// ---------------------------------------------------------------------------

async function loginAsBrowserAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  // Wait until the authenticated layout nav is present — this confirms
  // the redirect completed and the session is active
  await expect(page.getByRole("link", { name: "Ticket Manager" })).toBeVisible({
    timeout: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Tests — GET /api/tickets/:id (auth required)
// ---------------------------------------------------------------------------

test.describe("GET /api/tickets/:id", () => {
  test("returns 401 when called without authentication", async ({ request }) => {
    const response = await request.get(`${API_BASE}/tickets/nonexistent-id`);
    expect(response.status()).toBe(401);
  });

  test("returns 404 for a nonexistent ticket ID", async ({ request }) => {
    const sessionCookie = await getAdminSessionCookie(request);
    const response = await request.get(
      `${API_BASE}/tickets/00000000-0000-0000-0000-000000000000`,
      { headers: { Cookie: sessionCookie } }
    );
    expect(response.status()).toBe(404);
  });

  test("returns ticket with replies and assignedTo when authenticated", async ({
    request,
  }) => {
    // Create a ticket via webhook first
    const webhookRes = await request.post(`${API_BASE}/webhooks/inbound-email`, {
      data: {
        subject: "Detail API Test Ticket",
        body: "Body for detail endpoint test.",
        senderEmail: "detail-api@example.com",
        senderName: "Detail Sender",
      },
    });
    expect(webhookRes.status()).toBe(200);
    const { ticket: created } = await webhookRes.json();

    const sessionCookie = await getAdminSessionCookie(request);
    const res = await request.get(`${API_BASE}/tickets/${created.id}`, {
      headers: { Cookie: sessionCookie },
    });

    expect(res.status()).toBe(200);
    const { ticket } = await res.json();

    expect(ticket).toMatchObject({
      id: created.id,
      subject: "Detail API Test Ticket",
      body: "Body for detail endpoint test.",
      senderEmail: "detail-api@example.com",
      senderName: "Detail Sender",
      status: "OPEN",
      category: "GENERAL_QUESTION",
    });

    // Response must include replies array and assignedTo field
    expect(Array.isArray(ticket.replies)).toBe(true);
    expect(ticket).toHaveProperty("assignedTo");
  });
});

// ---------------------------------------------------------------------------
// Tests — PATCH /api/tickets/:id (auth required)
// ---------------------------------------------------------------------------

test.describe("PATCH /api/tickets/:id", () => {
  test("updates ticket status", async ({ request }) => {
    const webhookRes = await request.post(`${API_BASE}/webhooks/inbound-email`, {
      data: {
        ...VALID_PAYLOAD,
        subject: "Status Update Test",
        senderEmail: "status-update@example.com",
      },
    });
    expect(webhookRes.status()).toBe(200);
    const { ticket: created } = await webhookRes.json();

    const sessionCookie = await getAdminSessionCookie(request);
    const patchRes = await request.patch(`${API_BASE}/tickets/${created.id}`, {
      headers: { Cookie: sessionCookie },
      data: { status: "RESOLVED" },
    });

    expect(patchRes.status()).toBe(200);
    const { ticket } = await patchRes.json();

    expect(ticket.id).toBe(created.id);
    expect(ticket.status).toBe("RESOLVED");
    // Response must include replies (to keep client cache consistent)
    expect(Array.isArray(ticket.replies)).toBe(true);
  });

  test("updates ticket category", async ({ request }) => {
    const webhookRes = await request.post(`${API_BASE}/webhooks/inbound-email`, {
      data: {
        ...VALID_PAYLOAD,
        subject: "Category Update Test",
        senderEmail: "category-update@example.com",
      },
    });
    expect(webhookRes.status()).toBe(200);
    const { ticket: created } = await webhookRes.json();

    const sessionCookie = await getAdminSessionCookie(request);
    const patchRes = await request.patch(`${API_BASE}/tickets/${created.id}`, {
      headers: { Cookie: sessionCookie },
      data: { category: "REFUND_REQUEST" },
    });

    expect(patchRes.status()).toBe(200);
    const { ticket } = await patchRes.json();

    expect(ticket.id).toBe(created.id);
    expect(ticket.category).toBe("REFUND_REQUEST");
    expect(Array.isArray(ticket.replies)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — POST /api/tickets/:id/replies (auth required)
// ---------------------------------------------------------------------------

test.describe("POST /api/tickets/:id/replies", () => {
  test("creates a reply with senderType AGENT and the authenticated user as author", async ({
    request,
  }) => {
    // Create a ticket to reply to
    const webhookRes = await request.post(`${API_BASE}/webhooks/inbound-email`, {
      data: {
        ...VALID_PAYLOAD,
        subject: "Reply Creation Test",
        senderEmail: "reply-creation@example.com",
      },
    });
    expect(webhookRes.status()).toBe(200);
    const { ticket: created } = await webhookRes.json();

    const sessionCookie = await getAdminSessionCookie(request);
    const replyRes = await request.post(
      `${API_BASE}/tickets/${created.id}/replies`,
      {
        headers: { Cookie: sessionCookie },
        data: { body: "This is a test reply from an agent." },
      }
    );

    expect(replyRes.status()).toBe(201);
    const { reply } = await replyRes.json();

    expect(reply).toMatchObject({
      body: "This is a test reply from an agent.",
      senderType: "AGENT",
    });
    expect(typeof reply.id).toBe("string");
    expect(reply.id.length).toBeGreaterThan(0);
    // Author should be populated with id and name
    expect(reply.author).toBeDefined();
    expect(typeof reply.author.id).toBe("string");
    expect(typeof reply.author.name).toBe("string");
    expect(reply.isAiGenerated).toBe(false);
  });

  test("returns 401 when called without authentication", async ({ request }) => {
    const webhookRes = await request.post(`${API_BASE}/webhooks/inbound-email`, {
      data: {
        ...VALID_PAYLOAD,
        subject: "Reply Unauth Test",
        senderEmail: "reply-unauth@example.com",
      },
    });
    expect(webhookRes.status()).toBe(200);
    const { ticket: created } = await webhookRes.json();

    const replyRes = await request.post(
      `${API_BASE}/tickets/${created.id}/replies`,
      { data: { body: "Should be rejected." } }
    );
    expect(replyRes.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Tests — Ticket detail page (browser)
// ---------------------------------------------------------------------------

test.describe("Ticket detail page", () => {
  test("shows ticket subject, sender info, and body after navigating from the list", async ({
    page,
    request,
  }) => {
    // Create a ticket via API so we have a known ID
    const webhookRes = await request.post(`${API_BASE}/webhooks/inbound-email`, {
      data: {
        subject: "Browser Detail Test Subject",
        body: "Browser detail test body content.",
        senderEmail: "browser-detail@example.com",
        senderName: "Browser Detail Sender",
      },
    });
    expect(webhookRes.status()).toBe(200);
    const { ticket: created } = await webhookRes.json();

    await loginAsBrowserAdmin(page);

    // Navigate directly to the ticket detail page
    await page.goto(`/tickets/${created.id}`);

    // Subject appears in the CardTitle
    await expect(page.getByText("Browser Detail Test Subject")).toBeVisible();

    // Sender name and email are shown in the From section
    await expect(page.getByText("Browser Detail Sender")).toBeVisible();
    await expect(page.getByText("browser-detail@example.com")).toBeVisible();

    // Message body is rendered
    await expect(page.getByText("Browser detail test body content.")).toBeVisible();

    // Back link is present
    await expect(
      page.getByRole("link", { name: /Back to tickets/i })
    ).toBeVisible();

    // Empty reply state shown when there are no replies
    await expect(page.getByText("No replies yet.")).toBeVisible();
  });

  test("posts a reply via the form and the reply appears in the thread", async ({
    page,
    request,
  }) => {
    const webhookRes = await request.post(`${API_BASE}/webhooks/inbound-email`, {
      data: {
        subject: "Browser Reply Test Subject",
        body: "Original ticket body.",
        senderEmail: "browser-reply@example.com",
        senderName: "Browser Reply Sender",
      },
    });
    expect(webhookRes.status()).toBe(200);
    const { ticket: created } = await webhookRes.json();

    await loginAsBrowserAdmin(page);
    await page.goto(`/tickets/${created.id}`);

    // Wait for the page to fully load (subject visible)
    await expect(page.getByText("Browser Reply Test Subject")).toBeVisible();

    // Type a reply and submit
    const replyText = "This is a browser-submitted agent reply.";
    await page.getByPlaceholder("Write a reply...").fill(replyText);
    await page.getByRole("button", { name: "Send Reply" }).click();

    // The reply body should appear in the thread
    await expect(page.getByText(replyText)).toBeVisible();

    // The "Agent" badge should appear next to the reply
    await expect(page.getByText("Agent")).toBeVisible();

    // Textarea should be cleared after successful submission
    await expect(page.getByPlaceholder("Write a reply...")).toHaveValue("");
  });
});
