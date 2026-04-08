import { jwtVerify, SignJWT } from "jose";

// Em produção (Vercel), você DEVE configurar a variável de ambiente JWT_SECRET.
// O fallback abaixo é apenas para desenvolvimento local e será invalidado se não houver um segredo real.
const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: JWT_SECRET environment variable is not set!");
    }
    return "dev-only-insecure-fallback-barber-premium";
  }
  return secret;
};

export const SECRET = new TextEncoder().encode(getSecret());

export async function createToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { id: string; role: "admin" | "client"; email: string; name: string };
  } catch (error) {
    return null;
  }
}

export async function isAdmin(token?: string) {
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload?.role === "admin";
}
