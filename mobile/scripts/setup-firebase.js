#!/usr/bin/env node
/**
 * Regenerates android/app/google-services.json from the base64 value in
 * .env — the same "don't commit the real file, commit an env var" pattern
 * the web app uses for its Firebase creds.
 *
 * .env is gitignored, google-services.json is gitignored; this script is the
 * only thing that writes the real file, and it's safe to run repeatedly
 * (e.g. as a "preandroid" step before every build).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = { ...loadEnv(ENV_PATH), ...process.env };

function writeFromBase64(envKey, outPath, label) {
  const b64 = env[envKey];
  if (!b64) {
    console.warn(`[setup-firebase] ${envKey} not set in .env — skipping ${label}.`);
    return;
  }
  const contents = Buffer.from(b64, 'base64').toString('utf8');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, contents);
  console.log(`[setup-firebase] Wrote ${label} from ${envKey}.`);
}

writeFromBase64('GOOGLE_SERVICES_JSON_BASE64', path.join(ROOT, 'android/app/google-services.json'), 'android/app/google-services.json');
