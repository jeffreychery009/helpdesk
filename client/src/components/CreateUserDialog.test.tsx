import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import CreateUserDialog from "./CreateUserDialog";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

import api from "@/lib/api";

const mockedApi = vi.mocked(api);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderDialog() {
  const queryClient = createQueryClient();
  return {
    user: userEvent.setup(),
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CreateUserDialog />
      </QueryClientProvider>
    ),
  };
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /create user/i }));
  await screen.findByRole("heading", { name: /create user/i });
}

describe("CreateUserDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the trigger button", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: /create user/i })).toBeInTheDocument();
  });

  it("opens the dialog when trigger is clicked", async () => {
    const { user } = renderDialog();
    await openDialog(user);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty form", async () => {
    const { user } = renderDialog();
    await openDialog(user);

    await user.click(screen.getByRole("button", { name: /^create user$/i }));

    expect(await screen.findByText("Name must be at least 3 characters")).toBeInTheDocument();
    expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  it("shows validation error for short name", async () => {
    const { user } = renderDialog();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "AB");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /^create user$/i }));

    expect(await screen.findByText("Name must be at least 3 characters")).toBeInTheDocument();
  });

  it("shows validation error for short password", async () => {
    const { user } = renderDialog();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: /^create user$/i }));

    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  it("shows validation error for missing email", async () => {
    const { user } = renderDialog();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "Test User");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /^create user$/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it("calls API with form data on valid submission", async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { user: { id: "1" } } });
    const { user } = renderDialog();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "securepass123");
    await user.click(screen.getByRole("button", { name: /^create user$/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/api/users", {
        name: "Jane Doe",
        email: "jane@example.com",
        password: "securepass123",
      });
    });
  });

  it("closes dialog on successful submission", async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { user: { id: "1" } } });
    const { user } = renderDialog();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "securepass123");
    await user.click(screen.getByRole("button", { name: /^create user$/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    });
  });

  it("shows server error on API failure", async () => {
    const axiosError = new AxiosError(
      "Conflict",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 409,
        data: { error: "A user with this email already exists" },
        statusText: "Conflict",
        headers: {},
        config: { headers: new AxiosHeaders() },
      }
    );
    mockedApi.post.mockRejectedValueOnce(axiosError);
    const { user } = renderDialog();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "securepass123");
    await user.click(screen.getByRole("button", { name: /^create user$/i }));

    expect(await screen.findByText("A user with this email already exists")).toBeInTheDocument();
  });

  it("shows generic error when API fails without error message", async () => {
    mockedApi.post.mockRejectedValueOnce(new Error("Network failure"));
    const { user } = renderDialog();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "securepass123");
    await user.click(screen.getByRole("button", { name: /^create user$/i }));

    expect(await screen.findByText("Failed to create user")).toBeInTheDocument();
  });

  it("does not call API when form is invalid", async () => {
    const { user } = renderDialog();
    await openDialog(user);

    await user.click(screen.getByRole("button", { name: /^create user$/i }));

    await screen.findByText("Name must be at least 3 characters");
    expect(mockedApi.post).not.toHaveBeenCalled();
  });
});
