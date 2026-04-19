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
    color: "oklch(0.55 0.19 250)",
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

const statStyles = [
  {
    gradient: "from-primary/10 to-primary/5",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    glow: "glow-blue-sm",
  },
  {
    gradient: "from-warning/10 to-warning/5",
    iconBg: "bg-warning/15",
    iconColor: "text-warning",
    glow: "",
  },
  {
    gradient: "from-success/10 to-success/5",
    iconBg: "bg-success/15",
    iconColor: "text-success",
    glow: "",
  },
  {
    gradient: "from-chart-5/10 to-chart-5/5",
    iconBg: "bg-chart-5/15",
    iconColor: "text-chart-5",
    glow: "",
  },
  {
    gradient: "from-muted-foreground/10 to-muted-foreground/5",
    iconBg: "bg-muted-foreground/15",
    iconColor: "text-muted-foreground",
    glow: "",
  },
];

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
    { label: "Total Tickets", value: data?.totalTickets, icon: Ticket },
    { label: "Open Tickets", value: data?.openTickets, icon: CircleDot },
    { label: "Resolved by AI", value: data?.aiResolvedTickets, icon: Bot },
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
      <h2 className="font-heading text-xl font-bold tracking-tight text-foreground mb-6">
        Dashboard
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat, i) => {
          const style = statStyles[i];
          return (
            <Card
              key={stat.label}
              className={`glass-card relative overflow-hidden ${style.glow}`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${style.gradient} pointer-events-none`}
              />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div
                    className={`flex size-8 items-center justify-center rounded-lg ${style.iconBg}`}
                  >
                    <stat.icon className={`size-4 ${style.iconColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 glass-card">
        <CardHeader>
          <CardTitle className="font-heading font-bold">
            Tickets per Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={data?.ticketsPerDay} accessibilityLayer>
                <CartesianGrid
                  vertical={false}
                  stroke="#262626"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: "#737373", fontSize: 12 }}
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
                  tick={{ fill: "#737373", fontSize: 12 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        const d = new Date(String(value) + "T00:00:00");
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
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
