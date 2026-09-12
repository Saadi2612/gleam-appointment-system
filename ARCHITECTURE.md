# Architecture — from demo to production

This document describes how the Gleam Dental Care booking demo becomes a real product.
**The demo stores no PHI.** It runs entirely in the browser on synthetic data. Everything
below is what a production build adds.

---

## 1. Shape of the demo (today)

```
Browser
 ├─ React / Next.js 16 (App Router) UI
 ├─ lib/store.ts          typed, async-shaped data layer  ("the API")
 │    └─ in-memory objects  ⇄  localStorage  (seeded by lib/seed.ts)
 ├─ lib/availability.ts   pure slot engine
 └─ lib/domain.ts         static practice facts
```

Every read/write already goes through `lib/store.ts` with a promise-returning signature
(`await store.createAppointment(...)`). That interface is the seam: swap the implementation
for `fetch()` calls and the components don't change.

---

## 2. Target production architecture

```
                     ┌─────────────────────────────────────────────┐
   Patients  ──────▶ │  Next.js app (Vercel / AWS)                  │
   Staff     ──────▶ │   • patient booking UI                       │
                     │   • /admin practice console (staff SSO)      │
                     │   • Route Handlers / server actions          │
                     └───────────────┬─────────────────────────────┘
                                     │  Prisma / Drizzle
                     ┌───────────────▼─────────────────────────────┐
                     │  PostgreSQL  (HIPAA-eligible managed DB)     │
                     │   patients, appointments, providers,         │
                     │   schedules, waitlist, intake_forms,         │
                     │   notifications, audit_log                   │
                     └───────────────┬─────────────────────────────┘
        ┌────────────────────────────┼───────────────────────────────┐
        │                            │                               │
 ┌──────▼──────┐          ┌──────────▼──────────┐          ┌─────────▼─────────┐
 │ PMS bridge  │          │ Eligibility gateway │          │ Messaging (BAA)   │
 │ Dentrix /   │          │ DentalXChange /     │          │ Twilio / Sinch    │
 │ Eaglesoft / │          │ Onederful / Vyne    │          │ SMS + email       │
 │ Open Dental │          └─────────────────────┘          └───────────────────┘
 └─────────────┘
        │
 ┌──────▼───────────────┐
 │ Calendar sync        │
 │ Google / Microsoft   │
 │ 365 (per provider)   │
 └──────────────────────┘
```

---

## 3. Component-by-component

### Database

- **PostgreSQL** on a HIPAA-eligible managed host (AWS RDS, GCP Cloud SQL, or Neon/Supabase
  with a signed BAA). Encryption at rest + in transit.
- Schema mirrors `lib/types.ts` almost 1:1. Add: `audit_log` (every read/write to a PHI row,
  actor, timestamp, reason), `user` + `staff_role`, `location_hours_override` (holidays/PTO),
  `message_log`, `consent_record`.
- Row-level tenancy from day one even though it's one practice — Gleam is opening three more
  offices, and a multi-practice DSO version is the obvious upsell.

### Availability engine

- `lib/availability.ts` moves server-side unchanged in spirit. Inputs come from the DB
  (`provider_schedule`, `location_hours`, live `appointment` rows, `block_time`) instead of
  static objects.
- Cache computed day-availability per (location, service, provider, date) with a short TTL;
  bust on any appointment/schedule write for that scope.
- Hold a slot for ~10 minutes while a patient finishes the wizard (a `slot_hold` row with
  expiry) to prevent double-booking under load.

### PMS integration (Dentrix / Eaglesoft / Open Dental)

- This is the hard part and the deal-maker. Options, roughly in order of effort:
  - **Open Dental** — has a real REST API; direct integration.
  - **Dentrix / Eaglesoft** — via their partner programs (Dentrix Connected / Sikka /
    NexHealth-style middleware) or an on-prem sync agent hitting the local database.
- Sync is bidirectional: pull patients, providers, operatories, existing schedule; push new
  appointments, cancellations, reschedules, and completed intake forms/signatures.
- Treat the PMS as source of truth for clinical data; the app owns the booking funnel,
  waitlist, and messaging.

### Insurance eligibility

- Replace `store.checkEligibility()` with a real clearinghouse: **DentalXChange**,
  **Onederful**, **Vyne Trellis**, or **Change Healthcare**.
- Real-time 270/271 eligibility. Cache results per (member, payer) for 24–48h.
- Surface the same patient-friendly summary card; keep raw 271 for the front desk.

### Messaging (SMS + email)

- **Twilio** (or Sinch/Telnyx) under a BAA for SMS; **Postmark/SES** under a BAA for email.
- Powers: booking confirmation, reminders (T-48h / T-2h), waitlist offers with a
  reply-to-claim keyword, recall nudges, review requests.
- Inbound webhook handles "YES" replies to claim a waitlist slot — first valid reply wins,
  slot is atomically assigned.
