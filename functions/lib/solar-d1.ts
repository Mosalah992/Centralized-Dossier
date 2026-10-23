// The war table's pieces in D1: the `solar_pins` table (migrations/
// 0005_solar_pins.sql) in the thalmor-reports database the Cabinet already
// reads, through the REPORTS binding. Only the routes import this.

import type { PinStore } from './solar-pins';
import type { SolarPin } from '../../shared/solar';

const COLUMNS = 'id, kind, x, y, label, note, created_at, updated_at';

function toPin(row: Record<string, unknown>): SolarPin {
  return {
    id: String(row.id),
    kind: row.kind === 'interest' ? 'interest' : 'pawn',
    x: Number(row.x),
    y: Number(row.y),
    label: String(row.label ?? ''),
    note: String(row.note ?? ''),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export function d1PinStore(db: D1Database): PinStore {
  return {
    async list() {
      const { results } = await db.prepare(`SELECT ${COLUMNS} FROM solar_pins ORDER BY created_at, id`).all<Record<string, unknown>>();
      return (results ?? []).map(toPin);
    },
    async count() {
      const row = await db.prepare('SELECT COUNT(*) AS n FROM solar_pins').first<{ n: number }>();
      return Number(row?.n ?? 0);
    },
    async get(id) {
      const row = await db.prepare(`SELECT ${COLUMNS} FROM solar_pins WHERE id = ?`).bind(id).first<Record<string, unknown>>();
      return row ? toPin(row) : null;
    },
    async insert(pin) {
      await db
        .prepare(`INSERT INTO solar_pins (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(pin.id, pin.kind, pin.x, pin.y, pin.label, pin.note, pin.createdAt, pin.updatedAt)
        .run();
    },
    async update(pin) {
      await db
        .prepare('UPDATE solar_pins SET kind = ?, x = ?, y = ?, label = ?, note = ?, updated_at = ? WHERE id = ?')
        .bind(pin.kind, pin.x, pin.y, pin.label, pin.note, pin.updatedAt, pin.id)
        .run();
    },
    async remove(id) {
      const result = await db.prepare('DELETE FROM solar_pins WHERE id = ?').bind(id).run();
      return (result.meta?.changes ?? 0) > 0;
    },
  };
}
