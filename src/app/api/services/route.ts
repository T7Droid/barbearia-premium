import { NextRequest, NextResponse } from "next/server";
import { ServiceService } from "@/lib/services/service.service";
import { AuthService } from "@/lib/services/auth.service";

async function checkAdmin(request: NextRequest) {
  const result = await AuthService.verifySession(request);
  return result.authenticated && result.user?.role === "admin";
}

export async function GET() {
  try {
    const services = await ServiceService.list();
    return NextResponse.json(services, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao carregar serviços" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const newService = await ServiceService.create({
      name: body.name,
      description: body.description,
      price: parseFloat(body.price),
      durationMinutes: parseInt(body.durationMinutes),
      imageUrl: body.imageUrl,
    });
    return NextResponse.json(newService, { status: 201 });
  } catch (error: any) {
    console.error("API Error (POST /api/services):", error);
    return NextResponse.json({ 
      error: "Erro ao criar serviço", 
      details: error.message 
    }, { status: 400 });
  }
}
