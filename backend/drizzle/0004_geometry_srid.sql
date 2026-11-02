-- Tag existing geometries with WGS 84 (SRID 4326) and fix trips.path, created as a point by mistake.
ALTER TABLE "blackspots" ALTER COLUMN "location" SET DATA TYPE geometry(Point,4326) USING ST_SetSRID("location", 4326);--> statement-breakpoint
ALTER TABLE "risk_events" ALTER COLUMN "location" SET DATA TYPE geometry(Point,4326) USING ST_SetSRID("location", 4326);--> statement-breakpoint
ALTER TABLE "stages" ALTER COLUMN "location" SET DATA TYPE geometry(Point,4326) USING ST_SetSRID("location", 4326);--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "path" SET DATA TYPE geometry(LineString,4326) USING ST_SetSRID("path", 4326);