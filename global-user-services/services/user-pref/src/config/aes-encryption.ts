import crypto from 'crypto';
import { AES_SECRET, AES_IV } from '../env';

export const encrypt = async (value: string): Promise<string> => {
  const algorithm = 'aes-256-cbc';
  //const key = crypto.createHash('sha256').update(process.env.LOCAL_MASTER_KEY || '').digest().slice(0, 32);
  const key = crypto.createHash('sha256').update(AES_SECRET).digest()
  const iv = Buffer.from(AES_IV , 'hex'); // IV loaded from environment variable
  if (iv.length !== 16) {
    throw new Error('Invalid IV length. Ensure LOCAL_IV is a 16-byte hex string.');
  }

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encryptedValue = cipher.update(value, 'utf8', 'hex');
  encryptedValue += cipher.final('hex');

  const encryptedString = encryptedValue;
  //console.log(`Encrypted value for '${value}': ${encryptedString}`);
  return encryptedString;
};


// Decrypts the given encrypted string
export const decrypt = (encryptedString: string) => {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(AES_SECRET).digest()

    if (!encryptedString || typeof encryptedString !== 'string') {
        throw new Error(`Invalid encrypted string format: ${encryptedString ?? 'undefined'}`);
    }
    const iv = Buffer.from(AES_IV, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decryptedValue = decipher.update(encryptedString, 'hex', 'utf8');
    decryptedValue += decipher.final('utf8');

    //console.log(`Decrypted value: ${decryptedValue}`);
    return decryptedValue;
};