const express   = require('express');
const WebSocket = require('ws');
const QRCode    = require('qrcode');
const path      = require('path');
const os        = require('os');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // trust Railway's load balancer for real IPs

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

// ── TURN credentials (credentials stay server-side, never in frontend) ──
app.get('/api/turn-credentials', (req, res) => {
  res.json([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    {
      urls: [
        'turn:coshot.metered.live:80',
        'turn:coshot.metered.live:80?transport=tcp',
        'turns:coshot.metered.live:443',
        'turns:coshot.metered.live:443?transport=tcp',
      ],
      username:   process.env.TURN_USERNAME   || '',
      credential: process.env.TURN_CREDENTIAL || '',
    },
  ]);
});

// ── QR code endpoint ─────────────────────────────────────────────────
app.get('/api/qr', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).end();
  try {
    const buf = await QRCode.toBuffer(url, {
      width: 280, margin: 1,
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
  const https      = require('https');
  const selfsigned = require('selfsigned');
  const pems = selfsigned.generate([{ name: 'commonName', value: 'camerashare.local' }], {
    days: 365, keySize: 2048,
  });
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
const rooms    = new Map(); // code → room object
const usedCodes = new Set(); // one-time enforcement: codes are never reused

const ROOM_EXPIRY_MS       = 10 * 60 * 1000; // 10 min: no director joined
const DISCONNECT_EXPIRY_MS =  2 * 60 * 1000; //  2 min: director dropped

function generateCode() {
  let code, tries = 0;
  do {
    const a = WORDS[Math.floor(Math.random() * WORDS.length)];
    const b = WORDS[Math.floor(Math.random() * WORDS.length)];
    const c = WORDS[Math.floor(Math.random() * WORDS.length)];
    const n = Math.floor(1000 + Math.random() * 9000);
    code = `${a}-${b}-${n}-${c}`;
    tries++;
  } while ((rooms.has(code) || usedCodes.has(code)) && tries < 200);
  return code;
}

function expireRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  const msg = { type: 'session-expired', message: 'Session expired — please start a new room.' };
  send(room.photographer, msg);
  send(room.director,     msg);
  send(room.pendingDirector, msg);
  if (room.expiryTimer)     clearTimeout(room.expiryTimer);
  if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
  usedCodes.add(code);
  rooms.delete(code);
  console.log(`[room] expired: ${code}`);
}

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
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

// ── Signaling ────────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  ws.role     = null;
  ws.roomCode = null;

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket.remoteAddress;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // Rate-limit all join/create attempts
    if (msg.type === 'join-room' || msg.type === 'create-room') {
      if (!checkWsRate(ip)) {
        send(ws, { type: 'error', message: 'Too many attempts — please wait 5 minutes.' });
        return;
      }
    }

    switch (msg.type) {

      case 'create-room': {
        const code = generateCode();
        const expiryTimer = setTimeout(() => expireRoom(code), ROOM_EXPIRY_MS);
        rooms.set(code, {
          photographer:    ws,
          director:        null,
          pendingDirector: null,
          expiryTimer,
          disconnectTimer: null,
        });
        ws.role = 'photographer'; ws.roomCode = code;
        send(ws, { type: 'room-created', code });
        console.log(`[room] created: ${code}`);
        break;
      }

      case 'join-room': {
        const code = (msg.code || '').toLowerCase().replace(/\s/g, '');
        const room = rooms.get(code);
        if (!room) {
          send(ws, { type: 'error', message: 'Room not found. Check the code and try again.' });
          return;
        }
        if (room.director) {
          send(ws, { type: 'error', message: 'Room already has a Director connected.' });
          return;
        }
        if (room.pendingDirector) {
          send(ws, { type: 'error', message: 'Another request is already pending approval.' });
          return;
        }
        room.pendingDirector = ws; ws.role = 'pending-director'; ws.roomCode = code;
        send(ws, { type: 'knock-sent' });
        send(room.photographer, { type: 'knock' });
        send(room.photographer, {
          type: 'join-attempt', outcome: 'pending',
          time: new Date().toISOString(),
        });
        console.log(`[room] knock: ${code}`);
        break;
      }

      case 'knock-response': {
        if (ws.role !== 'photographer') return;
        const room = rooms.get(ws.roomCode);
        if (!room || !room.pendingDirector) return;
        const pending = room.pendingDirector;
        room.pendingDirector = null;
        if (msg.allowed) {
          if (room.disconnectTimer) { clearTimeout(room.disconnectTimer); room.disconnectTimer = null; }
          if (room.expiryTimer)     { clearTimeout(room.expiryTimer);     room.expiryTimer     = null; }
          room.director = pending; pending.role = 'director';
          send(pending, { type: 'room-joined',    code: ws.roomCode });
          send(ws,      { type: 'director-joined' });
          send(ws, { type: 'join-attempt', outcome: 'allowed', time: new Date().toISOString() });
          console.log(`[room] approved: ${ws.roomCode}`);
        } else {
          pending.role = null; pending.roomCode = null;
          send(pending, { type: 'knock-denied', message: 'The Photographer declined your request.' });
          send(ws, { type: 'join-attempt', outcome: 'denied', time: new Date().toISOString() });
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
          send(room.photographer, {
            type: 'join-attempt', outcome: 'cancelled',
            time: new Date().toISOString(),
          });
        }
        ws.role = null; ws.roomCode = null;
        break;
      }

      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        send(ws.role === 'photographer' ? room.director : room.photographer, msg);
        break;
      }

      case 'command': {
        const room = rooms.get(ws.roomCode);
        if (!room || ws.role !== 'director') return;
        send(room.photographer, { type: 'command', command: msg.command, data: msg.data });
        break;
      }

      case 'unfreeze': {
        const room = rooms.get(ws.roomCode);
        if (!room || ws.role !== 'photographer') return;
        send(room.director, { type: 'unfreeze' });
        break;
      }

      case 'mic-state': {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        const target = ws.role === 'photographer' ? room.director : room.photographer;
        send(target, { type: 'mic-state', enabled: msg.enabled });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room) return;

    if (ws.role === 'photographer') {
      send(room.director,        { type: 'peer-left', message: 'Photographer disconnected.' });
      send(room.pendingDirector, { type: 'knock-denied', message: 'Photographer disconnected.' });
      if (room.expiryTimer)     clearTimeout(room.expiryTimer);
      if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
      usedCodes.add(ws.roomCode);
      rooms.delete(ws.roomCode);
      console.log(`[room] closed: ${ws.roomCode}`);
    } else if (ws.role === 'director') {
      room.director = null;
      send(room.photographer, { type: 'peer-left', message: 'Director disconnected.' });
      // 2-minute grace: expire room if director doesn't rejoin
      room.disconnectTimer = setTimeout(() => expireRoom(ws.roomCode), DISCONNECT_EXPIRY_MS);
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
    console.log('\n CameraShare is running!\n');
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
