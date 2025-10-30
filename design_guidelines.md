# Golf Day OS - Design Guidelines

## Design Approach

**Selected Approach:** Modern SaaS Productivity System (Linear + Notion inspired)

**Justification:** Golf Day OS is a utility-focused productivity tool requiring efficient data management, clear workflow states, and intuitive navigation. The Linear design system excels at status-driven interfaces with clean hierarchies, while Notion's approach to structured content organization fits the course/event/member data model perfectly.

**Core Principles:**
- Clarity over decoration
- Workflow visibility (draft → polling → RSVP → finalized states)
- Information density without clutter
- Fast access to common actions

---

## Typography

**Font Stack:**
- Primary: `Inter` (Google Fonts) - for UI, tables, forms
- Secondary: `JetBrains Mono` (Google Fonts) - for codes (join codes, course IDs)

**Hierarchy:**
- H1: `text-3xl font-semibold` (Page titles - "My Groups", "Course Directory")
- H2: `text-2xl font-semibold` (Section headers - "Upcoming Events", "Members")
- H3: `text-lg font-medium` (Card titles, event names)
- Body: `text-base` (Standard content)
- Small: `text-sm` (Metadata, timestamps, helper text)
- Tiny: `text-xs` (Labels, badges, table headers)

**Special Elements:**
- Status badges: `text-xs font-medium uppercase tracking-wide`
- Course tags: `text-xs font-medium`
- Join codes: `font-mono text-lg tracking-wider`

---

## Layout System

**Spacing Primitives:** Tailwind units of **2, 3, 4, 6, 8, 12, 16**
- Tight spacing: `gap-2`, `p-2` (badges, compact lists)
- Standard spacing: `gap-4`, `p-4` (cards, form fields)
- Section spacing: `gap-6`, `py-8` (between major sections)
- Page padding: `p-8` desktop, `p-4` mobile

**Container Strategy:**
- Max width: `max-w-7xl mx-auto` for main content
- Narrow forms: `max-w-2xl` for event creation, settings
- Full-width tables: `w-full` with internal padding

**Grid Patterns:**
- Course cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Event dashboard: `grid-cols-1 lg:grid-cols-3 gap-6` (sidebar + main + activity)
- Member roster: Single column list with dividers

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Fixed at top, full-width with subtle bottom border
- Left: Logo + app name
- Center: Primary nav links (Dashboard, Courses, Settings)
- Right: User avatar + dropdown
- Height: `h-16`
- Structure: Horizontal flex with `justify-between`

**Breadcrumbs:**
- Below nav bar for context (Group → Event → Polls)
- `text-sm` with separator icons
- Clickable trail for navigation

### Cards & Containers

**Event Card:**
- Border with rounded corners (`rounded-lg border`)
- Padding: `p-6`
- Header: Event title + status badge (right-aligned)
- Body: Course name, date, capacity indicator
- Footer: Action buttons (View, Edit for owners)

**Course Card:**
- Compact design with `p-4`
- Title + city/region in header
- Tags as pill badges below
- Fee note and website link in footer
- Hover state: subtle border highlight

**Group Panel:**
- Larger card with `p-8`
- Header with group name + join code display
- Member count and event count indicators
- "New Event" CTA button prominently placed

### Tables

**Roster/Member Tables:**
- Full-width with alternating row backgrounds
- Header: `text-xs uppercase tracking-wide font-medium`
- Rows: `py-3 px-4` with clean borders
- Columns: Name, Email/Phone, Status, Actions
- Mobile: Stack into cards with labels

**Course Directory Table:**
- Filterable header with search input
- Columns: Name, Location, Tags, Actions
- Sortable headers (indicated by icons)
- Pagination at bottom

### Forms

**Event Creation Multi-Step:**
- Step indicator at top (1. Details → 2. Options → 3. Review)
- Clean form sections with clear labels above inputs
- Input styling: `border rounded-lg px-4 py-3` with focus ring
- Submit button: Large, full-width or right-aligned
- Helper text below fields in `text-sm`

**Poll Voting Interface:**
- Radio buttons for single-choice (course/date polls)
- Each option as clickable card with `border rounded-lg p-4`
- Live vote count shown after voting
- Submit button becomes prominent when selection made

