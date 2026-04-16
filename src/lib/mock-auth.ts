import { createToken, verifyToken as verifySessionToken } from "./auth";

export const ADMIN_USER = {
  email: "thyagonevesa.sa@gmail.com",
  password: "admin123",
  name: "Barbeiro Mestre",
};

export async function createSessionToken(payload: any) {
  return await createToken(payload);
}

export { verifySessionToken };
