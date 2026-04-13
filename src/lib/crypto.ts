import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Deriva uma chave de 32 bytes a partir do JWT_SECRET usando SHA-256.
 * Isso garante que qualquer tamanho de secret funcione como chave AES-256.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado. Impossível encriptar.");
  return createHash("sha256").update(secret).digest();
}

/**
 * Encripta um texto usando AES-256-GCM.
 * Retorna uma string no formato: iv:authTag:ciphertext (tudo em hex)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // GCM recomenda 12 bytes de IV
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Formato: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decripta um texto encriptado pelo método encrypt().
 * Aceita o formato: iv:authTag:ciphertext
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    throw new Error("Formato de texto encriptado inválido");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const ciphertext = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Verifica se uma string parece estar encriptada (formato iv:authTag:ciphertext).
 * Util para compatibilidade com dados antigos não-encriptados.
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split(":");
  return parts.length === 3 && parts[0].length === 24 && parts[1].length === 32;
}
