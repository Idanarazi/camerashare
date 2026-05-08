const express  = require('express');
const WebSocket = require('ws');
const QRCode   = require('qrcode');
const path     = require('path');
const os       = require('os');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// ── QR code endpoint ────────────────────────────────────────────────
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

// ── HTTP vs HTTPS depending on environment ──────────────────────────
let server;
if (process.env.NODE_ENV === 'production') {
  // Production: platform (Railway / Render / Vercel) terminates SSL
  const http = require('http');
  server = http.createServer(app);
} else {
  // Local dev: self-signed SSL so mobile browsers grant camera access
  const https    = require('https');
  const selfsigned = require('selfsigned');
  const pems = selfsigned.generate([{ name: 'commonName', value: 'camerashare.local' }], {
    days: 365, keySize: 2048,
  });
  server = https.createServer({ key: pems.private, cert: pems.cert }, app);
}

const wss = new WebSocket.Server({ server });

// ── Room state ──────────────────────────────────────────────────────
// roomCode -> { photographer, director, pendingDirector }
const rooms = new Map();
const WORDS = ['LAKE','MOON','STAR','BLUE','ROSE','PINE','DAWN','MIST','GOLD','SAGE','FIRE','SNOW','WAVE','BIRD'];

function generateCode() {
  return `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

// ── Signaling ───────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  ws.role = null;
  ws.roomCode = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'create-room': {
        let code = generateCode();
        while (rooms.has(code)) code = generateCode();
        rooms.set(code, { photographer: ws, director: null, pendingDirector: null });
        ws.role = 'photographer'; ws.roomCode = code;
        send(ws, { type: 'room-created', code });
        console.log(`[room] created: ${code}`);
        break;
      }

      case 'join-room': {
        const code = (msg.code || '').toUpperCase().replace(/\s/g, '');
        const room = rooms.get(code);
        if (!room)              { send(ws, { type: 'error', message: 'Room not found. Check the code and try again.' }); return; }
        if (room.director)      { send(ws, { type: 'error', message: 'Room already has a Director connected.' }); return; }
        if (room.pendingDirector) { send(ws, { type: 'error', message: 'Another request is already pending approval.' }); return; }
        room.pendingDirector = ws; ws.role = 'pending-director'; ws.roomCode = code;
        send(ws, { type: 'knock-sent' });
        send(room.photographer, { type: 'knock' });
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
          room.director = pending; pending.role = 'director';
          send(pending, { type: 'room-joined', code: ws.roomCode });
          send(ws, { type: 'director-joined' });
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
      rooms.delete(ws.roomCode);
      console.log(`[room] closed: ${ws.roomCode}`);
    } else if (ws.role === 'director') {
      room.director = null;
      send(room.photographer, { type: 'peer-left', message: 'Director disconnected.' });
    } else if (ws.role === 'pending-director' && room.pendingDirector === ws) {
      room.pendingDirector = null;
      send(room.photographer, { type: 'knock-cancelled' });
    }
  });
});

// Exported for Vercel / serverless adapters
module.exports = app;

// ── Start (skipped on Vercel which handles listen itself) ───────────
if (!process.env.VERCEL) {
  function getLocalIP() {
    for (const ifaces of Object.values(os.networkInterfaces()))
      for (const iface of ifaces)
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    return 'localhost';
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    const proto = process.env.NODE_ENV === 'production' ? 'http' : 'https';
    console.log('\n CameraShare is running!\n');
    if (process.env.NODE_ENV !== 'production') {
      console.log(` Local:   https://localhost:${PORT}`);
      console.log(` Network: https://${ip}:${PORT}   <-- open this on both phones\n`);
      console.log(' NOTE: Both devices will show a security warning (self-signed cert).');
      console.log('       Tap "Advanced" then "Proceed" to continue.\n');
    } else {
      console.log(` Listening on port ${PORT}`);
    }
  });
}
