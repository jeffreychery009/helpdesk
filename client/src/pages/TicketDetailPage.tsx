import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles } from "lucide-react";
import api from "@/lib/api";
import {
  ticketStatuses,
  ticketCategories,
  type Ticket,
  type TicketStatus,
  type TicketCategory,
  type TicketReply,
} from "core/schemas/ticket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReplyThread from "@/components/ReplyThread";

type TicketDetail = Ticket & {
  assignedTo: { id: string; name: string } | null;
  replies: TicketReply[];
};

type Assignee = { id: string; name: string };

function formatCategory(category: TicketCategory) {
  return category
    .split("_")
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join(" ");
}

function StatusDot({ status }: { status: TicketStatus }) {
  const color =
    status === "OPEN"
      ? "bg-warning"
      : status === "RESOLVED"
        ? "bg-success"
        : "bg-muted-foreground";
  return <span className={`size-2 rounded-full ${color}`} />;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const res = await api.get<{ ticket: TicketDetail }>(`/api/tickets/${id}`);
      return res.data.ticket;
    },
  });

  const { data: assignees } = useQuery({
    queryKey: ["assignees"],
    queryFn: async () => {
      const res = await api.get<{ users: Assignee[] }>("/api/tickets/assignees");
      return res.data.users;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (assignedToId: string | null) => {
      const res = await api.patch<{ ticket: TicketDetail }>(
        `/api/tickets/${id}/assign`,
        { assignedToId },
      );
      return res.data.ticket;
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(["ticket", id], ticket);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { status?: TicketStatus; category?: TicketCategory }) => {
      const res = await api.patch<{ ticket: TicketDetail }>(
        `/api/tickets/${id}`,
        data,
      );
      return res.data.ticket;
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(["ticket", id], ticket);
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ summary: string }>(
        `/api/tickets/${id}/summarize`,
      );
      return res.data.summary;
    },
    onSuccess: (text) => {
      setSummary(text);
    },
  });

  function handleAssign(value: string) {
    const assignedToId = value === "unassigned" ? null : value;
    assignMutation.mutate(assignedToId);
  }

  function handleStatusChange(value: string) {
    updateMutation.mutate({ status: value as TicketStatus });
  }

  function handleCategoryChange(value: string) {
    updateMutation.mutate({ category: value as TicketCategory });
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        to="/tickets"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to tickets
      </Link>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <Card className="glass-card">
          <CardHeader>
            <Skeleton className="h-7 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card className="glass-card">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3">
                <StatusDot status={data.status} />
                <CardTitle className="font-heading text-xl font-bold">
                  {data.subject}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="grid grid-cols-[1fr_220px] gap-10">
                <div className="space-y-8">
                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                        From
                      </p>
                      <p className="font-medium text-foreground">{data.senderName}</p>
                      <p className="text-muted-foreground text-xs">{data.senderEmail}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                        Created
                      </p>
                      <p className="text-sm">{new Date(data.createdAt).toLocaleString()}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1 mt-3">
                        Updated
                      </p>
                      <p className="text-sm">{new Date(data.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Message body */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Message
                    </p>
                    <div className="rounded-lg border border-border/50 bg-background/50 p-4 whitespace-pre-wrap text-sm leading-relaxed">
                      {data.body}
                    </div>
                  </div>
                </div>

                {/* Sidebar controls */}
                <div className="space-y-5 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                      Status
                    </p>
                    <Select
                      value={data.status}
                      onValueChange={handleStatusChange}
                      disabled={updateMutation.isPending}
                      items={ticketStatuses.map((s) => ({
                        value: s,
                        label: s.charAt(0) + s.slice(1).toLowerCase(),
                      }))}
                    >
                      <SelectTrigger className="w-full bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketStatuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                      Category
                    </p>
                    <Select
                      value={data.category}
                      onValueChange={handleCategoryChange}
                      disabled={updateMutation.isPending}
                      items={ticketCategories.map((c) => ({
                        value: c,
                        label: formatCategory(c),
                      }))}
                    >
                      <SelectTrigger className="w-full bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketCategories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {formatCategory(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                      Assigned to
                    </p>
                    <Select
                      value={data.assignedTo?.id ?? "unassigned"}
                      onValueChange={handleAssign}
                      disabled={assignMutation.isPending}
                      items={[
                        { value: "unassigned", label: "Unassigned" },
                        ...(assignees?.map((user) => ({ value: user.id, label: user.name })) ?? []),
                      ]}
                    >
                      <SelectTrigger className="w-full bg-background/50 border-border/50">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {assignees?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* AI Summarize */}
              <div className="mt-8 pt-6 border-t border-border/30">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={summarizeMutation.isPending}
                  onClick={() => summarizeMutation.mutate()}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {summarizeMutation.isPending ? "Summarizing..." : "Summarize"}
                </Button>
                {summarizeMutation.isPending && (
                  <div className="mt-3 space-y-2 rounded-lg border border-border/50 bg-background/50 p-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[85%]" />
                    <Skeleton className="h-4 w-[70%]" />
                  </div>
                )}
                {summary && !summarizeMutation.isPending && (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                    {summary}
                  </div>
                )}
                {summarizeMutation.isError && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertDescription>Failed to generate summary. Please try again.</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          <ReplyThread
            ticketId={id!}
            senderName={data.senderName}
            replies={data.replies}
          />
        </>
      )}
    </div>
  );
}
