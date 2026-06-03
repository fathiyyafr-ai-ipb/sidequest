# Product Requirement Document (PRD): SideQuest

SideQuest is a comprehensive, premium co-competition and partner-matchmaking platform designed specifically for university students and event organizers. It empowers students to discover prestigious academic/non-academic competitions, establish teams with complementary skill sets, and seamlessly collaborate through an AI-powered matchmaking algorithm and an interactive AI SideKick assistant.

---

## 0. Document Control

| Field | Value |
| :--- | :--- |
| **Document status** | Draft for review |
| **Version** | 2.0 |
| **Last updated** | 2026-06-03 |
| **Document owner** | Product Management |
| **Contributors** | Engineering, Design, Founding team |
| **Reviewers / approvers** | _TBD — assign before sign-off_ |
| **Source of truth** | This file is reverse-validated against the live codebase (`backend/`, `frontend/`). Where prose and code diverge, see §14 *Known Discrepancies*. |

**Change log**

| Version | Date | Author | Summary |
| :--- | :--- | :--- | :--- |
| 1.0 | (initial) | Founding team | Original feature/architecture spec (§1–§8). |
| 2.0 | 2026-06-03 | Product Management | Added Goals & Success Metrics (§9), reverse-engineered User Stories & Acceptance Criteria (§10), Non-Functional Requirements (§11), Assumptions/Dependencies/Constraints (§12), Risks (§13), Known Discrepancies & Open Questions (§14), Analytics plan (§15), Glossary (§16). |

> **Reading guide.** §1–§8 are the original feature and architecture specification and remain authoritative for *what the product does*. §9–§16 were added to bring the document to professional PRD completeness: *why we build it, how we measure success, what is explicitly out of scope, what could go wrong, and what is still undecided.*

---

## 1. Executive Summary & Vision

University students frequently struggle to find suitable partners for hackathons, business plan competitions, UI/UX design challenges, and scientific paper contests. Existing general-purpose messaging platforms (like WhatsApp, Discord, or Telegram) lack structured profiles, portfolio verification, and contextualized team recruitment. Conversely, competition organizers (EO) lack targeted channels to promote events and manage participant registers.

SideQuest solves this by offering a centralized premium hub where:
- **Landing Page**: A LinkedIn-inspired split hero layout with a high-fidelity collaboration illustration (`assets/hero.png`), dual CTAs ("Mulai sebagai Peserta 🚀", "Daftar sebagai Penyelenggara 💼"), value propositions, and live public competition statistics.
- **Competitions** are easily searchable and filtered by categories, scope, and fees, supporting both Individual (Perorangan) and Team (Tim) registration formats.
- **Matchmaking Engine (Fase 2)** acts as an intelligent AI-powered recommendation system, calculating compatibility scores (60% to 99%) based on a multi-dimensional matrix (Skill Gaps, Cross-functional Major Synergy, University alignment) and generating personalized conversational reasoning bubbles.
- **SideKick AI Assistant (Fase 3)**: A global, persistent floating chatbot (`⚡`) that dynamically queries the database for matching competitions, teammates, or FAQs, rendering them as interactive rich cards inside a slide-out drawer.
- **Staff Governance (Moderator & Superadmin)**: Dark-glassmorphic admin portals that enable user deactivation, competition scraping from social media, feature flag toggles, and master platform maintenance controls.

---

## 2. Target Audience & User Personas

| Persona | Role | Primary Goals | Key Pain Points |
| :--- | :--- | :--- | :--- |
| **The Project Initiator (Owner)** | Student with a concrete idea/team plan | Seeks to recruit specialists (e.g., a Developer looking for a UI/UX Designer or Business Presenter). | Difficulty filtering applicants by verified skills and managing incoming application statuses. |
| **The Solo Specialist (Soloist)** | Talented student seeking a team | Wants to be discovered by active teams or find compatible peers to form a new team. | Hard to find trustworthy teams that match their skill sets and target competitions. |
| **The Competition Organizer (Organizer)** | Academic committee, student association, or external institution | Aims to easily host and publish competition listings, manage participant registrations in a structured environment, and maximize outreach to talented students. | Dispersed registration data, difficulty verifying team rosters, and lack of specialized channels to promote events to targeted student niches. |
| **The Moderator & Superadmin (Staff)** | SideQuest Platform Operators | Maintain system security, toggle platform feature modules, scrape external contests, and manage maintenance modes. | Need precise control over user bans, feature availability, and fast content importing. |

---

## 3. Core Feature Specifications

### 3.1. Authentication & Security
- **Multi-Role Registration Toggle**: The signup screen features a tabbed selector:
  - **Peserta Lomba**: Standard student inputs (University select, Study Program, Semester).
  - **Penyelenggara Lomba (Event Organizer)**: Dynamic form swap that hides student inputs and requests *"Nama Instansi Penyelenggara"*, registering users with the `organizer` role and redirecting them immediately to the EO Dashboard.
- **Forgot Password Screen**: Database-backed recovery email checks. Validated emails receive a glassmorphic green success card simulating instruction delivery; invalid emails trigger a distinct red error alert.
- **JWT-Based Security**: All API controllers verify tokens, preventing unauthorized guest access and blocking deactivated accounts (`is_active = false`) with `403 Forbidden` responses.

### 3.2. Competition Directory & Detail
- **Central Directory**: Filterable by category, scope, fees, and sorted by nearest deadline.
- **Individual vs Team Formats**: Allows organizers to enforce strict **minimum** and **maximum** member limits per team.
- **Operational Hosting Options**:
  - **Hosted (Terpadu)**: Integration where registration forms are custom-built inside SideQuest, unlocking premium dashboard analytics, automated roster checks, and exclusive co-competition student matchmaking tools.
  - **Non-Hosted (Eksternal)**: Basic informational listing where the registration CTA redirects participants to external landing pages or forms (e.g., Google Forms).

### 3.3. AI Partner Matchmaking (Fase 2)
- **Multi-Dimensional AI Scoring Engine**: Compatibility score (60% to 99%) calculated based on:
  - **Base Score**: 50 points.
  - **Skill-Gap Filling (Max +20)**: Checks candidate skills that are missing in the current user's profile.
  - **Cross-Functional Synergy (Max +15)**: Groups majors into 5 domains (Tech, Design, Business, Science, Social). Synergy pairs (e.g., Tech + Design) get +15 points; same-domain matches get +5 points.
  - **Shared Category Interests (Max +8)**: Alignment in saved/registered competition tags.
  - **University Alignment (Max +5)**: Same university bonus.
- **AI Dynamic Reasoning Generator**: Produces a personalized `aiInsight` explanation detailing the exact synergy group, reasoning, and skill-gap filling list.
- **UI Capsule Highlight**: Displays a sparkling AI tag (`✨ Sinergi`), a prominent AI disclaimer badge (`⚡ Generated by SideQuest AI`), and specific skill chips berlabel *"Mengisi Celah"* on each matchmaking profile card.

### 3.4. Team Recruitment Hub
- **Team Creation**: Owners specify description, maximum members, contact links, target competition, and required skills tags.
- **Applicant Tracking System (ATS)**: Owners can review team applicants, view their full portfolios, and click "Setuju Bergabung" (Approve) or "Tolak" (Reject) in real-time.

