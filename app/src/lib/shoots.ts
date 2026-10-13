// Your shoots: each one is the photos from one session, newest photo first.
// Photos are kept inside the app (Documents/shoots/<id>/), and the list lives in AsyncStorage.
// The "Show demo shoots" switch in Settings adds sample ones so the layout can be tried.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSource } from 'expo-image';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { useSettings } from './settings';
import { SAMPLE_PHOTOS } from './samples';

// `uri` is set for your own photos (what gets saved to Photos); `thumb` is a small copy for grids and strips.
export type ShootPhoto = { key: string; src: ImageSource; fav: boolean; uri?: string; thumb?: ImageSource };
export type Shoot = { id: string; at: number; photos: ShootPhoto[]; demo?: boolean };

// ── stored shoots ─────────────────────────────────────────────

// `file` is relative to the app's Documents folder: iPhone moves that folder on every app update,
// so a full path saved today would point nowhere next month. On the web, `file` is the photo itself.
type StoredPhoto = { key: string; file: string; fav: boolean; thumb?: string };
type StoredShoot = { id: string; at: number; photos: StoredPhoto[] };

const KEY = 'picme.shoots.v1';
const WEB = Platform.OS === 'web';
let stored: StoredShoot[] = [];
let snapshot: Shoot[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function fs() {
  return require('expo-file-system') as typeof import('expo-file-system');
}

function photoUri(shootId: string, file: string) {
  if (WEB) return file;
  const { File, Paths } = fs();
  return new File(Paths.document, 'shoots', shootId, file).uri;
}

function publish() {
  snapshot = stored.map((s) => ({
    id: s.id,
    at: s.at,
    photos: s.photos.map((p) => {
      const uri = photoUri(s.id, p.file);
      return { key: p.key, fav: p.fav, uri, src: { uri }, thumb: p.thumb ? { uri: photoUri(s.id, p.thumb) } : undefined };
    }),
  }));
  listeners.forEach((l) => l());
}

function persist() {
  publish();
  if (WEB) return; // the web preview keeps shoots for the session only (photos are too big for its storage)
  AsyncStorage.setItem(KEY, JSON.stringify(stored)).catch(() => {});
}

function load() {
  if (loaded) return;
  loaded = true;
  if (WEB) return;
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as StoredShoot[];
      const ids = new Set(stored.map((s) => s.id));
      stored = [...stored, ...saved.filter((s) => !ids.has(s.id))].sort((a, b) => b.at - a.at);
      publish();
      // Photos saved before thumbnails existed get theirs now, quietly
      stored.forEach((s) => queueThumbs(s.id, s.photos.filter((p) => !p.thumb).map((p) => p.key)));
    })
    .catch(() => {});
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Keep new photos (camera cache files) in a shoot. Newest first. Returns the photo keys. */
export function addPhotos(shootId: string, uris: string[]) {
  load();
  const stamp = Date.now();
  const photos: StoredPhoto[] = [];
  uris.forEach((uri, i) => {
    const key = `${shootId}-${stamp}-${i}`;
    if (WEB) {
      photos.push({ key, file: uri, fav: false });
      return;
    }
    try {
      const { Directory, File, Paths } = fs();
      const dir = new Directory(Paths.document, 'shoots', shootId);
      dir.create({ intermediates: true, idempotent: true });
      const name = `${stamp}-${i}.jpg`;
      new File(uri).moveSync(new File(dir, name));
      photos.push({ key, file: name, fav: false });
    } catch {
      // A photo that couldn't be kept is skipped; the rest still land.
    }
  });
  if (!photos.length) return [];
  insert(shootId, photos.reverse());
  return photos.map((p) => p.key);
}

/** Keep a photo that arrived from the other phone (a JPEG data URL). Returns its key, or null. */
export function addPhotoData(shootId: string, dataUrl: string) {
  load();
  const stamp = Date.now();
  const tag = Math.random().toString(36).slice(2, 7);
  const key = `${shootId}-${stamp}-${tag}`;
  let file = dataUrl;
  if (!WEB) {
    try {
      const { Directory, File, Paths } = fs();
      const dir = new Directory(Paths.document, 'shoots', shootId);
      dir.create({ intermediates: true, idempotent: true });
      const name = `${stamp}-${tag}.jpg`;
      const f = new File(dir, name);
      f.create();
      f.write(dataUrl.slice(dataUrl.indexOf(',') + 1), { encoding: 'base64' } as any);
      file = name;
    } catch {
      return null;
    }
  }
  insert(shootId, [{ key, file, fav: false }]);
  return key;
}

/** New photos go to the front of their shoot (a new shoot goes to the front of the list). */
function insert(shootId: string, photos: StoredPhoto[]) {
  const existing = stored.find((s) => s.id === shootId);
  if (existing) {
    stored = stored.map((s) => (s.id === shootId ? { ...s, photos: [...photos, ...s.photos] } : s));
  } else {
    stored = [{ id: shootId, at: Date.now(), photos }, ...stored];
  }
  queueThumbs(
    shootId,
    photos.map((p) => p.key),
  );
  persist();
}

