import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { config } from "@/lib/config";
import { encrypt } from "@/lib/crypto";
import https from "node:https";

/**
 * Faz um POST usando node:https nativo (evita problemas de undici/fetch timeout via ngrok).
 */
function postOAuthToken(params: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    
    const req = https.request("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(body)
      },
      timeout: 30000
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ statusCode: res.statusCode, ...parsed });
          }
        } catch {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timeout")); });
    req.write(body);
    req.end();
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const tenantId = searchParams.get("state");

  if (!code || !tenantId) {
    return NextResponse.redirect(new URL("/?error=mp_auth_failed", request.url));
  }

  try {
    const mainAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";

    console.log("[MP OAuth] Exchanging code for tokens...", { 
      appId: config.mercadopago.appId, 
      redirectUri: config.mercadopago.redirectUri,
      codeLength: code.length 
    });

    // Usar node:https nativo para evitar problemas de ConnectTimeout do undici via ngrok
    const data = await postOAuthToken({
      client_id: config.mercadopago.appId || "",
      client_secret: config.mercadopago.clientSecret || "",
      grant_type: "authorization_code",
      code: code,
      redirect_uri: config.mercadopago.redirectUri || ""
    });

    console.log("[MP OAuth] Token exchange successful!", { user_id: data.user_id });

    // Encriptar tokens sensíveis antes de salvar no banco de dados
    const encryptedAccessToken = encrypt(data.access_token);
    const encryptedRefreshToken = data.refresh_token ? encrypt(data.refresh_token) : null;

    // Salvar no banco de dados para o tenant específico
    const { error: updateError } = await supabaseAdmin!
      .from("tenants")
      .update({
        mp_connected: true,
        mp_access_token: encryptedAccessToken,
        mp_public_key: data.public_key,
        mp_refresh_token: encryptedRefreshToken,
        mp_user_id: String(data.user_id),
        mp_connection_error: null,
      })
      .eq("id", tenantId);

    if (updateError) throw updateError;

    console.log(`[MP OAuth] Successfully connected tenant ${tenantId} (MP User: ${data.user_id})`);

    // Buscar o slug do tenant para redirecionar de volta corretamente
    const { data: tenant } = await supabaseAdmin!
      .from("tenants")
      .select("slug")
      .eq("id", tenantId)
      .single();

    const redirectSlug = tenant?.slug || "default";

    // Redirecionar de volta para o localhost (onde o admin tem sessão ativa)
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : request.nextUrl.origin;
    return NextResponse.redirect(new URL(`/${redirectSlug}/admin/configuracoes?mp_success=true`, baseUrl));
  } catch (error: any) {
    console.error("MP Callback Error:", error);

    let redirectSlug = "default";
    try {
      const { data: tenant } = await supabaseAdmin!
        .from("tenants")
        .select("slug")
        .eq("id", tenantId)
        .single();
      if (tenant?.slug) redirectSlug = tenant.slug;
    } catch {}

    const errorMsg = error.message || error.error || "Erro desconhecido";
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : request.nextUrl.origin;
    return NextResponse.redirect(
      new URL(`/${redirectSlug}/admin/configuracoes?mp_error=${encodeURIComponent(errorMsg)}`, baseUrl)
    );
  }
}