### 3.5. Real-Time Premium Notification Engine
- **Dynamically Calculated Badges**: Sums unread notifications, pending connection requests, and team joins.
- **Actionable Dropdown Panels**: Toggling the notification bell opens a premium panel that aggregates requests, displaying a yellow **PENDING** label for unresponded requests.
- **Profile Modal Integrations**: Clicking on a notification instantly opens the corresponding applicant's profile modal with functional action buttons at the bottom. Once accepted or rejected, the notification immediately disappears from the panel, and the badge count decreases.

### 3.6. SideKick AI Assistant & Personal Agent (Fase 3)
- **Global Dynamic Injection**: Dynamic `import('./sidekick.js')` loads the chatbot globally inside `fillSidebarUser()` for logged-in participants, ensuring zero boilerplate HTML edits.
- **Stateless Keyword Intent Engine (Backend)**: Detects user intents naturally:
  - *Competitions*: Searches `competitions` and returns a list.
  - *Teammates*: Searches `users` joined with `skills` based on skills or university keywords.
  - *FAQ Guide*: Answers platform operational questions (Matchmaking, EO fees, Tim limits).
  - *Conversational Fallback*: Welcomes users and guides them on possible prompts.
- **Persistent Obrolan Drawer (Frontend)**: Obrolan drawer slides elegantly from the right. Conversation history is saved to `localStorage` (`sq_sidekick_chat_history`) to prevent chat loss when navigating between pages.
- **Interactive Rich Cards**: If SideKick returns structured objects, the chat bubble renders interactive mini-cards (Competition details link or Teammates "Hubungkan ✨" buttons that trigger connectivity directly from the chat window).

### 3.7. Platform Governance & Moderation (Moderator & Superadmin)
- **Roster Moderation**: Toggle sliders to immediately activate or suspend users, teams, or competitions.
- **AI Web Scraper Console**: Simulates scraping external Instagram/website URLs, displaying progress logs in a retro terminal, pre-filling drafts, and saving them to the database.
- **Superadmin Controls**: Toggle moderator staff active status, turn off modules platform-wide (competitions, teams, matchmaking), and activate a master **Maintenance Mode** (blocks regular users with an golden hourglass glassmorphic landing `maintenance.html`, while staff bypasses it).

### 3.8. Sponsorship & Targeted Advertising Module (Phase 4)
- **Sponsor Invitation Flow**: Staff (Moderators/Superadmins) can invite new brand sponsors directly from the admin console. Invited sponsor accounts are immediately verified and approved for instant logging access.
- **Sponsor Portal Console (`sponsor-dashboard.html`)**: Exclusive interactive dashboard designed with vibrant glassmorphic parameters to manage brand portfolios:
  - **Overview Performance metrics**: Tracks overall daily ad spend, total active impressions, clicks, and calculated click-through rate (CTR).
  - **Ad Creator Form & Cost Simulator**: Sponsors easily configure title, target URL, banner poster, target page keys (Dashboard, Competitions, Matchmaking, Teams), and calendar ranges. Ad campaign costs are calculated instantly.
  - **Historical Date-Effective Pricing**: Ad daily pricing configurations are logged historically in `sponsorship_pricing_rates`. The system dynamically selects active rates on the campaign start date (`effective_date <= start_date`) for price transparency.
  - **Moderator Auditing Logs**: Staff can adjust campaign costs manually with a mandatory reason input, leaving an unalterable trail log in `sponsorship_cost_logs` for transparency auditing.
- **E2E Widget Targeted Ad Banner (Student-Facing)**:
  - Dynamic glassmorphic targeted banners embedded across 4 primary student pages.
  - Toggles active campaigns randomly with automated impression counting and click monitoring.
  - Reverts gracefully to a promotional card for **"Sidekick AI Assistant"** if no active campaigns are found.

---

## 4. Feature Details, Site Map & Role Access Rights

To ensure clean system governance and reliable security, all functional modules are regulated under a structured navigation hierarchy (Site Map) and a strict Role-Based Access Control (RBAC) authorization matrix.

### 4.1. Platform Site Map

Below is the structured navigation flow representing both the public-facing pages and authenticated user dashboard areas:

- **Public Space (Unauthenticated)**
  - Landing Page (`index.html`) -> Value Proposition, Live Platform Stats, Latest 5 Competitions Preview (Read-Only)
  - About Us Page (`pages/about.html`) -> Developer Team Profile & Vision
  - FAQ Page (`pages/faq.html`) -> Interactive Accordions FAQ
  - Terms of Service (`pages/terms.html`) -> Standard Usage Agreement
  - Privacy Policy (`pages/privacy.html`) -> GDPR and Data Safety Standard
  - Login Page (`pages/login.html`) -> Account Authentication Gate
  - Registration Page (`pages/register.html`) -> Signup Gateway (Student Tab vs Organizer Tab)
  - Forgot Password Gateway (`pages/forgot-password.html`) -> Recovery Instructions Form
  - Onboarding Screen (`pages/onboarding.html`) -> Verification Status & Active Sandbox Logs
- **Student Dashboard Portal (`pages/dashboard.html` & sub-sections)**
  - Home Dashboard (`dashboard.html`) -> Personal Stats, Active Joined Teams, Matchmaking Previews
  - Competitions Directory (`direktori.html`) -> Searchable Contest Grid, Categories/Fees Filters
  - Competition Detail (`detail.html?id=...`) -> Full Contest Requirements, Group Size Limits, Roster Registration
  - Matchmaking Room (`matchmaking.html`) -> AI Complementary Scoring, AI Dynamic Reasoning Insight
  - Teammate Hunt (`cari-tim.html`) -> Open Vacancy ATS, Recruitment Form, Applicant Pipeline
  - My Profile (`profil.html` & `edit-profil.html`) -> Portfolio Fields, Verified Skill Chips, Achievements Log
- **Event Organizer (EO) Dashboard (`pages/organizer-dashboard.html` & sub-sections)**
  - EO Home (`organizer-dashboard.html`) -> Active Contest Submissions list, Registered Teams KPI
  - Post Competition (`posting-lomba.html`) -> Hosted/Non-Hosted Contest Publisher with member quota limits
- **Sponsor / Brand Partner Dashboard (`pages/sponsor-dashboard.html` & sub-menu)**
  - Sponsor Console (`sponsor-dashboard.html`) -> Management of Promotional Ad Banners, Bootcamp/Development Tool Vouchers, and Tournament Sponsorship Campaigns.
- **Staff Control Console (`pages/admin-dashboard.html`)**
  - Master KPI Overview -> Platform total users metrics, database statuses, system flag toggles, active Sponsor listings
  - Roster Moderator & Users -> Users lists with slider switch to instantly ban/restore student, organizer, or sponsor accounts
  - Retro Scraper Logs Console -> AI Web scraper simulator from instagram URLs
  - System Flags & Maintenance -> Master toggles for modules and maintenance bypass mode

### 4.2. Role Access Authorization Matrix (RBAC)

