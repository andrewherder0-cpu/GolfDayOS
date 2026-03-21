import { z } from "zod";
import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb, pgEnum, real } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ===== USER SCHEMA =====
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  createdAt: z.string(),
});

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// ===== GROUP SCHEMA =====
export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  joinCode: z.string(),
  ownerId: z.string(),
  createdAt: z.string(),
});

export const insertGroupSchema = z.object({
  name: z.string().min(1),
});

export type Group = z.infer<typeof groupSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

// ===== MEMBERSHIP SCHEMA =====
export const membershipRoleEnum = z.enum(["owner", "member"]);

export const membershipSchema = z.object({
  id: z.string(),
  userId: z.string(),
  groupId: z.string(),
  role: membershipRoleEnum,
  joinedAt: z.string(),
});

export const insertMembershipSchema = z.object({
  userId: z.string(),
  groupId: z.string(),
  role: membershipRoleEnum,
});

export type MembershipRole = z.infer<typeof membershipRoleEnum>;
export type Membership = z.infer<typeof membershipSchema>;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;

// ===== COURSE SCHEMA =====
export const courseSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  region: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  tags: z.array(z.string()),
  feeNote: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const insertCourseSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  region: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  tags: z.array(z.string()).default([]),
  feeNote: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type Course = z.infer<typeof courseSchema>;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

// ===== EVENT SCHEMA =====
export const eventStateEnum = z.enum(["draft", "polling", "rsvp", "final", "closed"]);

export const eventSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  title: z.string(),
  state: eventStateEnum,
  capacity: z.number(),
  notes: z.string().optional(),
  chosenCourseId: z.string().optional(),
  chosenDate: z.string().optional(), // ISO date string
  createdBy: z.string(),
  deadlinesJson: z.string().optional(), // JSON string
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertEventSchema = z.object({
  groupId: z.string(),
  title: z.string().min(1),
  capacity: z.number().min(1).max(100),
  notes: z.string().optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  capacity: z.number().min(1).max(100).optional(),
  notes: z.string().optional(),
});

export type EventState = z.infer<typeof eventStateEnum>;
export type Event = z.infer<typeof eventSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;

// ===== POLL SCHEMA =====
export const pollTypeEnum = z.enum(["course", "date"]);
export const pollVisibilityEnum = z.enum(["live", "hidden"]);

export const pollSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  type: pollTypeEnum,
  closesAt: z.string().optional(), // ISO datetime string
  visibility: pollVisibilityEnum,
  createdAt: z.string(),
});

export const insertPollSchema = z.object({
  eventId: z.string(),
  type: pollTypeEnum,
  closesAt: z.string().optional(),
  visibility: pollVisibilityEnum.default("live"),
});

export type PollType = z.infer<typeof pollTypeEnum>;
export type PollVisibility = z.infer<typeof pollVisibilityEnum>;
export type Poll = z.infer<typeof pollSchema>;
export type InsertPoll = z.infer<typeof insertPollSchema>;

// ===== POLL OPTION SCHEMA =====
export const pollOptionSchema = z.object({
  id: z.string(),
  pollId: z.string(),
  label: z.string(),
  courseId: z.string().optional(),
  dateOption: z.string().optional(), // ISO date string
  createdAt: z.string(),
});

export const insertPollOptionSchema = z.object({
  pollId: z.string(),
  label: z.string(),
  courseId: z.string().optional(),
  dateOption: z.string().optional(),
});

export type PollOption = z.infer<typeof pollOptionSchema>;
export type InsertPollOption = z.infer<typeof insertPollOptionSchema>;

// ===== VOTE SCHEMA =====
export const voteSchema = z.object({
  id: z.string(),
  pollId: z.string(),
  optionId: z.string(),
  userId: z.string(),
  createdAt: z.string(),
});

export const insertVoteSchema = z.object({
  pollId: z.string(),
  optionId: z.string(),
  userId: z.string(),
});

export type Vote = z.infer<typeof voteSchema>;
export type InsertVote = z.infer<typeof insertVoteSchema>;

// ===== RSVP SCHEMA =====
export const rsvpStatusEnum = z.enum(["joined", "waitlisted", "withdrawn"]);

