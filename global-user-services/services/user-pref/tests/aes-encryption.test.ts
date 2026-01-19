import { encrypt, decrypt } from '../src/config/aes-encryption';
import crypto from 'crypto';


jest.mock('../src/env', () => ({
  AES_SECRET: 'test_secret_key_1234567890',
  AES_IV: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
}));

describe('Encryption Utilities', () => {
  const plainText = 'SensitiveData123';

  it('should encrypt and decrypt the value correctly', async () => {
    const encrypted = await encrypt(plainText);
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(plainText);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('should throw error for invalid IV length during encryption', async () => {
    jest.resetModules();
    jest.doMock('../src/env', () => ({
      AES_SECRET: 'test_secret_key_1234567890',
      AES_IV: '1234', // invalid IV
    }));

    const { encrypt: encryptWithInvalidIV } = await import('../src/config/aes-encryption');

    await expect(encryptWithInvalidIV(plainText)).rejects.toThrow(
      'Invalid IV length. Ensure LOCAL_IV is a 16-byte hex string.'
    );
  });

  it('should throw error for invalid encrypted string during decryption', () => {
    expect(() => decrypt(undefined as any)).toThrow('Invalid encrypted string format: undefined');
    expect(() => decrypt('')).toThrow('Invalid encrypted string format: ');
  });
});