The stateless JWT security engine dictates feature levels based on the user's authenticated role structure:

| Functional Module | Guest / Anonymous | Student (Peserta) | Organizer (EO) | Brand Sponsor | Staff (Moderator/Super) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Browse Landing Page & FAQ** | **Read-Only** | **Full Access** | **Full Access** | **Full Access** | **Full Access** |
| **Browse Competition Directory**| **Read-Only** | **Full Access & Join** | **Read-Only** | **Read-Only** | **Manage & Moderate** |
| **Create & Edit Competitions**| No Access | No Access | **Full (Own Listing)** | No Access | **Full (Moderate All)** |
| **AI Partner Matchmaking** | No Access | **Full (Browse & Connect)**| No Access | No Access | No Access |
| **Create Team & Manage ATS** | No Access | **Full (Own Team)** | No Access | No Access | No Access |
| **Apply & Join Active Teams**| No Access | **Full** | No Access | No Access | No Access |
| **SideKick AI Assistant** | No Access | **Full** | No Access | No Access | No Access |
| **Edit Skills & Portfolio** | No Access | **Full** | No Access | No Access | No Access |
| **Review Competition Roster** | No Access | No Access | **Full (Own Event)** | No Access | No Access |
| **Manage Campaigns & Ads** | No Access | No Access | No Access | **Full (Own Listing)** | **Full (Moderate All)** |
| **Instagram AI Web Scraping**| No Access | No Access | No Access | No Access | **Full** |
| **Ban Account & Toggle Flags**| No Access | No Access | No Access | No Access | **Full** |
| **Toggle Staff/Moderator Ban**| No Access | No Access | No Access | No Access | **Superadmin Only** |

---

## 5. Technical Architecture & Database Schema

SideQuest is powered by a highly structured and optimized modern technology stack, seamlessly combining robust relational data management, dynamic modular frontend patterns, and deterministic AI scoring/NLP engines:

### 5.1. Core Tech Stack Detail
* **Backend Core**: Built on **Node.js** with the **Express.js** framework, serving a lightweight, high-performance RESTful API. It handles token verification, state transitions, dynamic notifications, and houses the AI personal agent endpoints.
* **Database Layer**: A relational **PostgreSQL** database managed using connection pooling (`pg` client). Relational design guarantees transactional consistency and high-speed multi-table joins (e.g., coupling students, skill sets, and matching vacancies).
* **Security & Auth**: Secured via stateless **JSON Web Tokens (JWT)**. Passwords are encrypted utilizing **Bcrypt** hashing. Middleware guards intercept every restricted endpoint, immediately blocking banned profiles (`is_active = false`) with `403 Forbidden` responses.
* **Frontend-Backend Communications**: Managed by a custom **ESM-based client API layer (`frontend/js/api.js`)**. It encapsulates all system endpoints (auth, competitions, teams, matchmaking, notifications, sidekick) into modular asynchronous methods. It integrates an automated `401 Unauthorized` interceptor that uses silent refresh tokens to re-authenticate users seamlessly.

### 5.2. Embedded AI Technologies & Engines
SideQuest features advanced, server-driven intelligence built directly into the platform without external heavy model dependencies:
* **Multi-Dimensional AI Scoring Engine**: A deterministic matchmaking algorithm designed to pair students with highly complementary co-competitors:
  - **Skill-Gap Analysis (+20 pts)**: Evaluates the initiator's desired/missing capabilities against the candidate's verified skills, highlighting exact matching chips labeled *"Mengisi Celah"*.
  - **Cross-Functional Domain Synergy (+15 pts)**: Automatically maps study programs into 5 distinct domains (Tech, Design, Business, Science, Social). It rewards cross-functional pairs (e.g., Developer + Designer) to foster holistic startup-like team formations.
  - **Interest Overlap (+8 pts) & Campus Bonus (+5 pts)**: Accounts for mutual saved contests and shared almamaters.
* **Dynamic AI Reasoning Generator**: Dynamically crafts personalized conversational insights (`aiInsight`) per candidate card, explaining exactly *why* this pairing is synergistic, which skill gaps are bridged, and how they should collaborate.
* **SideKick NLP Intent Engine**: A keyword-based natural language processing model hosted on `POST /api/sidekick/chat`. It interprets unstructured user queries (e.g., *"recommend react developers from IPB"*, *"find hackathons next month"*, or *"how does matchmaking work"*), parses targets, queries the PostgreSQL database via structured SQL searches, and compiles rich response payloads containing contextual text and interactive UI cards (Competition details or "Connect ✨" triggers).

```mermaid
erDiagram
    users ||--o{ team_members : joins
    users ||--o{ saved_competitions : bookmarks
    users ||--o{ competition_registrations : registers
    users ||--o{ user_skills : possesses
    users ||--o{ connections : sender_or_receiver
    users ||--o{ notifications : receives
    
    competitions ||--o{ saved_competitions : referenced_by
    competitions ||--o{ competition_registrations : referenced_by
    competitions ||--o{ teams : hosts
    
    categories ||--o{ competitions : classifies
    
    teams ||--o{ team_members : has
    teams ||--o{ notifications : triggers
    
    skills ||--o{ user_skills : classified_as
```

### 5.3. Entity Specifications (schema.sql & migrations)

```sql
-- User Account Info (includes is_active toggle flag)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  university VARCHAR(100),
  prodi VARCHAR(100),
  avatar_color VARCHAR(20),
  bio TEXT,
  role VARCHAR(20) DEFAULT 'peserta',
  experience JSONB,
  achievements JSONB,
  online BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

-- Bidirectional Connections
CREATE TABLE connections (
  id SERIAL PRIMARY KEY,
  sender_id INT REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sender_id, receiver_id)
);

-- Platform Configuration & Master settings
CREATE TABLE platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value VARCHAR(255) NOT NULL
);

-- Historical Ad Daily Pricing Rates
CREATE TABLE sponsorship_pricing_rates (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(50) NOT NULL, -- 'dashboard', 'competitions', 'matchmaking', 'teams'
  price_per_day DECIMAL(12, 2) NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sponsor Partnership Ad Campaigns
CREATE TABLE sponsorships (
  id SERIAL PRIMARY KEY,
  sponsor_id INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  target_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  pages VARCHAR(50)[] NOT NULL, -- Array target page keys
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moderator Cost Adjustment Audit Logs
CREATE TABLE sponsorship_cost_logs (
  id SERIAL PRIMARY KEY,
  sponsorship_id INT REFERENCES sponsorships(id) ON DELETE CASCADE,
  modified_by INT REFERENCES users(id) ON DELETE CASCADE,
  old_cost DECIMAL(12, 2) NOT NULL,
  new_cost DECIMAL(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. System Interaction Flows

Below is the interaction sequence showing how a connection request is initiated, processed, and accepted dynamically from the notification panel.

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice (Sender)
    actor Bob as Bob (Receiver)
    participant API as Backend API Server
    participant DB as PostgreSQL Database

    Alice->>API: POST /api/matchmaking/connect (Bob's ID)
    API->>DB: Check existing connections
    alt No relation exists
        API->>DB: INSERT INTO connections (status = 'pending')
        API->>DB: INSERT INTO notifications (Bob's ID, title='Permintaan Koneksi Baru', applicant_id = Alice's ID)
        API-->>Alice: 200 OK (Request Sent)
    else Bob already sent connection request to Alice
        API->>DB: UPDATE connections SET status = 'accepted'
        API->>DB: INSERT INTO notifications (Alice's ID, title='Koneksi Diterima')
        API-->>Alice: 200 OK (Connected Automatically)
    end

    Note over Bob: Bob logs in and opens dashboard
    Bob->>API: GET /api/notifications/unread-count
    API-->>Bob: Unread Count = 1 (Renders active orange badge)
    
    Bob->>Bob: Toggles notification panel
    Bob->>API: GET /api/notifications
    API-->>Bob: Returns notifications (includes Alice's request as PENDING)
    
    Bob->>Bob: Clicks the notification card
    Bob->>API: GET /api/users/Alice_ID
    API-->>Bob: Returns Alice's profile (connectionStatus = 'received', connectionId = X)
    Note over Bob: Profile modal opens with prominent "Terima Koneksi" and "Tolak Koneksi" buttons
    
    Bob->>API: PATCH /api/connections/X (status = 'accepted')
    API->>DB: UPDATE connections SET status = 'accepted'
    API-->>Bob: 200 OK
    
    Bob->>Bob: Modal automatically closes, notification disappears from panel, and badge count decreases
```

