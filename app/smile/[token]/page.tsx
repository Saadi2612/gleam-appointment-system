"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Camera,
  Upload,
  X,
  Sparkles,
  Loader2,
  Check,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getService } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useStore, useStoreQuery } from "@/hooks/use-store";
import { BeforeAfterSlider, PLACEHOLDER_AFTER } from "@/components/smile/before-after-slider";

const SHOT_TYPES = [
  { id: "smile", en: "Full smile", es: "Sonrisa completa", hint: { en: "Straight on, teeth showing", es: "De frente, mostrando los dientes" } },
  { id: "relaxed", en: "Relaxed lips", es: "Labios relajados", hint: { en: "Mouth closed, natural", es: "Boca cerrada, natural" } },
  { id: "profile", en: "Side profile", es: "Perfil lateral", hint: { en: "Turned 90°, smiling", es: "Girado 90°, sonriendo" } },
];

const GOALS_EN = ["Whiter", "Straighter", "Close a gap", "Fix a chip", "Longer front teeth", "Even gum line", "Replace old bonding"];
const GOALS_ES = ["Más blancos", "Más derechos", "Cerrar un espacio", "Arreglar una astilla", "Dientes frontales más largos", "Encía pareja", "Reemplazar resina vieja"];

/** Resize a data URL so its longest edge is at most `max` px, as JPEG. */
function downscale(dataUrl: string, max: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function SmileDesignPage() {
  const { lang } = useI18n();
  const { token } = useParams<{ token: string }>();
  const store = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeShot, setActiveShot] = useState<string>("smile");

  const { data: appt, loading } = useStoreQuery((s) => s.getAppointmentByToken(token), [token]);
  const { data: saved } = useStoreQuery((s) => s.getSmileDesign(token), [token]);

  const [photos, setPhotos] = useState<{ id: string; label: string; dataUrl: string }[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [timeline, setTimeline] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!saved) return;
    setPhotos(saved.photos);
    setGoals(saved.goals);
    setNotes(saved.notes);
    setTimeline(saved.timeline ?? "");
    setBudget(saved.budgetRange ?? "");
  }, [saved]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      // phone cameras produce 4–8 MB images; downscale before we hold one in
      // the browser store, or a few uploads blow the localStorage quota
      const dataUrl = await downscale(String(reader.result), 900);
      setPhotos((p) => [
        ...p.filter((x) => x.id !== activeShot),
        { id: activeShot, label: activeShot, dataUrl },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function submit() {
    setBusy(true);
    await store.saveSmileDesign(token, { photos, goals, notes, timeline, budgetRange: budget });
    await store.notify({
      channel: "sms",
      to: "",
      kind: "smile-design",
      relatedAppointmentId: appt?.id,
      body: `Gleam Dental: smile design photos received — Dr. will review before your ${getService(appt?.serviceId ?? "")?.shortName ?? "consult"}.`,
    });
    setBusy(false);
    setSubmitted(true);
  }

  const goalOptions = lang === "es" ? GOALS_ES : GOALS_EN;
  const primary = photos.find((p) => p.id === "smile") ?? photos[0];

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-muted-foreground">
        {lang === "es" ? "No pudimos encontrar esa cita." : "We couldn't find that appointment."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.07] px-3 py-1 text-xs font-medium text-accent">
        <Sparkles className="size-3.5" />
        {lang === "es" ? "Diseño de sonrisa virtual" : "Virtual smile design"}
      </p>
      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
        {lang === "es" ? "Muéstrenos su sonrisa" : "Show us your smile"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {lang === "es"
          ? "Suba tres fotos y su dentista llegará a la consulta ya con un plan preliminar. Ahorra una visita entera."
          : "Upload three photos and your dentist walks into the consult already holding a draft plan. Saves a whole visit."}
      </p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="size-3" />
        {lang === "es"
          ? "Demo: las fotos se quedan en su navegador y nunca se suben."
          : "Demo: photos stay in your browser and are never uploaded."}
      </p>

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl border border-success/30 bg-success/[0.06] p-6 text-center"
        >
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-6" strokeWidth={3} />
          </span>
          <p className="mt-3 font-semibold">
            {lang === "es" ? "¡Recibido! Su dentista lo revisará antes de su visita." : "Got it! Your dentist will review before your visit."}
          </p>
          <Button asChild variant="outline" className="mt-4 rounded-full">
            <Link href={`/appt/${token}`}>
              {lang === "es" ? "Ver mi cita" : "View my appointment"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </motion.div>
      ) : (
        <>
          {/* photo upload */}
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {SHOT_TYPES.map((s) => {
              const shot = photos.find((p) => p.id === s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveShot(s.id);
                    fileRef.current?.click();
                  }}
                  className={cn(
                    "group relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
                    shot ? "border-primary/50 border-solid" : "border-border hover:border-primary/40",
                  )}
                >
                  {shot ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shot.dataUrl} alt={s.en} className="size-full object-cover" />
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotos((p) => p.filter((x) => x.id !== s.id));
                        }}
                        className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                      >
                        <X className="size-3.5" />
                      </span>
                    </>
                  ) : (
                    <span className="flex h-full flex-col items-center justify-center gap-1.5 p-2 text-center">
                      <Camera className="size-5 text-muted-foreground" />
                      <span className="text-xs font-medium">{lang === "es" ? s.es : s.en}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {lang === "es" ? s.hint.es : s.hint.en}
                      </span>
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Upload className="mr-1 inline size-3" />
                    {lang === "es" ? "Cambiar" : "Replace"}
                  </span>
                </button>
              );
            })}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />

          {/* preview */}
          {primary && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold">
                {lang === "es" ? "Vista previa — arrastre para comparar" : "Preview — drag to compare"}
              </p>
              <BeforeAfterSlider
                before={primary.dataUrl}
                after={PLACEHOLDER_AFTER}
                beforeLabel={lang === "es" ? "Hoy" : "Today"}
                afterLabel={lang === "es" ? "Proyectado" : "Projected"}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {lang === "es"
                  ? "Simulación ilustrativa. Su dentista produce el diseño real con el escaneo iTero en la consulta."
                  : "Illustrative simulation. Your dentist produces the real design from your iTero scan at the consult."}
              </p>
            </div>
          )}

          {/* goals */}
          <div className="mt-6">
            <Label className="text-xs">{lang === "es" ? "¿Qué le gustaría cambiar?" : "What would you change?"}</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {goalOptions.map((g) => {
                const active = goals.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => setGoals((x) => (active ? x.filter((y) => y !== g) : [...x, g]))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{lang === "es" ? "¿Para cuándo?" : "Any deadline?"}</Label>
              <Select value={timeline} onValueChange={setTimeline}>
                <SelectTrigger>
                  <SelectValue placeholder={lang === "es" ? "Sin prisa" : "No rush"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asap">{lang === "es" ? "Lo antes posible" : "As soon as possible"}</SelectItem>
                  <SelectItem value="1month">{lang === "es" ? "Dentro de un mes" : "Within a month"}</SelectItem>
                  <SelectItem value="3months">{lang === "es" ? "2–3 meses" : "2–3 months"}</SelectItem>
                  <SelectItem value="event">{lang === "es" ? "Tengo un evento (boda, foto)" : "I have an event (wedding, photos)"}</SelectItem>
                  <SelectItem value="norush">{lang === "es" ? "Sin prisa" : "No rush"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                {lang === "es" ? "Presupuesto aproximado" : "Rough budget"}{" "}
                <span className="text-muted-foreground">({lang === "es" ? "opcional" : "optional"})</span>
              </Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger>
                  <SelectValue placeholder={lang === "es" ? "Prefiero hablarlo" : "Rather discuss it"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under2k">{lang === "es" ? "Menos de $2,000" : "Under $2,000"}</SelectItem>
                  <SelectItem value="2-5k">$2,000 – $5,000</SelectItem>
                  <SelectItem value="5-10k">$5,000 – $10,000</SelectItem>
                  <SelectItem value="10k+">{lang === "es" ? "Más de $10,000" : "$10,000+"}</SelectItem>
                  <SelectItem value="discuss">{lang === "es" ? "Prefiero hablarlo" : "Rather discuss it"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label className="text-xs">{lang === "es" ? "Algo más que debamos saber" : "Anything else we should know"}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                lang === "es"
                  ? "Ej. no me gusta cómo se ve mi diente frontal en las fotos…"
                  : "e.g. I don't like how my front tooth looks in photos…"
              }
            />
          </div>

          <Button
            onClick={submit}
            disabled={busy || photos.length === 0}
            size="lg"
            className="mt-6 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {lang === "es" ? "Enviar a mi dentista" : "Send to my dentist"}
          </Button>
        </>
      )}
    </div>
  );
}
