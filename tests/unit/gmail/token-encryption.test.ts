import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from '@/lib/utils';

const KEY_V1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const KEY_V2 = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

describe('Gmail Token Encryption & Key Rotation (D-27)', () => {
  it('encrypts and decrypts Google OAuth tokens round-trip with keyId', () => {
    const rawRefreshToken = '1//04_abcdef_refresh_token_12345_sample';
    const encrypted = encryptSecret(rawRefreshToken, KEY_V1, 'k1');

    // Ciphertext must follow versioned format: v1:keyId:iv:tag:ciphertext
    expect(encrypted).toMatch(/^v1:k1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    // Raw token must never be present as plaintext substring
    expect(encrypted).not.toContain(rawRefreshToken);

    const decrypted = decryptSecret(encrypted, KEY_V1);
    expect(decrypted).toBe(rawRefreshToken);
  });

  it('supports key rotation: decrypts with old key and re-encrypts with new key', () => {
    const rawAccessToken = 'ya29.a0AfH6SMA_mock_access_token_value';

    // Stored originally with key v1 / k1
    const encryptedV1 = encryptSecret(rawAccessToken, KEY_V1, 'k1');

    // Key rotation process: decrypt using old key
    const decrypted = decryptSecret(encryptedV1, KEY_V1);
    expect(decrypted).toBe(rawAccessToken);

    // Re-encrypt with new key v2 / k2
    const encryptedV2 = encryptSecret(decrypted, KEY_V2, 'k2');
    expect(encryptedV2).toMatch(/^v1:k2:/);

    // Successfully decrypted with new key
    const decryptedV2 = decryptSecret(encryptedV2, KEY_V2);
    expect(decryptedV2).toBe(rawAccessToken);
  });

  it('detects tampering and rejects altered ciphertexts or forged tags', () => {
    const rawToken = 'super_secret_refresh_token';
    const encrypted = encryptSecret(rawToken, KEY_V1, 'k1');

    const parts = encrypted.split(':');
    // Tamper with the ciphertext (last part)
    const lastPart = parts[4];
    const tamperedLast = lastPart.endsWith('ff') ? lastPart.slice(0, -2) + '00' : lastPart.slice(0, -2) + 'ff';
    const tamperedCiphertext = parts.slice(0, 4).join(':') + ':' + tamperedLast;

    expect(() => decryptSecret(tamperedCiphertext, KEY_V1)).toThrow();

    // Tamper with the auth tag
    const tamperedTag = parts[0] + ':' + parts[1] + ':' + parts[2] + ':00112233445566778899aabbccddeeff:' + parts[4];
    expect(() => decryptSecret(tamperedTag, KEY_V1)).toThrow();
  });
});
