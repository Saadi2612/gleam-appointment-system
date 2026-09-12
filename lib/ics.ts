import { format } from "date-fns";
import { getLocation, getProvider, getService, BRAND } from "./domain";
import type { Appointment } from "./types";

function icsDate(d: Date): string {
  // floating local time (no Z) so the calendar shows the office's clock time
  return format(d, "yyyyMMdd'T'HHmmss");
}

function esc(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export function appointmentToICS(appt: Appointment): string {
  const loc = getLocation(appt.locationId)!;
  const svc = getService(appt.serviceId)!;
  const prov = getProvider(appt.providerId)!;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gleam Dental Care//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appt.token}@gleamdental.demo`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(new Date(appt.start))}`,
    `DTEND:${icsDate(new Date(appt.end))}`,
    `SUMMARY:${esc(`${svc.name} — ${BRAND.name}`)}`,
    `LOCATION:${esc(`${loc.name}, ${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}`)}`,
    `DESCRIPTION:${esc(
      `With Dr. ${prov.firstName} ${prov.lastName}, ${prov.credential}.\nArrive 10 minutes early. Questions? Call ${loc.phone}.\nManage this appointment: https://gleam.care/appt/${appt.token}`,
    )}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${svc.name} at ${BRAND.name} in 2 hours`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadICS(appt: Appointment, filename = "gleam-appointment.ics") {
  const blob = new Blob([appointmentToICS(appt)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
