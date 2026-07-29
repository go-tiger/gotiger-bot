import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
/** GCM 권장 IV 길이. */
const IV_LENGTH = 12;
/** 저장 형식을 나중에 바꿀 수 있도록 앞에 붙인다. */
const PREFIX = 'v1';

/**
 * 마스터 키는 DB 밖(환경변수)에 둔다.
 * DB 와 같은 곳에 두면 암호화가 인코딩으로 전락한다.
 */
function masterKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY 환경변수가 없습니다.');
  }

  // 길이에 상관없이 32바이트 키를 얻기 위해 해시를 거친다.
  return createHash('sha256').update(raw).digest();
}

/** `v1:{iv}:{authTag}:{암호문}` 형태의 base64 조합으로 만든다. */
export function encrypt(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);

  return [
    PREFIX,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decrypt(payload: string): string {
  const [prefix, iv, authTag, encrypted] = payload.split(':');
  if (prefix !== PREFIX || !iv || !authTag || !encrypted) {
    throw new Error('암호문 형식이 올바르지 않습니다.');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    masterKey(),
    Buffer.from(iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * 검증만 하면 되는 값(모드 → 봇 키)은 원문을 보관할 이유가 없다.
 * 봇이 발급한 고엔트로피 난수라 솔트 없는 해시로 충분하다.
 */
export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** 길이가 달라도 예외 없이 false 를 돌려준다. */
export function verifyKey(key: string, hashed: string): boolean {
  const expected = Buffer.from(hashed, 'hex');
  const actual = Buffer.from(hashKey(key), 'hex');

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** 게임서버에 발급할 키. URL 안전 문자만 쓴다. */
export function generateKey(): string {
  return randomBytes(32).toString('base64url');
}
