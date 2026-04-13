import { NextRequest, NextResponse } from "next/server";
import { BarberService } from "@/lib/services/barber.service";
import { AuthService } from "@/lib/services/auth.service";

async function checkAdmin(request: NextRequest) {
  const result = await AuthService.verifySession(request);
  return result.authenticated && result.user?.role === "admin";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const updatedBarber = await BarberService.update(id, {
      name: body.name,
      description: body.description,
      imageUrl: body.imageUrl,
      active: body.active,
    });
    return NextResponse.json(updatedBarber);
  } catch (error: any) {
    console.error(`API Error (PUT /api/barbers/${params.id}):`, error);
    return NextResponse.json({ 
      error: "Erro ao atualizar barbeiro", 
      details: error.message 
    }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const id = parseInt(params.id);
    await BarberService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`API Error (DELETE /api/barbers/${params.id}):`, error);
    return NextResponse.json({ 
      error: "Erro ao excluir barbeiro", 
      details: error.message 
    }, { status: 400 });
  }
}
