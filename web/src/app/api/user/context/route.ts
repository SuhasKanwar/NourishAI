import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { MICROSERVICE_BASE_URL } from "@/lib/config";

/**
 * GET /api/user/context?location=...&latitude=...&longitude=...
 * Proxies the context request to the FastAPI microservice, injecting the real user ID.
 */
export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  params.set("user_id", userId);
  if (searchParams.get("location")) params.set("location", searchParams.get("location")!);
  if (searchParams.get("latitude")) params.set("latitude", searchParams.get("latitude")!);
  if (searchParams.get("longitude")) params.set("longitude", searchParams.get("longitude")!);

  try {
    const response = await fetch(`${MICROSERVICE_BASE_URL}/user/context?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { weather: "backend unavailable", location: "unknown" },
      { status: 502 }
    );
  }
}
