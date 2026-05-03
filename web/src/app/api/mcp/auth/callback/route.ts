import { NextRequest, NextResponse } from "next/server";
import { MICROSERVICE_BASE_URL } from "@/lib/config";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/mcp/auth/callback?code=...&state=...
 * Handles the Swiggy MCP OAuth callback by proxying to the FastAPI microservice.
 * Note: No session check here since this is an OAuth redirect from Swiggy.
 */
export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state parameter" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${MICROSERVICE_BASE_URL}/mcp/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "MCP callback failed", detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Save token to DB
    if (data.access_token) {
      await prisma.swiggyToken.upsert({
        where: { userId },
        update: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(Date.now() + data.expires_in * 1000),
          scope: data.scope,
        },
        create: {
          userId,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(Date.now() + data.expires_in * 1000),
          scope: data.scope,
        }
      });
    }

    // Redirect back to dashboard after successful OAuth
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch {
    return NextResponse.json(
      { error: "MCP callback service unreachable" },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
