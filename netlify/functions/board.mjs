import { getStore } from '@netlify/blobs';

const STORE = 'sg-food-bingo';
const DEVICE_RE = /^[a-z0-9-]{8,64}$/i;
const CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679'; // no look-alikes

const store = () => getStore({ name: STORE, consistency: 'strong' });

const slug = (name) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const squares = (src) =>
  Array.from({ length: 25 }, (_, i) => (Array.isArray(src) ? src[i] === true : false));

function newCode() {
  let out = '';
  for (let i = 0; i < 4; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

async function readAll(s) {
  const { blobs } = await s.list();
  const records = await Promise.all(
    blobs.map((b) => s.get(b.key, { type: 'json' }).catch(() => null))
  );
  // never expose device ids or rejoin codes to other players
  return records
    .filter((r) => r && r.name && Array.isArray(r.tried))
    .map((r) => ({ name: r.name, tried: r.tried, updated: r.updated || 0 }));
}

const fail = (status, error, message) => Response.json({ error, message }, { status });
const ok = (body) => Response.json(body, { headers: { 'cache-control': 'no-store' } });

export default async (req) => {
  const s = store();

  if (req.method === 'GET') {
    return ok({ players: await readAll(s) });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'bad_json', 'That request was not valid JSON.');
  }

  const action = String(body.action || '');
  const device = String(body.device || '');
  const name = String(body.name || '').trim().slice(0, 40);
  const key = slug(name);

  if (!DEVICE_RE.test(device)) return fail(400, 'bad_device', 'Missing a valid device id.');
  if (!key) return fail(400, 'bad_name', 'Pick a name with at least one letter or number.');

  const existing = await s.get(key, { type: 'json' }).catch(() => null);

  if (action === 'join') {
    if (existing && existing.device !== device) {
      return fail(409, 'name_taken', `${existing.name} is already playing on another device.`);
    }
    const rec = existing || { name, device, code: newCode(), tried: squares(null) };
    rec.name = name;
    rec.updated = Date.now();
    await s.setJSON(key, rec);
    return ok({ player: { name: rec.name, code: rec.code, tried: rec.tried }, players: await readAll(s) });
  }

  if (action === 'claim') {
    const code = String(body.code || '').trim().toUpperCase();
    if (!existing) return fail(404, 'no_such_player', 'No one is playing under that name yet.');
    if (existing.code !== code) return fail(403, 'bad_code', 'That rejoin code does not match.');
    existing.device = device;
    existing.updated = Date.now();
    await s.setJSON(key, existing);
    return ok({
      player: { name: existing.name, code: existing.code, tried: existing.tried },
      players: await readAll(s)
    });
  }

  if (action === 'save') {
    if (!existing) return fail(404, 'no_such_player', 'That player is not on the board.');
    if (existing.device !== device) {
      return fail(403, 'not_your_card', 'This card belongs to someone else.');
    }
    existing.tried = squares(body.tried);
    existing.updated = Date.now();
    await s.setJSON(key, existing);
    return ok({ ok: true, players: await readAll(s) });
  }

  if (action === 'delete') {
    if (!existing) return fail(404, 'no_such_player', 'That player is not on the board.');
    if (existing.device !== device) {
      return fail(403, 'not_your_card', 'This card belongs to someone else.');
    }
    await s.delete(key);
    return ok({ ok: true, players: await readAll(s) });
  }

  return fail(400, 'bad_action', 'Unknown action.');
};

export const config = { path: '/api/board' };
