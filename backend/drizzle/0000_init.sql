CREATE TYPE "public"."room_status" AS ENUM('open', 'drawn');--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"name" varchar(30) NOT NULL,
	"name_key" varchar(30) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "participants_room_name_key" UNIQUE("room_id","name_key")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(60) NOT NULL,
	"gift_date" date,
	"budget_cents" integer,
	"status" "room_status" DEFAULT 'open' NOT NULL,
	"pair_rule_enabled" boolean DEFAULT true NOT NULL,
	"invite_code" varchar(32) NOT NULL,
	"manage_token_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_invite_code_unique" UNIQUE("invite_code"),
	CONSTRAINT "rooms_manage_token_hash_unique" UNIQUE("manage_token_hash")
);
--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;