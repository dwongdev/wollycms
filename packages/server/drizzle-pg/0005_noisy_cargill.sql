CREATE TABLE "trusted_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "trusted_devices_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;