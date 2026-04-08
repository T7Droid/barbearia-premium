import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";

export async function GET(request: Request) {
  try {
    const result = await AuthService.verifySession(request);
    if (!result.authenticated) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
