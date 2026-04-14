import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import {
  ticketStatuses,
  ticketCategories,
  type Ticket,
  type TicketStatus,
  type TicketCategory,
} from "core/schemas/ticket";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 10;

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

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="ml-2 h-4 w-4" />;
  if (sorted === "desc") return <ArrowDown className="ml-2 h-4 w-4" />;
  return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
}

function TicketsTableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

const columnHelper = createColumnHelper<Ticket>();

const columns = [
  columnHelper.accessor("subject", {
    header: "Subject",
    cell: (info) => (
      <Link
        to={`/tickets/${info.row.original.id}`}
        className="font-medium hover:underline text-primary"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("senderName", {
    header: "Sender",
    cell: (info) => (
      <div className="flex flex-col">
        <span>{info.getValue()}</span>
        <span className="text-xs text-muted-foreground">
          {info.row.original.senderEmail}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: (info) => (
      <Badge variant="secondary">{formatCategory(info.getValue())}</Badge>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <Badge variant={statusVariant(info.getValue())}>{info.getValue()}</Badge>
    ),
  }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (info) => (
      <span className="text-muted-foreground">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
];

function toggle<T>(set: T[], value: T): T[] {
  return set.includes(value) ? set.filter((v) => v !== value) : [...set, value];
}

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [statusFilter, setStatusFilter] = useState<TicketStatus[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const sortBy = sorting[0]?.id ?? "createdAt";
  const sortOrder = sorting[0]?.desc === false ? "asc" : "desc";
  const hasActiveFilters =
    statusFilter.length > 0 || categoryFilter.length > 0 || search.length > 0;

  // Reset to page 1 whenever filters, search, or sort change
  function handleSortingChange(updater: Parameters<typeof setSorting>[0]) {
    setSorting(updater);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }
  function handleStatusFilter(next: TicketStatus[]) {
    setStatusFilter(next);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }
  function handleCategoryFilter(next: TicketCategory[]) {
    setCategoryFilter(next);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }
  function handleSearchInput(value: string) {
    setSearchInput(value);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "tickets",
      sortBy,
      sortOrder,
      statusFilter,
      categoryFilter,
      search,
      pagination.pageIndex,
    ],
    queryFn: async () => {
      const res = await api.get<{
        tickets: Ticket[];
        total: number;
        page: number;
        pageSize: number;
      }>("/api/tickets", {
        params: {
          sortBy,
          sortOrder,
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          ...(statusFilter.length ? { status: statusFilter.join(",") } : {}),
          ...(categoryFilter.length ? { category: categoryFilter.join(",") } : {}),
          ...(search ? { search } : {}),
        },
      });
      return res.data;
    },
  });

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const { pageIndex } = pagination;

  const firstItem = total === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const lastItem = Math.min((pageIndex + 1) * PAGE_SIZE, total);

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting, pagination },
    onSortingChange: handleSortingChange,
    onPaginationChange: setPagination,
    manualSorting: true,
    manualPagination: true,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
  });

  function clearFilters() {
    setStatusFilter([]);
    setCategoryFilter([]);
    setSearchInput("");
    setSearch("");
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-lg font-semibold text-foreground mb-4">Tickets</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Tickets</CardTitle>
          <CardDescription>Click a column header to sort.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter bar */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject or sender…"
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="pl-9 max-w-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </span>
                {ticketStatuses.map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter.includes(s) ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleStatusFilter(toggle(statusFilter, s))}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Category
                </span>
                {ticketCategories.map((c) => (
                  <Button
                    key={c}
                    variant={categoryFilter.includes(c) ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCategoryFilter(toggle(categoryFilter, c))}
                  >
                    {formatCategory(c)}
                  </Button>
                ))}
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <TicketsTableSkeleton />
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No tickets match your filters."
                : "No tickets found."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3 h-8 font-medium"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            <SortIcon sorted={header.column.getIsSorted()} />
                          </Button>
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination controls */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {firstItem}–{lastItem} of {total} tickets
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.firstPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pageIndex + 1} of {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.lastPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