- Quiet hours, per-patient opt-out, STOP handling, and full `message_log` for compliance.

### Provider calendar sync

- Per-provider OAuth to Google Calendar / Microsoft 365.
- Two-way: office PTO and external commitments block booking; booked appointments appear on
  the provider's personal calendar.

### Auth

- **Patients:** lightweight — magic link / OTP by SMS. The tokenized `/appt/[token]` model
  from the demo stays for no-friction management links.
- **Staff:** SSO (Google Workspace / Microsoft Entra) with the Front Desk / Office Manager /
  Regional Director roles from the brief mapped to real permissions.

### AI triage

- `lib/triage.ts` stays a **deterministic rule engine** in production too. A clinical
  decision that routes someone to a same-day chair has to be reviewable, versioned, and
  explainable — an LLM guessing at urgency is a liability, not a feature.
- An LLM can sit *in front* of it: normalize free text, handle spelling and Spanish
  variants, then hand structured symptoms to the same rules. Log every input/output pair
  as PHI under the same retention policy.
- Red-flag copy (airway swelling, avulsed tooth) must be signed off by the practice's
  clinical lead before launch.

### Membership plan billing

- Stripe Billing (or the PMS's own in-house plan module) for the recurring charge, with
  dunning, card-update emails, and renewal reminders.
- Membership status flows back into eligibility: a member's cleaning is "covered" the same
  way an insured patient's is, and the 15% discount applies at treatment planning.
- Note the regulatory line: in-house plans are **not insurance**. Several states regulate
  them as discount plans and require specific disclosure language — legal review before
  launch, and the signup page must carry that disclosure.

### Reputation routing

- Real Google Business Profile review links, per location, with UTM attribution so you can
  prove which visits produced which reviews.
- Keep the 4–5★ / 1–3★ split honest: never suppress a review a patient wants to post
  publicly. Routing is about *asking* the right people, and giving unhappy patients a
  faster path to a human — not about gating feedback.
- Private feedback becomes a ticket with an owner and an SLA, not just a list.

### e-signature & intake

- Canvas capture stays, but the completed form is rendered to a **PDF** with the signature,
  timestamp, IP, and form version, then stored as an immutable artifact and pushed to the
  PMS document store.
- Smile-design photos are patient images and therefore PHI: encrypted object storage, a
  signed-URL read path, retention limits, and a BAA with the storage provider. In the demo
  they never leave the browser precisely so this doesn't apply.

### Hosting & compliance

- HIPAA-eligible hosting with a signed **BAA** for every vendor touching PHI (host, DB,
  Twilio, email, clearinghouse, error tracking).
- Encryption in transit (TLS 1.2+) and at rest.
- Audit logging on all PHI access; log retention per policy.
- Least-privilege IAM; secrets in a managed vault; no PHI in logs or analytics.
- Data retention & deletion policy; patient data export on request.
- Pen test + a HIPAA security risk assessment before go-live.
- Business continuity: automated encrypted backups, tested restore, RPO/RTO targets.

### Observability

- Error tracking (Sentry, BAA), structured request logs, uptime monitoring, and a synthetic
  check that books + cancels a test appointment every few minutes.

---

## 4. Migration path

1. Stand up Postgres + the `store` implementation behind the existing interface; point the
   demo UI at it. No component changes.
2. Add staff auth + the `/admin` console (Phase 2).
3. Integrate the PMS in read-only mode; reconcile patients & schedule.
4. Turn on PMS write-back for new bookings behind a feature flag, one location first.
5. Add eligibility + messaging providers.
6. Add calendar sync.
7. Cut the website's "Book Now" buttons from flexbook.me to the embedded widget.
8. Turn on the growth layer — review routing, recall campaigns, membership billing — once
   the schedule data is trustworthy enough to trigger from.

### The embed, for real

The `/embed` page mocks the drop-in. Production is a small loader script that mounts the
widget into the host page's `<div>`:

- Render inside a **shadow root** or an iframe so the practice's WordPress theme CSS can't
  leak in and break the widget (or vice versa).
- Per-practice key in a `data-` attribute; CORS locked to the practice's own domains.
- Lazy-load below the fold; no third-party analytics inside the widget.
- Post height changes to the parent so the host page can size the frame.

---

## 5. Explicit non-goals of the demo

- No real network calls, no auth, no persistence beyond `localStorage`.
- No PHI — all names, phone numbers, insurance IDs, and histories are randomly generated by
  `lib/seed.ts`. Smile-design photos are read with `FileReader` and never leave the browser.
- The `.ics` file and the eligibility card are real UI over fake data.
- The triage assistant calls no external AI service; it is a keyword/rule engine that runs
  offline in the browser.
- No payment is collected anywhere, including the membership signup.
- The ROI calculator's assumption constants (no-show reduction, waitlist fill rate,
  incremental factor) are industry estimates, not measurements from this practice.
