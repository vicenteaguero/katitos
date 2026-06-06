// Dependency-free VAPID (Web Push) keypair generator.
// Prints a P-256 keypair as base64url, ready for env files.
// Run: `node scripts/gen-vapid.mjs`
import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

const pub = publicKey.export({ format: 'jwk' });
const priv = privateKey.export({ format: 'jwk' });

const x = Buffer.from(pub.x, 'base64url');
const y = Buffer.from(pub.y, 'base64url');
// Uncompressed point: 0x04 || X || Y
const raw = Buffer.concat([Buffer.from([0x04]), x, y]);

const out = {
  public: raw.toString('base64url'),
  private: priv.d, // already base64url, 32 bytes
};

console.log(JSON.stringify(out));
