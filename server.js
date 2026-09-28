const express   = require('express');
const WebSocket = require('ws');
const QRCode    = require('qrcode');
const path      = require('path');
const fs        = require('fs');
const os        = require('os');
const https     = require('https');
const crypto    = require('crypto');
const rateLimit = require('express-rate-limit');

// ── Optional .env file (local development) ───────────────────────────
// Lines like KEY=value. Real environment variables always win.
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {}

const app = express();
app.set('trust proxy', 1); // trust the hosting load balancer for real IPs

// ── HTTP rate limiting ───────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a minute.' },
});
app.use('/api/', apiLimiter);

app.use(express.static(path.join(__dirname, 'public')));

// ── ICE servers (STUN + TURN) ────────────────────────────────────────
// Preferred: METERED_API_KEY → temporary credentials from Metered's API.
// Fallback:  TURN_USERNAME + TURN_CREDENTIAL → static credentials.
// Neither:   STUN only (fine on the same Wi-Fi, may fail across networks).
const METERED_DOMAIN = process.env.METERED_DOMAIN || 'coshot.metered.live';
const STUN_SERVERS = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'stun:stun.l.google.com:19302' },
];
const ICE_CACHE_MS = 10 * 60 * 1000;
let iceCache = { servers: null, at: 0 };

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function staticTurnServers() {
  const username   = process.env.TURN_USERNAME;
  const credential = process.env.TURN_CREDENTIAL;
  if (!username || !credential) return [];
  return [
    'turn:global.relay.metered.ca:80',
    'turn:global.relay.metered.ca:80?transport=tcp',
    'turn:global.relay.metered.ca:443',
    'turns:global.relay.metered.ca:443?transport=tcp',
  ].map((urls) => ({ urls, username, credential }));
}

async function getIceServers() {
  if (iceCache.servers && Date.now() - iceCache.at < ICE_CACHE_MS) return iceCache.servers;
  let servers = null;
  if (process.env.METERED_API_KEY) {
    try {
      const url = `https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${encodeURIComponent(process.env.METERED_API_KEY)}`;
      const list = await fetchJSON(url);
      if (Array.isArray(list) && list.length) servers = list;
    } catch (err) {
      console.warn(`[ice] Metered API failed (${err.message}) — using fallback`);
    }
  }
  if (!servers) servers = [...STUN_SERVERS, ...staticTurnServers()];
  iceCache = { servers, at: Date.now() };
  return servers;
}

app.get('/api/turn-credentials', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getIceServers());
});

// ── QR code endpoint (only for this app's own director links) ────────
app.get('/api/qr', async (req, res) => {
  const { url } = req.query;
  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).end(); }
  if (parsed.host !== req.headers.host || parsed.pathname !== '/director.html') {
    return res.status(400).end();
  }
  try {
    const buf = await QRCode.toBuffer(parsed.href, {
      width: 400, margin: 3,
      color: { dark: '#000000', light: '#ffffff' },
    });
    res.set('Content-Type', 'image/png').set('Cache-Control', 'public,max-age=3600').send(buf);
  } catch { res.status(500).end(); }
});

// ── HTTP vs HTTPS ────────────────────────────────────────────────────
let server;
if (process.env.NODE_ENV === 'production') {
  const http = require('http');
  server = http.createServer(app);
} else {
  // Local HTTPS needs a certificate. Keep one on disk so phones only have to accept it once —
  // a fresh certificate on every restart would make them warn (and fail) all over again.
  const certFile = path.join(__dirname, '.cert', 'dev-cert.json');
  let pems = null;
  try { pems = JSON.parse(fs.readFileSync(certFile, 'utf8')); } catch {}
  if (!pems?.private || !pems?.cert) {
    const selfsigned = require('selfsigned');
    pems = selfsigned.generate([{ name: 'commonName', value: 'picme.local' }], { days: 825, keySize: 2048 });
    try {
      fs.mkdirSync(path.dirname(certFile), { recursive: true });
      fs.writeFileSync(certFile, JSON.stringify({ private: pems.private, cert: pems.cert }));
    } catch {}
  }
  server = https.createServer({ key: pems.private, cert: pems.cert }, app);
}

const wss = new WebSocket.Server({ server });

