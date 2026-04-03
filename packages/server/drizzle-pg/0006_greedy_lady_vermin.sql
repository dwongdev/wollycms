CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" text NOT NULL,
	"expires_at" text NOT NULL,
	"rotated_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_oauth" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"email" text,
	"name" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pages" DROP CONSTRAINT "pages_slug_unique";--> statement-breakpoint
ALTER TABLE "page_revisions" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "translation_group_id" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "unpublish_at" text;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_oauth" ADD CONSTRAINT "user_oauth_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_oauth_provider_unique" ON "user_oauth" USING btree ("provider","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_oauth_user_provider_unique" ON "user_oauth" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_locale_unique" ON "pages" USING btree ("slug","locale");--> statement-breakpoint
CREATE INDEX "idx_pages_locale" ON "pages" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "idx_pages_translation_group" ON "pages" USING btree ("translation_group_id");