// ── small copies for grids and the viewer's strip (decoding 12 MP photos there is what made it lag) ──

const thumbQueue: { shootId: string; key: string }[] = [];
let thumbBusy = false;

function queueThumbs(shootId: string, keys: string[]) {
  if (WEB || !keys.length) return;
  keys.forEach((key) => thumbQueue.push({ shootId, key }));
  void runThumbs();
}

async function runThumbs() {
  if (thumbBusy) return;
  thumbBusy = true;
  const { ImageManipulator, SaveFormat } = require('expo-image-manipulator') as typeof import('expo-image-manipulator');
  while (thumbQueue.length) {
    const { shootId, key } = thumbQueue.shift()!;
    const p = stored.find((s) => s.id === shootId)?.photos.find((x) => x.key === key);
    if (!p || p.thumb) continue;
    try {
      const img = await ImageManipulator.manipulate(photoUri(shootId, p.file)).resize({ width: 360 }).renderAsync();
      const out = await img.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
      const { Directory, File, Paths } = fs();
      const name = `${p.file.replace(/\.jpg$/, '')}-t.jpg`;
      new File(out.uri).moveSync(new File(new Directory(Paths.document, 'shoots', shootId), name));
      stored = stored.map((s) => (s.id !== shootId ? s : { ...s, photos: s.photos.map((x) => (x.key === key ? { ...x, thumb: name } : x)) }));
      persist();
    } catch {
      // no thumbnail: the full photo is shown instead
    }
  }
  thumbBusy = false;
}

// ── deleting ──────────────────────────────────────────────────

function deleteFiles(shootId: string, photos: StoredPhoto[]) {
  if (WEB) return;
  const { File, Paths } = fs();
  photos.forEach((p) =>
    [p.file, p.thumb].forEach((f) => {
      if (!f) return;
      try {
        new File(Paths.document, 'shoots', shootId, f).delete();
      } catch {}
    }),
  );
}

/** Delete some photos from a shoot (from this phone only). A shoot left empty goes away. */
export function removePhotos(shootId: string, keys: string[]) {
  const shoot = stored.find((s) => s.id === shootId);
  if (!shoot) return;
  const gone = new Set(keys);
  deleteFiles(
    shootId,
    shoot.photos.filter((p) => gone.has(p.key)),
  );
  const left = shoot.photos.filter((p) => !gone.has(p.key));
  stored = left.length ? stored.map((s) => (s.id === shootId ? { ...s, photos: left } : s)) : stored.filter((s) => s.id !== shootId);
  persist();
}

/** Delete a whole shoot from this phone. */
export function removeShoot(shootId: string) {
  const shoot = stored.find((s) => s.id === shootId);
  if (!shoot) return;
  deleteFiles(shootId, shoot.photos);
  if (!WEB) {
    try {
      const { Directory, Paths } = fs();
      new Directory(Paths.document, 'shoots', shootId).delete();
    } catch {}
  }
  stored = stored.filter((s) => s.id !== shootId);
  persist();
}

export function setFav(shootId: string, key: string, fav: boolean) {
  stored = stored.map((s) => (s.id !== shootId ? s : { ...s, photos: s.photos.map((p) => (p.key === key ? { ...p, fav } : p)) }));
  persist();
}

// ── demo shoots ───────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const pick = (prefixes: string[]) => SAMPLE_PHOTOS.filter((p) => prefixes.some((x) => p.key.startsWith(x)));

function demoShoots(): Shoot[] {
  const today = new Date();
  today.setHours(18, 42, 0, 0);
  return [
    { id: 'demo-1', at: today.getTime(), photos: pick(['lake', 'city']), demo: true },
    { id: 'demo-2', at: today.getTime() - 2 * DAY - 3 * 60 * 60 * 1000, photos: pick(['beach']), demo: true },
    { id: 'demo-3', at: today.getTime() - 9 * DAY + 2 * 60 * 60 * 1000, photos: pick(['mountain']), demo: true },
  ];
}

export function useShoots(): Shoot[] {
  const { settings } = useSettings();
  const real = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return settings.demoShoots ? [...real, ...demoShoots()] : real;
}

/** The photos of one shoot, live (empty until the first photo lands). */
export function useShoot(id: string | undefined) {
  const real = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return real.find((s) => s.id === id);
}

export function findShoot(shoots: Shoot[], id: string | undefined) {
  return shoots.find((s) => s.id === id);
}

/** The photo that represents a shoot: the first favorite, or the first photo. */
export function cover(shoot: Shoot) {
  return shoot.photos.find((p) => p.fav) ?? shoot.photos[0];
}

export const favCount = (shoot: Shoot) => shoot.photos.filter((p) => p.fav).length;

/** "Today, 18:42", "Yesterday", "Saturday", or "Oct 3". */
export function shootLabel(at: number, withTime = true) {
  const d = new Date(at);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (at >= startOfToday) return withTime ? `Today, ${time}` : 'Today';
  if (at >= startOfToday - DAY) return withTime ? `Yesterday, ${time}` : 'Yesterday';
  if (at >= startOfToday - 6 * DAY) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