// ── Word list for room codes (280 words) ─────────────────────────────
const WORDS = [
  'apple','atlas','barn','beach','bird','blade','bloom','blue','boat','bolt',
  'bone','book','boot','brave','brick','brook','brush','buck','burn','burst',
  'bush','calm','cave','cedar','chalk','charm','chase','chief','clay','cliff',
  'cloud','coast','coin','coral','core','corn','crane','creek','crisp','crop',
  'crown','curl','curve','cycle','dawn','deer','delta','dome','door','dove',
  'draft','draw','drift','drop','drum','dusk','dust','eagle','earth','echo',
  'edge','ember','epic','fade','fawn','fern','field','fire','fish','flag',
  'flame','flash','fleet','flock','flood','flow','foam','fold','ford','forge',
  'fork','form','fort','frost','fuel','gale','gate','gaze','gear','gem',
  'glade','glow','gold','grain','grand','grape','grass','gray','green','grim',
  'grip','grove','guard','gulf','gust','hail','hare','hawk','haze','helm',
  'herb','hero','hill','hive','hold','hole','hope','horn','hull','hunt',
  'iris','isle','jade','jump','keep','kind','kite','knot','lake','land',
  'lane','lark','lava','lead','leaf','lean','ledge','lime','line','link',
  'lion','lone','loop','lure','lynx','mace','main','maple','mark','marsh',
  'mast','maze','mesa','mild','mill','mint','mist','moon','moose','moss',
  'mount','mule','nest','night','noon','north','oak','opal','orca','oval',
  'pace','palm','path','peak','pear','pine','pipe','plain','plum','pod',
  'pond','pool','port','post','prey','pride','prime','pulse','pure','rain',
  'rapid','raven','ray','reef','rest','ridge','rift','ring','rise','river',
  'roam','robe','rock','root','rose','rover','ruin','rush','rust','sage',
  'sail','salt','sand','scale','scout','seed','shade','shaft','shark','shell',
  'shore','silk','silt','site','skill','sky','slate','slim','slope','snow',
  'soft','soil','soul','spark','spear','speed','spire','spring','spur','star',
  'stem','step','stern','stone','storm','stream','swift','sword','tall','teal',
  'thorn','tide','tiger','tile','torch','trail','tree','trout','tuft','tusk',
  'vale','vault','veil','vine','violet','viper','void','volt','wade','wake',
  'wall','wave','west','wheat','wild','wind','wolf','wood','wren','zone',
];

// ── Room state ───────────────────────────────────────────────────────
const rooms     = new Map(); // code → room object
const usedCodes = new Set(); // one-time enforcement: codes are never reused

const ROOM_EXPIRY_MS         = 10 * 60 * 1000; // no director joined for 10 min
const DIRECTOR_GRACE_MS      =  2 * 60 * 1000; // director dropped: can resume for 2 min
const PHOTOGRAPHER_GRACE_MS  =  3 * 60 * 1000; // photographer dropped: can resume for 3 min
const HEARTBEAT_MS           = 20 * 1000;      // server → client "hb" interval
const DEAD_SOCKET_MS         = 50 * 1000;      // silent this long = dead connection

const randomInt = (n) => crypto.randomInt(n);
const newToken  = () => crypto.randomBytes(16).toString('hex');
const newJoinKey = () => crypto.randomBytes(9).toString('base64url'); // goes in the QR code

function generateCode() {
  let code, tries = 0;
  do {
    const a = WORDS[randomInt(WORDS.length)];
    const b = WORDS[randomInt(WORDS.length)];
    const c = WORDS[randomInt(WORDS.length)];
    const n = 1000 + randomInt(9000);
    code = `${a}-${b}-${n}-${c}`;
    tries++;
  } while ((rooms.has(code) || usedCodes.has(code)) && tries < 200);
  return code;
}

function clearTimer(room, key) {
  if (room[key]) { clearTimeout(room[key]); room[key] = null; }
}

function expireRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  const msg = { type: 'session-expired', message: 'Session ended — please start a new room.' };
  send(room.photographer, msg);
  send(room.director,     msg);
  send(room.pendingDirector, msg);
  clearTimer(room, 'expiryTimer');
  clearTimer(room, 'directorGraceTimer');
  clearTimer(room, 'photographerGraceTimer');
  usedCodes.add(code);
  rooms.delete(code);
  console.log(`[room] expired: ${code}`);
}

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function tokensMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Let a director in: from the Photographer tapping Allow, or from scanning the QR in person.
function approveDirector(room, code, pending) {
  clearTimer(room, 'directorGraceTimer');
  clearTimer(room, 'expiryTimer');
  if (room.pendingDirector === pending) room.pendingDirector = null;
  if (room.director && room.director !== pending) room.director.terminate();
  room.director      = pending;
  room.directorToken = newToken();
  room.joinKey       = newJoinKey(); // each QR code works once
  pending.role = 'director'; pending.roomCode = code;
  send(pending, { type: 'room-joined', code, token: room.directorToken, photographerPresent: true, mode: room.mode });
  send(room.photographer, { type: 'director-joined', resumed: false });
  send(room.photographer, { type: 'room-key', key: room.joinKey });
}

// Director gone for good (left, or grace expired): room goes back to waiting.
function releaseDirector(room, code) {
  clearTimer(room, 'directorGraceTimer');
  room.director      = null;
  room.directorToken = null;
  send(room.photographer, { type: 'director-gone' });
  clearTimer(room, 'expiryTimer');
  room.expiryTimer = setTimeout(() => expireRoom(code), ROOM_EXPIRY_MS);
}

// ── WebSocket rate limiting (join/create attempts per IP) ────────────
const wsRateMap = new Map(); // ip → { count, resetAt, blockedUntil }

function checkWsRate(ip) {
  const now = Date.now();
  let r = wsRateMap.get(ip);
  if (!r) { r = { count: 0, resetAt: now + 60_000, blockedUntil: 0 }; wsRateMap.set(ip, r); }
  if (now < r.blockedUntil) return false;
  if (now >= r.resetAt) { r.count = 0; r.resetAt = now + 60_000; }
  if (++r.count > 10) { r.blockedUntil = now + 5 * 60_000; return false; }
  return true;
}

// Prune stale rate-limit records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of wsRateMap)
    if (now > r.blockedUntil && now > r.resetAt) wsRateMap.delete(ip);
}, 10 * 60_000);

// ── Heartbeat: detect dead phones (locked screen, lost signal) ───────
setInterval(() => {
  const now = Date.now();
  for (const ws of wss.clients) {
    if (now - ws.lastSeen > DEAD_SOCKET_MS) { ws.terminate(); continue; }
    send(ws, { type: 'hb' });
  }
}, HEARTBEAT_MS);

