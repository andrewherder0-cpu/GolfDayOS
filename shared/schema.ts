import { z } from "zod";

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
