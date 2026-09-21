CREATE TABLE IF NOT EXISTS "subjects" (
  "name" text PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "events" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "name" text NOT NULL,
  "subject" text NOT NULL,
  "date" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
