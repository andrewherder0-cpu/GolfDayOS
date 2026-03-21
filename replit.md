# Golf Day OS

## Overview

Golf Day OS is a comprehensive, production-ready golf event management system designed to streamline the organization of golf events. It provides a complete workflow from event drafting and course/date polling to RSVP management, pairing organization, and tee sheet export. The system aims to simplify the complexities of group golf event planning, offering a robust solution for organizers and participants.

## User Preferences

None specified yet.

## System Architecture

### Frontend (React + TypeScript)
- **Frameworks**: React 18, Vite
- **UI/UX**: Modern SaaS productivity aesthetic, inspired by tools like Linear and Notion. Uses Shadcn UI with Tailwind CSS for components.
- **State Management**: TanStack Query for server-side data, custom AuthProvider Context for authentication.
- **Routing**: Wouter for client-side navigation.
- **Core Pages**: Login, Dashboard, Group Management, Course Directory, Event Details (with tabs for Overview, Polls, RSVP, Players, Course Map, Chat, Settings), Invitations.
- **Visual Enhancements**: Animated gradients, AI-generated imagery, Lucide icons, and Framer Motion for interactive elements and animations, optimized for responsiveness and performance.

### Backend (Express.js + TypeScript)
- **Framework**: Express.js
- **Database Interaction**: Drizzle ORM managing PostgreSQL.
- **Authentication**: Session-based authentication using HTTP-only cookies and bcrypt for password hashing. Integrates a centralized AuthProvider context for efficient state management.
- **API Structure**:
    - `/api/auth`: User authentication and management.
    - `/api/groups`: Group creation, invitations, and membership management.
    - `/api/courses`: Search, creation, updates, and CSV import of golf courses. Includes Google Maps Places API integration with server-side key management.
    - `/api/events`: Comprehensive event lifecycle management.
    - `/api/polls`: Polling system for course and date selection, including vote management.
    - `/api/rsvps`: RSVP handling with capacity limits and waitlist management.
    - `/api/pairings`: Creation and management of player pairings and tee sheets.
    - `/api/chat`: Real-time event-specific chat functionality.
    - `/api/maps`: Secure server-side rendered Google Maps iframe for course viewing.
- **Roles**: Implements `owner` and `organizer` roles for granular access control, particularly within event management.

### Data Model (PostgreSQL with Drizzle ORM)
- **Core Entities**: Users, Groups, Memberships, Courses, Events, Polls, Poll Options, Votes, RSVPs, Pairings, Pairing Members, Invitations, Chat Messages, Activity Logs.
- **Relationships**: Robust foreign key constraints and indexing ensure data integrity and performance.

## External Dependencies

- **Database**: PostgreSQL (specifically Neon for cloud deployment).
- **Mapping Service**: Google Maps Places API (for course search and mapping, with server-side key management).
- **UI Components**: Shadcn UI.
- **Styling Framework**: Tailwind CSS.
- **Animation Library**: Framer Motion.
- **Icons**: Lucide React.
- **Frontend State Management**: TanStack Query.
- **Validation**: Zod (for schema validation).
- **Fonts**: Inter, JetBrains Mono.
- **Email Service**: Currently stubbed (console logging), designed for integration with third-party services like SendGrid or AWS SES for actual email delivery.