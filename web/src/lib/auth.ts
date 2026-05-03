import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";

/**
 * Returns the current server-side session, or null if not authenticated.
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Returns the authenticated user's ID from the session.
 * Sends a 401 JSON response if the user is not logged in.
 * Use in API route handlers:
 *   const userId = await requireUserId();
 *   if (userId instanceof NextResponse) return userId;
 */
export async function requireUserId(): Promise<string | NextResponse> {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  return userId;
}
