// Checks the Supabase settings the app ships with, without printing their values.
// The key must be a publishable (or legacy anon) key; a secret or service role key must
// never end up in the app. Reads process.env first, then .env.
import { existsSync, readFileSync } from 'node:fs';

const NAMES = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_KEY'];

function readDotEnv() {
  if (!existsSync('.env')) return {};
  const values = {};
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function classifyKey(key) {
  if (!key) return { ok: false, label: 'kosong' };
  if (key.startsWith('sb_publishable_')) return { ok: true, label: 'publishable' };
  if (key.startsWith('sb_secret_'))
    return { ok: false, label: 'SECRET, jangan dipakai di aplikasi' };
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const role = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role;
      return role === 'anon'
        ? { ok: true, label: 'JWT role anon' }
        : { ok: false, label: `JWT role ${role}, jangan dipakai di aplikasi` };
    } catch {
      return { ok: false, label: 'JWT tidak terbaca' };
    }
  }
  return { ok: false, label: 'format tidak dikenali' };
}

const fileValues = readDotEnv();
const value = (name) => process.env[name] ?? fileValues[name] ?? '';

const url = value(NAMES[0]);
const urlOk = /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url);
const key = classifyKey(value(NAMES[1]));

console.log(
  `${NAMES[0]}: ${url ? (urlOk ? 'ok (https://<ref>.supabase.co)' : 'format tidak dikenali') : 'kosong'}`,
);
console.log(`${NAMES[1]}: ${key.ok ? 'ok' : 'MASALAH'} (${key.label})`);

if (!urlOk || !key.ok) process.exit(1);