export const rsvpSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  userId: z.string(),
  status: rsvpStatusEnum,
  positionInt: z.number().optional(),
  claimedExpiresAt: z.string().optional(), // ISO datetime string
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertRsvpSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  status: rsvpStatusEnum,
  positionInt: z.number().optional(),
  claimedExpiresAt: z.string().optional(),
});

export type RsvpStatus = z.infer<typeof rsvpStatusEnum>;
export type Rsvp = z.infer<typeof rsvpSchema>;
export type InsertRsvp = z.infer<typeof insertRsvpSchema>;

// ===== PAIRING SCHEMA =====
export const pairingSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  teeTimeText: z.string().optional(),
  createdAt: z.string(),
});

export const insertPairingSchema = z.object({
  eventId: z.string(),
  name: z.string(),
  teeTimeText: z.string().optional(),
});

export type Pairing = z.infer<typeof pairingSchema>;
export type InsertPairing = z.infer<typeof insertPairingSchema>;

// ===== PAIRING MEMBER SCHEMA =====
export const pairingMemberSchema = z.object({
  id: z.string(),
  pairingId: z.string(),
  userId: z.string(),
  orderInt: z.number(),
  createdAt: z.string(),
});

export const insertPairingMemberSchema = z.object({
  pairingId: z.string(),
  userId: z.string(),
  orderInt: z.number(),
});

export type PairingMember = z.infer<typeof pairingMemberSchema>;
export type InsertPairingMember = z.infer<typeof insertPairingMemberSchema>;

// ===== CHAT MESSAGE SCHEMA =====
export const chatMessageSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  userId: z.string(),
  content: z.string(),
  createdAt: z.string(),
});

export const insertChatMessageSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  content: z.string().min(1).max(2000),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// ===== INVITATION SCHEMA =====
export const invitationSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  email: z.string().email(),
  invitedBy: z.string(),
  token: z.string(),
  acceptedAt: z.string().nullable(),
  expiresAt: z.string(),
  createdAt: z.string(),
});

export const insertInvitationSchema = z.object({
  groupId: z.string(),
  email: z.string().email(),
  invitedBy: z.string(),
  token: z.string(),
  expiresAt: z.string(),
});

export type Invitation = z.infer<typeof invitationSchema>;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

// ===== ACTIVITY LOG SCHEMA =====
export const activityLogSchema = z.object({
  id: z.string(),
  eventId: z.string().optional(),
  actorId: z.string(),
  action: z.string(),
  payloadJson: z.string().optional(), // JSON string
  createdAt: z.string(),
});

export const insertActivityLogSchema = z.object({
  eventId: z.string().optional(),
  actorId: z.string(),
  action: z.string(),
  payloadJson: z.string().optional(),
});

export type ActivityLog = z.infer<typeof activityLogSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// ========================================
// DRIZZLE ORM DATABASE SCHEMA
// ========================================

// Enums
export const membershipRoleEnumDb = pgEnum("membership_role", ["owner", "member"]);
export const eventStateEnumDb = pgEnum("event_state", ["draft", "polling", "rsvp", "final", "closed"]);
export const pollTypeEnumDb = pgEnum("poll_type", ["course", "date"]);
export const pollVisibilityEnumDb = pgEnum("poll_visibility", ["live", "hidden"]);
export const rsvpStatusEnumDb = pgEnum("rsvp_status", ["joined", "waitlisted", "withdrawn"]);

