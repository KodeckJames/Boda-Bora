import { sql } from 'drizzle-orm'
import { customType } from 'drizzle-orm/pg-core'

// PostGIS columns in WGS 84 (SRID 4326). Drizzle's built-in `geometry` helper drops the SRID
// (and only really supports points), so these declare the exact column types and write
// SRID-tagged values. x = longitude, y = latitude.

export type XY = { x: number; y: number }

// Points come back from Postgres as hex EWKB: byte order, type (with SRID flag), [SRID], x, y.
function parseEwkbPoint(hex: string): XY {
  const buf = Buffer.from(hex, 'hex')
  const le = buf[0] === 1
  const type = le ? buf.readUInt32LE(1) : buf.readUInt32BE(1)
  const offset = type & 0x20000000 ? 9 : 5 // skip the SRID if present
  const x = le ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset)
  const y = le ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8)
  return { x, y }
}

export const point4326 = customType<{ data: XY; driverData: string }>({
  dataType: () => 'geometry(Point,4326)',
  toDriver: (v) => sql`ST_SetSRID(ST_MakePoint(${v.x}, ${v.y}), 4326)` as unknown as string,
  fromDriver: (v) => parseEwkbPoint(v),
})

// Written with sql`ST_GeomFromText(...)`; read it as GeoJSON with ST_AsGeoJSON when needed.
export const lineString4326 = customType<{ data: string; driverData: string }>({
  dataType: () => 'geometry(LineString,4326)',
})
