import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import session from "express-session";
import multer from "multer";
import Papa from "papaparse";
import { storage } from "./storage";
import { requireAuth } from "./middleware/auth";
import { generateTeeSheetPDF } from "./utils/pdf";
import { notifyPollOpened, notifyRsvpOpened, notifySpotAvailable, notifyRosterLocked, notifyTeeSheetPosted } from "./utils/email";
import { insertUserSchema, insertGroupSchema, insertCourseSchema, insertEventSchema, updateEventSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "golf-day-os-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  // Attach user to request if session exists
  app.use(async (req, res, next) => {
    if (req.session && (req.session as any).userId) {
      const user = await storage.getUser((req.session as any).userId);
      if (user) {
        req.user = user;
      }
    }
    next();
  });

  // ===== AUTH ROUTES =====
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await storage.createUser({
        ...data,
        password: passwordHash,
      });

      // Set session
      (req.session as any).userId = user.id;

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      (req.session as any).userId = user.id;

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const { passwordHash: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  app.put("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, email, phone } = req.body;
      const updated = await storage.updateUser(req.user!.id, { name, email, phone });
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      const { passwordHash: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== GROUP ROUTES =====
  app.post("/api/groups", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(data, req.user!.id);

      // Create owner membership
      await storage.createMembership({
        userId: req.user!.id,
        groupId: group.id,
        role: "owner",
      });

      await storage.createActivityLog({
        actorId: req.user!.id,
        action: "group_created",
        payloadJson: JSON.stringify({ groupName: group.name }),
      });

      res.json(group);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/groups/:id/invite", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Check if user is owner
      if (group.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Only group owner can generate invite codes" });
      }

      res.json({ joinCode: group.joinCode });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/groups/join/:joinCode", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroupByJoinCode(req.params.joinCode);
      if (!group) {
        return res.status(404).json({ error: "Invalid join code" });
      }

      // Check if already a member
      const existing = await storage.getMembership(req.user!.id, group.id);
      if (existing) {
        return res.status(400).json({ error: "Already a member of this group" });
      }

      await storage.createMembership({
        userId: req.user!.id,
        groupId: group.id,
        role: "member",
      });

      await storage.createActivityLog({
        actorId: req.user!.id,
        action: "member_joined",
        payloadJson: JSON.stringify({ groupName: group.name }),
      });

      res.json(group);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/groups/mine", requireAuth, async (req: Request, res: Response) => {
    try {
      const groups = await storage.getUserGroups(req.user!.id);
      
      const groupsWithDetails = await Promise.all(
        groups.map(async (group) => {
          const memberships = await storage.getGroupMemberships(group.id);
          const events = await storage.getGroupEvents(group.id);
          return {
            ...group,
            memberCount: memberships.length,
            eventCount: events.length,
          };
        })
      );

      res.json(groupsWithDetails);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/groups/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Check if user is a member
      const membership = await storage.getMembership(req.user!.id, group.id);
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this group" });
      }

      const memberships = await storage.getGroupMemberships(group.id);
      const events = await storage.getGroupEvents(group.id);

      const membersWithDetails = await Promise.all(
        memberships.map(async (m) => {
          const user = await storage.getUser(m.userId);
          return { ...m, user };
        })
      );

      res.json({
        ...group,
        members: membersWithDetails,
        events,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== COURSE ROUTES =====
  app.get("/api/courses", requireAuth, async (req: Request, res: Response) => {
    try {
      const { q, city, region, tag } = req.query;
      const courses = await storage.searchCourses(
        q as string,
        { city: city as string, region: region as string, tag: tag as string }
      );
      res.json(courses);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/courses", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(data);
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/courses/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertCourseSchema.partial().parse(req.body);
      const course = await storage.updateCourse(req.params.id, data);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/courses/import", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const csvContent = req.file.buffer.toString("utf-8");
      const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

      let count = 0;
      for (const row of parsed.data as any[]) {
        try {
          const tags = row.tags ? JSON.parse(row.tags) : [];
          await storage.createCourse({
            name: row.name,
            city: row.city,
            region: row.region,
            lat: row.lat ? parseFloat(row.lat) : undefined,
            lng: row.lng ? parseFloat(row.lng) : undefined,
            tags,
            feeNote: row.feeNote || undefined,
            website: row.website || undefined,
            isActive: true,
          });
          count++;
        } catch (err) {
          console.error("Failed to import course:", row, err);
        }
      }

      res.json({ count });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/courses/search-google", requireAuth, async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google Maps API key not configured" });
      }

      const searchQuery = `golf course ${query}`;
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Maps API error:', data);
        return res.status(500).json({ error: `Google Maps API error: ${data.status}` });
      }

      const results = (data.results || []).map((place: any) => ({
        googlePlaceId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
      }));

      res.json(results);
    } catch (error: any) {
      console.error('Google Maps search error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/courses/add-from-google", requireAuth, async (req: Request, res: Response) => {
    try {
      const { googlePlaceId, name, address, lat, lng } = req.body;

      if (!googlePlaceId || !name || !address) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const addressParts = address.split(',').map((s: string) => s.trim());
      const city = addressParts[addressParts.length - 3] || 'Unknown';
      const region = addressParts[addressParts.length - 2]?.split(' ')[0] || 'Unknown';

      const course = await storage.createCourse({
        name,
        city,
        region,
        lat,
        lng,
        tags: ['google-maps'],
        feeNote: undefined,
        website: undefined,
        isActive: true,
      });

      res.json(course);
    } catch (error: any) {
      console.error('Add course from Google error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // ===== EVENT ROUTES =====
  app.post("/api/events", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertEventSchema.parse(req.body);
      
      // Check if user is a member of the group
      const membership = await storage.getMembership(req.user!.id, data.groupId);
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this group" });
      }

      const event = await storage.createEvent(data, req.user!.id);

      await storage.createActivityLog({
        eventId: event.id,
        actorId: req.user!.id,
        action: "event_created",
        payloadJson: JSON.stringify({ eventTitle: event.title }),
      });

      res.json(event);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/events/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can update" });
      }

      if (event.state !== "draft") {
        return res.status(400).json({ error: "Can only update draft events" });
      }

      const data = updateEventSchema.parse(req.body);
      const updated = await storage.updateEvent(event.id, data);

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/events/:id/polls/open", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can open polls" });
      }

      if (event.state !== "draft") {
        return res.status(400).json({ error: "Can only open polls for draft events" });
      }

      const { createCoursePoll, createDatePoll } = req.body;

      if (createCoursePoll) {
        const poll = await storage.createPoll({
          eventId: event.id,
          type: "course",
          visibility: "live",
        });

        // In a real app, you'd have a form to add options - for now, stub with empty
        await storage.createActivityLog({
          eventId: event.id,
          actorId: req.user!.id,
          action: "poll_opened",
          payloadJson: JSON.stringify({ pollType: "course" }),
        });
      }

      if (createDatePoll) {
        const poll = await storage.createPoll({
          eventId: event.id,
          type: "date",
          visibility: "live",
        });

        await storage.createActivityLog({
          eventId: event.id,
          actorId: req.user!.id,
          action: "poll_opened",
          payloadJson: JSON.stringify({ pollType: "date" }),
        });
      }

      await storage.updateEvent(event.id, { state: "polling" });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/events/:id/rsvp/open", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can open RSVP" });
      }

      if (event.state !== "polling") {
        return res.status(400).json({ error: "Event must be in polling state" });
      }

      if (!event.chosenCourseId || !event.chosenDate) {
        return res.status(400).json({ error: "Course and date must be chosen before opening RSVP" });
      }

      await storage.updateEvent(event.id, { state: "rsvp" });

      await storage.createActivityLog({
        eventId: event.id,
        actorId: req.user!.id,
        action: "rsvp_opened",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/events/:id/finalize", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can finalize" });
      }

      if (event.state !== "rsvp") {
        return res.status(400).json({ error: "Event must be in RSVP state" });
      }

      await storage.updateEvent(event.id, { state: "final" });

      await storage.createActivityLog({
        eventId: event.id,
        actorId: req.user!.id,
        action: "event_finalized",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/events/upcoming", requireAuth, async (req: Request, res: Response) => {
    try {
      const events = await storage.getUserUpcomingEvents(req.user!.id);
      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          const group = await storage.getGroup(event.groupId);
          const course = event.chosenCourseId ? await storage.getCourse(event.chosenCourseId) : undefined;
          return {
            ...event,
            groupName: group?.name,
            courseName: course?.name,
          };
        })
      );
      res.json(eventsWithDetails);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/events/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Check if user is a member of the group
      const membership = await storage.getMembership(req.user!.id, event.groupId);
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this group" });
      }

      const group = await storage.getGroup(event.groupId);
      const course = event.chosenCourseId ? await storage.getCourse(event.chosenCourseId) : undefined;
      const polls = await storage.getEventPolls(event.id);
      const rsvps = await storage.getEventRsvps(event.id);

      const rsvpsWithUsers = await Promise.all(
        rsvps.map(async (rsvp) => {
          const user = await storage.getUser(rsvp.userId);
          return { ...rsvp, user };
        })
      );

      res.json({
        ...event,
        group,
        course,
        polls,
        rsvps: rsvpsWithUsers,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== POLL ROUTES =====
  app.get("/api/polls/event/:eventId", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const polls = await storage.getEventPolls(event.id);
      const pollsWithDetails = await Promise.all(
        polls.map(async (poll) => {
          const options = await storage.getPollOptions(poll.id);
          const votes = await storage.getPollVotes(poll.id);
          const userVote = await storage.getVote(poll.id, req.user!.id);

          const optionsWithVotes = await Promise.all(
            options.map(async (option) => {
              const voteCount = votes.filter((v) => v.optionId === option.id).length;
              const course = option.courseId ? await storage.getCourse(option.courseId) : undefined;
              return { ...option, voteCount, course };
            })
          );

          return { ...poll, options: optionsWithVotes, userVote };
        })
      );

      const group = await storage.getGroup(event.groupId);

      res.json({
        ...event,
        group,
        polls: pollsWithDetails,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/polls/:pollId/vote", requireAuth, async (req: Request, res: Response) => {
    try {
      const poll = await storage.getPoll(req.params.pollId);
      if (!poll) {
        return res.status(404).json({ error: "Poll not found" });
      }

      // Check if user already voted
      const existingVote = await storage.getVote(poll.id, req.user!.id);
      if (existingVote) {
        return res.status(400).json({ error: "Already voted" });
      }

      const { optionId } = req.body;
      await storage.createVote({
        pollId: poll.id,
        optionId,
        userId: req.user!.id,
      });

      await storage.createActivityLog({
        eventId: poll.eventId,
        actorId: req.user!.id,
        action: "poll_voted",
        payloadJson: JSON.stringify({ pollType: poll.type }),
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/polls/:pollId/close", requireAuth, async (req: Request, res: Response) => {
    try {
      const poll = await storage.getPoll(req.params.pollId);
      if (!poll) {
        return res.status(404).json({ error: "Poll not found" });
      }

      const event = await storage.getEvent(poll.eventId);
      if (!event || event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can close polls" });
      }

      await storage.updatePoll(poll.id, { visibility: "hidden" });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/polls/:pollId/apply-result", requireAuth, async (req: Request, res: Response) => {
    try {
      const poll = await storage.getPoll(req.params.pollId);
      if (!poll) {
        return res.status(404).json({ error: "Poll not found" });
      }

      const event = await storage.getEvent(poll.eventId);
      if (!event || event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can apply results" });
      }

      const options = await storage.getPollOptions(poll.id);
      const votes = await storage.getPollVotes(poll.id);

      // Count votes for each option
      const voteCounts = options.map((option) => ({
        option,
        count: votes.filter((v) => v.optionId === option.id).length,
      }));

      // Find winner (or use tiebreak selection)
      let winner;
      if (req.body.winningOptionId) {
        winner = options.find((o) => o.id === req.body.winningOptionId);
      } else {
        const maxVotes = Math.max(...voteCounts.map((v) => v.count));
        const topOptions = voteCounts.filter((v) => v.count === maxVotes);
        if (topOptions.length > 1 && maxVotes > 0) {
          return res.status(400).json({ error: "Tie detected - must specify winningOptionId" });
        }
        winner = topOptions[0]?.option;
      }

      if (!winner) {
        return res.status(400).json({ error: "No votes cast" });
      }

      // Apply result
      if (poll.type === "course" && winner.courseId) {
        await storage.updateEvent(event.id, { chosenCourseId: winner.courseId });
      } else if (poll.type === "date" && winner.dateOption) {
        await storage.updateEvent(event.id, { chosenDate: winner.dateOption });
      }

      await storage.createActivityLog({
        eventId: event.id,
        actorId: req.user!.id,
        action: "poll_result_applied",
        payloadJson: JSON.stringify({ pollType: poll.type }),
      });

      // Check if both course and date are chosen, transition to RSVP
      const updatedEvent = await storage.getEvent(event.id);
      if (updatedEvent?.chosenCourseId && updatedEvent.chosenDate && updatedEvent.state === "polling") {
        // Auto-transition to RSVP
        // Note: In production, you might want to require manual RSVP opening
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== RSVP ROUTES =====
  app.post("/api/rsvps/event/:eventId/join", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.state !== "rsvp" && event.state !== "final") {
        return res.status(400).json({ error: "RSVP not open" });
      }

      // Check if already RSVPed
      const existing = await storage.getRsvp(event.id, req.user!.id);
      if (existing && existing.status !== "withdrawn") {
        return res.status(400).json({ error: "Already RSVPed" });
      }

      // Check capacity
      const rsvps = await storage.getEventRsvps(event.id);
      const joinedCount = rsvps.filter((r) => r.status === "joined").length;

      let status: "joined" | "waitlisted" = "joined";
      let positionInt: number | undefined = undefined;

      if (joinedCount >= event.capacity) {
        status = "waitlisted";
        const waitlistedRsvps = rsvps.filter((r) => r.status === "waitlisted");
        positionInt = waitlistedRsvps.length + 1;
      }

      if (existing) {
        await storage.updateRsvp(existing.id, { status, positionInt });
      } else {
        await storage.createRsvp({
          eventId: event.id,
          userId: req.user!.id,
          status,
          positionInt,
        });
      }

      await storage.createActivityLog({
        eventId: event.id,
        actorId: req.user!.id,
        action: status === "joined" ? "rsvp_joined" : "rsvp_waitlisted",
      });

      res.json({ success: true, status, positionInt });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/rsvps/event/:eventId/withdraw", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const rsvp = await storage.getRsvp(event.id, req.user!.id);
      if (!rsvp) {
        return res.status(404).json({ error: "No RSVP found" });
      }

      const wasJoined = rsvp.status === "joined";

      await storage.updateRsvp(rsvp.id, { status: "withdrawn", positionInt: undefined, claimedExpiresAt: undefined });

      await storage.createActivityLog({
        eventId: event.id,
        actorId: req.user!.id,
        action: "rsvp_withdrawn",
      });

      // If was joined, promote next waitlist member
      if (wasJoined) {
        const rsvps = await storage.getEventRsvps(event.id);
        const waitlisted = rsvps
          .filter((r) => r.status === "waitlisted")
          .sort((a, b) => (a.positionInt || 0) - (b.positionInt || 0));

        if (waitlisted.length > 0) {
          const next = waitlisted[0];
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await storage.updateRsvp(next.id, { claimedExpiresAt: expiresAt });

          const nextUser = await storage.getUser(next.userId);
          if (nextUser) {
            notifySpotAvailable(nextUser.email, event.title, expiresAt);
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/rsvps/event/:eventId/claim", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const rsvp = await storage.getRsvp(event.id, req.user!.id);
      if (!rsvp || rsvp.status !== "waitlisted") {
        return res.status(400).json({ error: "Not on waitlist" });
      }

      if (!rsvp.claimedExpiresAt) {
        return res.status(400).json({ error: "No claim window available" });
      }

      if (new Date(rsvp.claimedExpiresAt) < new Date()) {
        return res.status(400).json({ error: "Claim window expired" });
      }

      await storage.updateRsvp(rsvp.id, { status: "joined", positionInt: undefined, claimedExpiresAt: undefined });

      await storage.createActivityLog({
        eventId: event.id,
        actorId: req.user!.id,
        action: "rsvp_claimed",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/rsvps/event/:eventId", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const rsvps = await storage.getEventRsvps(event.id);
      const rsvpsWithUsers = await Promise.all(
        rsvps.map(async (rsvp) => {
          const user = await storage.getUser(rsvp.userId);
          return { ...rsvp, user };
        })
      );

      const group = await storage.getGroup(event.groupId);
      const course = event.chosenCourseId ? await storage.getCourse(event.chosenCourseId) : undefined;

      res.json({
        ...event,
        group,
        course,
        rsvps: rsvpsWithUsers,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== PAIRING ROUTES =====
  app.get("/api/pairings/event/:eventId", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const pairings = await storage.getEventPairings(event.id);
      const pairingsWithMembers = await Promise.all(
        pairings.map(async (pairing) => {
          const members = await storage.getPairingMembers(pairing.id);
          const membersWithUsers = await Promise.all(
            members.map(async (member) => {
              const user = await storage.getUser(member.userId);
              return { ...member, user };
            })
          );
          return { ...pairing, members: membersWithUsers };
        })
      );

      // Get available players (joined RSVPs not in pairings)
      const rsvps = await storage.getEventRsvps(event.id);
      const joinedRsvps = rsvps.filter((r) => r.status === "joined");
      const allPairingMembers = pairingsWithMembers.flatMap((p) => p.members);
      const pairedUserIds = allPairingMembers.map((m) => m.userId);
      const availablePlayers = await Promise.all(
        joinedRsvps
          .filter((r) => !pairedUserIds.includes(r.userId))
          .map((r) => storage.getUser(r.userId))
      );

      const group = await storage.getGroup(event.groupId);

      res.json({
        ...event,
        group,
        pairings: pairingsWithMembers,
        availablePlayers: availablePlayers.filter(Boolean),
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pairings/event/:eventId", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can create pairings" });
      }

      const { name, teeTimeText } = req.body;
      const pairing = await storage.createPairing({
        eventId: event.id,
        name,
        teeTimeText,
      });

      res.json(pairing);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/pairings/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const pairing = await storage.getPairing(req.params.id);
      if (!pairing) {
        return res.status(404).json({ error: "Pairing not found" });
      }

      const event = await storage.getEvent(pairing.eventId);
      if (!event || event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can update pairings" });
      }

      const { name, teeTimeText } = req.body;
      const updated = await storage.updatePairing(pairing.id, { name, teeTimeText });

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pairings/:id/members", requireAuth, async (req: Request, res: Response) => {
    try {
      const pairing = await storage.getPairing(req.params.id);
      if (!pairing) {
        return res.status(404).json({ error: "Pairing not found" });
      }

      const event = await storage.getEvent(pairing.eventId);
      if (!event || event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can add members" });
      }

      const { userId } = req.body;
      const members = await storage.getPairingMembers(pairing.id);

      const member = await storage.createPairingMember({
        pairingId: pairing.id,
        userId,
        orderInt: members.length,
      });

      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/pairings/:pairingId/members/:memberId", requireAuth, async (req: Request, res: Response) => {
    try {
      const member = await storage.getPairingMember(req.params.memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const pairing = await storage.getPairing(member.pairingId);
      if (!pairing) {
        return res.status(404).json({ error: "Pairing not found" });
      }

      const event = await storage.getEvent(pairing.eventId);
      if (!event || event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can remove members" });
      }

      await storage.deletePairingMember(member.id);

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pairings/:pairingId/members/:memberId/reorder", requireAuth, async (req: Request, res: Response) => {
    try {
      const member = await storage.getPairingMember(req.params.memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const pairing = await storage.getPairing(member.pairingId);
      if (!pairing) {
        return res.status(404).json({ error: "Pairing not found" });
      }

      const event = await storage.getEvent(pairing.eventId);
      if (!event || event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Only event creator can reorder members" });
      }

      const { direction } = req.body;
      const members = (await storage.getPairingMembers(pairing.id)).sort((a, b) => a.orderInt - b.orderInt);
      const currentIndex = members.findIndex((m) => m.id === member.id);

      if (direction === "up" && currentIndex > 0) {
        const swapWith = members[currentIndex - 1];
        await storage.updatePairingMember(member.id, { orderInt: swapWith.orderInt });
        await storage.updatePairingMember(swapWith.id, { orderInt: member.orderInt });
      } else if (direction === "down" && currentIndex < members.length - 1) {
        const swapWith = members[currentIndex + 1];
        await storage.updatePairingMember(member.id, { orderInt: swapWith.orderInt });
        await storage.updatePairingMember(swapWith.id, { orderInt: member.orderInt });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/pairings/event/:eventId/export/tee-sheet.pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const pairings = await storage.getEventPairings(event.id);
      const pairingsWithMembers = await Promise.all(
        pairings.map(async (pairing) => {
          const members = (await storage.getPairingMembers(pairing.id)).sort((a, b) => a.orderInt - b.orderInt);
          const players = await Promise.all(members.map((m) => storage.getUser(m.userId)));
          return {
            name: pairing.name,
            teeTime: pairing.teeTimeText || "TBD",
            players: players.filter(Boolean).map((p) => p!.name),
          };
        })
      );

      const course = event.chosenCourseId ? await storage.getCourse(event.chosenCourseId) : undefined;

      const pdfBuffer = generateTeeSheetPDF({
        eventTitle: event.title,
        date: event.chosenDate || "TBD",
        courseName: course?.name || "TBD",
        pairings: pairingsWithMembers,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="tee-sheet-${event.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pairings/event/:eventId/export/roster.csv", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const rsvps = await storage.getEventRsvps(event.id);
      const joinedRsvps = rsvps.filter((r) => r.status === "joined");

      const rows = await Promise.all(
        joinedRsvps.map(async (rsvp) => {
          const user = await storage.getUser(rsvp.userId);
          return {
            name: user?.name || "",
            email: user?.email || "",
            phone: user?.phone || "",
            status: rsvp.status,
          };
        })
      );

      const csv = Papa.unparse(rows);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="roster-${event.id}.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