// Tables  
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groups = pgTable("groups", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  joinCode: varchar("join_code", { length: 20 }).notNull().unique(),
  ownerId: varchar("owner_id", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memberships = pgTable("memberships", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  groupId: varchar("group_id", { length: 36 }).notNull().references(() => groups.id),
  role: membershipRoleEnumDb("role").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  lat: real("lat"),
  lng: real("lng"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  feeNote: text("fee_note"),
  website: varchar("website", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: varchar("group_id", { length: 36 }).notNull().references(() => groups.id),
  title: varchar("title", { length: 255 }).notNull(),
  state: eventStateEnumDb("state").notNull().default("draft"),
  capacity: integer("capacity").notNull(),
  notes: text("notes"),
  chosenCourseId: varchar("chosen_course_id", { length: 36 }).references(() => courses.id),
  chosenDate: varchar("chosen_date", { length: 20 }),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  deadlinesJson: jsonb("deadlines_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const polls = pgTable("polls", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => events.id),
  type: pollTypeEnumDb("type").notNull(),
  closesAt: timestamp("closes_at"),
  visibility: pollVisibilityEnumDb("visibility").notNull().default("live"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pollOptions = pgTable("poll_options", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  pollId: varchar("poll_id", { length: 36 }).notNull().references(() => polls.id),
  label: varchar("label", { length: 255 }).notNull(),
  courseId: varchar("course_id", { length: 36 }).references(() => courses.id),
  dateOption: varchar("date_option", { length: 20 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const votes = pgTable("votes", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  pollId: varchar("poll_id", { length: 36 }).notNull().references(() => polls.id),
  optionId: varchar("option_id", { length: 36 }).notNull().references(() => pollOptions.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rsvps = pgTable("rsvps", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => events.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  status: rsvpStatusEnumDb("status").notNull(),
  positionInt: integer("position_int"),
  claimedExpiresAt: timestamp("claimed_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pairings = pgTable("pairings", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => events.id),
  name: varchar("name", { length: 255 }).notNull(),
  teeTimeText: varchar("tee_time_text", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pairingMembers = pgTable("pairing_members", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  pairingId: varchar("pairing_id", { length: 36 }).notNull().references(() => pairings.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  orderInt: integer("order_int").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: varchar("event_id", { length: 36 }).references(() => events.id),
  actorId: varchar("actor_id", { length: 36 }).notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => events.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: varchar("group_id", { length: 36 }).notNull().references(() => groups.id),
  email: varchar("email", { length: 255 }).notNull(),
  invitedBy: varchar("invited_by", { length: 36 }).notNull().references(() => users.id),
  token: varchar("token", { length: 64 }).notNull().unique(),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  ownedGroups: many(groups),
  createdEvents: many(events),
  votes: many(votes),
  rsvps: many(rsvps),
  pairingMembers: many(pairingMembers),
  activityLogs: many(activityLogs),
  chatMessages: many(chatMessages),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, {
    fields: [groups.ownerId],
    references: [users.id],
  }),
  memberships: many(memberships),
  events: many(events),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [memberships.groupId],
    references: [groups.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  group: one(groups, {
    fields: [events.groupId],
    references: [groups.id],
  }),
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  chosenCourse: one(courses, {
    fields: [events.chosenCourseId],
    references: [courses.id],
  }),
  polls: many(polls),
  rsvps: many(rsvps),
  pairings: many(pairings),
  activityLogs: many(activityLogs),
  chatMessages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  event: one(events, {
    fields: [chatMessages.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  event: one(events, {
    fields: [polls.eventId],
    references: [events.id],
  }),
  options: many(pollOptions),
  votes: many(votes),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.id],
  }),
  course: one(courses, {
    fields: [pollOptions.courseId],
    references: [courses.id],
  }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  poll: one(polls, {
    fields: [votes.pollId],
    references: [polls.id],
  }),
  option: one(pollOptions, {
    fields: [votes.optionId],
    references: [pollOptions.id],
  }),
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

export const rsvpsRelations = relations(rsvps, ({ one }) => ({
  event: one(events, {
    fields: [rsvps.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [rsvps.userId],
    references: [users.id],
  }),
}));

export const pairingsRelations = relations(pairings, ({ one, many }) => ({
  event: one(events, {
    fields: [pairings.eventId],
    references: [events.id],
  }),
  members: many(pairingMembers),
}));

export const pairingMembersRelations = relations(pairingMembers, ({ one }) => ({
  pairing: one(pairings, {
    fields: [pairingMembers.pairingId],
    references: [pairings.id],
  }),
  user: one(users, {
    fields: [pairingMembers.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  event: one(events, {
    fields: [activityLogs.eventId],
    references: [events.id],
  }),
  actor: one(users, {
    fields: [activityLogs.actorId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  group: one(groups, {
    fields: [invitations.groupId],
    references: [groups.id],
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

// Drizzle-Zod Schemas for validation
export const insertUserSchemaDb = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(6), // Will be hashed to passwordHash
  name: z.string().min(1),
  phone: z.string().optional(),
}).omit({ id: true, createdAt: true });

export const selectUserSchemaDb = createSelectSchema(users);
export type UserDb = typeof users.$inferSelect;
export type InsertUserDb = z.infer<typeof insertUserSchemaDb>;