**RSVP Controls:**
- Large status indicator (Joined, Waitlisted, Available)
- Single primary action button (Join/Claim/Withdraw)
- Capacity bar visualization showing filled slots
- Waitlist position clearly displayed if applicable

### Status & Feedback

**Status Badges:**
- Pill shape: `rounded-full px-3 py-1`
- State-specific treatments:
  - Draft: Neutral tone
  - Polling: Active/energetic feel
  - RSVP: Success indication
  - Finalized: Strong confirmation
  - Closed: Muted/complete

**Capacity Indicator:**
- Progress bar: `h-2 rounded-full overflow-hidden`
- Fill percentage based on joined/capacity
- Text below: "12 / 16 spots filled"

**Countdown Timer:**
- For poll deadlines and claim windows
- Large numeric display with units
- Updates in real-time
- Warning state when < 24 hours

### Pairing Management

**Drag-and-Drop Groups:**
- Pairing cards in grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`
- Each pairing: `border rounded-lg p-4`
- Header: Tee time input + group name
- Member slots: Draggable list items with handles
- Add/remove member buttons
- Reorder with up/down arrows (simpler than drag-drop)

**Tee Sheet Preview:**
- Table format with columns: Tee Time, Group, Players
- Print-optimized styling
- Export button (PDF/CSV) prominently placed

### Buttons & Actions

**Button Hierarchy:**
- Primary: Solid background, `px-6 py-3 rounded-lg font-medium`
- Secondary: Border style, `px-6 py-3 rounded-lg`
- Tertiary: Text-only with hover underline
- Icon buttons: `p-2 rounded-lg` for actions in tables

**CTA Buttons:**
- "Create Event", "Join Group": Large, prominent
- "Export Tee Sheet", "Import Courses": Secondary style
- Destructive actions (Delete, Withdraw): Distinct treatment

### Modals & Overlays

**Confirmation Dialogs:**
- Centered modal with backdrop blur
- Max-width: `max-w-md`
- Padding: `p-6`
- Title, description, action buttons (Cancel + Confirm)

**Import CSV Modal:**
- Larger modal (`max-w-2xl`)
- Dropzone for file upload
- Preview table of parsed data
- Validation errors shown inline

---

## Responsive Behavior

**Breakpoints:**
- Mobile: Base styles (< 768px)
- Tablet: `md:` (768px+)
- Desktop: `lg:` (1024px+)
- Wide: `xl:` (1280px+)

**Mobile Adaptations:**
- Navigation: Hamburger menu
- Tables: Transform to stacked cards
- Multi-column grids: Collapse to single column
- Reduced padding: `p-4` instead of `p-8`
- Bottom sheet modals instead of centered

---

## Images

**No Hero Section Required** - This is a utility dashboard application, not a marketing site.

**Use Images For:**
- Empty states: Illustration when no courses/events exist ("No events yet - create your first one!")
- User avatars: Initials in circles as fallback
- Group avatars: Optional group photo upload

**Image Specifications:**
- Avatar size: `w-10 h-10 rounded-full`
- Empty state illustrations: `max-w-xs mx-auto` centered in empty sections
- All images should have proper alt text for accessibility

---

## Special Interactions

**Minimal Animations:**
- Hover states: Subtle border highlight on cards
- Loading states: Simple spinner for async actions
- Success feedback: Checkmark icon fade-in after successful actions
- No decorative scroll animations

**Focus on:**
- Instant feedback for user actions
- Clear loading indicators during data fetches
- Toast notifications for background actions (poll closed, RSVP opened)

---

## Page-Specific Notes

**Dashboard:** 3-column layout on desktop (My Groups | Upcoming Events | Recent Activity), single column on mobile

**Course Directory:** Filters in sidebar on desktop, collapsible on mobile; main area is searchable table/grid

**Event Draft Page:** Wizard-style form with step progression, save draft capability

**Poll View:** Large voting interface with countdown timer, results revealed after voting

**Pairing Management:** Grid of pairing cards, reorganization controls, prominent export actions