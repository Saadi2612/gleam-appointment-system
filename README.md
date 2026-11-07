# Gleam Dental Care — Booking Platform

A clickable sales demo of an **in-house patient booking platform** for Gleam Dental Care
(Atlantic Dentistry — Atlantic Beach & Bartram Park, Jacksonville FL). It replaces the
current flexbook.me redirect with a branded, multi-location booking experience plus
revenue-recovery tooling.

> **Demo build — synthetic data only.** No backend, no database, no real PHI. Everything
> runs client-side from a seeded in-memory store persisted to `localStorage`.

---

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 (no environment variables required). Deploys to Vercel as-is.

> If something else already owns port 3000 (Docker, another dev server), Next will **not**
> move on its own here — start it explicitly: `PORT=4000 npm run dev`. Check what you're
> actually looking at with `curl -s localhost:3000 | grep -o "<title>.*</title>"`.

- `npm run build && npm start` — production build
- Reset the demo any time from the **Demo controls** panel (bottom-right, or `⌘/Ctrl-K`)

---

## What's in Phase 1

The patient-facing booking flow — the core of the pitch.

| Area | Where | Notes |
|---|---|---|
| Booking wizard | `/book` | 7 steps, one question per screen, progress bar, back always works, **state survives refresh** |
| Service picker | step 1 | 7 services, each with its own duration, equipment, and eligible providers |
| Location picker | step 2 | Next-available slot shown *on each card*; "soonest at either location" option |
| Provider picker | step 3 | "First available" default; only shows doctors who work that location **and** perform that service |
| Date & time | step 4 | Live slot engine — real per-location hours, per-provider schedules, service duration, 10-min turnover buffers, lunch blocks, and already-booked seed appointments. Closed days are greyed and labelled ("Closed Fridays after 2:00 PM"). |
| Patient details | step 5 | New vs. returning branch; returning patients "look up" by phone and get pre-filled |
| Insurance | step 6 | Carrier dropdown + member ID → mocked 1.5s "Verifying coverage with Delta Dental…" → coverage summary card (plan, remaining annual max, cleaning 100%) |
| Confirmation | `/confirmation/[id]` | Full summary, **.ics download**, directions link, "what to expect", link to intake forms |
| Emergency fast-path | `/book?service=emergency` | Skips the provider step, same-day openings only, practice phone + "call now" up top |
| Family booking | step 1 → "Booking for the whole family?" | Add members; the engine finds **side-by-side** or **back-to-back** slots across chairs/providers |
| Smart waitlist | `/manage`, and on `/appt/[token]` | Captures preferred day/time windows |
| My appointments | `/manage` | Patient portal — phone lookup (no password), then **Upcoming / Past** tabs with full visit history, status chips, outstanding balance, recall nudge, book-again and rate-your-visit actions |
| Manage one appointment | `/appt/[token]` | Tokenized link — reschedule, cancel, add to calendar, no login |
| Digital intake forms | `/forms/[token]` | Medical history, allergies, medications, HIPAA ack, **canvas e-signature**, completion ring, autosave |
| Coming-soon waitlist | `/coming-soon` | Lead capture for Fleming Island, Tinseltown, World Golf Village (name / email / ZIP / preferred office) |
| Bilingual toggle | header EN / ES | Full patient flow translated |
| Demo control bar | `⌘/Ctrl-K` | Reset data · trigger a cancellation (auto-fills from waitlist) · fire a sample notification · jump to a scenario |

## What's in Phase 2 — practice-side dashboard

Everything under **`/admin`** (no login). Top bar has a **role switcher** — Front Desk /
Office Manager / Regional Director — that changes what's visible, plus a location scope
switcher (Regional Director also gets "Both locations").

| Area | Where | Notes |
|---|---|---|
| Today view | `/admin/today` | Operatory columns (Atlantic Beach 6 chairs, Bartram Park 5), 15-min time rows, **drag a card to reschedule** with conflict detection (chair / provider / hours / blocks), color-coded by service category, status chips (Confirmed → Checked In → In Chair → Complete / No-Show) via the card popover, live "now" line. Falls forward to the next open day on weekends. |
| Schedule | `/admin/schedule` | Day / Week / Provider views. **Block time / PTO** dialog (whole-office or per-provider). **Provider split** dialog sets Dr. Murphy's weekday location assignment. Existing blocks list with remove. |
| Cancellation recovery | `/admin/recovery` | The money feature. Big **"Revenue recovered this month"** counter. One click on any upcoming appointment cancels it, pages the matching waitlist, streams the simulated SMS offers, refills the slot, and increments the counter. Active waitlist table below. |
| Patient list | `/admin/patients` | Searchable; last visit, next visit, outstanding balance, no-show count, recall badge (Scheduled / Due / Overdue / Lapsed). Row opens a detail dialog with visit history. Recall-status filter chips. |
| Recall & reactivation | `/admin/recall` | Two cohorts — due for a 6-month cleaning, and lapsed 12+ months — each with an estimated recoverable-revenue figure and a one-click (simulated) campaign send. Campaign history log. |
| Analytics | `/admin/analytics` | Per-location or combined: chair utilization %, no-show rate, production, open-chair-hours + idle-cost estimate; weekly volume & production trends, production by provider, new-patients-by-source and online-vs-phone donuts. Seeded trends, not flat lines. |
| Notification center | topbar bell | Slide-out panel; every simulated SMS/email as phone-style message bubbles, filterable by channel. |

