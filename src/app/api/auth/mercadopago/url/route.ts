import { NextRequest, NextResponse } from "next/server";
import { TenantContext } from "@/lib/services/tenant-context";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const appId = config.mercadopago.appId;
    const redirectUri = config.mercadopago.redirectUri;

    if (!appId || !redirectUri) {
      return NextResponse.json({ error: "Configuração do Mercado Pago incompleta (Faltando App ID ou Redirect URI)" }, { status: 500 });
    }

    // O parâmetro 'state' é usado para identificar qual tenant está autorizando quando ele voltar
    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${appId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}&state=${tenant.id}`;

    return NextResponse.json({ url: authUrl });
  } catch (error: any) {
    console.error("MP Auth URL Error:", error);
    return NextResponse.json({ error: "Erro ao gerar URL de autorização" }, { status: 500 });
  }
}
