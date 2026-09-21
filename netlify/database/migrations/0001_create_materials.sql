CREATE TABLE IF NOT EXISTS "materials" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "subject" text NOT NULL,
  "blob_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
