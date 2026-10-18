CREATE TYPE "public"."wishlist_kind" AS ENUM('link', 'file');--> statement-breakpoint
CREATE TABLE "pair_members" (
	"participant_id" uuid PRIMARY KEY NOT NULL,
	"pair_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"participant_a_id" uuid NOT NULL,
	"participant_b_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pairs_ordered" CHECK ("pairs"."participant_a_id" < "pairs"."participant_b_id")
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"participant_id" uuid PRIMARY KEY NOT NULL,
	"kind" "wishlist_kind" NOT NULL,
	"url" varchar(2000),
	"file_key" varchar(200),
	"file_name" varchar(100),
	"file_type" varchar(50),
	"file_size" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlists_shape" CHECK (("wishlists"."kind" = 'link' and "wishlists"."url" is not null and "wishlists"."file_key" is null) or ("wishlists"."kind" = 'file' and "wishlists"."file_key" is not null and "wishlists"."url" is null))
);
--> statement-breakpoint
ALTER TABLE "pair_members" ADD CONSTRAINT "pair_members_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pair_members" ADD CONSTRAINT "pair_members_pair_id_pairs_id_fk" FOREIGN KEY ("pair_id") REFERENCES "public"."pairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairs" ADD CONSTRAINT "pairs_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairs" ADD CONSTRAINT "pairs_participant_a_id_participants_id_fk" FOREIGN KEY ("participant_a_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairs" ADD CONSTRAINT "pairs_participant_b_id_participants_id_fk" FOREIGN KEY ("participant_b_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;