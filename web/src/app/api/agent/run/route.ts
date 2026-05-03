import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MICROSERVICE_BASE_URL } from "@/lib/config";

/**
 * POST /api/agent/run
 * Proxies the agent run request to the FastAPI microservice using the real user ID.
 * Also syncs the budget from the microservice response back to Prisma.
 * Body: { prompt, location?, latitude?, longitude?, monthly_budget? }
 */
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await request.json();

  try {
    const budget = await prisma.budget.findUnique({ where: { userId } });
    const swiggyToken = await prisma.swiggyToken.findUnique({ where: { userId } });
    const userPreferences = await prisma.userPreference.findMany({ 
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    const response = await fetch(`${MICROSERVICE_BASE_URL}/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        user_id: userId,
        swiggy_token: swiggyToken ? {
          access_token: swiggyToken.accessToken,
          refresh_token: swiggyToken.refreshToken,
          expires_at: swiggyToken.expiresAt.toISOString(),
          scope: swiggyToken.scope
        } : null,
        user_preferences: userPreferences.map(p => p.text),
        budget_data: budget ? {
          monthly_limit: budget.monthlyLimit,
          spent: budget.spent,
          remaining: Math.max(budget.monthlyLimit - budget.spent, 0)
        } : null
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Agent service error", detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Sync budget data from agent response back to Prisma
    if (data.budget) {
      try {
        await prisma.budget.upsert({
          where: { userId },
          update: {
            monthlyLimit: data.budget.monthly_limit ?? 12000,
            spent: data.budget.total_spent ?? 0,
          },
          create: {
            userId,
            monthlyLimit: data.budget.monthly_limit ?? 12000,
            spent: data.budget.total_spent ?? 0,
          },
        });
      } catch {
        // Budget sync is best-effort; don't fail the whole request
      }
    }
    
    // Save new preferences if the agent generated any
    if (data.new_preference) {
      try {
        await prisma.userPreference.create({
          data: {
            userId,
            text: data.new_preference,
          }
        });
      } catch {
        // Preference save is best-effort
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Agent service unreachable" },
      { status: 502 }
    );
  }
}
