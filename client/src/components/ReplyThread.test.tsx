import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TicketReply } from "core/schemas/ticket";
import ReplyThread from "./ReplyThread";

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

const agentReply: TicketReply = {
  id: "reply-1",
  body: "We're looking into this.",
  senderType: "AGENT",
  authorId: "user-1",
  author: { id: "user-1", name: "Jane Agent" },
  isAiGenerated: false,
  createdAt: "2026-04-10T12:00:00.000Z",
};

const customerReply: TicketReply = {
  id: "reply-2",
  body: "Thanks for the update!",
  senderType: "CUSTOMER",
  authorId: null,
  author: null,
  isAiGenerated: false,
  createdAt: "2026-04-10T13:00:00.000Z",
};

const aiReply: TicketReply = {
  id: "reply-3",
  body: "AI-generated response.",
  senderType: "AGENT",
  authorId: "user-1",
  author: { id: "user-1", name: "Jane Agent" },
  isAiGenerated: true,
  createdAt: "2026-04-10T14:00:00.000Z",
};

function renderReplyThread(replies: TicketReply[] = []) {
  const queryClient = createQueryClient();
  return {
    user: userEvent.setup(),
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ReplyThread
          ticketId="ticket-1"
          senderName="John Customer"
          replies={replies}
        />
      </QueryClientProvider>,
    ),
  };
}

describe("ReplyThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when there are no replies", () => {
    renderReplyThread([]);
    expect(screen.getByText("No replies yet.")).toBeInTheDocument();
  });

  it("renders agent reply with author name and Agent badge", () => {
    renderReplyThread([agentReply]);
    expect(screen.getByText("Jane Agent")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("We're looking into this.")).toBeInTheDocument();
  });

  it("renders customer reply with sender name and Customer badge", () => {
    renderReplyThread([customerReply]);
    expect(screen.getByText("John Customer")).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("Thanks for the update!")).toBeInTheDocument();
  });

  it("shows AI badge for AI-generated replies", () => {
    renderReplyThread([aiReply]);
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("does not show AI badge for non-AI replies", () => {
    renderReplyThread([agentReply]);
    expect(screen.queryByText("AI")).not.toBeInTheDocument();
  });

  it("renders multiple replies", () => {
    renderReplyThread([agentReply, customerReply]);
    expect(screen.getByText("We're looking into this.")).toBeInTheDocument();
    expect(screen.getByText("Thanks for the update!")).toBeInTheDocument();
    expect(screen.queryByText("No replies yet.")).not.toBeInTheDocument();
  });

  it("renders the reply form with textarea and submit button", () => {
    renderReplyThread([]);
    expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reply/i })).toBeInTheDocument();
  });

  it("disables submit button when textarea is empty", () => {
    renderReplyThread([]);
    expect(screen.getByRole("button", { name: /send reply/i })).toBeDisabled();
  });

  it("enables submit button when textarea has content", async () => {
    const { user } = renderReplyThread([]);
    await user.type(screen.getByPlaceholderText("Write a reply..."), "Hello");
    expect(screen.getByRole("button", { name: /send reply/i })).toBeEnabled();
  });

  it("calls API with reply body on submit", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { reply: agentReply },
    });
    const { user } = renderReplyThread([]);

    await user.type(screen.getByPlaceholderText("Write a reply..."), "Looking into it");
    await user.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        "/api/tickets/ticket-1/replies",
        { body: "Looking into it" },
      );
    });
  });

  it("clears textarea after successful submission", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { reply: agentReply },
    });
    const { user } = renderReplyThread([]);

    const textarea = screen.getByPlaceholderText("Write a reply...");
    await user.type(textarea, "Looking into it");
    await user.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("does not submit when textarea is only whitespace", async () => {
    const { user } = renderReplyThread([]);

    await user.type(screen.getByPlaceholderText("Write a reply..."), "   ");
    await user.click(screen.getByRole("button", { name: /send reply/i }));

    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it("shows error message on failed submission", async () => {
    mockedApi.post.mockRejectedValueOnce(new Error("Network error"));
    const { user } = renderReplyThread([]);

    await user.type(screen.getByPlaceholderText("Write a reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: /send reply/i }));

    expect(await screen.findByText("Failed to send reply. Please try again.")).toBeInTheDocument();
  });
});
