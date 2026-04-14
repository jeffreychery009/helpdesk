import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import api from "@/lib/api";
import type { TicketReply } from "core/schemas/ticket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReplyThreadProps {
  ticketId: string;
  senderName: string;
  replies: TicketReply[];
}

export default function ReplyThread({ ticketId, senderName, replies }: ReplyThreadProps) {
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState("");

  const replyMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post<{ reply: TicketReply }>(
        `/api/tickets/${ticketId}/replies`,
        { body },
      );
      return res.data.reply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      setReplyBody("");
    },
  });

  function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    replyMutation.mutate(trimmed);
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Replies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {replies.length === 0 && (
          <p className="text-sm text-muted-foreground">No replies yet.</p>
        )}

        {replies.map((reply) => (
          <div
            key={reply.id}
            className={`rounded-md border p-4 ${
              reply.senderType === "AGENT"
                ? "bg-muted/50 ml-8"
                : "mr-8"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">
                {reply.senderType === "AGENT"
                  ? (reply.author?.name ?? "Agent")
                  : senderName}
              </span>
              <Badge variant="outline" className="text-xs">
                {reply.senderType === "AGENT" ? "Agent" : "Customer"}
              </Badge>
              {reply.isAiGenerated && (
                <Badge variant="secondary" className="text-xs">
                  AI
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(reply.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
          </div>
        ))}

        <form onSubmit={handleSubmitReply} className="pt-4 border-t space-y-3">
          <Textarea
            placeholder="Write a reply..."
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={3}
            disabled={replyMutation.isPending}
          />
          {replyMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to send reply. Please try again.</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={replyMutation.isPending || !replyBody.trim()}
              size="sm"
            >
              <Send className="mr-2 h-4 w-4" />
              {replyMutation.isPending ? "Sending..." : "Send Reply"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
