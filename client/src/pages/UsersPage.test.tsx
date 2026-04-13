import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UsersPage from "./UsersPage";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from "@/lib/api";

const mockedApi = vi.mocked(api);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderUsersPage() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersPage />
    </QueryClientProvider>
  );
}

const mockUsers = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "ADMIN" as const,
    createdAt: "2025-01-15T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@example.com",
    role: "AGENT" as const,
    createdAt: "2025-02-20T00:00:00.000Z",
  },
];

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeletons while fetching", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {})); // never resolves
    renderUsersPage();
    expect(screen.getByText("All Users")).toBeInTheDocument();
    expect(screen.getByText("Manage team members and their roles.")).toBeInTheDocument();
  });

  it("renders user table after successful fetch", async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { users: mockUsers } });
    renderUsersPage();

    expect(await screen.findByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();

    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(screen.getByText("AGENT")).toBeInTheDocument();
  });

  it("renders user initials in avatars", async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { users: mockUsers } });
    renderUsersPage();

    expect(await screen.findByText("AJ")).toBeInTheDocument();
    expect(screen.getByText("BS")).toBeInTheDocument();
  });

  it("formats created dates", async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { users: mockUsers } });
    renderUsersPage();

    await screen.findByText("Alice Johnson");
    const dateStr = new Date("2025-01-15T00:00:00.000Z").toLocaleDateString();
    expect(screen.getByText(dateStr)).toBeInTheDocument();
  });

  it("renders table headers", async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { users: mockUsers } });
    renderUsersPage();

    await screen.findByText("Alice Johnson");
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("shows empty state when no users returned", async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { users: [] } });
    renderUsersPage();

    expect(await screen.findByText("No users found.")).toBeInTheDocument();
  });

  it("shows error message on fetch failure", async () => {
    mockedApi.get.mockRejectedValueOnce(new Error("Network error"));
    renderUsersPage();

    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("calls the correct API endpoint", () => {
    mockedApi.get.mockResolvedValueOnce({ data: { users: [] } });
    renderUsersPage();

    expect(mockedApi.get).toHaveBeenCalledWith("/api/users");
  });

  it("renders correct number of table rows", async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { users: mockUsers } });
    renderUsersPage();

    await screen.findByText("Alice Johnson");
    const tbody = screen.getAllByRole("row");
    // 1 header row + 2 data rows
    expect(tbody).toHaveLength(3);
  });
});