---

## 7. Business Development & Monetization

To ensure financial sustainability, long-term ecosystem vitality, and solid platform valuation, SideQuest incorporates a metrics-driven system performance framework and outlines monetization features ready to activate upon hitting specific growth targets.

### 7.1. GWA System Performance Monitoring (Growth, Watch & Aware)

SideQuest utilizes the GWA (*Growth, Watch, and Aware*) metrics hierarchy to evaluate the real-time health of the co-competition platform:

1. **Growth Metrics**: Primary indicators of platform expansion, adoption speed, and match-seeking activities.
   - **Monthly Active Users (MAU) & Daily Active Users (DAU)**: Unique active participant students and verified organizers on the platform.
   - **Team Formation Success Rate**: Total percentage of created student groups that successfully complete their rosters and register for contests.
   - **Total Active Competition Listings**: The cumulative number of active academic/non-academic competitions hosted by verified organizers.
   - **User Lifetime Value (Retention)**: The rate at which students return to seek new teams or competitions after completing a tournament cycle.

2. **Watch Metrics**: Quality and features performance indicators to be audited constantly to maintain user retention.
   - **Average Matchmaking Proximity Score**: Ensures the deterministic AI matchmaking engine serves high-value complementary suggestions (avoiding scores dropping under 60%).
   - **ATS Recruitment Conversion Rate**: The ratio of approved team members relative to the total applications received by team owners.
   - **SideKick AI Conversational Load**: Total query volume and parsing accuracy of the SideKick assistant in delivering contextual *Rich Cards*.
   - **Account Disabling Rate (Moderation Metrics)**: The volume of user/team bans (`is_active = false`) logged to audit community safety.

3. **Aware Metrics**: Baseline operational and hardware statuses to preemptively identify system bottlenecking.
   - **API Response Latency**: Server speed in rendering pages, scoring compatibility, and processing NLP sidekick payloads.
   - **PostgreSQL Pool & CPU Utilization**: Relational database connection pool load under intense multi-table joins.
   - **Email Verification Speed**: Average onboarding turnaround time from initial registration to email token verification completion.

### 7.2. Model Fitur Berbayar & Monetisasi (Monetization Gates)

SideQuest is architected with premium monetization modules designed to be automatically unlocked when platform growth hits a predefined threshold (e.g., **10,000 MAU** and **100+ verified active Event Organizers**):

* **Premium Team Spotlight (Recruitment Boost)**: Team initiators can purchase a micro-transaction boost to pin their team recruitment cards at the top of the "Cari Tim" feed. Pinned posts feature a premium golden-glowing border and badge for accelerated applicant discovery.
* **Premium Event Organizer Analytics Console**: Competition organizers pay a recurring subscription to unlock advanced dashboard panels, offering detailed demographics on registrants, university representation, skill-gap analysis, and talent scores.
* **SideKick AI Copilot Plus**: A premium tier for student participants that grants access to advanced AI copilot capabilities, including automatic PDF CV parsing, automated motivation letter generation tailored to selected competitions, and mock AI interview simulations.
* **Verified Talent Badge**: A micro-fee verification service where students submit past competition certificates for manual auditing by the SideQuest team, displaying a verified blue badge on their matchmaking and profile cards.
* **Targeted Brands Sponsorship (Program Kemitraan Sponsor)**: Activates a dedicated user role `sponsor` for third-party partners (such as developer tools vendors, cloud computing providers, skill-bootcamp coordinators, etc.) to advertise or form targeted partnerships directly:
  - *Sponsor Promotional Ad Banners*: Render promotional banners for relevant bootcamp or training programs inside competition feeds.
  - *Giveaways & Discount Campaigns*: Issue cloud credits, software licenses, or tool discounts directly to active student teams to aid their hackathon or case challenge development.
  - *Competition Co-Sponsorship*: Partner with Event Organizers to fund contests, embedding the sponsor's branding seamlessly inside target listing details.

---

## 8. Product Roadmap & Backlog

### Phase 1: Authentication & Public Onboarding (Completed)
- **LinkedIn-Style Landing Page**: Built split grid layout with CTA redirection.
- **Dynamic Registration & Recovery**: Form role tab switchers and database-backed Forgot Password screens.
- **Developer Profiles & FAQs**: Grid About page and transition FAQ accordions.

### Phase 2: AI Matchmaking & Skill-Gap Recommendation (Completed)
- **Multi-Dimensional AI Scoring**: Core logic weighting skills, major compatibility, university proximity, and categories.
- **AI Highlight Card**: Glassmorphic UI container with SideQuest AI tag, disclaimer, and skill chips.
- **E2E Validation Tests**: Successful `run_matchmaking_ai_test.js` verification.

### Phase 3: SideKick AI Assistant & Personal Agent (Completed)
- **Chat Drawer**: Sliding persistent chat Drawer with dynamic injection.
- **NLP Intent Engine**: Chat messages processed to query database for users, competitions, and FAQ.
- **Interactive Chat Cards**: Direct matchmaking connections and details link rendered from within conversation bubbles.

### Phase 4: Business Development & Monetization (Completed)
- **GWA Dashboard Integration**: Built analytics modules to visualize Growth, Watch, and Aware indicators in the superadmin deck.
- **Sponsorship & Ad Campaigns**: Full integration of premium sponsor dashboards (`sponsor-dashboard.html`), ad creation forms, dynamic cost simulators with date-effective pricing structures, cost adjustments logs, and admin moderating panels.
- **E2E Widget Targeted Ad Banner**: Added targeted glassmorphic ad banners across 4 student pages with impressions & click tracking and elegant fallback to the Sidekick AI chatbot.
- **E2E Integration Tests**: Completed E2E test validation script `run_sponsor_test.js` with 100% success rate.

