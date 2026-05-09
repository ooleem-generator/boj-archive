ALTER TABLE "challenge_contributors" DROP CONSTRAINT "challenge_contributors_challenge_id_challenges_id_fk";
--> statement-breakpoint
ALTER TABLE "challenge_submissions" DROP CONSTRAINT "challenge_submissions_challenge_id_challenges_id_fk";
--> statement-breakpoint
ALTER TABLE "challenge_contributors" ADD CONSTRAINT "challenge_contributors_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;