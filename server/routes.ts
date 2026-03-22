import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import session from "express-session";
import multer from "multer";
import Papa from "papaparse";
import { storage } from "./storage";
import { requireAuth } from "./middleware/auth";
import { generateTeeSheetPDF } from "./utils/pdf";
import { randomBytes } from "crypto";
import { notifyPollOpened, notifyRsvpOpened, notifySpotAvailable, notifyRosterLocked, notifyTeeSheetPosted, notifyGroupInvite, notifyEventUpdate, sendPasswordReset } from "./utils/email";
import { insertUserSchema, insertGroupSchema, insertCourseSchema, insertEventSchema, updateEventSchema } from "@shared/schema";
import { geocodeAndSeedCourses } from "./seed";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust Replit's reverse proxy so secure cookies work over HTTPS in production
  app.set("trust proxy", 1);

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

      // Set session and wait for it to be persisted before responding
      (req.session as any).userId = user.id;
      const { passwordHash: _, ...userWithoutPassword } = user;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: "Session error" });
        res.json(userWithoutPassword);
      });
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

      // Set session and wait for it to be persisted before responding
      (req.session as any).userId = user.id;
      const { passwordHash: _, ...userWithoutPassword } = user;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: "Session error" });
        res.json(userWithoutPassword);
      });
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

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      // Always return success to prevent user enumeration
      if (user) {
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await storage.createPasswordResetToken(user.id, token, expiresAt);
        const proto = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        const origin = `${proto}://${host}`;
        const resetUrl = `${origin}/reset-password?token=${token}`;
        sendPasswordReset(user.email, resetUrl);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Token is required" });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      const record = await storage.getPasswordResetToken(token);
      if (!record) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }
      if (record.usedAt) {
        return res.status(400).json({ error: "This reset link has already been used" });
      }
      if (new Date() > record.expiresAt) {
        return res.status(400).json({ error: "This reset link has expired" });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await storage.updateUserPassword(record.userId, passwordHash);
      await storage.markPasswordResetTokenUsed(record.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // Helper: check if user is an event organizer (creator, group owner, or organizer role)
  async function isEventOrganizer(userId: string, eventOrGroupId: { createdBy: string; groupId: string }): Promise<boolean> {
    if (eventOrGroupId.createdBy === userId) return true;
    const membership = await storage.getMembership(userId, eventOrGroupId.groupId);
    return membership?.role === "owner" || membership?.role === "organizer";
  }

  // Shared helper: create a token invitation and stub-send the email
  async function createTokenInvitation(group: { id: string; name: string; joinCode: string; ownerId: string }, inviterId: string, inviterName: string, email: string, req: Request) {
    const trimmedEmail = email.trim().toLowerCase();
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invitation = await storage.createInvitation({
      groupId: group.id,
      email: trimmedEmail,
      invitedBy: inviterId,
      token,
      expiresAt,
    });

    const host = req.headers.host || "localhost:5000";
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const inviteUrl = `${protocol}://${host}/invitations/${token}`;
    notifyGroupInvite(trimmedEmail, inviterName, group.name, group.joinCode, inviteUrl);

    return invitation;
  }

  app.post("/api/groups/:id/invite", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });

      if (group.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Only the group owner can send invitations" });
      }

      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email address required" });
      }

      const invitation = await createTokenInvitation(group, req.user!.id, req.user!.name, email, req);
      res.json({ success: true, message: `Invitation sent to ${email.trim().toLowerCase()}`, invitation });
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Alias: invite-email routes to the same logic (frontend compatibility)
  app.post("/api/groups/:id/invite-email", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });

      if (group.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Only the group owner can send email invitations" });
      }

      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email address required" });
      }

      const invitation = await createTokenInvitation(group, req.user!.id, req.user!.name, email, req);
      res.json({ success: true, message: `Invitation sent to ${email.trim().toLowerCase()}`, invitation });
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/groups/:id/invitations", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });

      // Allow owner OR organizer role to view invitations
      const membership = await storage.getMembership(req.user!.id, group.id);
      const isOwnerOrOrg = group.ownerId === req.user!.id || membership?.role === "organizer" || membership?.role === "owner";
      if (!isOwnerOrOrg) {
        return res.status(403).json({ error: "Only group organizers can view invitations" });
      }

      const invs = await storage.listGroupInvitations(group.id);
      res.json(invs);
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ===== INVITATION ACCEPT ROUTES =====
  app.get("/api/invitations/:token", async (req: Request, res: Response) => {
    try {
      const inv = await storage.getInvitationByToken(req.params.token);
      if (!inv) return res.status(404).json({ error: "Invitation not found" });

      const group = await storage.getGroup(inv.groupId);
      const inviter = await storage.getUser(inv.invitedBy);

      res.json({
        token: inv.token,
        email: inv.email,
        groupId: inv.groupId,
        groupName: group?.name ?? "Unknown Group",
        inviterName: inviter?.name ?? "Someone",
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
      });
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/invitations/:token/accept", requireAuth, async (req: Request, res: Response) => {
    try {
      const inv = await storage.getInvitationByToken(req.params.token);
      if (!inv) return res.status(404).json({ error: "Invitation not found" });
      if (inv.acceptedAt) return res.status(400).json({ error: "Invitation already accepted" });

      const now = new Date();
      if (new Date(inv.expiresAt) < now) {
        return res.status(400).json({ error: "Invitation has expired" });
      }

      // Bind acceptance to invited email (prevent token forwarding abuse)
      if (req.user!.email.toLowerCase() !== inv.email.toLowerCase()) {
        return res.status(403).json({
          error: `This invitation was sent to ${inv.email}. Please sign in with that email to accept.`,
        });
      }

      // Check if already a member
      const existing = await storage.getMembership(req.user!.id, inv.groupId);
      if (!existing) {
        await storage.createMembership({
          userId: req.user!.id,
          groupId: inv.groupId,
          role: "member",
        });
      }

      await storage.acceptInvitation(inv.token);

      res.json({ success: true, groupId: inv.groupId });
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
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

  // ===== CO-ORGANIZER MANAGEMENT =====
  app.patch("/api/groups/:id/members/:userId/role", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });

      // Only owner can promote/demote
      if (group.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Only the group owner can manage organizer roles" });
      }

      const { role } = req.body;
      if (!role || !["organizer", "member"].includes(role)) {
        return res.status(400).json({ error: "Role must be 'organizer' or 'member'" });
      }

      // Cannot change owner's role
      if (req.params.userId === group.ownerId) {
        return res.status(400).json({ error: "Cannot change the owner's role" });
      }

      const membership = await storage.getMembership(req.params.userId, group.id);
      if (!membership) return res.status(404).json({ error: "Member not found in group" });

      const updated = await storage.updateMembershipRole(req.params.userId, group.id, role);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== MEMBER REMOVAL =====
  app.delete("/api/groups/:id/members/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });

      // Only owner can remove members
      if (group.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Only the group owner can remove members" });
      }

      // Cannot remove the owner
      if (req.params.userId === group.ownerId) {
        return res.status(400).json({ error: "Cannot remove the group owner" });
      }

      const membership = await storage.getMembership(req.params.userId, group.id);
      if (!membership) return res.status(404).json({ error: "Member not found in group" });

      await storage.deleteMembership(req.params.userId, group.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== GROUP DELETE =====
  app.delete("/api/groups/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });

      // Only owner can delete the group
      if (group.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Only the group owner can delete the group" });
      }

      await storage.deleteGroup(group.id);
      res.json({ success: true });
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

  app.get("/api/maps/frame", requireAuth, async (req: Request, res: Response) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).send("<p>Maps API key not configured.</p>");
    }
    const all = await storage.searchCourses();
    const withCoords = all.filter(c => c.lat != null && c.lng != null);
    const canAddToPoll = req.query.canAddToPoll === "1";
    const pollId = typeof req.query.pollId === "string" ? req.query.pollId : "";
    // Escape </script> sequences to prevent stored XSS when embedding JSON in <script> block
    const coursesJson = JSON.stringify(withCoords.map(c => ({
      id: c.id,
      name: c.name,
      address: c.address || "",
      city: c.city,
      region: c.region,
      lat: c.lat,
      lng: c.lng,
      feeNote: c.feeNote || "",
      phone: c.phone || "",
      website: c.website || "",
      tags: c.tags,
    }))).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
    .add-btn { background:#16a34a; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px; padding:5px 10px; width:100%; margin-top:8px; }
    .add-btn:disabled { opacity:.5; cursor:default; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var COURSES = ${coursesJson};
    var CAN_ADD = ${canAddToPoll ? "true" : "false"};
    var POLL_ID = ${JSON.stringify(pollId)};
    var ORIGIN = ${JSON.stringify(process.env.APP_ORIGIN || "")};
    var map, markers = {}, infoWindow, activeFilter = "", addedIds = new Set();

    function esc(s) {
      return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
    }

    function buildContent(c) {
      var tags = c.tags.map(function(t){ return '<span style="font-size:11px;background:#f1f5f9;padding:1px 5px;border-radius:3px;margin-right:3px;">'+esc(t)+'</span>'; }).join("");
      var btn = "";
      if (CAN_ADD) {
        var disabled = addedIds.has(c.id) ? "disabled" : "";
        var label = addedIds.has(c.id) ? "Added" : "Add to Poll";
        btn = '<button class="add-btn" id="abtn-'+esc(c.id)+'" '+disabled+'>'+esc(label)+'</button>';
      }
      return '<div style="min-width:200px;max-width:240px;font-family:sans-serif;">'
        +'<p style="font-weight:600;font-size:13px;margin:0 0 2px;">'+esc(c.name)+'</p>'
        +(c.address ? '<p style="font-size:11px;color:#374151;margin:0 0 1px;">'+esc(c.address)+'</p>' : '')
        +'<p style="font-size:11px;color:#64748b;margin:0 0 5px;">'+esc(c.city)+', '+esc(c.region)+'</p>'
        +(c.feeNote ? '<p style="font-size:11px;color:#64748b;margin:0 0 3px;">'+esc(c.feeNote)+'</p>' : '')
        +(c.phone ? '<p style="font-size:11px;color:#64748b;margin:0 0 3px;">&#9742; '+esc(c.phone)+'</p>' : '')
        +'<div style="margin-bottom:6px;">'+tags+'</div>'
        +(c.website ? '<a href="'+esc(c.website)+'" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#2563eb;">Website &rarr;</a>' : '')
        +btn+'</div>';
    }

    function openInfo(marker, course) {
      infoWindow.setContent(buildContent(course));
      infoWindow.open(map, marker);
      window.parent.postMessage({ type: "selectCourse", courseId: course.id }, "*");
      if (CAN_ADD) {
        setTimeout(function() {
          var btn = document.getElementById("abtn-" + course.id);
          if (btn && !addedIds.has(course.id)) {
            btn.onclick = function() {
              window.parent.postMessage({ type: "addToPoll", courseId: course.id }, "*");
              addedIds.add(course.id);
              btn.textContent = "Added";
              btn.disabled = true;
            };
          }
        }, 80);
      }
    }

    function renderMarkers() {
      var q = activeFilter.toLowerCase();
      Object.keys(markers).forEach(function(id) { markers[id].setMap(null); });
      COURSES.forEach(function(c) {
        if (q && !(c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.region.toLowerCase().includes(q) || c.tags.some(function(t){ return t.toLowerCase().includes(q); }))) return;
        if (!markers[c.id]) {
          var m = new google.maps.Marker({ position: { lat: c.lat, lng: c.lng }, title: c.name });
          m.addListener("click", (function(course){ return function(){ openInfo(m, course); }; })(c));
          markers[c.id] = m;
        }
        markers[c.id].setMap(map);
      });
    }

    function focusCourse(courseId) {
      var c = COURSES.find(function(x){ return x.id === courseId; });
      if (!c || !markers[c.id]) return;
      map.panTo({ lat: c.lat, lng: c.lng });
      map.setZoom(13);
      openInfo(markers[c.id], c);
    }

    window.addEventListener("message", function(e) {
      if (e.data && e.data.type === "filter") { activeFilter = e.data.query || ""; renderMarkers(); }
      if (e.data && e.data.type === "focusCourse") { focusCourse(e.data.courseId); }
    });

    function initMap() {
      map = new google.maps.Map(document.getElementById("map"), { center: { lat: 43.7615, lng: -79.4111 }, zoom: 10, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
      infoWindow = new google.maps.InfoWindow();
      renderMarkers();
    }
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.send(html);
  });

  app.get("/api/courses/map", requireAuth, async (_req: Request, res: Response) => {
    try {
      const all = await storage.searchCourses();
      const withCoords = all.filter(c => c.lat != null && c.lng != null);
      res.json(withCoords);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/polls/:pollId/options", requireAuth, async (req: Request, res: Response) => {
    try {
      const poll = await storage.getPoll(req.params.pollId);
      if (!poll) return res.status(404).json({ error: "Poll not found" });

      const event = await storage.getEvent(poll.eventId);
      if (!event) return res.status(404).json({ error: "Event not found" });

      if (poll.visibility === "hidden") {
        return res.status(400).json({ error: "Poll is closed" });
      }

      if (event.state !== "polling") {
        return res.status(400).json({ error: "Event must be in polling state" });
      }

      if (poll.type === "course") {
        if (!await isEventOrganizer(req.user!.id, event)) {
          return res.status(403).json({ error: "Only event organizers can add course poll options" });
        }
        const { courseId, label } = req.body;
        if (!courseId && !label) {
          return res.status(400).json({ error: "courseId or label required" });
        }
        if (courseId) {
          const course = await storage.getCourse(courseId);
          if (!course) return res.status(404).json({ error: "Course not found" });
        }
        const existing = await storage.getPollOptions(poll.id);
        if (courseId && existing.some(o => o.courseId === courseId)) {
          return res.status(400).json({ error: "Course already in this poll" });
        }
        const course = courseId ? await storage.getCourse(courseId) : undefined;
        const option = await storage.createPollOption({
          pollId: poll.id,
          courseId: courseId || undefined,
          dateOption: undefined,
          label: label || course?.name || "",
        });
        return res.json(option);
      }

      if (poll.type === "date") {
        const membership = await storage.getMembership(req.user!.id, event.groupId);
        if (!membership) {
          return res.status(403).json({ error: "You must be a group member to suggest dates" });
        }
        const { dateOption } = req.body;
        if (!dateOption) {
          return res.status(400).json({ error: "dateOption (ISO date string) required" });
        }
        const parsed = new Date(dateOption);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ error: "Invalid date" });
        }
        // Store as YYYY-MM-DD (10 chars, fits varchar(20))
        const dateStr = dateOption.split("T")[0].substring(0, 10);
        const existing = await storage.getPollOptions(poll.id);
        if (existing.some(o => o.dateOption === dateStr)) {
          return res.status(400).json({ error: "This date is already in the poll" });
        }
        // Format a human-readable label
        const [year, month, day] = dateStr.split("-").map(Number);
        const displayDate = new Date(year, month - 1, day);
        const label = displayDate.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const option = await storage.createPollOption({
          pollId: poll.id,
          courseId: undefined,
          dateOption: dateStr,
          label,
        });
        return res.json(option);
      }

      return res.status(400).json({ error: "Unknown poll type" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  app.delete("/api/polls/:pollId", requireAuth, async (req: Request, res: Response) => {
    try {
      const poll = await storage.getPoll(req.params.pollId);
      if (!poll) return res.status(404).json({ error: "Poll not found" });
      const event = await storage.getEvent(poll.eventId);
      if (!event || !await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can delete polls" });
      }
      await storage.deletePoll(poll.id);
      const remainingPolls = await storage.getEventPolls(event.id);
      if (remainingPolls.length === 0 && event.state === "polling") {
        await storage.updateEvent(event.id, { state: "draft" });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  app.delete("/api/polls/options/:optionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const option = await storage.getPollOption(req.params.optionId);
      if (!option) return res.status(404).json({ error: "Poll option not found" });

      const poll = await storage.getPoll(option.pollId);
      if (!poll) return res.status(404).json({ error: "Poll not found" });

      // Only open polls can have options deleted
      if (poll.visibility !== "live") {
        return res.status(400).json({ error: "Cannot delete options from a closed poll" });
      }

      const event = await storage.getEvent(poll.eventId);
      if (!event || !await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can delete poll options" });
      }

      await storage.deletePollOption(option.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== EVENT ROUTES =====
  app.post("/api/events", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertEventSchema.parse(req.body);
      
      const membership = await storage.getMembership(req.user!.id, data.groupId);
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this group" });
      }

      // Only owners and organizers can create events
      if (membership.role !== "owner" && membership.role !== "organizer") {
        return res.status(403).json({ error: "Only group owners and organizers can create events" });
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

  app.delete("/api/events/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found" });

      // Only the group owner can delete an event
      const group = await storage.getGroup(event.groupId);
      if (!group || group.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Only the group owner can delete events" });
      }

      await storage.deleteEvent(event.id);
      res.json({ success: true, groupId: event.groupId });
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

      if (!await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can update" });
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

      if (!await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can open polls" });
      }

      if (event.state !== "draft") {
        return res.status(400).json({ error: "Can only open polls for draft events" });
      }

      const { createCoursePoll, createDatePoll, coursePollMultiSelect, datePollMultiSelect } = req.body;

      if (createCoursePoll) {
        const poll = await storage.createPoll({
          eventId: event.id,
          type: "course",
          multiSelect: !!coursePollMultiSelect,
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
          multiSelect: !!datePollMultiSelect,
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

      if (!await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can open RSVP" });
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

      if (!await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can finalize" });
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

  app.post("/api/events/:id/send-update", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found" });

      if (!await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can send updates" });
      }

      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

      const rsvps = await storage.getEventRsvps(event.id);
      const joined = rsvps.filter(r => r.status === "joined");

      const senderName = req.user!.name;
      await Promise.all(
        joined.map(async (rsvp) => {
          const member = await storage.getUser(rsvp.userId);
          if (member?.email) {
            notifyEventUpdate(member.email, event.title, senderName, message.trim());
          }
        })
      );

      console.log(`[send-update] Event "${event.title}" — emailed ${joined.length} recipients`);
      res.json({ success: true, recipientCount: joined.length });
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

      const [group, course, polls, rsvps, allMemberships] = await Promise.all([
        storage.getGroup(event.groupId),
        event.chosenCourseId ? storage.getCourse(event.chosenCourseId) : Promise.resolve(undefined),
        storage.getEventPolls(event.id),
        storage.getEventRsvps(event.id),
        storage.getGroupMemberships(event.groupId),
      ]);

      const [rsvpsWithUsers, membersWithUsers] = await Promise.all([
        Promise.all(rsvps.map(async (rsvp) => {
          const user = await storage.getUser(rsvp.userId);
          return { ...rsvp, user };
        })),
        Promise.all(allMemberships.map(async (m) => {
          const user = await storage.getUser(m.userId);
          return { ...m, user };
        })),
      ]);

      res.json({
        ...event,
        group,
        course,
        polls,
        rsvps: rsvpsWithUsers,
        members: membersWithUsers,
        membership,
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
          const userVotes = await storage.getUserVotes(poll.id, req.user!.id);

          const optionsWithVotes = await Promise.all(
            options.map(async (option) => {
              const voteCount = votes.filter((v) => v.optionId === option.id).length;
              const course = option.courseId ? await storage.getCourse(option.courseId) : undefined;
              return { ...option, voteCount, course };
            })
          );

          return { ...poll, options: optionsWithVotes, userVotes };
        })
      );

      const group = await storage.getGroup(event.groupId);
      const membership = await storage.getMembership(req.user!.id, event.groupId);

      res.json({
        ...event,
        group,
        polls: pollsWithDetails,
        membership,
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

      // Accept optionIds array (or legacy single optionId)
      let optionIds: string[] = req.body.optionIds ?? (req.body.optionId ? [req.body.optionId] : []);
      if (!optionIds.length) {
        return res.status(400).json({ error: "No options selected" });
      }

      if (poll.multiSelect) {
        // Multi-select: replace the user's entire vote selection
        await storage.deleteUserPollVotes(poll.id, req.user!.id);
        for (const optionId of optionIds) {
          await storage.createVote({ pollId: poll.id, optionId, userId: req.user!.id });
        }
      } else {
        // Single-select: prevent revoting
        const existingVote = await storage.getVote(poll.id, req.user!.id);
        if (existingVote) {
          return res.status(400).json({ error: "Already voted" });
        }
        await storage.createVote({ pollId: poll.id, optionId: optionIds[0], userId: req.user!.id });
      }

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
      if (!event || !await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can close polls" });
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
      if (!event || !await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can apply results" });
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

      // Apply result to event
      if (poll.type === "course" && winner.courseId) {
        await storage.updateEvent(event.id, { chosenCourseId: winner.courseId });
      } else if (poll.type === "date" && winner.dateOption) {
        await storage.updateEvent(event.id, { chosenDate: winner.dateOption });
      }

      // Auto-close this poll now that a result has been applied
      await storage.updatePoll(poll.id, { visibility: "hidden" });

      await storage.createActivityLog({
        eventId: event.id,
        actorId: req.user!.id,
        action: "poll_result_applied",
        payloadJson: JSON.stringify({ pollType: poll.type, winnerId: winner.id }),
      });

      // Check if all polls are now resolved → auto-advance to RSVP
      const updatedEvent = await storage.getEvent(event.id);
      const allPolls = await storage.getEventPolls(event.id);

      const allResolved = allPolls.length > 0 && allPolls.every((p) => {
        if (p.type === "course") return !!updatedEvent?.chosenCourseId;
        if (p.type === "date") return !!updatedEvent?.chosenDate;
        return true;
      });

      let transitioned = false;
      if (allResolved && updatedEvent?.state === "polling") {
        await storage.updateEvent(event.id, { state: "rsvp" });
        transitioned = true;
        await storage.createActivityLog({
          eventId: event.id,
          actorId: req.user!.id,
          action: "state_changed",
          payloadJson: JSON.stringify({ from: "polling", to: "rsvp", reason: "all_polls_resolved" }),
        });
      }

      res.json({ success: true, transitioned, newState: transitioned ? "rsvp" : updatedEvent?.state });
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

      if (!await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can create pairings" });
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
      if (!event || !await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can update pairings" });
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
      if (!event || !await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can add members" });
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
      if (!event || !await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can remove members" });
      }

      await storage.deletePairingMember(member.id);

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pairings/event/:eventId/generate-random", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (!await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can generate pairings" });
      }

      if (event.state !== "final" && event.state !== "closed") {
        return res.status(400).json({ error: "RSVP must be closed before generating teams" });
      }

      const groupSize = Math.max(2, Math.min(6, parseInt(req.body.groupSize) || 4));

      // Get all confirmed players
      const rsvps = await storage.getEventRsvps(event.id);
      const joinedRsvps = rsvps.filter((r) => r.status === "joined");
      if (joinedRsvps.length === 0) {
        return res.status(400).json({ error: "No confirmed players to generate teams from" });
      }

      // Clear existing pairings
      const existingPairings = await storage.getEventPairings(event.id);
      for (const pairing of existingPairings) {
        const members = await storage.getPairingMembers(pairing.id);
        for (const member of members) {
          await storage.deletePairingMember(member.id);
        }
        await storage.deletePairing(pairing.id);
      }

      // Fisher-Yates shuffle
      const playerIds = joinedRsvps.map((r) => r.userId);
      for (let i = playerIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
      }

      // Divide into groups and create pairings
      const created = [];
      for (let i = 0; i < playerIds.length; i += groupSize) {
        const groupPlayers = playerIds.slice(i, i + groupSize);
        const groupNumber = Math.floor(i / groupSize) + 1;
        const pairing = await storage.createPairing({
          eventId: event.id,
          name: `Group ${groupNumber}`,
          teeTimeText: "",
        });
        for (let j = 0; j < groupPlayers.length; j++) {
          await storage.createPairingMember({
            pairingId: pairing.id,
            userId: groupPlayers[j],
            orderInt: j,
          });
        }
        created.push(pairing);
      }

      await storage.createActivityLog({
        eventId: event.id,
        actorId: req.user!.id,
        action: "pairings_generated",
        payloadJson: JSON.stringify({ groupSize, groupCount: created.length, playerCount: playerIds.length }),
      });

      res.json({ success: true, groupCount: created.length, playerCount: playerIds.length });
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
      if (!event || !await isEventOrganizer(req.user!.id, event)) {
        return res.status(403).json({ error: "Only event organizers can reorder members" });
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

  // ===== CHAT ROUTES =====
  app.get("/api/chat/event/:eventId", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Check if user is a member of the group
      const membership = await storage.getMembership(req.user!.id, event.groupId);
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this group" });
      }

      const messages = await storage.getChatMessages(event.id);

      // Attach sender info to each message
      const messagesWithUsers = await Promise.all(
        messages.map(async (msg) => {
          const sender = await storage.getUser(msg.userId);
          const senderMembership = sender ? await storage.getMembership(sender.id, event.groupId) : undefined;
          return {
            ...msg,
            senderName: sender?.name ?? "Unknown",
            senderRole: senderMembership?.role ?? "member",
            isOrganizer: msg.userId === event.createdBy,
          };
        })
      );

      res.json(messagesWithUsers);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/chat/event/:eventId", requireAuth, async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Check if user is a member of the group
      const membership = await storage.getMembership(req.user!.id, event.groupId);
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this group" });
      }

      const { content } = req.body;
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }

      if (content.trim().length > 2000) {
        return res.status(400).json({ error: "Message too long (max 2000 characters)" });
      }

      const message = await storage.createChatMessage({
        eventId: event.id,
        userId: req.user!.id,
        content: content.trim(),
      });

      const sender = req.user!;
      res.json({
        ...message,
        senderName: sender.name,
        senderRole: membership.role,
        isOrganizer: message.userId === event.createdBy,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== ADMIN: GEOCODE & RESEED COURSES FROM CSV =====
  app.post("/api/admin/reseed-courses", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("[admin] Starting course geocode & reseed...");
      const result = await geocodeAndSeedCourses();
      console.log(`[admin] Reseed complete: ${result.inserted} inserted, ${result.updated} updated, ${result.failed.length} failed`);
      res.json({ success: true, ...result });
    } catch (error: unknown) {
      console.error("[admin] Reseed failed:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Reseed failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
