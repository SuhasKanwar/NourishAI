import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

/**
 * GET /api/user/budget
 * Returns the logged-in user's budget summary from the Prisma DB.
 */
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let budget = await prisma.budget.findUnique({ where: { userId } });
  if (!budget) {
    budget = await prisma.budget.create({
      data: { userId, monthlyLimit: 12000, spent: 0 },
    });
  }

  const remaining = Math.max(budget.monthlyLimit - budget.spent, 0);
  const usagePercent = budget.monthlyLimit
    ? Math.round((budget.spent / budget.monthlyLimit) * 10000) / 100
    : 0;

  return NextResponse.json({
    monthly_limit: budget.monthlyLimit,
    total_spent: budget.spent,
    remaining,
    usage_percent: usagePercent,
  });
}

/**
 * PUT /api/user/budget
 * Sets the monthly budget for the logged-in user.
 * Body: { monthly_budget: number }
 */
export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await request.json();
  const monthlyBudget = Number(body.monthly_budget);
  if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
    return NextResponse.json(
      { error: "monthly_budget must be a positive number" },
      { status: 400 }
    );
  }

  const budget = await prisma.budget.upsert({
    where: { userId },
    update: { monthlyLimit: monthlyBudget },
    create: { userId, monthlyLimit: monthlyBudget, spent: 0 },
  });

  const remaining = Math.max(budget.monthlyLimit - budget.spent, 0);
  const usagePercent = budget.monthlyLimit
    ? Math.round((budget.spent / budget.monthlyLimit) * 10000) / 100
    : 0;

  return NextResponse.json({
    monthly_limit: budget.monthlyLimit,
    total_spent: budget.spent,
    remaining,
    usage_percent: usagePercent,
  });
}