## What's in Phase 3 — the differentiators

| Feature | Where | Notes |
|---|---|---|
| AI triage assistant | chat bubble, patient side | Patients describe a problem instead of picking a service. A rule/keyword engine over a symptom map (`lib/triage.ts`) classifies urgency, picks the service and duration, spots a stated deadline ("wedding in three weeks"), surfaces red-flag safety copy, and drops the patient into the wizard pre-filled. **No external AI API** — instant, offline, auditable, and bilingual. |
| Cross-location load balancing | wizard, date & time step | When the chosen office is 8+ days out and the other can see the patient ≥2 days sooner, an inline nudge offers the switch — "Bartram Park has an opening Thu Sep 3 · 11 days sooner, and only 14 minutes further." Logic in `store.crossLocationSuggestion()`; `store.utilizationByLocation()` backs it. The seed deliberately runs Atlantic Beach hot so this fires live. |
| Membership plan | `/membership` + `/admin/growth` | Gleam Care: three tiers ($349 individual / $279 child / $599 perio), annual or monthly billing, 15% off other treatment. Signup flow on the patient side; active members, tier split and **MRR / ARR** on the practice side. |
| Virtual smile design | `/smile/[token]` | Cosmetic and Invisalign confirmations offer a photo intake — three guided shots, goals, timeline, budget — with a **drag before/after slider** against an inline SVG projection. Photos are read with `FileReader` and never leave the browser. |
| Post-visit review routing | `/review/[token]` | Marking a visit Complete fires the request. 4–5★ routes to a Google review CTA; 1–3★ opens a private feedback form that lands in the office manager's queue instead of the public listing. Reputation tile on `/admin/growth` shows the star distribution, capture rate, and follow-up queue. |
| Website embed | `/embed` | The booking widget running inside a mock of the practice's existing WordPress homepage — desktop/mobile toggle, real availability, and the copy-paste `<div>` + `<script>` snippet. Proves it drops in with no redirect. |
| ROI calculator | `/roi` | Seven live inputs (volume, no-show rate, appointment value, front-desk cost, phone minutes, online adoption, platform fee) → recovered revenue, staff hours freed, payback period, and a breakdown chart. Pre-filled with plausible two-location numbers and deliberately conservative (only 60% of saved visits counted as incremental). |

### Demo mechanics

