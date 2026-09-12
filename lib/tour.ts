// ---------------------------------------------------------------------------
// Guided tour — the pitch, in order, as data. Editable in one place so the
// walkthrough and the README demo script can't drift apart.
// ---------------------------------------------------------------------------

export interface TourStep {
  id: string;
  /** where the tour navigates for this step */
  href: string;
  title: string;
  /** the one line the presenter would say */
  say: string;
  /** what to actually click, for a self-running walkthrough */
  doThis: string;
  section: "patient" | "practice" | "close";
}

export const TOUR: TourStep[] = [
  {
    id: "home",
    href: "/",
    section: "patient",
    title: "The booking click that never leaves your site",
    say: "Today every ‘Book Now’ on gleamdental.com throws the patient to flexbook.me. This is that same click — branded, and it already knows both your offices.",
    doThis: "Point at the two location cards and their live next-available times.",
  },
  {
    id: "triage",
    href: "/",
    section: "patient",
    title: "AI triage — patients don't know what to book",
    say: "Most patients can't pick a service off a menu. They describe a problem. Watch — ‘chipped front tooth, wedding in three weeks.’",
    doThis: "Open the chat bubble, bottom right, and send the wedding example.",
  },
  {
    id: "wizard",
    href: "/book",
    section: "patient",
    title: "One question per screen",
    say: "Every service carries its own chair time, equipment, and eligible providers — so we never offer a slot that can't actually happen.",
    doThis: "Pick New Patient Exam, then Atlantic Beach, then First available.",
  },
  {
    id: "slots",
    href: "/book",
    section: "patient",
    title: "Availability that respects your real rules",
    say: "Your hours, lunch blocks, ten-minute turnovers, provider split schedules, and what's already on the books. Fridays close at two — the system knows.",
    doThis: "Open the calendar and click a Friday, then pick a slot.",
  },
  {
    id: "insurance",
    href: "/book",
    section: "patient",
    title: "Live eligibility is what closes the patient",
    say: "‘Your cleaning is covered a hundred percent and you have twelve hundred dollars of annual maximum left.’ Front desk never touches it.",
    doThis: "Pick Delta Dental, any member ID, hit Verify.",
  },
  {
    id: "portal",
    href: "/manage",
    section: "patient",
    title: "The patient's own record",
    say: "Every visit they've ever had, and every one coming up — no password, just the phone number you already have on file. This is the call your front desk stops taking.",
    doThis: "Look up a patient by phone, then switch to the Past tab.",
  },
  {
    id: "forms",
    href: "/manage",
    section: "patient",
    title: "Paperwork done before they arrive",
    say: "Fifteen minutes of clipboard time, gone — medical history, HIPAA, and a real signature captured on the phone.",
    doThis: "Open an appointment, then the forms link, and sign on the canvas.",
  },
  {
    id: "membership",
    href: "/membership",
    section: "patient",
    title: "Recurring revenue from your uninsured patients",
    say: "About a third of your patients have no dental insurance. This turns them into a subscription instead of a price objection.",
    doThis: "Toggle annual vs monthly, then look at the plan tiers.",
  },
  {
    id: "today",
    href: "/admin/today",
    section: "practice",
    title: "The front desk's morning",
    say: "Every online booking lands on the right chair with the right provider, color-coded. Drag to reschedule — it won't let you double-book.",
    doThis: "Drag a card to another chair, then click one and mark it Checked In.",
  },
  {
    id: "recovery",
    href: "/admin/recovery",
    section: "practice",
    title: "The money feature",
    say: "A cancellation used to be a dead hour. Now it text-blasts your waitlist and fills itself — and we're counting the dollars.",
    doThis: "Click ‘Cancel & recover’ on any appointment and watch the feed.",
  },
  {
    id: "recall",
    href: "/admin/recall",
    section: "practice",
    title: "The patients already in your database",
    say: "These are people who already trust you and just fell off the schedule. One click and they all get a text.",
    doThis: "Send the recall campaign and read the recoverable-revenue number.",
  },
  {
    id: "growth",
    href: "/admin/growth",
    section: "practice",
    title: "Reputation, steered",
    say: "Four and five stars go to Google. One to three opens a private form — the complaint lands in your inbox, not on your listing.",
    doThis: "Show the star distribution and the private feedback queue.",
  },
  {
    id: "analytics",
    href: "/admin/analytics",
    section: "practice",
    title: "What the owner actually wants to see",
    say: "Chair utilization, no-show rate, production per provider, online versus phone — per office or across the group.",
    doThis: "Switch the role to Regional Director and the scope to Both locations.",
  },
  {
    id: "embed",
    href: "/embed",
    section: "close",
    title: "It drops into the site you already have",
    say: "One div and one script tag. No theme rebuild, no plugin fight, and the patient never leaves gleamdental.com.",
    doThis: "Toggle desktop/mobile and book straight from the embedded widget.",
  },
  {
    id: "roi",
    href: "/roi",
    section: "close",
    title: "The number to end on",
    say: "Conservative inputs, your own numbers — and it still pays for itself in under three weeks.",
    doThis: "Drag the no-show rate slider and let them watch the annual figure move.",
  },
];

export const TOUR_SECTIONS: Record<TourStep["section"], string> = {
  patient: "Patient experience",
  practice: "Practice dashboard",
  close: "Closing the deal",
};
