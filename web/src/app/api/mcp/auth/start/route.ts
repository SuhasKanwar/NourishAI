import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { MICROSERVICE_BASE_URL } from "@/lib/config";

/**
 * GET /api/mcp/auth/start
 * Starts the Swiggy MCP OAuth flow via the FastAPI microservice, using the real user ID.
 */
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const response = await fetch(
      `${MICROSERVICE_BASE_URL}/mcp/auth/start?user_id=${encodeURIComponent(userId)}`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "MCP auth start failed", detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "MCP auth service unreachable" },
      { status: 502 }
    );
  }
}
