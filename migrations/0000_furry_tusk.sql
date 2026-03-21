CREATE TYPE "public"."event_state" AS ENUM('draft', 'polling', 'rsvp', 'final', 'closed');--> statement-breakpoint
CREATE TYPE "public"."game_type" AS ENUM('Scramble', 'Match Play', 'Stroke Play', 'Skins');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'organizer', 'member');--> statement-breakpoint
CREATE TYPE "public"."poll_type" AS ENUM('course', 'date');--> statement-breakpoint
CREATE TYPE "public"."poll_visibility" AS ENUM('live', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('joined', 'waitlisted', 'withdrawn');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"event_id" varchar(36),
	"actor_id" varchar(36) NOT NULL,
	"action" varchar(100) NOT NULL,
	"payload_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(255),
	"city" varchar(100) NOT NULL,
	"region" varchar(100) NOT NULL,
	"lat" real,
	"lng" real,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"fee_note" text,
	"website" varchar(500),
	"phone" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"group_id" varchar(36) NOT NULL,
	"title" varchar(255) NOT NULL,
	"state" "event_state" DEFAULT 'draft' NOT NULL,
	"capacity" integer NOT NULL,
	"notes" text,
	"game_type" "game_type",
	"team_size" integer,
	"chosen_course_id" varchar(36),
	"chosen_date" varchar(20),
	"created_by" varchar(36) NOT NULL,
	"deadlines_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"join_code" varchar(20) NOT NULL,
	"owner_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "groups_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"group_id" varchar(36) NOT NULL,
	"email" varchar(255) NOT NULL,
	"invited_by" varchar(36) NOT NULL,
	"token" varchar(64) NOT NULL,
	"accepted_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"group_id" varchar(36) NOT NULL,
	"role" "membership_role" NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pairing_members" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"pairing_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"order_int" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pairings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"tee_time_text" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"poll_id" varchar(36) NOT NULL,
	"label" varchar(255) NOT NULL,
	"course_id" varchar(36),
	"date_option" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"type" "poll_type" NOT NULL,
	"multi_select" boolean DEFAULT false NOT NULL,
	"closes_at" timestamp,
	"visibility" "poll_visibility" DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"position_int" integer,
	"claimed_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"poll_id" varchar(36) NOT NULL,
	"option_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_chosen_course_id_courses_id_fk" FOREIGN KEY ("chosen_course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_members" ADD CONSTRAINT "pairing_members_pairing_id_pairings_id_fk" FOREIGN KEY ("pairing_id") REFERENCES "public"."pairings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_members" ADD CONSTRAINT "pairing_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairings" ADD CONSTRAINT "pairings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_option_id_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."poll_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;