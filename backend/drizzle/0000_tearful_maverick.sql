CREATE TABLE "riders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"sacco_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "riders_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "saccos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_sacco_id_saccos_id_fk" FOREIGN KEY ("sacco_id") REFERENCES "public"."saccos"("id") ON DELETE no action ON UPDATE no action;