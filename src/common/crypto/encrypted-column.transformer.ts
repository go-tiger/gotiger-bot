import { ValueTransformer } from 'typeorm';
import { decrypt, encrypt } from './crypto.util';

/**
 * 토큰·API 키처럼 원문이 필요한 값을 암호화해 저장한다.
 * 검증만 하면 되는 값은 hashKey 를 쓴다.
 */
export const encryptedColumn: ValueTransformer = {
  to: (value?: string | null) =>
    value === null || value === undefined ? value : encrypt(value),
  from: (value?: string | null) =>
    value === null || value === undefined ? value : decrypt(value),
};
