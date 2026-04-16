import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles } from "lucide-react";
import api from "@/lib/api";
import type { TicketReply } from "core/schemas/ticket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

  const polishMutation = useMutation({
    mutationFn: async (draft: string) => {
      const res = await api.post<{ polished: string }>(
        `/api/tickets/${ticketId}/polish-reply`,
        { body: draft },
      );
      return res.data.polished;
    },
    onSuccess: (polished) => {
      setReplyBody(polished);
    },
  });

  function handlePolish() {
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    polishMutation.mutate(trimmed);
  }

  function handleSubmitReply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    replyMutation.mutate(trimmed);
  }

  return (
    <Card className="mt-6 glass-card">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-bold">Replies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {replies.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No replies yet.
          </p>
        )}

        {replies.map((reply) => (
          <div
            key={reply.id}
            className={`rounded-lg border p-4 transition-colors ${
              reply.senderType === "AGENT"
                ? "border-primary/20 bg-primary/5 ml-8"
                : "border-border/50 bg-background/50 mr-8"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-foreground">
                {reply.senderType === "AGENT"
                  ? (reply.author?.name ?? "Agent")
                  : senderName}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${
                  reply.senderType === "AGENT"
                    ? "border-primary/30 text-primary"
                    : "border-border/50"
                }`}
              >
                {reply.senderType === "AGENT" ? "Agent" : "Customer"}
              </Badge>
              {reply.isAiGenerated && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-chart-5/15 text-chart-5 border border-chart-5/30"
                >
                  AI
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(reply.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{reply.body}</p>
          </div>
        ))}

        <form onSubmit={handleSubmitReply} className="pt-4 border-t border-border/30 space-y-3">
          {polishMutation.isPending ? (
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/50 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[75%]" />
            </div>
          ) : (
            <Textarea
              placeholder="Write a reply..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={3}
              disabled={replyMutation.isPending}
              className="bg-background/50 border-border/50 focus:border-primary/50"
            />
          )}
          {polishMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to polish reply. Please try again.</AlertDescription>
            </Alert>
          )}
          {replyMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to send reply. Please try again.</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={polishMutation.isPending || replyMutation.isPending || !replyBody.trim()}
              onClick={handlePolish}
              className="border-chart-5/30 text-chart-5 hover:bg-chart-5/10"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {polishMutation.isPending ? "Polishing..." : "Polish"}
            </Button>
            <Button
              type="submit"
              disabled={replyMutation.isPending || polishMutation.isPending || !replyBody.trim()}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-blue-sm"
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
