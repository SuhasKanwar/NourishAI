import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { MICROSERVICE_BASE_URL } from "@/lib/config";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/agent/action
 * Proxies the action execution to the FastAPI microservice using the real user ID.
 * Body: { action: DashboardAction }
 */
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await request.json();

  try {
    const swiggyToken = await prisma.swiggyToken.findUnique({ where: { userId } });
    const budget = await prisma.budget.findUnique({ where: { userId } });

    const response = await fetch(`${MICROSERVICE_BASE_URL}/agent/action`, {
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
        { error: "Action service error", detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (data.record_action) {
      try {
        await prisma.orderRecord.create({
          data: {
            userId,
            actionType: data.record_action.type,
            payload: data.record_action.payload,
            status: "completed"
          }
        });
        if (data.record_action.amount > 0) {
          await prisma.budget.update({
            where: { userId },
            data: {
              spent: {
                increment: data.record_action.amount
              }
            }
          });
        }
      } catch {
        // Record is best effort
      }
    }
    
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Action service unreachable" },
      { status: 502 }
    );
  }
}
