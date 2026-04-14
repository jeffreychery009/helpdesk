import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "testadmin@example.com";
const ADMIN_PASSWORD = "TestPassword123!";

const NEW_USER_NAME = "E2E Test Agent";
const NEW_USER_EMAIL = "e2e-testagent@example.com";
const NEW_USER_PASSWORD = "AgentPass123!";

const UPDATED_NAME = "E2E Updated Agent";
const UPDATED_EMAIL = "e2e-updated@example.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  // Wait until the authenticated layout is visible
  await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible({
    timeout: 15_000,
  });
}

async function navigateToUsers(page: Page) {
  await page.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL(/\/users/);
  await expect(page.getByText("All Users")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Tests — serial: create → edit → delete share a single user lifecycle
// ---------------------------------------------------------------------------

test.describe("User management (happy paths)", () => {
  test.describe.configure({ mode: "serial" });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  // -------------------------------------------------------------------------
  // 1. List / Read
  // -------------------------------------------------------------------------

  test("admin can navigate to /users and see the users list", async () => {
    await navigateToUsers(page);

    // The page heading and card are rendered
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByText("All Users")).toBeVisible();

    // Column headers confirm the table is present
    await expect(
      page.getByRole("columnheader", { name: "User" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Email" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Role" })
    ).toBeVisible();

    // The seeded admin user must appear in the list
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 2. Create user
  // -------------------------------------------------------------------------

  test("admin can create a new agent user", async () => {
    await navigateToUsers(page);

    // Open the Create User dialog
    await page.getByRole("button", { name: "Create User" }).click();
    await expect(
      page.getByRole("dialog", { name: "Create User" })
    ).toBeVisible();

    // Fill in the form
    await page.getByLabel("Name").fill(NEW_USER_NAME);
    await page.getByLabel("Email").fill(NEW_USER_EMAIL);
    await page.getByLabel("Password").fill(NEW_USER_PASSWORD);

    // Submit
    await page
      .getByRole("dialog", { name: "Create User" })
      .getByRole("button", { name: "Create User" })
      .click();

    // Dialog closes on success
    await expect(
      page.getByRole("dialog", { name: "Create User" })
    ).not.toBeVisible();

    // New user appears in the table
    await expect(page.getByText(NEW_USER_NAME)).toBeVisible();
    await expect(page.getByText(NEW_USER_EMAIL)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 3. Edit user
  // -------------------------------------------------------------------------

  test("admin can edit the newly created user's details", async () => {
    await navigateToUsers(page);

    // Locate the row for the new user and click its edit (pencil) button
    const userRow = page.getByRole("row", { name: new RegExp(NEW_USER_NAME) });
    await expect(userRow).toBeVisible();

    await userRow.getByRole("button").first().click(); // pencil icon button

    // Edit dialog opens and is pre-populated
    const dialog = page.getByRole("dialog", { name: "Edit User" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Name")).toHaveValue(NEW_USER_NAME);
    await expect(dialog.getByLabel("Email")).toHaveValue(NEW_USER_EMAIL);

    // Update name and email
    await dialog.getByLabel("Name").clear();
    await dialog.getByLabel("Name").fill(UPDATED_NAME);

    await dialog.getByLabel("Email").clear();
    await dialog.getByLabel("Email").fill(UPDATED_EMAIL);

    // Submit
    await dialog.getByRole("button", { name: "Save Changes" }).click();

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // Updated values appear in the table
    await expect(page.getByText(UPDATED_NAME)).toBeVisible();
    await expect(page.getByText(UPDATED_EMAIL)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 4. Delete user
  // -------------------------------------------------------------------------

  test("admin can delete the updated user", async () => {
    await navigateToUsers(page);

    // Locate the row by the updated name
    const userRow = page.getByRole("row", { name: new RegExp(UPDATED_NAME) });
    await expect(userRow).toBeVisible();

    // The delete button is the second icon button in the row (trash icon)
    await userRow.getByRole("button").nth(1).click();

    // Confirm dialog
    const confirmDialog = page.getByRole("alertdialog");
    await expect(confirmDialog).toBeVisible();
    await expect(
      confirmDialog.getByRole("heading", { name: "Delete User" })
    ).toBeVisible();
    await expect(
      confirmDialog.getByText(new RegExp(UPDATED_NAME))
    ).toBeVisible();

    // Confirm deletion
    await confirmDialog.getByRole("button", { name: "Delete" }).click();

    // Dialog closes
    await expect(confirmDialog).not.toBeVisible();

    // User is no longer in the table
    await expect(page.getByText(UPDATED_NAME)).not.toBeVisible();
    await expect(page.getByText(UPDATED_EMAIL)).not.toBeVisible();
  });
});
