CREATE TYPE "public"."app_language" AS ENUM('en', 'sw');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "language" "app_language";