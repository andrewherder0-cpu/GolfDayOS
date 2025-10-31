# Golf Day OS

A production-ready golf event management system built with Express.js, React, and TypeScript.

## Overview

Golf Day OS helps groups organize golf events with a complete workflow: draft creation → course/date polling → RSVP management → pairing organization → tee sheet export.

## Recent Changes

- **October 31, 2025**: Authentication Flow Refinement
  - Fixed signup/login redirect issues using auth-state-driven navigation
  - Replaced setTimeout with useEffect that reacts to user state changes
  - Enabled session persistence across page refreshes (refetchOnMount: true)
  - Auth flow: signup/login → user set in cache → useEffect fires → navigate to dashboard
  - Session validated on page load via GET /api/auth/me with session cookie
  - Eliminated race conditions in redirect logic
  - End-to-end tested: signup, login, logout, session persistence all working
  - Architect reviewed and approved (PASS verdict with improvements implemented)

- **October 31, 2025**: Professional Landing Page
  - Built single-page landing with React, Tailwind CSS, and Framer Motion
  - Comprehensive sections: Hero, Pain Points, Solution/Features, How It Works, Testimonials, FAQ, Final CTA
  - Sticky navigation that transitions from transparent to solid on scroll
  - Smooth scroll navigation to in-page sections
  - Golf-themed color palette (deep green, sand, slate)
  - Created 6 reusable landing components (NavBar, Footer, FeatureCard, PainPointCard, TestimonialCard, FAQItem)
  - Added dedicated /signup route with clean form
  - Comprehensive SEO metadata and Open Graph tags
  - All content per specification with Unsplash images
  - Framer Motion animations throughout (fade-in, slide-in, scale, hover effects)
  - Fully responsive design (mobile-first)
  - End-to-end tested and architect approved

- **October 30, 2025**: Google Maps Places API Integration
  - Added backend endpoint GET /api/courses/search-google for searching golf courses
  - Added backend endpoint POST /api/courses/add-from-google for adding courses from results
  - Updated Courses page with tabbed dialog (Google Maps + Manual Entry)
  - Google Maps search: enter query → displays results → click Add → saved to database
  - Auto-tags courses with 'google-maps', extracts city/region from formatted address
  - Secures API key server-side (never exposed to frontend)
  - Architect reviewed and approved (PASS verdict)
  - Requires valid Google API key with Places API enabled and billing configured

- **October 30, 2025**: Production-ready PostgreSQL database migration
  - Migrated from in-memory storage to PostgreSQL with Drizzle ORM
  - Created complete database schema with 12 tables and proper relations
  - Implemented DatabaseStorage class with all 35+ storage methods
  - All tables created: users, groups, memberships, courses, events, polls, pollOptions, votes, rsvps, pairings, pairingMembers, activityLogs
  - Verified end-to-end functionality: signup, auth, groups, courses, RSVPs all working
  - Production-grade persistence with foreign key constraints and proper indexes

- **October 30, 2025**: Critical authentication optimization
  - Implemented AuthProvider context to centralize authentication state
  - Fixed duplicate /api/auth/me queries (was hammering backend, now single call)
  - All pages now use useAuthContext() instead of direct useAuth() calls
  - Significantly improved app performance and reduced server load

- **2024**: Initial MVP implementation
  - Complete user authentication system with email/password
  - Group management with join codes
  - Course directory with search and CSV import
  - Event lifecycle management (draft → polling → RSVP → final)
  - Polling system for course and date selection
  - RSVP management with capacity limits and waitlists
  - Pairing management with PDF/CSV export
  - Activity logging throughout the system

## Architecture

### Frontend (React + TypeScript)
- **Pages**: Login, Dashboard, Groups, Courses, Events, Polls, RSVP, Pairings, Settings
- **State Management**: TanStack Query for server state, AuthProvider context for auth
- **UI Components**: Shadcn UI with Tailwind CSS
- **Design System**: Modern SaaS productivity (Linear/Notion inspired)
- **Routing**: Wouter for client-side routing
- **Authentication**: Centralized via AuthProvider context (client/src/lib/AuthProvider.tsx)

### Backend (Express.js + TypeScript)
- **Storage**: PostgreSQL database with Drizzle ORM (DatabaseStorage)
- **Database**: 12 tables with foreign key relationships and proper indexes
- **Authentication**: Session-based with HTTP-only cookies, bcrypt password hashing
- **API Routes**:
  - `/api/auth` - signup, login, logout, user management
  - `/api/groups` - create, invite, join, list groups
  - `/api/courses` - search, create, update, CSV import
  - `/api/events` - full event lifecycle management
  - `/api/polls` - voting, closing, applying results
  - `/api/rsvps` - join, withdraw, claim waitlist spots
  - `/api/pairings` - create/manage groups, export tee sheets

### Data Model
- **User**: email, name, phone, password hash
- **Group**: name, join code, owner
- **Membership**: user-group relationships with roles
- **Course**: name, location, tags, fees, website
- **Event**: title, state, capacity, chosen course/date
- **Poll**: type (course/date), options, votes
- **RSVP**: status (joined/waitlisted/withdrawn), position
- **Pairing**: groups of players with tee times
- **ActivityLog**: event audit trail

## User Preferences

None specified yet.

## Technical Stack

- **Runtime**: Node.js 20
- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Styling**: Tailwind CSS, Shadcn UI components
- **Fonts**: Inter (primary), JetBrains Mono (code/join codes)
- **State**: TanStack Query v5
- **Validation**: Zod schemas with Drizzle-Zod integration
- **Storage**: DatabaseStorage (PostgreSQL) - production-ready persistence

## Development

```bash
# Install dependencies (handled automatically)
npm install

# Start development server (frontend + backend)
npm run dev
```

The application runs on port 5000 with both frontend and backend served together.

## Key Features

1. **Authentication**: Email/password with secure sessions
2. **Groups**: Create groups, generate join codes, invite members
3. **Courses**: Searchable directory, CSV import, tags/filters
4. **Events**: Multi-stage workflow (draft → polling → RSVP → final)
5. **Polling**: Vote on courses and dates, tie-break handling
6. **RSVP**: Capacity management, automatic waitlist, 24h claim windows
7. **Pairings**: Manual group creation, tee time assignment, member ordering
8. **Export**: PDF tee sheets, CSV rosters
9. **Notifications**: Console-based email stubs (ready for real email integration)

## Business Rules

- **Polls**: One vote per user per poll, live tallies, owner can close and apply results
- **RSVP**: Auto-waitlist when capacity reached, withdraw triggers waitlist promotion
- **Waitlist Claims**: 24-hour window to claim promoted spots
- **Event States**: draft → polling → rsvp → final → closed

## Future Enhancements

- Real email notifications (SendGrid/similar)
- ICS calendar downloads  
- Bulk nudge for non-voters/non-RSVPs
- Drag-and-drop pairing management
- Scoring and handicap tracking
- Payment integration
- Retry loop for join-code generation (edge case handling)
- Connection pooling optimization for high-traffic scenarios