// ── Signaling ────────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  ws.role     = null;
  ws.roomCode = null;
  ws.lastSeen = Date.now();

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket.remoteAddress;

  ws.on('message', (raw) => {
    ws.lastSeen = Date.now();
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg.type !== 'string') return;

    // Rate-limit all join/create attempts
    if (msg.type === 'join-room' || msg.type === 'create-room') {
      if (!checkWsRate(ip)) {
        send(ws, { type: 'error', message: 'Too many attempts — please wait 5 minutes.' });
        return;
      }
    }

    switch (msg.type) {

      case 'hb': break; // keep-alive reply, lastSeen already updated

      case 'create-room': {
        const code  = generateCode();
        const token = newToken();
        const key   = newJoinKey();
        const mode  = msg.mode === 'tripod' ? 'tripod' : 'photo';
        rooms.set(code, {
          mode,
          photographer:           ws,
          photographerToken:      token,
          joinKey:                key,
          director:               null,
          directorToken:          null,
          pendingDirector:        null,
          expiryTimer:            setTimeout(() => expireRoom(code), ROOM_EXPIRY_MS),
          directorGraceTimer:     null,
          photographerGraceTimer: null,
        });
        ws.role = 'photographer'; ws.roomCode = code;
        send(ws, { type: 'room-created', code, token, key, mode });
        console.log(`[room] created: ${code}`);
        break;
      }

      // Photographer reconnecting to its own room after a dropped connection
      case 'resume-room': {
        const room = rooms.get(msg.code);
        if (!room || !tokensMatch(msg.token, room.photographerToken)) {
          send(ws, { type: 'resume-failed' });
          return;
        }
        if (room.photographer && room.photographer !== ws) room.photographer.terminate();
        clearTimer(room, 'photographerGraceTimer');
        room.photographer = ws;
        ws.role = 'photographer'; ws.roomCode = msg.code;
        send(ws, { type: 'room-resumed', code: msg.code, key: room.joinKey, mode: room.mode, directorPresent: !!room.director });
        send(room.director, { type: 'photographer-back' });
        if (room.pendingDirector) send(ws, { type: 'knock' });
        console.log(`[room] photographer resumed: ${msg.code}`);
        break;
      }

      case 'join-room': {
        const code = (typeof msg.code === 'string' ? msg.code : '').toLowerCase().replace(/\s/g, '');
        const room = rooms.get(code);
        if (!room) {
          send(ws, { type: 'error', message: 'Room not found. Check the code and try again.' });
          return;
        }
        if (!room.photographer) {
          send(ws, { type: 'error', message: 'The Photographer is reconnecting — try again in a moment.' });
          return;
        }
        if (room.director) {
          send(ws, { type: 'error', message: 'Room already has a Director connected.' });
          return;
        }
        // Scanned the QR in person → the one-time key proves they're standing there. No knock.
        if (typeof msg.key === 'string' && room.joinKey && tokensMatch(msg.key, room.joinKey)) {
          if (room.pendingDirector) {
            send(room.pendingDirector, { type: 'knock-denied', message: 'Someone else joined by scanning the code.' });
            room.pendingDirector.role = null; room.pendingDirector.roomCode = null;
            room.pendingDirector = null;
            send(room.photographer, { type: 'knock-cancelled' });
          }
          approveDirector(room, code, ws);
          console.log(`[room] joined by QR: ${code}`);
          return;
        }
        if (room.pendingDirector) {
          send(ws, { type: 'error', message: 'Another request is already pending approval.' });
          return;
        }
        room.pendingDirector = ws; ws.role = 'pending-director'; ws.roomCode = code;
        send(ws, { type: 'knock-sent' });
        send(room.photographer, { type: 'knock' });
        console.log(`[room] knock: ${code}`);
        break;
      }

      // Director reconnecting after a dropped connection — no new knock needed
      case 'rejoin-room': {
        const room = rooms.get(msg.code);
        if (!room || !room.directorToken || !tokensMatch(msg.token, room.directorToken)) {
          send(ws, { type: 'rejoin-failed' });
          return;
        }
        if (room.director && room.director !== ws) room.director.terminate();
        clearTimer(room, 'directorGraceTimer');
        room.director = ws;
        ws.role = 'director'; ws.roomCode = msg.code;
        send(ws, { type: 'room-joined', code: msg.code, token: room.directorToken, resumed: true,
                   photographerPresent: !!room.photographer, mode: room.mode });
        send(room.photographer, { type: 'director-joined', resumed: true, peerAlive: !!msg.peerAlive });
        console.log(`[room] director resumed: ${msg.code}`);
        break;
      }

      case 'knock-response': {
        if (ws.role !== 'photographer') return;
        const room = rooms.get(ws.roomCode);
        if (!room || !room.pendingDirector) return;
        const pending = room.pendingDirector;
        room.pendingDirector = null;
        if (msg.allowed) {
          approveDirector(room, ws.roomCode, pending);
          console.log(`[room] approved: ${ws.roomCode}`);
        } else {
          pending.role = null; pending.roomCode = null;
          send(pending, { type: 'knock-denied', message: 'The Photographer declined your request.' });
          console.log(`[room] denied: ${ws.roomCode}`);
        }
        break;
      }

      case 'cancel-knock': {
        if (ws.role !== 'pending-director') return;
        const room = rooms.get(ws.roomCode);
        if (room && room.pendingDirector === ws) {
          room.pendingDirector = null;
          send(room.photographer, { type: 'knock-cancelled' });
        }
        ws.role = null; ws.roomCode = null;
        break;
      }

      // WebRTC signaling + mic state: only between the two approved peers
      case 'offer':
      case 'answer':
      case 'ice-candidate':
      case 'mic-state': {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        let target = null;
        if (ws.role === 'photographer' && room.photographer === ws) target = room.director;
        else if (ws.role === 'director' && room.director === ws) target = room.photographer;
        if (!target) return;
        if (msg.type === 'mic-state') send(target, { type: 'mic-state', enabled: !!msg.enabled });
        else send(target, { type: msg.type, sdp: msg.sdp, candidate: msg.candidate });
        break;
      }

      // ── Swap roles: either side asks, the other approves ──
      case 'swap-request': {
        const room = rooms.get(ws.roomCode);
        if (!room || room.mode !== 'photo' || !room.photographer || !room.director) return;
        const isP = ws.role === 'photographer' && room.photographer === ws;
        const isD = ws.role === 'director' && room.director === ws;
        if (!isP && !isD) return;
        room.swapFrom = ws.role;
        send(isP ? room.director : room.photographer, { type: 'swap-request' });
        break;
      }

      case 'swap-response': {
        const room = rooms.get(ws.roomCode);
        if (!room || !room.swapFrom || !room.photographer || !room.director) return;
        const answerer = room.swapFrom === 'photographer' ? room.director : room.photographer;
        const asker    = room.swapFrom === 'photographer' ? room.photographer : room.director;
        if (ws !== answerer) return;
        room.swapFrom = null;
        if (!msg.accept) { send(asker, { type: 'swap-declined' }); return; }

        const code = ws.roomCode;
        const oldP = room.photographer, oldD = room.director;
        room.photographerToken = newToken();
        room.directorToken     = newToken();
        room.photographer = null;
        room.director     = null;
        // Both phones are about to reload into their new screens — their old sockets no longer own the room
        oldP.roomCode = null; oldP.role = null;
        oldD.roomCode = null; oldD.role = null;
        clearTimer(room, 'photographerGraceTimer');
        room.photographerGraceTimer = setTimeout(() => expireRoom(code), PHOTOGRAPHER_GRACE_MS);
        clearTimer(room, 'directorGraceTimer');
        room.directorGraceTimer = setTimeout(() => releaseDirector(room, code), DIRECTOR_GRACE_MS);
        send(oldD, { type: 'swap-go', role: 'photographer', code, token: room.photographerToken });
        send(oldP, { type: 'swap-go', role: 'director',     code, token: room.directorToken });
        console.log(`[room] roles swapped: ${code}`);
        break;
      }

      case 'command': {
        const room = rooms.get(ws.roomCode);
        if (!room || ws.role !== 'director' || room.director !== ws) return;
        send(room.photographer, { type: 'command', command: msg.command, data: msg.data });
        break;
      }

    }
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;
    const code = ws.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    if (ws.role === 'photographer' && room.photographer === ws) {
      // Keep the room alive so the photographer can come back (locked screen, app switch)
      room.photographer = null;
      send(room.director,        { type: 'photographer-away' });
      if (room.pendingDirector) {
        send(room.pendingDirector, { type: 'knock-denied', message: 'The Photographer disconnected.' });
        room.pendingDirector.role = null; room.pendingDirector.roomCode = null;
        room.pendingDirector = null;
      }
      clearTimer(room, 'photographerGraceTimer');
      room.photographerGraceTimer = setTimeout(() => expireRoom(code), PHOTOGRAPHER_GRACE_MS);
      console.log(`[room] photographer away: ${code}`);
    } else if (ws.role === 'director' && room.director === ws) {
      room.director = null;
      send(room.photographer, { type: 'director-away' });
      clearTimer(room, 'directorGraceTimer');
      room.directorGraceTimer = setTimeout(() => releaseDirector(room, code), DIRECTOR_GRACE_MS);
      console.log(`[room] director away: ${code}`);
    } else if (ws.role === 'pending-director' && room.pendingDirector === ws) {
      room.pendingDirector = null;
      send(room.photographer, { type: 'knock-cancelled' });
    }
  });
});

module.exports = app;

if (!process.env.VERCEL) {
  function getLocalIP() {
    for (const ifaces of Object.values(os.networkInterfaces()))
      for (const iface of ifaces)
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    return 'localhost';
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n PicMe is running!\n');
    const turn = process.env.METERED_API_KEY ? 'Metered API'
      : (process.env.TURN_USERNAME ? 'static TURN credentials' : 'none (STUN only — same Wi-Fi works best)');
    console.log(` TURN relay: ${turn}`);
    if (process.env.NODE_ENV !== 'production') {
      const ip = getLocalIP();
      console.log(` Local:   https://localhost:${PORT}`);
      console.log(` Network: https://${ip}:${PORT}   <-- open this on both phones\n`);
      console.log(' NOTE: Both devices will show a security warning (self-signed cert).');
      console.log('       Tap "Advanced" then "Proceed" to continue.\n');
    } else {
      console.log(` Listening on port ${PORT}`);
    }
  });
}