| Tool | How | Notes |
|---|---|---|
| Demo control bar | `⌘/Ctrl-K` | Start the guided tour · trigger a cancellation · **fast-forward the day** (advances today's board a status step and fires review requests) · fire a notification · reset data · jump to any of 8 scenarios. |
| Guided tour | `⌘K` → Start the guided tour | 15 numbered steps in pitch order. Each shows the line to say and what to click, navigates for you, and survives page changes. `←` `→` to move, `Esc` to exit. Self-running if the client wants to click through it later. Content lives in `lib/tour.ts`. |
| Demo badge | always visible | "Demo — synthetic data only", bottom-left. |

---

## Suggested 10-minute demo script

Open on a laptop; keep a phone handy for the mobile view. Reset data first (`⌘K` → Reset).

> Prefer it hands-free? `⌘K` → **Start the guided tour** walks these same beats in order,
> with the line to say on each screen, and navigates for you.

| # | Screen | Do this | Say this |
|---|---|---|---|
| 1 | `/` (home) | Land on the branded homepage. Point at the two location cards. | "Today every 'Book Now' on your site throws the patient to flexbook.me. This is that same click — except it never leaves gleamdental.com, and it already knows your two offices." |
| 1b | `/` chat bubble | Open **What's bothering you?** and send "chipped front tooth and a wedding in three weeks". | "Patients can't pick a service off a menu — they describe a problem. It reads the urgency, picks the visit, notices the deadline, and drops them into booking already filled in. And it's a rules engine, so it's instant and it can't hallucinate." |
| 2 | `/book` step 1 | Click **New Patient Exam & Cleaning**. | "One question per screen. Every service carries its own chair time, equipment, and which doctors can do it — so we never offer a slot that can't actually happen." |
| 3 | step 2 (location) | Point at "Next: Tomorrow 9:20 AM" on each card, then pick Atlantic Beach. | "Real-time availability on the card itself. No 'submit and we'll call you back.'" |
| 4 | step 3 (provider) | Leave **First available** selected. | "Most patients just want the soonest opening. For the ones who don't, every doctor's real split schedule is here — including Dr. Murphy across both offices." |
| 5 | step 4 (date & time) | Open the calendar, click a Friday — show it greys out after 2 PM. Pick a slot; watch it animate. | "This grid respects your hours, lunch blocks, 10-minute turnovers, and what's already on the books. Fridays close at two — the system knows." |
| 5b | same screen, scroll down | Point at the **Bartram Park has an opening…** nudge, then hit Switch. | "Atlantic Beach is booked out for long appointments. Instead of losing that patient, we offer them your other chair — eleven days sooner, fourteen minutes further. That's load balancing you can't do over the phone." |
| 6 | step 5 (patient) | Toggle **returning patient**, type a phone number, hit look-up, watch it pre-fill. | "Returning patients don't retype anything." |
| 7 | step 6 (insurance) | Pick Delta Dental, enter any member ID, click **Verify**. Wait for the card. | "This is the moment that closes patients — 'your cleaning is covered 100%, you have \$1,240 of annual maximum left.' Front desk never touches it." |
| 8 | step 7 → confirmation | Confirm. Show the .ics download and the "complete your forms now" link. | "Add-to-calendar, directions, and paperwork — done before they hang up." |
| 8b | `/manage` | Look a patient up by phone, then switch to the **Past** tab. | "And here's their own record — every visit they've had and every one coming. No password, just the number you already have on file. That's the 'when was my last cleaning?' call your front desk stops taking." |
| 9 | `/forms/[token]` | Fill a couple of sections, sign on the canvas, watch the ring fill. | "Fifteen minutes of clipboard time, gone. Signature and HIPAA captured." |
| 10 | `⌘K` → **Trigger a cancellation** | Watch the toast: waitlist paged, slot refilled, "\$165 recovered this month." | "Here's the ROI. A cancellation used to be a dead hour. Now it text-blasts your waitlist and fills itself — and we're counting the dollars." |
| — | Bonus | Flip the header to **ES**; reload the mobile view. | "Jacksonville's Spanish-speaking patients get the whole flow in their language. And 70% of dental bookings are on a phone — this was built phone-first." |

### …and the practice side (add ~4 minutes)

| # | Screen | Do this | Say this |
|---|---|---|---|
| 11 | `/admin/today` | Point at the operatory board. Drag one card to a different chair/time. Click a card → mark **Checked In**. | "This is your front desk's morning. Every online booking lands here on the right chair, color-coded. Drag to reschedule — it won't let you double-book a provider or a room." |
| 12 | `/admin/recovery` | Click **Cancel & recover** on any appointment. Watch the feed. | "Same recovery engine as the patient side, but now it's a dashboard. Watch: cancelled, waitlist texted, slot filled, counter goes up. That number is why this pays for itself." |
| 13 | `/admin/recall` | Click **Send recall campaign**. | "Forty-nine patients overdue for a cleaning — one click, they all get a text, and there's the estimated production you just put back on the schedule." |
| 14 | `/admin/analytics` → switch role to **Regional Director**, scope to **Both locations** | Scroll the charts. | "Chair utilization, no-show rate, production per provider, online-vs-phone — per office or across the group. The role switch is what the regional director sees versus the front desk." |
| 15 | Topbar **bell** | Open the notification center. | "Every text and email the system sent, as it happened. During onboarding this is how the office sees the automation actually working." |

### …and the close (add ~3 minutes)

| # | Screen | Do this | Say this |
|---|---|---|---|
| 16 | `/admin/growth` | Point at the star distribution, then the private feedback queue. | "Four and five stars go to Google. One to three opens a private form — so the complaint lands in your inbox instead of on your listing. That queue is reviews you didn't get." |
| 17 | same screen, scroll | Point at **Membership MRR**. | "And here's the uninsured third of your patients turned into recurring revenue instead of a price objection." |
| 18 | `/embed` | Toggle desktop/mobile, then book from the widget inside the mock site. | "This is your existing WordPress page. One div, one script tag — no rebuild, no plugin fight, and the patient never leaves your domain." |
| 19 | `/roi` | Drag the no-show rate slider; let them watch the annual number move. | "Your numbers, not mine. Conservative — we only count sixty percent of saved visits as new money — and it still pays for itself in under a month." |

---

## Mocked vs. what production needs

| Concern | In this demo | Production |
|---|---|---|
| Data store | Seeded in-memory objects → `localStorage`, behind a typed `lib/store.ts` facade | Real database (Postgres) + API; the store facade is the seam to swap |
| "Today" | Seed regenerates relative to the current date on each new day | Real appointment data |
| Availability engine | `lib/availability.ts` runs in the browser | Same logic server-side, reading live calendars |
| Insurance eligibility | `store.checkEligibility()` — 1.5s timer, deterministic fake result | Real clearinghouse (e.g. DentalXChange, Onederful, Vyne) |
| SMS / email | `store.notify()` records into an in-app list; nothing is sent | Twilio / a HIPAA-eligible messaging provider under a BAA |
| Patient lookup | Matches against seed patients by phone | PMS patient index |
| Auth | None (by design — speed of demo) | Patient identity + staff SSO for the `/admin` side |
| Provider schedules | Static in `lib/domain.ts`; blocks/PTO/splits persist to `localStorage` | Two-way calendar sync (PMS + Google/Outlook) |
| e-signature | Canvas → PNG data URL, stored locally | Stored as a signed PDF artifact with audit trail |
| Admin roles | Client-side switcher, no enforcement | Staff SSO with real per-role permissions and an audit log |
| Analytics | Computed in the browser from seed appointments | Warehouse / reporting queries over live data |
| Drag-to-reschedule | Optimistic local move with conflict checks | Same, plus slot-hold locking and PMS write-back |
| AI triage | Deterministic rules over a symptom map (`lib/triage.ts`) | Same engine, clinician-reviewed and versioned. An LLM could rank the free text, but the urgency decision stays rule-based and auditable |
| Smile design "after" | Inline SVG placeholder; photos stay in the browser | Lab wax-up render or an AI simulation, with photos stored as PHI under a BAA |
| Google review link | Button marks the review posted, opens nothing | Real Google Business Profile review link with UTM attribution |
| Membership billing | No payment collected | Stripe (or the PMS's own plan module) with dunning and renewal reminders |
| ROI figures | Assumption constants at the top of `app/roi/page.tsx` | Same model, seeded from the practice's actual PMS export |

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the full production path.

---

## Project layout

```
app/
  page.tsx                  homepage
  book/                     the 7-step wizard (client wizard, one step router)
  confirmation/[id]/        post-booking screen (.ics, directions, forms link)
  appt/[token]/             manage: reschedule / cancel / waitlist / calendar
  forms/[token]/            digital intake + canvas e-signature
  coming-soon/              lead capture for the 3 unopened offices
  locations/                hours, doctors, map links
  manage/                   patient portal — upcoming + past visits, phone lookup
  admin/                    practice dashboard (layout + role gate)
    today/ schedule/ recovery/ patients/ recall/ analytics/ growth/
  membership/               in-house plan tiers + signup
  smile/[token]/            virtual smile design intake + before/after slider
  review/[token]/           post-visit rating with public/private routing
  embed/                    the widget inside a mock WordPress homepage
  roi/                      interactive ROI calculator
components/
  wizard/                   step components, slot grid, select cards, cross-location nudge
  intake/                   signature pad, progress ring
  admin/                    nav, topbar, operatory board, status chips, notification drawer
  triage/                   AI triage chat widget
  smile/                    before/after comparison slider
  embed/                    the compact embeddable booking widget
  guided-tour.tsx           14-step presenter walkthrough
  i18n-provider.tsx         EN/ES context
  demo-control-bar.tsx      ⌘K presenter panel
  waitlist-form.tsx         reusable waitlist capture
lib/
  domain.ts                 Gleam facts: locations, hours, providers, services, plans ← edit before a pitch
  seed.ts                   synthetic patients / appointments / members / reviews    ← edit before a pitch
  store.ts                  typed async data layer (the "API") — booking, admin, analytics, growth
  availability.ts           slot engine (hours × schedules × duration × buffers × bookings)
  triage.ts                 symptom map + urgency rules for the assistant
  tour.ts                   the guided tour script
  service-style.ts          category → color map for the board
  i18n.ts                   translation dictionaries
  ics.ts                    calendar file generation
hooks/
  use-store.ts              useSyncExternalStore bindings + query hook + useHydrated
  use-booking.tsx           wizard state machine (persisted)
  use-admin.tsx             role + location scope, feature gating
```

`lib/domain.ts` and `lib/seed.ts` are deliberately separated from `lib/store.ts` so seed
data and business rules can be tuned right before a pitch without touching the data layer.
