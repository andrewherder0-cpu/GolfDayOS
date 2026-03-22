import { randomUUID } from "crypto";
import { eq, and, or, ilike, desc, asc, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  groups,
  memberships,
  courses,
  events,
  polls,
  pollOptions,
  votes,
  rsvps,
  pairings,
  pairingMembers,
  activityLogs,
  chatMessages,
  invitations,
  passwordResetTokens,
} from "@shared/schema";
import type {
  User,
  InsertUser,
  Group,
  InsertGroup,
  Membership,
  MembershipRole,
  InsertMembership,
  Course,
  InsertCourse,
  Event,
  InsertEvent,
  UpdateEvent,
  Poll,
  InsertPoll,
  PollOption,
  InsertPollOption,
  Vote,
  InsertVote,
  Rsvp,
  InsertRsvp,
  Pairing,
  InsertPairing,
  PairingMember,
  InsertPairingMember,
  ActivityLog,
  InsertActivityLog,
  ChatMessage,
  InsertChatMessage,
  Invitation,
  InsertInvitation,
  PasswordResetToken,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<Omit<User, "id" | "passwordHash" | "createdAt">>): Promise<User | undefined>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;

  // Password Reset Tokens
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;

  // Groups
  getGroup(id: string): Promise<Group | undefined>;
  getGroupByJoinCode(joinCode: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup, ownerId: string): Promise<Group>;
  getUserGroups(userId: string): Promise<Group[]>;
  deleteGroup(id: string): Promise<void>;

  // Events (additional)
  deleteEvent(id: string): Promise<void>;

  // Memberships
  getMembership(userId: string, groupId: string): Promise<Membership | undefined>;
  getGroupMemberships(groupId: string): Promise<Membership[]>;
  createMembership(membership: InsertMembership): Promise<Membership>;
  updateMembershipRole(userId: string, groupId: string, role: MembershipRole): Promise<Membership | undefined>;
  deleteMembership(userId: string, groupId: string): Promise<void>;

  // Courses
  getCourse(id: string): Promise<Course | undefined>;
  searchCourses(query?: string, filters?: { city?: string; region?: string; tag?: string }): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, updates: Partial<InsertCourse>): Promise<Course | undefined>;

  // Events
  getEvent(id: string): Promise<Event | undefined>;
  getGroupEvents(groupId: string): Promise<Event[]>;
  getUserUpcomingEvents(userId: string): Promise<Event[]>;
  createEvent(event: InsertEvent, createdBy: string): Promise<Event>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;

  // Polls
  getPoll(id: string): Promise<Poll | undefined>;
  getEventPolls(eventId: string): Promise<Poll[]>;
  createPoll(poll: InsertPoll): Promise<Poll>;
  updatePoll(id: string, updates: Partial<Poll>): Promise<Poll | undefined>;
  deletePoll(id: string): Promise<void>;

  // Poll Options
  getPollOption(id: string): Promise<PollOption | undefined>;
  getPollOptions(pollId: string): Promise<PollOption[]>;
  createPollOption(option: InsertPollOption): Promise<PollOption>;
  deletePollOption(id: string): Promise<void>;

  // Votes
  getVote(pollId: string, userId: string): Promise<Vote | undefined>;
  getUserVotes(pollId: string, userId: string): Promise<Vote[]>;
  getPollVotes(pollId: string): Promise<Vote[]>;
  createVote(vote: InsertVote): Promise<Vote>;
  deleteUserPollVotes(pollId: string, userId: string): Promise<void>;

  // RSVPs
  getRsvp(eventId: string, userId: string): Promise<Rsvp | undefined>;
  getEventRsvps(eventId: string): Promise<Rsvp[]>;
  createRsvp(rsvp: InsertRsvp): Promise<Rsvp>;
  updateRsvp(id: string, updates: Partial<Rsvp>): Promise<Rsvp | undefined>;

  // Pairings
  getPairing(id: string): Promise<Pairing | undefined>;
  getEventPairings(eventId: string): Promise<Pairing[]>;
  createPairing(pairing: InsertPairing): Promise<Pairing>;
  updatePairing(id: string, updates: Partial<Pairing>): Promise<Pairing | undefined>;
  deletePairing(id: string): Promise<void>;

  // Pairing Members
  getPairingMember(id: string): Promise<PairingMember | undefined>;
  getPairingMembers(pairingId: string): Promise<PairingMember[]>;
  createPairingMember(member: InsertPairingMember): Promise<PairingMember>;
  updatePairingMember(id: string, updates: Partial<PairingMember>): Promise<PairingMember | undefined>;
  deletePairingMember(id: string): Promise<void>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getEventActivityLogs(eventId: string): Promise<ActivityLog[]>;

  // Chat Messages
  getChatMessages(eventId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Invitations
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  listGroupInvitations(groupId: string): Promise<Invitation[]>;
  acceptInvitation(token: string): Promise<Invitation | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Helper function to generate join codes
  private generateJoinCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return undefined;
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      email: insertUser.email,
      passwordHash: insertUser.password,
      name: insertUser.name,
      phone: insertUser.phone,
    }).returning();
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateUser(id: string, updates: Partial<Omit<User, "id" | "passwordHash" | "createdAt">>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    if (!user) return undefined;
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [row] = await db.insert(passwordResetTokens).values({ userId, token, expiresAt }).returning();
    return row;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return row ?? undefined;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }

  // Groups
  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    if (!group) return undefined;
    return {
      ...group,
      createdAt: group.createdAt.toISOString(),
    };
  }

  async getGroupByJoinCode(joinCode: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.joinCode, joinCode));
    if (!group) return undefined;
    return {
      ...group,
      createdAt: group.createdAt.toISOString(),
    };
  }

  async createGroup(insertGroup: InsertGroup, ownerId: string): Promise<Group> {
    const joinCode = this.generateJoinCode();
    const [group] = await db.insert(groups).values({
      name: insertGroup.name,
      joinCode,
      ownerId,
    }).returning();
    return {
      ...group,
      createdAt: group.createdAt.toISOString(),
    };
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const result = await db
      .select({
        id: groups.id,
        name: groups.name,
        joinCode: groups.joinCode,
        ownerId: groups.ownerId,
        createdAt: groups.createdAt,
      })
      .from(memberships)
      .innerJoin(groups, eq(memberships.groupId, groups.id))
      .where(eq(memberships.userId, userId));
    
    return result.map(g => ({
      ...g,
      createdAt: g.createdAt.toISOString(),
    }));
  }

  // Memberships
  async getMembership(userId: string, groupId: string): Promise<Membership | undefined> {
    const [membership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.groupId, groupId)));
    if (!membership) return undefined;
    return {
      ...membership,
      joinedAt: membership.joinedAt.toISOString(),
    };
  }

  async getGroupMemberships(groupId: string): Promise<Membership[]> {
    const result = await db
      .select()
      .from(memberships)
      .where(eq(memberships.groupId, groupId));
    return result.map(m => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
    }));
  }

  async createMembership(insertMembership: InsertMembership): Promise<Membership> {
    const [membership] = await db.insert(memberships).values(insertMembership).returning();
    return {
      ...membership,
      joinedAt: membership.joinedAt.toISOString(),
    };
  }

  async updateMembershipRole(userId: string, groupId: string, role: MembershipRole): Promise<Membership | undefined> {
    const [membership] = await db
      .update(memberships)
      .set({ role })
      .where(and(eq(memberships.userId, userId), eq(memberships.groupId, groupId)))
      .returning();
    if (!membership) return undefined;
    return {
      ...membership,
      joinedAt: membership.joinedAt.toISOString(),
    };
  }

  async deleteMembership(userId: string, groupId: string): Promise<void> {
    await db.delete(memberships).where(
      and(eq(memberships.userId, userId), eq(memberships.groupId, groupId))
    );
  }

  // Courses
  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) return undefined;
    return {
      ...course,
      createdAt: course.createdAt.toISOString(),
    };
  }

  async searchCourses(query?: string, filters?: { city?: string; region?: string; tag?: string }): Promise<Course[]> {
    const conditions = [eq(courses.isActive, true)];

    if (query) {
      conditions.push(
        or(
          ilike(courses.name, `%${query}%`),
          ilike(courses.city, `%${query}%`),
          ilike(courses.region, `%${query}%`),
          sql`EXISTS (SELECT 1 FROM unnest(${courses.tags}) AS tag WHERE tag ILIKE ${`%${query}%`})`
        )!
      );
    }

    if (filters?.city) {
      conditions.push(ilike(courses.city, filters.city));
    }

    if (filters?.region) {
      conditions.push(ilike(courses.region, filters.region));
    }

    if (filters?.tag) {
      conditions.push(sql`${filters.tag} ILIKE ANY(${courses.tags})`);
    }

    const result = await db
      .select()
      .from(courses)
      .where(and(...conditions));

    return result.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(insertCourse).returning();
    return {
      ...course,
      createdAt: course.createdAt.toISOString(),
    };
  }

  async updateCourse(id: string, updates: Partial<InsertCourse>): Promise<Course | undefined> {
    const [course] = await db
      .update(courses)
      .set(updates)
      .where(eq(courses.id, id))
      .returning();
    if (!course) return undefined;
    return {
      ...course,
      createdAt: course.createdAt.toISOString(),
    };
  }

  // Events
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    if (!event) return undefined;
    return {
      ...event,
      deadlinesJson: event.deadlinesJson ? JSON.stringify(event.deadlinesJson) : undefined,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  async getGroupEvents(groupId: string): Promise<Event[]> {
    const result = await db
      .select()
      .from(events)
      .where(eq(events.groupId, groupId));
    return result.map(e => ({
      ...e,
      deadlinesJson: e.deadlinesJson ? JSON.stringify(e.deadlinesJson) : undefined,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));
  }

  async getUserUpcomingEvents(userId: string): Promise<Event[]> {
    const result = await db
      .select({
        id: events.id,
        groupId: events.groupId,
        title: events.title,
        state: events.state,
        capacity: events.capacity,
        notes: events.notes,
        gameType: events.gameType,
        teamSize: events.teamSize,
        chosenCourseId: events.chosenCourseId,
        chosenDate: events.chosenDate,
        createdBy: events.createdBy,
        deadlinesJson: events.deadlinesJson,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
      })
      .from(events)
      .innerJoin(memberships, eq(events.groupId, memberships.groupId))
      .where(and(
        eq(memberships.userId, userId),
        sql`${events.state} != 'closed'`
      ));

    return result.map(e => ({
      ...e,
      deadlinesJson: e.deadlinesJson ? JSON.stringify(e.deadlinesJson) : undefined,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));
  }

  async createEvent(insertEvent: InsertEvent, createdBy: string): Promise<Event> {
    const [event] = await db.insert(events).values({
      ...insertEvent,
      createdBy,
      state: "draft",
    }).returning();
    return {
      ...event,
      deadlinesJson: event.deadlinesJson ? JSON.stringify(event.deadlinesJson) : undefined,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const updateData: any = { ...updates };
    if (updates.deadlinesJson !== undefined) {
      updateData.deadlinesJson = updates.deadlinesJson ? JSON.parse(updates.deadlinesJson) : null;
    }
    updateData.updatedAt = new Date();

    const [event] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();
    if (!event) return undefined;
    return {
      ...event,
      deadlinesJson: event.deadlinesJson ? JSON.stringify(event.deadlinesJson) : undefined,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  async deleteEvent(id: string): Promise<void> {
    // Cascade: pairings, rsvps, votes, poll options, polls, chat messages, activity logs
    const eventPairings = await db.select({ id: pairings.id }).from(pairings).where(eq(pairings.eventId, id));
    for (const p of eventPairings) {
      await db.delete(pairingMembers).where(eq(pairingMembers.pairingId, p.id));
    }
    await db.delete(pairings).where(eq(pairings.eventId, id));
    await db.delete(rsvps).where(eq(rsvps.eventId, id));
    const eventPolls = await db.select({ id: polls.id }).from(polls).where(eq(polls.eventId, id));
    for (const poll of eventPolls) {
      const options = await db.select({ id: pollOptions.id }).from(pollOptions).where(eq(pollOptions.pollId, poll.id));
      if (options.length > 0) {
        await db.delete(votes).where(inArray(votes.optionId, options.map(o => o.id)));
      }
      await db.delete(votes).where(eq(votes.pollId, poll.id));
      await db.delete(pollOptions).where(eq(pollOptions.pollId, poll.id));
    }
    await db.delete(polls).where(eq(polls.eventId, id));
    await db.delete(chatMessages).where(eq(chatMessages.eventId, id));
    await db.delete(activityLogs).where(eq(activityLogs.eventId, id));
    await db.delete(events).where(eq(events.id, id));
  }

  async deleteGroup(id: string): Promise<void> {
    // Cascade: all events and their children, invitations, memberships
    const groupEvents = await db.select({ id: events.id }).from(events).where(eq(events.groupId, id));
    for (const ev of groupEvents) {
      await this.deleteEvent(ev.id);
    }
    await db.delete(invitations).where(eq(invitations.groupId, id));
    await db.delete(memberships).where(eq(memberships.groupId, id));
    await db.delete(groups).where(eq(groups.id, id));
  }

  // Polls
  async getPoll(id: string): Promise<Poll | undefined> {
    const [poll] = await db.select().from(polls).where(eq(polls.id, id));
    if (!poll) return undefined;
    return {
      ...poll,
      closesAt: poll.closesAt ? poll.closesAt.toISOString() : undefined,
      createdAt: poll.createdAt.toISOString(),
    };
  }

  async getEventPolls(eventId: string): Promise<Poll[]> {
    const result = await db
      .select()
      .from(polls)
      .where(eq(polls.eventId, eventId));
    return result.map(p => ({
      ...p,
      closesAt: p.closesAt ? p.closesAt.toISOString() : undefined,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async createPoll(insertPoll: InsertPoll): Promise<Poll> {
    const pollData: any = { ...insertPoll };
    if (insertPoll.closesAt) {
      pollData.closesAt = new Date(insertPoll.closesAt);
    }
    const [poll] = await db.insert(polls).values(pollData).returning();
    return {
      ...poll,
      closesAt: poll.closesAt ? poll.closesAt.toISOString() : undefined,
      createdAt: poll.createdAt.toISOString(),
    };
  }

  async updatePoll(id: string, updates: Partial<Poll>): Promise<Poll | undefined> {
    const updateData: any = { ...updates };
    if (updates.closesAt !== undefined) {
      updateData.closesAt = updates.closesAt ? new Date(updates.closesAt) : null;
    }
    const [poll] = await db
      .update(polls)
      .set(updateData)
      .where(eq(polls.id, id))
      .returning();
    if (!poll) return undefined;
    return {
      ...poll,
      closesAt: poll.closesAt ? poll.closesAt.toISOString() : undefined,
      createdAt: poll.createdAt.toISOString(),
    };
  }

  async deletePoll(id: string): Promise<void> {
    const optionRows = await db.select({ id: pollOptions.id }).from(pollOptions).where(eq(pollOptions.pollId, id));
    const optionIds = optionRows.map(o => o.id);
    if (optionIds.length > 0) {
      await db.delete(votes).where(inArray(votes.optionId, optionIds));
    }
    await db.delete(votes).where(eq(votes.pollId, id));
    await db.delete(pollOptions).where(eq(pollOptions.pollId, id));
    await db.delete(polls).where(eq(polls.id, id));
  }

  // Poll Options
  async getPollOption(id: string): Promise<PollOption | undefined> {
    const [option] = await db.select().from(pollOptions).where(eq(pollOptions.id, id));
    if (!option) return undefined;
    return {
      ...option,
      createdAt: option.createdAt.toISOString(),
    };
  }

  async getPollOptions(pollId: string): Promise<PollOption[]> {
    const result = await db
      .select()
      .from(pollOptions)
      .where(eq(pollOptions.pollId, pollId));
    return result.map(o => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  async createPollOption(insertOption: InsertPollOption): Promise<PollOption> {
    const [option] = await db.insert(pollOptions).values(insertOption).returning();
    return {
      ...option,
      createdAt: option.createdAt.toISOString(),
    };
  }

  async deletePollOption(id: string): Promise<void> {
    await db.delete(votes).where(eq(votes.optionId, id));
    await db.delete(pollOptions).where(eq(pollOptions.id, id));
  }

  // Votes
  async getVote(pollId: string, userId: string): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.pollId, pollId), eq(votes.userId, userId)));
    if (!vote) return undefined;
    return {
      ...vote,
      createdAt: vote.createdAt.toISOString(),
    };
  }

  async getUserVotes(pollId: string, userId: string): Promise<Vote[]> {
    const result = await db
      .select()
      .from(votes)
      .where(and(eq(votes.pollId, pollId), eq(votes.userId, userId)));
    return result.map(v => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  async getPollVotes(pollId: string): Promise<Vote[]> {
    const result = await db
      .select()
      .from(votes)
      .where(eq(votes.pollId, pollId));
    return result.map(v => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const [vote] = await db.insert(votes).values(insertVote).returning();
    return {
      ...vote,
      createdAt: vote.createdAt.toISOString(),
    };
  }

  async deleteUserPollVotes(pollId: string, userId: string): Promise<void> {
    await db.delete(votes).where(
      and(eq(votes.pollId, pollId), eq(votes.userId, userId))
    );
  }

  // RSVPs
  async getRsvp(eventId: string, userId: string): Promise<Rsvp | undefined> {
    const [rsvp] = await db
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.userId, userId)));
    if (!rsvp) return undefined;
    return {
      ...rsvp,
      claimedExpiresAt: rsvp.claimedExpiresAt ? rsvp.claimedExpiresAt.toISOString() : undefined,
      createdAt: rsvp.createdAt.toISOString(),
      updatedAt: rsvp.updatedAt.toISOString(),
    };
  }

  async getEventRsvps(eventId: string): Promise<Rsvp[]> {
    const result = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.eventId, eventId));
    return result.map(r => ({
      ...r,
      claimedExpiresAt: r.claimedExpiresAt ? r.claimedExpiresAt.toISOString() : undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async createRsvp(insertRsvp: InsertRsvp): Promise<Rsvp> {
    const rsvpData: any = { ...insertRsvp };
    if (insertRsvp.claimedExpiresAt) {
      rsvpData.claimedExpiresAt = new Date(insertRsvp.claimedExpiresAt);
    }
    const [rsvp] = await db.insert(rsvps).values(rsvpData).returning();
    return {
      ...rsvp,
      claimedExpiresAt: rsvp.claimedExpiresAt ? rsvp.claimedExpiresAt.toISOString() : undefined,
      createdAt: rsvp.createdAt.toISOString(),
      updatedAt: rsvp.updatedAt.toISOString(),
    };
  }

  async updateRsvp(id: string, updates: Partial<Rsvp>): Promise<Rsvp | undefined> {
    const updateData: any = { ...updates };
    if (updates.claimedExpiresAt !== undefined) {
      updateData.claimedExpiresAt = updates.claimedExpiresAt ? new Date(updates.claimedExpiresAt) : null;
    }
    updateData.updatedAt = new Date();

    const [rsvp] = await db
      .update(rsvps)
      .set(updateData)
      .where(eq(rsvps.id, id))
      .returning();
    if (!rsvp) return undefined;
    return {
      ...rsvp,
      claimedExpiresAt: rsvp.claimedExpiresAt ? rsvp.claimedExpiresAt.toISOString() : undefined,
      createdAt: rsvp.createdAt.toISOString(),
      updatedAt: rsvp.updatedAt.toISOString(),
    };
  }

  // Pairings
  async getPairing(id: string): Promise<Pairing | undefined> {
    const [pairing] = await db.select().from(pairings).where(eq(pairings.id, id));
    if (!pairing) return undefined;
    return {
      ...pairing,
      createdAt: pairing.createdAt.toISOString(),
    };
  }

  async getEventPairings(eventId: string): Promise<Pairing[]> {
    const result = await db
      .select()
      .from(pairings)
      .where(eq(pairings.eventId, eventId));
    return result.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async createPairing(insertPairing: InsertPairing): Promise<Pairing> {
    const [pairing] = await db.insert(pairings).values(insertPairing).returning();
    return {
      ...pairing,
      createdAt: pairing.createdAt.toISOString(),
    };
  }

  async updatePairing(id: string, updates: Partial<Pairing>): Promise<Pairing | undefined> {
    const [pairing] = await db
      .update(pairings)
      .set(updates)
      .where(eq(pairings.id, id))
      .returning();
    if (!pairing) return undefined;
    return {
      ...pairing,
      createdAt: pairing.createdAt.toISOString(),
    };
  }

  async deletePairing(id: string): Promise<void> {
    await db.delete(pairingMembers).where(eq(pairingMembers.pairingId, id));
    await db.delete(pairings).where(eq(pairings.id, id));
  }

  // Pairing Members
  async getPairingMember(id: string): Promise<PairingMember | undefined> {
    const [member] = await db.select().from(pairingMembers).where(eq(pairingMembers.id, id));
    if (!member) return undefined;
    return {
      ...member,
      createdAt: member.createdAt.toISOString(),
    };
  }

  async getPairingMembers(pairingId: string): Promise<PairingMember[]> {
    const result = await db
      .select()
      .from(pairingMembers)
      .where(eq(pairingMembers.pairingId, pairingId));
    return result.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async createPairingMember(insertMember: InsertPairingMember): Promise<PairingMember> {
    const [member] = await db.insert(pairingMembers).values(insertMember).returning();
    return {
      ...member,
      createdAt: member.createdAt.toISOString(),
    };
  }

  async updatePairingMember(id: string, updates: Partial<PairingMember>): Promise<PairingMember | undefined> {
    const [member] = await db
      .update(pairingMembers)
      .set(updates)
      .where(eq(pairingMembers.id, id))
      .returning();
    if (!member) return undefined;
    return {
      ...member,
      createdAt: member.createdAt.toISOString(),
    };
  }

  async deletePairingMember(id: string): Promise<void> {
    await db.delete(pairingMembers).where(eq(pairingMembers.id, id));
  }

  // Activity Logs
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const logData: any = { ...insertLog };
    if (insertLog.payloadJson) {
      logData.payloadJson = JSON.parse(insertLog.payloadJson);
    }
    const [log] = await db.insert(activityLogs).values(logData).returning();
    return {
      ...log,
      payloadJson: log.payloadJson ? JSON.stringify(log.payloadJson) : undefined,
      createdAt: log.createdAt.toISOString(),
    };
  }

  async getEventActivityLogs(eventId: string): Promise<ActivityLog[]> {
    const result = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.eventId, eventId))
      .orderBy(desc(activityLogs.createdAt));
    return result.map(l => ({
      ...l,
      payloadJson: l.payloadJson ? JSON.stringify(l.payloadJson) : undefined,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  // Chat Messages
  async getChatMessages(eventId: string): Promise<ChatMessage[]> {
    const result = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.eventId, eventId))
      .orderBy(asc(chatMessages.createdAt));
    return result.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(message).returning();
    return {
      ...msg,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  // Invitations
  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [inv] = await db.insert(invitations).values({
      ...invitation,
      expiresAt: new Date(invitation.expiresAt),
    }).returning();
    return {
      ...inv,
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    };
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [inv] = await db.select().from(invitations).where(eq(invitations.token, token));
    if (!inv) return undefined;
    return {
      ...inv,
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    };
  }

  async listGroupInvitations(groupId: string): Promise<Invitation[]> {
    const result = await db
      .select()
      .from(invitations)
      .where(eq(invitations.groupId, groupId))
      .orderBy(desc(invitations.createdAt));
    return result.map(inv => ({
      ...inv,
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }));
  }

  async acceptInvitation(token: string): Promise<Invitation | undefined> {
    const [inv] = await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.token, token))
      .returning();
    if (!inv) return undefined;
    return {
      ...inv,
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    };
  }
}

/*
// Backup: MemStorage implementation
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private groups: Map<string, Group> = new Map();
  private memberships: Map<string, Membership> = new Map();
  private courses: Map<string, Course> = new Map();
  private events: Map<string, Event> = new Map();
  private polls: Map<string, Poll> = new Map();
  private pollOptions: Map<string, PollOption> = new Map();
  private votes: Map<string, Vote> = new Map();
  private rsvps: Map<string, Rsvp> = new Map();
  private pairings: Map<string, Pairing> = new Map();
  private pairingMembers: Map<string, PairingMember> = new Map();
  private activityLogs: Map<string, ActivityLog> = new Map();

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email,
      passwordHash: insertUser.password, // Will be hashed before calling this
      name: insertUser.name,
      phone: insertUser.phone,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<Omit<User, "id" | "passwordHash" | "createdAt">>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    const user = this.users.get(id);
    if (user) this.users.set(id, { ...user, passwordHash });
  }

  private passwordResetTokens: Map<string, PasswordResetToken> = new Map();

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const row: PasswordResetToken = {
      id: randomUUID(),
      userId,
      token,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.passwordResetTokens.set(row.id, row);
    return row;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    return Array.from(this.passwordResetTokens.values()).find((t) => t.token === token);
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    const row = this.passwordResetTokens.get(id);
    if (row) this.passwordResetTokens.set(id, { ...row, usedAt: new Date() });
  }

  // Groups
  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroupByJoinCode(joinCode: string): Promise<Group | undefined> {
    return Array.from(this.groups.values()).find((g) => g.joinCode === joinCode);
  }

  async createGroup(insertGroup: InsertGroup, ownerId: string): Promise<Group> {
    const id = randomUUID();
    const joinCode = this.generateJoinCode();
    const group: Group = {
      id,
      name: insertGroup.name,
      joinCode,
      ownerId,
      createdAt: new Date().toISOString(),
    };
    this.groups.set(id, group);
    return group;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const memberships = Array.from(this.memberships.values()).filter((m) => m.userId === userId);
    return memberships.map((m) => this.groups.get(m.groupId)).filter(Boolean) as Group[];
  }

  private generateJoinCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Memberships
  async getMembership(userId: string, groupId: string): Promise<Membership | undefined> {
    return Array.from(this.memberships.values()).find((m) => m.userId === userId && m.groupId === groupId);
  }

  async getGroupMemberships(groupId: string): Promise<Membership[]> {
    return Array.from(this.memberships.values()).filter((m) => m.groupId === groupId);
  }

  async createMembership(insertMembership: InsertMembership): Promise<Membership> {
    const id = randomUUID();
    const membership: Membership = {
      id,
      ...insertMembership,
      joinedAt: new Date().toISOString(),
    };
    this.memberships.set(id, membership);
    return membership;
  }

  // Courses
  async getCourse(id: string): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async searchCourses(query?: string, filters?: { city?: string; region?: string; tag?: string }): Promise<Course[]> {
    let courses = Array.from(this.courses.values()).filter((c) => c.isActive);

    if (query) {
      const q = query.toLowerCase();
      courses = courses.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters?.city) {
      courses = courses.filter((c) => c.city.toLowerCase() === filters.city!.toLowerCase());
    }

    if (filters?.region) {
      courses = courses.filter((c) => c.region.toLowerCase() === filters.region!.toLowerCase());
    }

    if (filters?.tag) {
      courses = courses.filter((c) => c.tags.some((t) => t.toLowerCase() === filters.tag!.toLowerCase()));
    }

    return courses;
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const id = randomUUID();
    const course: Course = {
      id,
      ...insertCourse,
      createdAt: new Date().toISOString(),
    };
    this.courses.set(id, course);
    return course;
  }

  async updateCourse(id: string, updates: Partial<InsertCourse>): Promise<Course | undefined> {
    const course = this.courses.get(id);
    if (!course) return undefined;
    const updated = { ...course, ...updates };
    this.courses.set(id, updated);
    return updated;
  }

  // Events
  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getGroupEvents(groupId: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter((e) => e.groupId === groupId);
  }

  async getUserUpcomingEvents(userId: string): Promise<Event[]> {
    const userGroups = await this.getUserGroups(userId);
    const groupIds = userGroups.map((g) => g.id);
    return Array.from(this.events.values()).filter((e) => groupIds.includes(e.groupId) && e.state !== "closed");
  }

  async createEvent(insertEvent: InsertEvent, createdBy: string): Promise<Event> {
    const id = randomUUID();
    const event: Event = {
      id,
      ...insertEvent,
      state: "draft",
      chosenCourseId: undefined,
      chosenDate: undefined,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    const updated = { ...event, ...updates, updatedAt: new Date().toISOString() };
    this.events.set(id, updated);
    return updated;
  }

  // Polls
  async getPoll(id: string): Promise<Poll | undefined> {
    return this.polls.get(id);
  }

  async getEventPolls(eventId: string): Promise<Poll[]> {
    return Array.from(this.polls.values()).filter((p) => p.eventId === eventId);
  }

  async createPoll(insertPoll: InsertPoll): Promise<Poll> {
    const id = randomUUID();
    const poll: Poll = {
      id,
      ...insertPoll,
      createdAt: new Date().toISOString(),
    };
    this.polls.set(id, poll);
    return poll;
  }

  async updatePoll(id: string, updates: Partial<Poll>): Promise<Poll | undefined> {
    const poll = this.polls.get(id);
    if (!poll) return undefined;
    const updated = { ...poll, ...updates };
    this.polls.set(id, updated);
    return updated;
  }

  // Poll Options
  async getPollOption(id: string): Promise<PollOption | undefined> {
    return this.pollOptions.get(id);
  }

  async getPollOptions(pollId: string): Promise<PollOption[]> {
    return Array.from(this.pollOptions.values()).filter((o) => o.pollId === pollId);
  }

  async createPollOption(insertOption: InsertPollOption): Promise<PollOption> {
    const id = randomUUID();
    const option: PollOption = {
      id,
      ...insertOption,
      createdAt: new Date().toISOString(),
    };
    this.pollOptions.set(id, option);
    return option;
  }

  // Votes
  async getVote(pollId: string, userId: string): Promise<Vote | undefined> {
    return Array.from(this.votes.values()).find((v) => v.pollId === pollId && v.userId === userId);
  }

  async getUserVotes(pollId: string, userId: string): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter((v) => v.pollId === pollId && v.userId === userId);
  }

  async getPollVotes(pollId: string): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter((v) => v.pollId === pollId);
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = randomUUID();
    const vote: Vote = {
      id,
      ...insertVote,
      createdAt: new Date().toISOString(),
    };
    this.votes.set(id, vote);
    return vote;
  }

  async deleteUserPollVotes(pollId: string, userId: string): Promise<void> {
    for (const [id, vote] of this.votes.entries()) {
      if (vote.pollId === pollId && vote.userId === userId) {
        this.votes.delete(id);
      }
    }
  }

  // RSVPs
  async getRsvp(eventId: string, userId: string): Promise<Rsvp | undefined> {
    return Array.from(this.rsvps.values()).find((r) => r.eventId === eventId && r.userId === userId);
  }

  async getEventRsvps(eventId: string): Promise<Rsvp[]> {
    return Array.from(this.rsvps.values()).filter((r) => r.eventId === eventId);
  }

  async createRsvp(insertRsvp: InsertRsvp): Promise<Rsvp> {
    const id = randomUUID();
    const rsvp: Rsvp = {
      id,
      ...insertRsvp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.rsvps.set(id, rsvp);
    return rsvp;
  }

  async updateRsvp(id: string, updates: Partial<Rsvp>): Promise<Rsvp | undefined> {
    const rsvp = this.rsvps.get(id);
    if (!rsvp) return undefined;
    const updated = { ...rsvp, ...updates, updatedAt: new Date().toISOString() };
    this.rsvps.set(id, updated);
    return updated;
  }

  // Pairings
  async getPairing(id: string): Promise<Pairing | undefined> {
    return this.pairings.get(id);
  }

  async getEventPairings(eventId: string): Promise<Pairing[]> {
    return Array.from(this.pairings.values()).filter((p) => p.eventId === eventId);
  }

  async createPairing(insertPairing: InsertPairing): Promise<Pairing> {
    const id = randomUUID();
    const pairing: Pairing = {
      id,
      ...insertPairing,
      createdAt: new Date().toISOString(),
    };
    this.pairings.set(id, pairing);
    return pairing;
  }

  async updatePairing(id: string, updates: Partial<Pairing>): Promise<Pairing | undefined> {
    const pairing = this.pairings.get(id);
    if (!pairing) return undefined;
    const updated = { ...pairing, ...updates };
    this.pairings.set(id, updated);
    return updated;
  }

  async deletePairing(id: string): Promise<void> {
    this.pairings.delete(id);
    // Also delete associated members
    const members = Array.from(this.pairingMembers.values()).filter((m) => m.pairingId === id);
    members.forEach((m) => this.pairingMembers.delete(m.id));
  }

  // Pairing Members
  async getPairingMember(id: string): Promise<PairingMember | undefined> {
    return this.pairingMembers.get(id);
  }

  async getPairingMembers(pairingId: string): Promise<PairingMember[]> {
    return Array.from(this.pairingMembers.values()).filter((m) => m.pairingId === pairingId);
  }

  async createPairingMember(insertMember: InsertPairingMember): Promise<PairingMember> {
    const id = randomUUID();
    const member: PairingMember = {
      id,
      ...insertMember,
      createdAt: new Date().toISOString(),
    };
    this.pairingMembers.set(id, member);
    return member;
  }

  async updatePairingMember(id: string, updates: Partial<PairingMember>): Promise<PairingMember | undefined> {
    const member = this.pairingMembers.get(id);
    if (!member) return undefined;
    const updated = { ...member, ...updates };
    this.pairingMembers.set(id, updated);
    return updated;
  }

  async deletePairingMember(id: string): Promise<void> {
    this.pairingMembers.delete(id);
  }

  // Activity Logs
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const log: ActivityLog = {
      id,
      ...insertLog,
      createdAt: new Date().toISOString(),
    };
    this.activityLogs.set(id, log);
    return log;
  }

  async getEventActivityLogs(eventId: string): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter((l) => l.eventId === eventId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
*/

export const storage = new DatabaseStorage();
