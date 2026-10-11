/**
 * Crypto Utilities
 * رمزنگاری و رمزگشایی امن با AES-256-GCM
 * 
 * @module lib/crypto
 * @version 1.0.0
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

/**
 * دریافت کلید رمزنگاری از محیط
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error(
      'ENCRYPTION_KEY یا JWT_SECRET در environment variables تنظیم نشده است'
    );
  }
  
  if (secret.length < 32) {
    throw new Error('ENCRYPTION_KEY باید حداقل ۳۲ کاراکتر باشد');
  }
  
  // تبدیل secret به کلید ۳۲ بایتی با scrypt
  return crypto.scryptSync(secret, 'eitbal-salt-v1', KEY_LENGTH);
}

/**
 * رمزنگاری متن
 * @param plainText متن ساده
 * @returns متن رمزنگاری‌شده به صورت base64
 */
export function encrypt(plainText: string): string {
  if (!plainText) {
    throw new Error('متن ورودی نمی‌تواند خالی باشد');
  }
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // ساختار: iv (16) + authTag (16) + encrypted
  const result = Buffer.concat([iv, authTag, encrypted]);
  
  return result.toString('base64');
}

/**
 * رمزگشایی متن
 * @param encryptedText متن رمزنگاری‌شده به صورت base64
 * @returns متن اصلی
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error('متن رمزنگاری‌شده نمی‌تواند خالی باشد');
  }
  
  try {
    const key = getEncryptionKey();
    const buffer = Buffer.from(encryptedText, 'base64');
    
    // استخراج بخش‌ها
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(
      `خطا در رمزگشایی: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`
    );
  }
}

/**
 * رمزنگاری یک آبجکت JSON
 */
export function encryptJSON<T = any>(data: T): string {
  return encrypt(JSON.stringify(data));
}

/**
 * رمزگشایی به آبجکت JSON
 */
export function decryptJSON<T = any>(encryptedText: string): T {
  return JSON.parse(decrypt(encryptedText)) as T;
}

/**
 * هش کردن یک مقدار (برای webhook secret، توکن و...)
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * ساخت توکن تصادفی امن
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * بررسی مطابقت hash با مقدار اصلی
 */
export function compareHash(value: string, hashedValue: string): boolean {
  return hash(value) === hashedValue;
}

/**
 * ایجاد HMAC signature (برای webhook verification)
 */
export function createHMAC(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * بررسی HMAC signature
 */
export function verifyHMAC(
  data: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHMAC(data, secret);
  
  // مقایسه امن در برابر timing attacks
  if (expectedSignature.length !== signature.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

/**
 * هش کردن پسورد با scrypt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hashBuffer = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: 16384,
    r: 8,
    p: 1,
  });
  
  return `${salt.toString('hex')}:${hashBuffer.toString('hex')}`;
}

/**
 * بررسی مطابقت پسورد با hash
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const [saltHex, hashHex] = hashedPassword.split(':');
    
    if (!saltHex || !hashHex) {
      return false;
    }
    
    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(hashHex, 'hex');
    
    const hashBuffer = crypto.scryptSync(password, salt, KEY_LENGTH, {
      N: 16384,
      r: 8,
      p: 1,
    });
    
    return crypto.timingSafeEqual(hashBuffer, expectedHash);
  } catch (error) {
    return false;
  }
}

// ==================== EXPORT DEFAULT ====================
export default {
  encrypt,
  decrypt,
  encryptJSON,
  decryptJSON,
  hash,
  generateSecureToken,
  compareHash,
  createHMAC,
  verifyHMAC,
  hashPassword,
  verifyPassword,
};