import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Ticket, CircleDot, Bot, TrendingUp, Clock } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  aiResolvedTickets: number;
  aiResolvedPercent: number;
  avgResolutionMinutes: number | null;
  ticketsPerDay: { date: string; count: number }[];
}

const chartConfig = {
  count: {
    label: "Tickets",
    color: "black",
  },
} satisfies ChartConfig;

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "N/A";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export default function HomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get<DashboardStats>("/api/dashboard/stats");
      return res.data;
    },
  });

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">Failed to load dashboard stats.</Alert>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Tickets",
      value: data?.totalTickets,
      icon: Ticket,
    },
    {
      label: "Open Tickets",
      value: data?.openTickets,
      icon: CircleDot,
    },
    {
      label: "Resolved by AI",
      value: data?.aiResolvedTickets,
      icon: Bot,
    },
    {
      label: "AI Resolution Rate",
      value: data ? `${data.aiResolvedPercent}%` : undefined,
      icon: TrendingUp,
    },
    {
      label: "Avg Resolution Time",
      value: data ? formatDuration(data.avgResolutionMinutes) : undefined,
      icon: Clock,
    },
  ];

  return (
    <div className="p-8">
      <h2 className="text-lg font-semibold text-black mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tickets per Day</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={data?.ticketsPerDay} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: string) => {
                    const d = new Date(value + "T00:00:00");
                    return d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value: string) => {
                        const d = new Date(value + "T00:00:00");
                        return d.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
