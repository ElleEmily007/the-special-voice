import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { PLANS } from "@/lib/plans";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  status: true,
  planId: true,
  frequency: true,
  voice: true,
  testament: true,
  trackKey: true,
  optedOut: true,
  lastDeliveredAt: true,
  trialEndsAt: true,
  createdAt: true,
} as const;

function buildWhere(params: URLSearchParams): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};

  const q = params.get("q")?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const status = params.get("status");
  if (status) where.status = status;

  const planId = params.get("planId");
  if (planId) where.planId = planId;

  const optedOut = params.get("optedOut");
  if (optedOut === "true") where.optedOut = true;
  if (optedOut === "false") where.optedOut = false;

  return where;
}

/** Subscriber list for /admin/subscribers, with the status counts it shows. */
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.get("limit")) || DEFAULT_LIMIT));
  const where = buildWhere(params);

  const [customers, total, byStatus, optedOutCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
    // Summary counts describe the whole base, not the filtered page, so the
    // strip stays a stable overview while filters change underneath it.
    prisma.customer.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.customer.count({ where: { optedOut: true } }),
  ]);

  const summary = byStatus.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});

  return NextResponse.json({
    customers,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary: { ...summary, optedOut: optedOutCount },
    plans: PLANS.map((plan) => ({
      id: plan.id,
      name: plan.name,
      frequency: plan.frequency,
      monthlyPrice: plan.monthlyPrice,
    })),
  });
}
