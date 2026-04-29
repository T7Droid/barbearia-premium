import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";
import { TenantContext } from "@/lib/services/tenant-context";

export async function POST(request: NextRequest) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const session = await AppointmentService.createCheckoutSession({
      ...body,
      tenantId: tenant.id,
      slug: tenant.slug
    });
    return NextResponse.json(session);
  } catch (error) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: "Erro ao iniciar checkout" }, { status: 400 });
  }
}