### Phase 5: Instant Messaging & WebSockets (Future Backlog)
- **Real-Time Messaging Widget**: Chat rooms and messages tables in DB. Replace the placeholder toast `"💬 Fitur pesan masuk segera hadir!"` with a functional socket-backed sidebar.
- **WebSocket Integration**: Establish a socket connection for real-time chat delivery and instant head-up desktop notifications.

---

## 9. Goals, Non-Goals & Success Metrics

### 9.1. Business Objectives

SideQuest exists to become the default infrastructure layer for student competition team formation in Indonesia. The product objectives, in priority order:

1. **Liquidity** — Build a two-sided marketplace dense enough that any student seeking a teammate finds a relevant, responsive match. This is the existential goal; everything else is secondary.
2. **Trust** — Make skill, portfolio, and identity signals reliable enough that students confidently team with strangers.
3. **Organizer adoption** — Become the channel where Event Organizers prefer to publish and manage competitions, creating the demand-side gravity that pulls students in.
4. **Monetization readiness** — Stand up the premium, sponsorship, and analytics rails *before* they are needed, so revenue can be switched on the moment growth thresholds are met (see §7.2), not built reactively.

### 9.2. Goals (in scope for the current product)

- A working, end-to-end loop: **discover competition → find/form team → connect → register**.
- Deterministic, explainable AI matchmaking (no external LLM dependency, no per-call cost).
- Full role-based platform for five roles: Student, Organizer, Sponsor, Moderator, Superadmin.
- Operational governance tooling (bans, feature flags, maintenance mode) so the platform can be run safely by a small team.
- Premium/sponsorship modules built and dormant, gated behind growth thresholds.

### 9.3. Non-Goals (explicitly out of scope — and why)

Stating these prevents scope creep and sets reviewer expectations.

| Non-Goal | Rationale |
| :--- | :--- |
| **Real-time chat / messaging** | Deferred to Phase 5. Today, connections hand off to external contact links. Building reliable WebSocket chat is a project in itself and is not required to validate the core matchmaking loop. |
| **Native mobile apps (iOS/Android)** | The product is a responsive web app. Native is unjustified until web product-market fit is proven. |
| **Real payment processing** | Monetization modules (§7.2) simulate cost calculation; no payment gateway is integrated. Charging is a post-threshold concern. |
| **Real email/SMS delivery** | Email verification is *simulated* (token logged to server console). Real transactional email is a fast-follow, not a core-loop blocker. |
| **Generative-LLM matchmaking or chat** | The matchmaking and SideKick engines are deterministic/keyword-based by deliberate design — predictable, free to run, and debuggable. Swapping in an LLM is a future option, not a requirement. |
| **Automated, real social-media scraping** | The "AI Web Scraper" is an organizer-productivity *simulation* that pre-fills competition drafts; it does not actually crawl Instagram. |
| **Multi-country / multi-language beyond ID + EN** | The product is built for Indonesian universities first. |

### 9.4. Success Metrics & Targets

The original GWA framework (§7.1) names the right metrics but sets no targets. The table below proposes **launch-phase targets** to make the framework actionable. These are PM recommendations for the first two quarters post-launch and should be ratified with the founding team.

| Tier | Metric | Definition | Proposed target (first 2 quarters) | Instrumented today? |
| :--- | :--- | :--- | :--- | :---: |
| **North Star** | **Successful Team Formations** | Distinct teams that reach `min_members` and register for a competition | 250 in first 2 quarters | ⚠️ Derivable from `team_members` + `competition_registrations`; not surfaced |
| Growth | MAU / DAU | Unique active users in 30/1-day windows | 2,000 MAU / DAU-MAU ratio ≥ 20% | ❌ No event tracking yet |
| Growth | Team Formation Success Rate | % of created teams that fill roster & register | ≥ 35% | ⚠️ Derivable, not surfaced |
| Growth | Active Competition Listings | Competitions with `is_active=true` and future deadline | ≥ 60 live at any time | ✅ Queryable (admin stats) |
| Growth | Organizer activation | Organizers who publish ≥ 1 competition / total approved | ≥ 50% | ⚠️ Derivable |
| Watch | Avg. Matchmaking Score served | Mean compatibility of surfaced cards | ≥ 75% (floor 60%) | ⚠️ Computed per request, not logged |
| Watch | Connection acceptance rate | accepted / (accepted+rejected+pending) on `connections` | ≥ 40% | ⚠️ Derivable from `connections.status` |
| Watch | ATS approval rate | approved applicants / total team applications | ≥ 30% | ⚠️ Derivable from `team_members` |
| Watch | SideKick query volume & resolution | Queries/day and % returning a rich card vs. fallback | Track from day 1 | ❌ Not logged |
| Aware | API p95 latency | 95th-percentile response time | < 500 ms (non-AI), < 1 s (matchmaking) | ❌ Not measured |
| Aware | Uptime | Backend availability | ≥ 99.5% | ❌ No monitoring |
| Aware | Email verification completion | % of registrants who verify | ≥ 70% | ⚠️ `is_verified` derivable |

> **PM note.** The recurring "⚠️ derivable, not surfaced" pattern is the single biggest analytics gap: the data exists in PostgreSQL but nothing aggregates or visualizes it over time. See §15 for the instrumentation plan. Until that lands, every target above is unverifiable in production.

---

## 10. User Stories & Acceptance Criteria

> These stories are **reverse-engineered from the implemented endpoints and controllers** (`backend/routes/*`, `backend/controllers/*`) and the frontend pages (`frontend/pages/*`), so they describe behavior the system *actually exhibits today*, not aspiration. Format: `As a [role], I want [capability], so that [outcome]`, followed by Given/When/Then acceptance criteria. Priorities: **P0** = core loop, **P1** = important, **P2** = supporting.

### Epic A — Authentication & Onboarding

**A1 (P0) — Register as a student or organizer.**
*As a prospective user, I want to sign up under the correct role, so that I land in the right experience.*
- **Given** I am on `register.html` and select the Student tab, **when** I submit name, email, password, university, and study program, **then** a `peserta` user is created (`POST /api/auth/register`) and I am told to complete verification.
- **Given** I select the Organizer tab, **when** I submit institution details, **then** an `organizer` user is created with `is_approved=false` (pending staff review) in production.
- **Given** I register from `localhost`, **then** `is_verified` and `is_approved` are auto-set `true` (development convenience).
- **Given** I register in production, **then** a `verification_token` is generated and the verification link is emitted (currently to the server console as a simulated email).
- **Edge:** duplicate email → registration rejected; password is stored only as a bcrypt hash, never plaintext.

**A2 (P0) — Verify email before first login.**
*As a registered user, I want to verify my email, so that I can access the platform.*
- **Given** an unverified account, **when** I attempt login, **then** I receive `403` with *"Silakan verifikasi email Anda terlebih dahulu."*
- **Given** I open `GET /api/auth/verify?token=…` with a valid token, **then** `is_verified` is set `true`, the token is cleared, and I may log in.

