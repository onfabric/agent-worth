"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ArrowDownUp, CircleDollarSign, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SessionView = {
  id: string;
  employeeId: string;
  employeeName: string;
  team?: string;
  sourceTool: "codex" | "claude-code" | "claude-cowork";
  sourceSessionId: string;
  title?: string;
  model?: string;
  provider?: string;
  startedAt?: string;
  usageStatus: "native" | "estimated" | "missing";
  totalTokens: number;
  totalUsd: number;
  goalSummary: string | null;
  proficiencyScore: number | null;
};

type CostSummary = {
  totalUsd: number;
  totalTokens: number;
  sessions: number;
  byEmployee: Array<{ employeeId: string; employeeName: string; totalUsd: number; totalTokens: number; sessions: number }>;
};

const fallbackSessions: SessionView[] = [
  {
    id: "synthetic-codex",
    employeeId: "emp_synthetic_ada",
    employeeName: "Ada Lovelace",
    team: "Platform",
    sourceTool: "codex",
    sourceSessionId: "codex_synthetic_001",
    title: "Billing parser tests",
    model: "gpt-5-codex",
    provider: "openai",
    startedAt: "2026-06-03T09:00:00.000Z",
    usageStatus: "native",
    totalTokens: 18500,
    totalUsd: 0.0405,
    goalSummary: null,
    proficiencyScore: null
  },
  {
    id: "synthetic-claude",
    employeeId: "emp_synthetic_grace",
    employeeName: "Grace Hopper",
    team: "Infrastructure",
    sourceTool: "claude-code",
    sourceSessionId: "claude_synthetic_001",
    title: "Sync lock refactor",
    model: "claude-opus-4.5",
    provider: "anthropic",
    startedAt: "2026-06-03T11:00:00.000Z",
    usageStatus: "native",
    totalTokens: 10800,
    totalUsd: 0.27,
    goalSummary: null,
    proficiencyScore: null
  }
];

const fallbackSummary: CostSummary = {
  totalUsd: fallbackSessions.reduce((sum, session) => sum + session.totalUsd, 0),
  totalTokens: fallbackSessions.reduce((sum, session) => sum + session.totalTokens, 0),
  sessions: fallbackSessions.length,
  byEmployee: [
    { employeeId: "emp_synthetic_ada", employeeName: "Ada Lovelace", totalUsd: 0.0405, totalTokens: 18500, sessions: 1 },
    { employeeId: "emp_synthetic_grace", employeeName: "Grace Hopper", totalUsd: 0.27, totalTokens: 10800, sessions: 1 }
  ]
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`);
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(value);
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

const columns: ColumnDef<SessionView>[] = [
  {
    accessorKey: "employeeName",
    header: "Employee",
    cell: ({ row }) => (
      <div className="min-w-36">
        <div className="font-medium">{row.original.employeeName}</div>
        <div className="text-xs text-[var(--muted-foreground)]">{row.original.team ?? "Unassigned"}</div>
      </div>
    )
  },
  {
    accessorKey: "title",
    header: "Session",
    cell: ({ row }) => (
      <div className="max-w-72">
        <div className="truncate font-medium">{row.original.title ?? row.original.sourceSessionId}</div>
        <div className="truncate text-xs text-[var(--muted-foreground)]">{row.original.sourceSessionId}</div>
      </div>
    )
  },
  {
    accessorKey: "sourceTool",
    header: "Source",
    cell: ({ row }) => <Badge variant="secondary">{row.original.sourceTool}</Badge>
  },
  {
    accessorKey: "model",
    header: "Model",
    cell: ({ row }) => <span className="text-sm">{row.original.model ?? "Unknown"}</span>
  },
  {
    accessorKey: "totalTokens",
    header: "Tokens",
    cell: ({ row }) => compactNumber(row.original.totalTokens)
  },
  {
    accessorKey: "totalUsd",
    header: "Cost",
    cell: ({ row }) => <span className="font-medium">{currency(row.original.totalUsd)}</span>
  },
  {
    accessorKey: "usageStatus",
    header: "Usage",
    cell: ({ row }) => (
      <Badge variant={row.original.usageStatus === "native" ? "default" : "warning"}>{row.original.usageStatus}</Badge>
    )
  },
  {
    accessorKey: "proficiencyScore",
    header: "Evaluator",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted-foreground)]">
        {row.original.proficiencyScore === null ? "Pending" : row.original.proficiencyScore.toFixed(2)}
      </span>
    )
  }
];

function Dashboard() {
  const [query, setQuery] = React.useState("");
  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => fetchJson<SessionView[]>("/v1/sessions", fallbackSessions)
  });
  const costsQuery = useQuery({
    queryKey: ["costs"],
    queryFn: () => fetchJson<CostSummary>("/v1/costs", fallbackSummary)
  });

  const sessions = sessionsQuery.data ?? fallbackSessions;
  const summary = costsQuery.data ?? fallbackSummary;
  const filtered = sessions.filter((session) =>
    [session.employeeName, session.team, session.title, session.sourceTool, session.model]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <main className="min-h-screen">
      <div className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Agent Worth</h1>
            <p className="text-sm text-[var(--muted-foreground)]">AI coding-agent spend, sessions, and outcome readiness.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void sessionsQuery.refetch();
              void costsQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-6 py-6">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={CircleDollarSign} label="Team cost" value={currency(summary.totalUsd)} detail="Native token usage" />
          <Metric icon={ArrowDownUp} label="Tokens synced" value={compactNumber(summary.totalTokens)} detail={`${summary.sessions} sessions`} />
          <Metric icon={Users} label="Employees" value={String(summary.byEmployee.length)} detail="Synthetic seed data" />
          <Metric icon={ShieldCheck} label="Evaluator" value="Staged" detail="Scores remain nullable" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Sessions</CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter sessions"
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employee Cost</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {summary.byEmployee.map((employee) => (
                <div
                  key={employee.employeeId}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-[var(--border)] p-3"
                >
                  <div>
                    <div className="font-medium">{employee.employeeName}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {compactNumber(employee.totalTokens)} tokens across {employee.sessions} session
                      {employee.sessions === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold">{currency(employee.totalUsd)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-foreground)]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-[var(--muted-foreground)]">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">{detail}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const queryClient = new QueryClient();

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

