import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import type { Ticket, TicketStatus, TicketCategory } from "core/schemas/ticket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TicketDetail = Ticket & {
  assignedTo: { id: string; name: string } | null;
};

type Assignee = { id: string; name: string };

function formatCategory(category: TicketCategory) {
  return category
    .split("_")
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join(" ");
}

function statusVariant(status: TicketStatus) {
  if (status === "OPEN") return "default" as const;
  if (status === "RESOLVED") return "secondary" as const;
  return "outline" as const;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

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

  function handleAssign(value: string) {
    const assignedToId = value === "unassigned" ? null : value;
    assignMutation.mutate(assignedToId);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        to="/tickets"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to tickets
      </Link>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <Card>
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
        <Card>
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">{data.subject}</CardTitle>
              <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
              <Badge variant="secondary">{formatCategory(data.category)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">From</p>
                <p className="font-medium">{data.senderName}</p>
                <p className="text-muted-foreground">{data.senderEmail}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{new Date(data.createdAt).toLocaleString()}</p>
                <p className="text-muted-foreground mt-2">Updated</p>
                <p>{new Date(data.updatedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Assigned to</p>
                <Select
                  value={data.assignedTo?.id ?? "unassigned"}
                  onValueChange={handleAssign}
                  disabled={assignMutation.isPending}
                  items={[
                    { value: "unassigned", label: "Unassigned" },
                    ...(assignees?.map((user) => ({ value: user.id, label: user.name })) ?? []),
                  ]}
                >
                  <SelectTrigger className="w-full">
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

            <div>
              <p className="text-sm text-muted-foreground mb-2">Message</p>
              <div className="rounded-md border p-4 whitespace-pre-wrap text-sm">
                {data.body}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