**A3 (P0) — Log in and be gated correctly.**
*As a user, I want secure login, so that only authorized, active, verified accounts get in.*
- Login (`POST /api/auth/login`) returns a JWT (`expiresIn: 1d`) **only** when the account passes, in order: `is_active=true`, `is_approved=true`, `is_verified=true`, and bcrypt password match.
- Each failed gate returns a distinct, role-appropriate message (deactivated / under review / verify email / wrong credentials).

**A4 (P1) — Recover a forgotten password.**
*As a user who forgot my password, I want a recovery path, so that I can regain access.*
- **Given** a known email on `forgot-password.html`, **when** I submit, **then** I see a success confirmation; an unknown email shows a distinct error. (`POST /api/auth/forgot-password`)

**A5 (P1) — Approve pending organizers (staff).**
*As a Moderator/Superadmin, I want to approve organizer accounts, so that only legitimate hosts can publish.*
- **Given** an organizer with `is_approved=false`, **when** I approve via `PATCH /api/admin/approve-organizer/:id`, **then** the organizer can log in and reach the EO dashboard.

### Epic B — Competition Discovery & Registration

**B1 (P0) — Browse and filter competitions.** *As anyone (guest included), I want to browse competitions filtered by category/scope/fee and sorted by nearest deadline, so that I find relevant contests fast.* (`GET /api/competitions`, public)
- Results expose `daysLeft` and a humanized deadline; expired/inactive listings are excluded from the default view.

**B2 (P0) — View competition detail.** *As a student, I want full requirements and team-size limits, so that I can decide to register.* (`GET /api/competitions/:id`)
- Detail shows `min_members`/`max_members`, hosted vs. external model; an external listing's CTA redirects out, a hosted one registers in-platform.

**B3 (P1) — Save/bookmark competitions.** *As a student, I want to save competitions, so that I can revisit them.* (`POST`/`DELETE /api/competitions/:id/save`, `GET /api/competitions/saved`) — requires auth.

**B4 (P0) — Register for a competition.** *As a student, I want to register (solo or as a team), so that I'm entered.* (`POST /api/competitions/:id/register`)
- Registration status is queryable (`GET /:id/registration-status`); a user cannot double-register.

**B5 (P1) — Publish & manage competitions (organizer).** *As an organizer, I want to create, edit, publish, and announce results, so that I run my event end-to-end.* (`POST /organizer/create`, `PUT /organizer/:id`, `PATCH /organizer/:id/publish`, `PATCH /organizer/:id/announce`, `GET /organizer/mine`)
- Only the owning organizer (or staff) may mutate a listing; member quotas are enforced at registration.

**B6 (P1) — Review competition roster (organizer).** *As an organizer, I want to see and respond to registrants/applicants, so that I manage participation.* (`GET /organizer/:id/applicants`, `PATCH /organizer/:id/applicants/:userId`)

### Epic C — AI Matchmaking & Connections

**C1 (P0) — Get ranked, explained teammate suggestions.** *As a student, I want compatibility-scored candidates with reasons, so that I pick complementary teammates.* (`GET /api/matchmaking`)
- **Acceptance (validated against `matchmakingController.js`):** score starts at **50**; **+20** when the candidate fills a skill gap (or +10 partial); **+15** cross-functional domain synergy (or +5 same-domain); **+8** shared category interest; **+5** same university; final score **clamped to 60–99**.
- Each card returns an `aiInsight` string naming the synergy group and the bridged skill gaps, plus an `⚡ Generated by SideQuest AI` disclaimer and *"Mengisi Celah"* chips.
- The current user's existing connection status to each candidate is reflected on the card.

**C2 (P0) — Send and auto-reciprocate connection requests.** *As a student, I want to connect with a candidate, so that we can collaborate.* (`POST /api/matchmaking/connect`)
- **Given** no prior relation, a `pending` connection + a notification to the receiver are created.
- **Given** the receiver had already sent *me* a request, the system **auto-accepts** (status → `accepted`) and notifies both — no double-handshake needed.
- A `UNIQUE(sender_id, receiver_id)` constraint prevents duplicate requests.

**C3 (P0) — Respond to a connection from notifications.** *As a student, I want to accept/reject a request from the notification panel, so that I manage my network inline.* (`PATCH /api/connections/:id`)
- On response, the connection status updates, the notification disappears, and the unread badge decrements (per the §6 sequence flow).

### Epic D — Team Recruitment (ATS)

**D1 (P0) — Create a recruiting team.** *As an owner, I want to post a team with description, max members, target competition, contact link, and required skills, so that specialists can find me.* (`POST /api/teams`)

**D2 (P0) — Apply to a team.** *As a soloist, I want to apply to an open team, so that I can join.* (`POST /api/teams/:id/apply`)

**D3 (P0) — Approve/reject applicants (ATS).** *As an owner, I want to review portfolios and approve/reject applicants in real time, so that I build the right roster.* (`POST /api/teams/:id/respond`)
- Approving adds the user to `team_members` (role `member`) and notifies them; rejecting closes the application.

**D4 (P1) — Invite a candidate directly.** *As an owner, I want to invite a specific candidate, so that I can proactively recruit.* (`POST /api/teams/:id/invite`, response via `POST /:id/respond-invite`)

**D5 (P1) — Browse teammate candidates & my teams.** (`GET /api/teams/candidates`, `GET /api/teams/me`, `GET /api/teams/:id`, `PUT /api/teams/:id`)
- The public team list (`GET /api/teams`) uses **optional auth** so logged-in users get connection-priority sorting.

### Epic E — Notifications

**E1 (P0) — See an accurate unread badge.** *As a user, I want a live unread count, so that I know when something needs me.* (`GET /api/notifications/unread-count`) — sums unread notifications, pending connections, and team joins.

**E2 (P0) — Act on notifications.** *As a user, I want an actionable dropdown showing PENDING items that open the relevant profile/modal, so that I respond without leaving the page.* (`GET /api/notifications`, `PATCH /api/notifications/read-all`)

### Epic F — SideKick AI Assistant

**F1 (P1) — Ask SideKick in natural language.** *As a logged-in student, I want a chat assistant that finds competitions/teammates/answers FAQs, so that I get help without navigating menus.* (`POST /api/sidekick/chat`)
- Intent is keyword-detected: competition search, teammate search (users ⨝ skills by skill/university), FAQ, or conversational fallback.
- Structured results render as interactive rich cards (competition link, or teammate *"Hubungkan ✨"* that triggers a connection from chat).
- Chat history persists in `localStorage` (`sq_sidekick_chat_history`) across page navigation.

### Epic G — Profile & Portfolio

**G1 (P1) — View and edit my profile.** *As a student, I want to maintain my portfolio, skills, achievements, and experience, so that I'm discoverable and credible.* (`GET /api/users/me`, `PUT /api/users/me`, also mounted at `/api/profile`)

### Epic H — Premium Hosted-Event Suite (Organizer)

> **Reverse-engineered from `premiumRoutes.js` / `premiumController.js` — substantially richer than §3 documents. This suite includes a full judging workflow not described elsewhere in this PRD.**

