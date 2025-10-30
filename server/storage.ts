import { randomUUID } from "crypto";
import type {
  User,
  InsertUser,
  Group,
  InsertGroup,
  Membership,
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
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<Omit<User, "id" | "passwordHash" | "createdAt">>): Promise<User | undefined>;

  // Groups
  getGroup(id: string): Promise<Group | undefined>;
  getGroupByJoinCode(joinCode: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup, ownerId: string): Promise<Group>;
  getUserGroups(userId: string): Promise<Group[]>;

  // Memberships
  getMembership(userId: string, groupId: string): Promise<Membership | undefined>;
  getGroupMemberships(groupId: string): Promise<Membership[]>;
  createMembership(membership: InsertMembership): Promise<Membership>;

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

  // Poll Options
  getPollOption(id: string): Promise<PollOption | undefined>;
  getPollOptions(pollId: string): Promise<PollOption[]>;
  createPollOption(option: InsertPollOption): Promise<PollOption>;

  // Votes
  getVote(pollId: string, userId: string): Promise<Vote | undefined>;
  getPollVotes(pollId: string): Promise<Vote[]>;
  createVote(vote: InsertVote): Promise<Vote>;

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
}

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

export const storage = new MemStorage();
