CREATE TYPE "public"."batch_status" AS ENUM('received', 'processing', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."coaching_source" AS ENUM('ai', 'template');--> statement-breakpoint
CREATE TYPE "public"."coaching_status" AS ENUM('draft', 'published', 'read');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('harsh_braking', 'sharp_cornering', 'rapid_acceleration');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('pending', 'quoted', 'referred', 'declined');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."shift_source" AS ENUM('sacco_upload', 'sacco_manual');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('rider', 'sacco_admin', 'insurer_analyst', 'admin');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blackspots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" geometry(point) NOT NULL,
	"radius_m" integer DEFAULT 150 NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaching_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"message_sw" text NOT NULL,
	"message_en" text NOT NULL,
	"focus" text,
	"facts" jsonb NOT NULL,
	"source" "coaching_source" NOT NULL,
	"model" text,
	"status" "coaching_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"insurer_id" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "insurers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"sacco_id" uuid,
	"insurer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text,
	"name" text,
	"role" "user_role",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"insurer_id" uuid NOT NULL,
	"status" "quote_status" DEFAULT 'pending' NOT NULL,
	"score_snapshot" jsonb NOT NULL,
	"premium_ksh" integer,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_scores_current" (
	"rider_id" uuid PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"score" real NOT NULL,
	"braking" real NOT NULL,
	"cornering" real NOT NULL,
	"acceleration" real NOT NULL,
	"night_exposure" real NOT NULL,
	"route_risk" real NOT NULL,
	"coverage" real NOT NULL,
	"confidence" real NOT NULL,
	"delta" real,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"rider_id" uuid NOT NULL,
	"type" "event_type" NOT NULL,
	"severity" "severity" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"location" geometry(point),
	"speed_kmh" real,
	"magnitude_g" real NOT NULL,
	"blackspot_id" uuid
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"sacco_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"source" "shift_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sacco_id" uuid NOT NULL,
	"name" text NOT NULL,
	"location" geometry(point),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"batch_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"distance_m" real NOT NULL,
	"night_m" real DEFAULT 0 NOT NULL,
	"blackspot_m" real DEFAULT 0 NOT NULL,
	"max_speed_kmh" real,
	"path" geometry(point),
	"score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"status" "batch_status" DEFAULT 'received' NOT NULL,
	"session_started_at" timestamp with time zone,
	"session_ended_at" timestamp with time zone,
	"gaps" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "upload_batches_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "weekly_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"score" real NOT NULL,
	"braking" real NOT NULL,
	"cornering" real NOT NULL,
	"acceleration" real NOT NULL,
	"night_exposure" real NOT NULL,
	"route_risk" real NOT NULL,
	"coverage" real NOT NULL,
	"confidence" real NOT NULL,
	"distance_km" real NOT NULL,
	"trip_count" integer NOT NULL,
	"event_count" integer NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "stage_id" uuid;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "bike_reg" text;--> statement-breakpoint
ALTER TABLE "saccos" ADD COLUMN "county" text;--> statement-breakpoint
ALTER TABLE "coaching_messages" ADD CONSTRAINT "coaching_messages_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_sacco_id_saccos_id_fk" FOREIGN KEY ("sacco_id") REFERENCES "public"."saccos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_scores_current" ADD CONSTRAINT "rider_scores_current_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_blackspot_id_blackspots_id_fk" FOREIGN KEY ("blackspot_id") REFERENCES "public"."blackspots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_sacco_id_saccos_id_fk" FOREIGN KEY ("sacco_id") REFERENCES "public"."saccos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_sacco_id_saccos_id_fk" FOREIGN KEY ("sacco_id") REFERENCES "public"."saccos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_scores" ADD CONSTRAINT "weekly_scores_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_subject_idx" ON "audit_log" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "coaching_rider_week_idx" ON "coaching_messages" USING btree ("rider_id","week_start");--> statement-breakpoint
CREATE INDEX "consents_rider_idx" ON "consents" USING btree ("rider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_sacco_idx" ON "memberships" USING btree ("user_id","sacco_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_insurer_idx" ON "memberships" USING btree ("user_id","insurer_id");--> statement-breakpoint
CREATE INDEX "quote_requests_insurer_idx" ON "quote_requests" USING btree ("insurer_id","status");--> statement-breakpoint
CREATE INDEX "risk_events_rider_time_idx" ON "risk_events" USING btree ("rider_id","occurred_at");--> statement-breakpoint
CREATE INDEX "risk_events_trip_idx" ON "risk_events" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "shifts_rider_time_idx" ON "shifts" USING btree ("rider_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shifts_rider_start_idx" ON "shifts" USING btree ("rider_id","starts_at");--> statement-breakpoint
CREATE INDEX "stages_sacco_idx" ON "stages" USING btree ("sacco_id");--> statement-breakpoint
CREATE INDEX "trips_rider_time_idx" ON "trips" USING btree ("rider_id","started_at");--> statement-breakpoint
CREATE INDEX "upload_batches_rider_idx" ON "upload_batches" USING btree ("rider_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_scores_rider_week_idx" ON "weekly_scores" USING btree ("rider_id","week_start");--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "riders_sacco_idx" ON "riders" USING btree ("sacco_id");--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_user_id_unique" UNIQUE("user_id");