**H1 (P1) — Configure a hosted event.** *As a premium organizer, I want event settings and custom registration fields, so that I tailor intake.* (`GET/POST /premium/organizer/settings/:compId`, `GET/POST /premium/organizer/fields/:compId`)

**H2 (P1) — Collect & review submissions.** (`GET /premium/organizer/submissions/:compId`; participant side: `GET /premium/participant/fields/:compId`, `POST /premium/participant/submit/:compId`)

**H3 (P1) — Manage judges and judging.** *As an organizer, I want to add judges who score submissions, so that I run fair evaluation.* (`GET/POST /premium/organizer/judges/:compId`)

**H4 (P1) — Judge portal.** *As a judge, I want to log in, see assigned submissions, and grade them, so that I evaluate entries.* (`GET /premium/judge/auth`, `GET /premium/judge/submissions`, `POST /premium/judge/grade`; UI: `judge-portal.html`)
- ⚠️ **Security note:** judge endpoints are **not** behind `authMiddleware` (token passed as a query param). See §13/§14.

**H5 (P1) — View event analytics.** (`GET /premium/organizer/analytics/:compId`) — demographics, university representation, skill-gap and talent insights for registrants.

### Epic I — Sponsorship & Targeted Ads

**I1 (P1) — Create and manage ad campaigns (sponsor).** (`POST /api/sponsor/ads`, `GET /api/sponsor/ads`) — title, target URL, banner, target page keys, date range; cost computed from date-effective pricing.

**I2 (P1) — Serve and measure targeted banners (student-facing).** (`GET /api/sponsor/active-ads`, `POST /api/sponsor/ads/impression`, `POST /api/sponsor/ads/:id/click`)
- Active campaigns rotate across 4 student pages with impression/click tracking; **falls back to a SideKick promo card** when no campaign is active.

**I3 (P1) — Invite sponsors & audit costs (staff).** (`POST /api/admin/invite-sponsor`, `GET /api/admin/sponsorships`, `PATCH /sponsorships/:id/toggle`, `PATCH /sponsorships/:id/cost`, `POST /api/admin/sponsorship-pricing`, `GET /sponsorships/:id/logs`)
- A cost adjustment requires a mandatory reason and writes an immutable row to `sponsorship_cost_logs`.

### Epic J — Platform Governance (Staff)

**J1 (P0) — Ban/restore any account, team, or competition.** (`PATCH /api/admin/toggle/:type/:id`) — flips `is_active`; banned users get `403` at login and on every guarded endpoint.

**J2 (P1) — Simulated competition scraping.** (`POST /api/admin/scrape`) — pre-fills a competition draft from a URL via a retro terminal log; saves to DB. (Simulation, not a real crawler.)

**J3 (P1) — View platform KPIs.** (`GET /api/admin/stats`, `GET /api/admin/data`) — user/competition/team counts and active sponsor listings.

**J4 (P1) — Superadmin: toggle staff, feature flags, maintenance.** (`PATCH /api/admin/super/moderator/:id/toggle`, `PATCH /super/features`, `PATCH /super/maintenance`)
- Feature flags in `platform_settings`: `feature_competitions`, `feature_teams`, `feature_matchmaking`, `feature_connections`, `feature_premium_organizer`, plus `maintenance_mode`.
- **Given** `maintenance_mode='true'`, regular users are routed to `maintenance.html`; staff bypass it (enforced by `checkPlatformStatus` middleware).

---

## 11. Non-Functional Requirements (NFRs)

> The original PRD specifies functional behavior thoroughly but no quality attributes. These NFRs are **PM/architect recommendations**; items marked *aspirational* are not yet implemented and are flagged so reviewers don't assume coverage.

### 11.1. Performance & Scalability
- **API latency:** p95 < 500 ms for CRUD/list endpoints; < 1 s for `GET /api/matchmaking` (multi-table join + scoring). *Aspirational — not currently measured.*
- **Concurrency:** PostgreSQL access is pooled (`pg.Pool`). Pool sizing and connection limits must be tuned to the Supabase plan; the app connects via the Supabase **pooler** (port 6543) in production.
- **Payload discipline:** list endpoints should paginate before catalogs exceed ~1k rows (currently unpaginated — acceptable at seed scale, a known scaling cliff).

### 11.2. Availability & Reliability
- **Uptime target:** ≥ 99.5% for the backend (Render) and DB (Supabase). *No uptime monitoring/alerting configured yet — recommended.*
- **Graceful degradation:** the ad widget already degrades to a promo card on no-campaign/error; the same defensive default should apply anywhere external data may be empty.

### 11.3. Security & Privacy
- **AuthN:** stateless JWT (HS256), 1-day expiry; passwords hashed with bcrypt (cost 10).
- **AuthZ:** `authMiddleware` guards protected routes; `adminMiddleware` enforces `isModeratorOrAdmin` / `isSuperadmin`; banned accounts (`is_active=false`) are rejected.
- **Known gaps (must-fix before scale):**
  - **No token refresh endpoint** exists, yet the frontend calls `/api/auth/refresh` (§14). Sessions hard-expire at 24h.
  - **Judge endpoints bypass `authMiddleware`** and accept a token via query string (§10 H4) — a privilege/exposure risk.
  - `JWT_SECRET` falls back to a hardcoded default string when unset — production must set a strong secret.
  - **No rate limiting** on auth or write endpoints (brute-force / abuse exposure).
  - **No CSRF/origin restriction**; CORS is wide-open (`app.use(cors())`).
- **Compliance:** the product serves Indonesian students; the governing regime is **UU PDP (UU No. 27/2022, Pelindungan Data Pribadi)**, *not* GDPR as §4.1 currently implies. Privacy Policy and data-retention/erasure handling should be written to UU PDP.

### 11.4. Accessibility & UX Quality
- Target **WCAG 2.1 AA** for the student-facing flows (color contrast on the glassmorphic UI is a known risk area). *Aspirational — not audited.*
- **Responsive web** is the only supported surface; define a browser support matrix (recommend: latest 2 versions of Chrome, Safari, Edge, Firefox; iOS/Android mobile web).

### 11.5. Internationalization
- The product is **bilingual (Bahasa Indonesia primary, English secondary)** — this PRD itself ships in both (`prd_sidequest.md`, `prd_sidequest_id.md`). UI copy is currently ID-first; treat ID as the source language.

### 11.6. Maintainability & Operability
- **Config:** all secrets via environment (`DATABASE_URL`, `JWT_SECRET`, `PORT`); `.env` is gitignored.
- **Observability:** structured logging and error tracking are *not* yet in place — recommended before public launch.
- **Migrations:** schema changes are applied via standalone `run_*_migrations.js` scripts. These do **not** run automatically on deploy and must be executed manually against production (operational footgun — see §13).

---

## 12. Assumptions, Dependencies & Constraints

### 12.1. Assumptions
- Students predominantly register with valid (ideally `.ac.id`) university emails; identity trust leans on this.
- Organizers are willing to migrate listing + roster management into SideQuest rather than spreadsheets/Google Forms.
- Deterministic scoring is "good enough" matchmaking quality to drive connections at launch scale.
- Demand is concentrated in Indonesian university competition cycles (seasonal peaks around major competitions).

