import { test, expect } from "@playwright/test";
import {
  seedAgent,
  cleanupAgent,
  AGENT_EMAIL,
  AGENT_PASSWORD,
} from "./helpers/seed-agent";

const ADMIN_EMAIL = "testadmin@example.com";
const ADMIN_PASSWORD = "TestPassword123!";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string
) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

// ---------------------------------------------------------------------------
// Successful login
// ---------------------------------------------------------------------------

test.describe("Successful login", () => {
  test("admin can log in and reach the home page", async ({ page }) => {
    await page.goto("/login");

    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // After login we should land on the home page with the Layout nav
    await expect(
      page.getByRole("link", { name: "Ticket Manager" })
    ).toBeVisible();

    // The Sign Out button proves we are authenticated
    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();

    // Admin should see the Users link
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login form validation (client-side)
// ---------------------------------------------------------------------------

test.describe("Login form validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows error when submitting empty fields", async ({ page }) => {
    await page.getByRole("button", { name: "Sign In" }).click();

    // The form uses zod: email must be valid, password is required
    await expect(page.getByText("Please enter a valid email address")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("shows error for invalid email format", async ({ page }) => {
    // Use a value that passes HTML5 type="email" but fails zod's stricter validation
    // Alternatively, we can verify the browser's built-in validation fires
    const emailInput = page.getByLabel("Email");
    await emailInput.fill("not-an-email");
    await page.getByLabel("Password").fill("anything");
    await page.getByRole("button", { name: "Sign In" }).click();

    // The browser's native validation for type="email" should prevent submission.
    // Check that the email input reports as invalid via the :invalid pseudo-class.
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test("shows error when only password is empty", async ({ page }) => {
    await page.getByLabel("Email").fill("user@example.com");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Password is required")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Failed login attempts
// ---------------------------------------------------------------------------

test.describe("Failed login attempts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("wrong password shows server error", async ({ page }) => {
    await login(page, ADMIN_EMAIL, "WrongPassword999!");

    // Better Auth returns an error message for bad credentials
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });

  test("non-existent email shows server error", async ({ page }) => {
    await login(page, "nobody@example.com", "SomePassword123!");

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

test.describe("Session persistence", () => {
  test("user stays logged in after page reload", async ({ page }) => {
    await page.goto("/login");
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Wait for navigation to complete
    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();

    // Reload and verify session is still valid
    await page.reload();

    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();

    // The user name is shown in the nav
    await expect(page.getByText("Admin")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Logout flow
// ---------------------------------------------------------------------------

test.describe("Logout flow", () => {
  test("clicking Sign Out returns to login page", async ({ page }) => {
    await page.goto("/login");
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Sign Out" }).click();

    // Should be back on the login page
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });

  test("after logout, accessing protected route redirects to login", async ({
    page,
  }) => {
    await page.goto("/login");
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Sign Out" }).click();

    // Wait until we are on /login
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    // Now try to visit the protected home page directly
    await page.goto("/");

    // Should redirect back to /login
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Protected route redirect
// ---------------------------------------------------------------------------

test.describe("Protected route redirect", () => {
  test("unauthenticated user visiting / is redirected to /login", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user visiting /users is redirected to /login", async ({
    page,
  }) => {
    await page.goto("/users");

    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Admin route redirect (agent user)
// ---------------------------------------------------------------------------

test.describe("Admin route guard", () => {
  test.beforeAll(async () => {
    await seedAgent();
  });

  test.afterAll(async () => {
    await cleanupAgent();
  });

  test("agent user cannot access /users and is redirected to /", async ({
    page,
  }) => {
    await page.goto("/login");
    await login(page, AGENT_EMAIL, AGENT_PASSWORD);

    // Agent should reach home page (no Users link in nav)
    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();

    // The "Users" link should NOT appear for agents
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();

    // Directly navigate to /users
    await page.goto("/users");

    // AdminRoute redirects non-admin to /
    // We should be on the home page, not the users page
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);

    // Confirm we are still authenticated (nav is visible)
    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Already-authenticated redirect
// ---------------------------------------------------------------------------

test.describe("Login page redirect when already authenticated", () => {
  test("authenticated user visiting /login is redirected to /", async ({
    page,
  }) => {
    // Log in first
    await page.goto("/login");
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();

    // Now visit /login explicitly
    await page.goto("/login");

    // LoginPage checks session and does <Navigate to="/" />
    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
  });
});
