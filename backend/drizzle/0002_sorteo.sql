CREATE TABLE "assignments" (
	"giver_id" uuid PRIMARY KEY NOT NULL,
	"receiver_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	CONSTRAINT "assignments_receiver_key" UNIQUE("receiver_id"),
	CONSTRAINT "assignments_not_self" CHECK ("assignments"."giver_id" <> "assignments"."receiver_id")
);
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "draw_round" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_giver_id_participants_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_receiver_id_participants_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;