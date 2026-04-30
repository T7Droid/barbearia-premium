import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/services/notification.service";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const slug = request.nextUrl.searchParams.get("slug") || "barbearia-premium";

  if (!token) {
    return NextResponse.json({
      error: "Token é obrigatório. Use: /api/test-push?token=SEU_TOKEN"
    }, { status: 400 });
  }

  console.log("🚀 Disparando push de teste para o token:", token);

  try {
    await NotificationService.sendPushNotification(
      token,
      "Teste Data-Only ✂️",
      "Se chegar apenas UMA notificação com imagem, o problema da duplicidade foi resolvido!",
      {
        slug,
        image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800"
      }
    );

    return NextResponse.json({
      success: true,
      message: "Push enviado com sucesso! Verifique seu celular."
    });
  } catch (err: any) {
    console.error("❌ Erro fatal na rota de teste:", err.message);
    return NextResponse.json({
      success: false,
      error: err.message || "Erro desconhecido"
    }, { status: 500 });
  }
}