### 12.2. External Dependencies
| Dependency | Role | Risk if it fails |
| :--- | :--- | :--- |
| **Supabase** (PostgreSQL 17) | Production database (pooler:6543) | Total outage — no read/write |
| **Render** | Backend API host (`sidequest-backend-3930.onrender.com`) | API down; free-tier cold starts add latency |
| **Vercel** | Frontend hosting (auto-deploy on push) | Static site unavailable |
| **npm packages** | `express, pg, jsonwebtoken, bcryptjs, cors, dotenv` (lean, low supply-chain surface) | Standard dependency risk |

### 12.3. Constraints
- **No external AI/LLM spend** — intelligence must remain deterministic/in-house (cost & predictability constraint, by design).
- **Small operating team** — governance tooling must let a handful of staff run the platform.
- **Email/payments simulated** — real delivery/charging are out of scope until thresholds (§9.3).
- **Frontend is framework-less** ES-module vanilla JS — favors zero build step and portability over rich component ergonomics.

---

## 13. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
| :-- | :--- | :--- | :--- | :--- |
| R1 | **Cold-start / liquidity** — a two-sided market is useless until both sides are dense. Empty matchmaking kills retention. | High | Critical | Seed supply (organizers + listings) first; concentrate launch on 1–2 campuses to reach local density; rich seed data already exists for demos. |
| R2 | **Trust failure** — unverified skills let bad actors misrepresent themselves. | Med | High | Verified Talent Badge (§7.2); portfolio review; report/ban tooling (already built). |
| R3 | **Security gaps** — no rate limiting, open CORS, judge auth bypass, default JWT secret, missing refresh endpoint. | Med | High | Treat §11.3 "known gaps" as a pre-launch hardening checklist; add rate limiting and lock CORS to known origins. |
| R4 | **Manual migration footgun** — `run_*_migrations.js` run by hand against prod; easy to forget or misapply. | Med | High | Adopt a migration runner / checklist; gate deploys on migration status; never edit prod schema ad hoc. |
| R5 | **Render free-tier cold starts** degrade first-request latency and demo credibility. | High | Med | Upgrade to a warm instance before launch/investor demos; add a keep-alive ping. |
| R6 | **Matchmaking quality ceiling** — deterministic scoring may plateau in relevance as the pool grows. | Med | Med | Monitor avg. score served & acceptance rate (§9.4); keep the LLM swap as a documented future option. |
| R7 | **Single shared GitHub token & exposed DB credentials** in tooling/remote URLs. | Med | High | Rotate the embedded GitHub PAT and Supabase password; move to per-developer credentials and secret management. |
| R8 | **No analytics** — targets in §9.4 are unverifiable, so the team flies blind on product decisions. | High | Med | Ship the §15 instrumentation plan before declaring launch. |

---

## 14. Known Discrepancies & Open Questions

### 14.1. Doc ↔ Code Discrepancies (found during reverse-engineering)
1. **§5.3 schema is outdated.** The live `users` table has many more columns than shown (`is_verified, is_approved, verification_token, university_city, university_province, office_address, phone_number`, etc.). The PRD's SQL is illustrative, not current.
2. **Premium suite is under-documented.** §3 mentions premium analytics in passing, but the code implements a full **hosted-event + custom-fields + submissions + judges + grading** workflow (Epic H). This PRD now documents it; the original §3 should eventually absorb it.
3. **Refresh token is half-built.** Frontend (`api.js`) implements a 401→`/api/auth/refresh` retry flow, but **no `/auth/refresh` route exists** in the backend. Either build the endpoint or remove the client logic.
4. **Compliance regime mismatch.** §4.1 cites "GDPR"; the correct regime for Indonesian users is **UU PDP**.
5. **Feature-flag count.** §3.7 implies 3 module toggles; there are **6** keys in `platform_settings` (incl. `feature_connections`, `feature_premium_organizer`).

### 14.2. Open Questions (need a decision owner)
- **OQ1:** What is the real launch growth threshold for flipping on monetization — is §7.2's "10k MAU / 100 EO" firm, or a placeholder?
- **OQ2:** Will email verification ship as *real* transactional email before public launch, or stay simulated for the first cohort?
- **OQ3:** What are concrete prices/tiers for the four premium modules (§7.2 names them but sets no numbers)?
- **OQ4:** Single-campus beachhead vs. national launch — which de-risks the cold-start problem (R1) best for our team size?
- **OQ5:** Who owns the §11.3 security hardening, and is it a hard launch gate?

---

## 15. Analytics & Instrumentation Plan

The GWA metrics (§7.1, §9.4) are only as real as the data pipeline behind them. Today, **no event tracking exists**; metrics are at best derivable by ad-hoc SQL. Recommended plan:

1. **Event taxonomy** — instrument the core-loop events: `register`, `verify_email`, `login`, `competition_view`, `competition_register`, `matchmaking_view`, `connect_sent`, `connect_accepted`, `team_created`, `team_application`, `team_member_joined`, `sidekick_query` (with `resolved` boolean), `ad_impression`, `ad_click`.
2. **Funnel definition** — the North Star funnel: `register → verify → competition_view → (matchmaking_view | team_view) → connect_sent → connect_accepted → team_member_joined → competition_register`. Measure drop-off at each step.
3. **Aggregation surface** — extend the existing Superadmin admin dashboard (which already shows live counts) into a **GWA dashboard** that trends the §9.4 metrics over time, rather than point-in-time counts.
4. **Operational telemetry** — add request-latency logging (Aware tier) and uptime monitoring/alerting on Render + Supabase.
5. **Privacy** — analytics must respect UU PDP; avoid storing PII in event payloads; document retention.

---

## 16. Glossary

| Term | Meaning |
| :--- | :--- |
| **GWA** | Growth · Watch · Aware — the three-tier metrics hierarchy used to monitor platform health (§7.1). |
| **ATS** | Applicant Tracking System — the team-owner workflow to review and approve/reject applicants (Epic D). |
| **SideKick** | The in-app deterministic AI assistant chatbot (`POST /api/sidekick/chat`, Epic F). |
| **Mengisi Celah** | "Filling the gap" — UI chips marking a candidate's skills that fill the current user's skill gaps. |
| **Peserta** | Student participant (`role='peserta'`). |
| **Penyelenggara / EO** | Event Organizer (`role='organizer'`). |
| **Soloist / Owner** | Student personas: a soloist seeks a team; an owner runs a recruiting team. |
| **Hosted vs. Non-Hosted** | Whether competition registration happens inside SideQuest (hosted/`terpadu`) or redirects out (external/`eksternal`). |
| **Synergy domain** | One of 5 major groupings (Tech, Design, Business, Science, Social) used by the matchmaking engine for cross-functional scoring. |
| **Maintenance Mode** | A `platform_settings` flag that routes regular users to `maintenance.html` while staff bypass it. |
| **UU PDP** | Indonesia's Personal Data Protection Law (UU No. 27/2022) — the governing privacy regime. |
| **North Star** | Successful Team Formations — the single metric that best captures delivered product value (§9.4). |
