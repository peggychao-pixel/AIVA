import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const momentsTable = pgTable("moments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  loopType: text("loop_type"),
  anchorPhrase: text("anchor_phrase"),
  surfaceBelief: text("surface_belief"),
  hiddenFear: text("hidden_fear"),
  coreNeed: text("core_need"),
  originalThought: text("original_thought"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMomentSchema = createInsertSchema(momentsTable).omit({ id: true, createdAt: true });
export type InsertMoment = z.infer<typeof insertMomentSchema>;
export type Moment = typeof momentsTable.$inferSelect;
