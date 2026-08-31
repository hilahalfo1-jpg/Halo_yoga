"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Clock,
  CalendarPlus,
  Download,
  Gift,
  CalendarCheck,
  User,
  Phone,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn, formatPrice, formatDuration } from "@/lib/utils";
import { buildIcsEvent } from "@/lib/ics";
import { israelWallToUtc, localDateToKey } from "@/lib/time";
import StepWhoFor, { type BookingMode } from "./StepWhoFor";
import StepServiceSelect from "./StepServiceSelect";
import StepDateSelect from "./StepDateSelect";
import StepTimeSelect from "./StepTimeSelect";
import StepDetailsForm from "./StepDetailsForm";
import StepConfirmation from "./StepConfirmation";
import StepMedicalForm from "./StepMedicalForm";
import StepGiftDetails, { GIFT_TEMPLATE_OPTIONS } from "./StepGiftDetails";
import type { ServiceItem, TimeSlot } from "@/types";

type StepId =
  | "whoFor"
  | "service"
  | "date"
  | "time"
  | "details"
  | "confirm"
  | "medical"
  | "giftDetails"
  | "giftConfirm"
  | "success";

const STEP_LABELS: Record<StepId, string> = {
  whoFor: "למי התור?",
  service: "בחירת שירות",
  date: "בחירת תאריך",
  time: "בחירת שעה",
  details: "פרטים אישיים",
  confirm: "אישור",
  medical: "הצהרת בריאות",
  giftDetails: "פרטי המתנה",
  giftConfirm: "אישור",
  success: "",
};

interface BookingWizardProps {
  services: ServiceItem[];
}

export interface BookingData {
  service: ServiceItem | null;
  date: Date | null;
  timeSlot: TimeSlot | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
  isHomeVisit: boolean;
  customerPhoto: File | null;
}

export interface GiftData {
  purchaserName: string;
  purchaserPhone: string;
  purchaserEmail: string;
  recipientName: string;
  message: string;
  template: string;
}

// A same-route navigation that flips the query (?gift=1 / ?service=) must not
// keep a stale machine (mode/index/skip) — remount the wizard on any change
export default function BookingWizard(props: BookingWizardProps) {
  const searchParams = useSearchParams();
  return <BookingWizardInner key={searchParams.toString()} {...props} />;
}

function BookingWizardInner({ services }: BookingWizardProps) {
  const searchParams = useSearchParams();
  const giftFromQuery = searchParams.get("gift") === "1";

  const [mode, setMode] = useState<BookingMode | null>(
    giftFromQuery ? "gift" : null
  );
  const [dateSkipped, setDateSkipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bookingResult, setBookingResult] = useState<Record<string, unknown> | null>(null);
  const [isGiftSubmitting, setIsGiftSubmitting] = useState(false);

  const [data, setData] = useState<BookingData>({
    service: null,
    date: null,
    timeSlot: null,
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    notes: "",
    isHomeVisit: false,
    customerPhoto: null,
  });

  const [gift, setGift] = useState<GiftData>({
    purchaserName: "",
    purchaserPhone: "",
    purchaserEmail: "",
    recipientName: "",
    message: "",
    template: "botanical",
  });

  // Valid pre-selected service from the ?service=<slug> query param
  const preselectSlug = searchParams.get("service");
  const preselectedService = useMemo(
    () =>
      preselectSlug
        ? services.find((s) => s.slug === preselectSlug) ?? null
        : null,
    [preselectSlug, services]
  );
  // "שינוי שירות" on the date step clears the preselect — the service step
  // re-enters the derived sequence
  const [preselectCleared, setPreselectCleared] = useState(false);
  const servicePreselected = !!preselectedService && !preselectCleared;

  // Pre-select service from query param — ONLY sets the service (no step jump)
  useEffect(() => {
    if (preselectedService && !preselectCleared && !data.service) {
      setData((prev) => ({ ...prev, service: preselectedService }));
    }
  }, [preselectedService, preselectCleared, data.service]);

  // The active step sequence, derived from state — the single source of truth
  const stepIds = useMemo<StepId[]>(() => {
    const ids: StepId[] = [];
    if (!giftFromQuery) ids.push("whoFor");
    // Once a mode is chosen, a valid preselected service removes the service step
    if (!(servicePreselected && mode !== null)) ids.push("service");
    if (mode === "gift") {
      if (!dateSkipped) ids.push("date", "time");
      ids.push("giftDetails", "giftConfirm", "success");
    } else {
      // self (and not-yet-chosen renders the self shape past whoFor)
      ids.push("date", "time", "details", "confirm", "medical", "success");
    }
    return ids;
  }, [giftFromQuery, servicePreselected, mode, dateSkipped]);

  const safeIndex = Math.min(currentIndex, stepIds.length - 1);
  const currentStepId = stepIds[safeIndex];
  const progressSteps = stepIds.filter((id) => id !== "success");

  // Real UTC start/end of the booked slot (Israel wall clock → UTC)
  const getCalendarEventTimes = () => {
    if (!data.service || !data.date || !data.timeSlot) return null;
    const start = israelWallToUtc(localDateToKey(data.date), data.timeSlot.startTime);
    const end = new Date(start.getTime() + data.service.duration * 60 * 1000);
    return { start, end };
  };

  const generateCalendarUrl = () => {
    const times = getCalendarEventTimes();
    if (!data.service || !times) return "";
    const { start, end } = times;
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const title = encodeURIComponent(`${data.service.name} - HALO`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}`;
  };

  const downloadIcsFile = () => {
    const times = getCalendarEventTimes();
    if (!data.service || !times) return;
    const { start, end } = times;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      ...buildIcsEvent({
        uid: `${(bookingResult?.id as string) || Date.now()}@haloyogamassage.com`,
        start,
        end,
        summary: `${data.service.name} - HALO`,
      }),
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "booking.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const scrollTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  // Navigating back to a position before giftDetails un-skips the date,
  // so the date/time steps reappear on the way forward
  const maybeResetDateSkip = (targetPosition: number) => {
    if (!dateSkipped) return;
    const giftDetailsPos = stepIds.indexOf("giftDetails");
    if (giftDetailsPos !== -1 && targetPosition < giftDetailsPos) {
      setDateSkipped(false);
    }
  };

  const goNext = () => {
    setCurrentIndex((i) => Math.min(i + 1, stepIds.length - 1));
    scrollTop();
  };

  const goBack = () => {
    // Symmetric inverse of the date-skip: un-skip and let "date" re-occupy
    // this position in the derived sequence (the index does not move)
    if (currentStepId === "giftDetails" && dateSkipped) {
      setDateSkipped(false);
      scrollTop();
      return;
    }
    const target = Math.max(safeIndex - 1, 0);
    maybeResetDateSkip(target);
    setCurrentIndex(target);
    scrollTop();
  };

  // Positions in the CURRENT sequence only — back-navigation only
  const goToStep = (position: number) => {
    if (position < safeIndex) {
      maybeResetDateSkip(position);
      setCurrentIndex(position);
      scrollTop();
    }
  };

  const updateData = (partial: Partial<BookingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const updateGift = (partial: Partial<GiftData>) => {
    setGift((prev) => ({ ...prev, ...partial }));
  };

  const handleModeSelect = (m: BookingMode) => {
    setMode(m);
    goNext();
  };

  const handleDateSkip = () => {
    setDateSkipped(true);
    updateData({ date: null, timeSlot: null });
    scrollTop();
  };

  // Escape hatch from the ?service= preselect: "service" re-enters the derived
  // sequence at this position, so the user lands on it (the index does not move)
  const handleChangeService = () => {
    setPreselectCleared(true);
    scrollTop();
  };

  const handleGiftSubmit = async () => {
    if (!data.service) return;
    setIsGiftSubmitting(true);
    try {
      const withDate = !dateSkipped && data.date && data.timeSlot;
      const res = await fetch("/api/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: data.service.id,
          purchaserName: gift.purchaserName,
          purchaserPhone: gift.purchaserPhone,
          purchaserEmail: gift.purchaserEmail || undefined,
          recipientName: gift.recipientName,
          message: gift.message,
          template: gift.template,
          ...(withDate
            ? {
                date: localDateToKey(data.date!),
                startTime: data.timeSlot!.startTime,
              }
            : {}),
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("הבקשה נשלחה בהצלחה!");
        goNext();
      } else {
        toast.error(result.error || "שגיאה בשליחת הבקשה");
      }
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב מאוחר יותר");
    } finally {
      setIsGiftSubmitting(false);
    }
  };

  const giftDateDisplay = data.date?.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const renderStep = () => {
    switch (currentStepId) {
      case "whoFor":
        return <StepWhoFor selected={mode} onSelect={handleModeSelect} />;

      case "service":
        return (
          <StepServiceSelect
            services={services}
            selected={data.service}
            onSelect={(service) => {
              updateData({ service, date: null, timeSlot: null });
            }}
            onNext={goNext}
          />
        );

      case "date":
        if (!data.service) return null;
        return (
          <StepDateSelect
            serviceId={data.service.id}
            selected={data.date}
            onSelect={(date) => {
              updateData({ date, timeSlot: null });
            }}
            onNext={goNext}
            onBack={goBack}
            onSkip={mode === "gift" ? handleDateSkip : undefined}
            onChangeService={servicePreselected ? handleChangeService : undefined}
          />
        );

      case "time":
        if (!data.service || !data.date) return null;
        return (
          <StepTimeSelect
            serviceId={data.service.id}
            date={data.date}
            selected={data.timeSlot}
            onSelect={(timeSlot) => {
              updateData({ timeSlot });
            }}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case "details":
        return (
          <StepDetailsForm
            data={data}
            onUpdate={updateData}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case "confirm":
        return (
          <StepConfirmation
            data={data}
            onBack={goBack}
            onSuccess={(result) => {
              setBookingResult(result);
              goNext();
            }}
          />
        );

      case "medical":
        if (!bookingResult) return null;
        return (
          <StepMedicalForm
            bookingId={bookingResult.id as string}
            customerName={data.customerName}
            customerPhone={data.customerPhone}
            onSuccess={goNext}
            onSkip={goNext}
          />
        );

      case "giftDetails":
        return (
          <StepGiftDetails
            gift={gift}
            onUpdate={updateGift}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case "giftConfirm":
        return (
          <div>
            <h2 className="text-2xl font-bold text-text mb-2">אישור המתנה</h2>
            <p className="text-text-secondary mb-6">בדקו את הפרטים ושלחו את הבקשה</p>

            <Card className="max-w-md mx-auto space-y-4">
              <div className="flex items-start gap-3 pb-4 border-b border-border">
                <CalendarCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">שירות</p>
                  <p className="font-semibold text-text">{data.service?.name}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
                    <span>{formatDuration(data.service?.duration || 0)}</span>
                    <span>{formatPrice(data.service?.price || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 pb-4 border-b border-border">
                <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">מועד</p>
                  {!dateSkipped && data.date && data.timeSlot ? (
                    <>
                      <p className="font-semibold text-text">{giftDateDisplay}</p>
                      <p className="text-sm text-text-secondary" dir="ltr">
                        {data.timeSlot.startTime} - {data.timeSlot.endTime}
                      </p>
                    </>
                  ) : (
                    <p className="font-semibold text-text">
                      ללא תאריך — מקבל/ת המתנה יקבעו בעצמם
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 pb-4 border-b border-border">
                <Gift className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">מתנה עבור</p>
                  <p className="font-semibold text-text">{gift.recipientName}</p>
                  <p className="text-xs text-text-muted mt-1">
                    עיצוב:{" "}
                    {GIFT_TEMPLATE_OPTIONS.find((t) => t.value === gift.template)
                      ?.label ?? gift.template}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pb-4 border-b border-border">
                <User className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">הרוכש/ת</p>
                  <p className="font-semibold text-text">{gift.purchaserName}</p>
                </div>
              </div>

              <div
                className={cn(
                  "flex items-start gap-3",
                  gift.message && "pb-4 border-b border-border"
                )}
              >
                <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">טלפון</p>
                  <p className="font-semibold text-text" dir="ltr">
                    {gift.purchaserPhone}
                  </p>
                </div>
              </div>

              {gift.message && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-text-muted">הודעת ברכה</p>
                    <p className="text-sm text-text whitespace-pre-line">
                      {gift.message}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <p className="text-xs text-text-muted text-center max-w-md mx-auto mt-4">
              לאחר שליחת הבקשה הילה תיצור איתך קשר להסדרת התשלום, והגיפט קארד
              יישלח אליך לאחר האישור.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mt-4">
              <Button
                onClick={handleGiftSubmit}
                isLoading={isGiftSubmitting}
                fullWidth
                size="lg"
              >
                שליחת הבקשה
              </Button>
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={isGiftSubmitting}
                fullWidth
                className="sm:w-auto"
              >
                חזרה
              </Button>
            </div>
          </div>
        );

      case "success":
        if (mode === "gift") {
          return (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Gift className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-text mb-3">
                הבקשה נשלחה!
              </h2>
              <p className="text-text-secondary max-w-md mx-auto">
                הילה תיצור איתך קשר להסדרת התשלום ותשלח לך את כרטיס המתנה 🎁
              </p>
            </div>
          );
        }
        if (!bookingResult) return null;
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-text mb-3">
              הבקשה נשלחה בהצלחה!
            </h2>
            <p className="text-text-secondary mb-6">
              הבקשה שלכם התקבלה וממתינה לאישור. תקבלו עדכון ברגע שהתור יאושר.
            </p>
            <div className="bg-surface rounded-xl p-6 max-w-md mx-auto text-right space-y-2">
              <p>
                <span className="font-medium">שירות:</span>{" "}
                {data.service?.name}
              </p>
              <p>
                <span className="font-medium">תאריך:</span>{" "}
                {data.date?.toLocaleDateString("he-IL")}
              </p>
              <p>
                <span className="font-medium">שעה:</span>{" "}
                {data.timeSlot?.startTime} - {data.timeSlot?.endTime}
              </p>
              <p>
                <span className="font-medium">שם:</span> {data.customerName}
              </p>
              {data.isHomeVisit && (
                <p>
                  <span className="font-medium">סוג:</span> ביקור בית
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={generateCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <CalendarPlus className="h-4 w-4 ml-2" />
                  הוסיפו ליומן Google
                </Button>
              </a>
              <Button variant="outline" size="sm" onClick={downloadIcsFile}>
                <Download className="h-4 w-4 ml-2" />
                הוסיפו ליומן iPhone
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Progress Bar */}
      {currentStepId !== "success" && (
        <div className="mb-10">
          {/* Mobile: simple text indicator */}
          <div className="sm:hidden text-center mb-4">
            <span className="text-sm font-medium text-text">
              שלב {safeIndex + 1} מתוך {progressSteps.length}
            </span>
            <span className="text-sm text-text-muted mr-2">
              — {STEP_LABELS[currentStepId]}
            </span>
            <div className="mt-2 h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${((safeIndex + 1) / progressSteps.length) * 100}%`,
                }}
              />
            </div>
            {/* Mobile: tap completed steps */}
            {safeIndex > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                {progressSteps.slice(0, safeIndex).map((stepId, i) => (
                  <button
                    key={stepId}
                    onClick={() => goToStep(i)}
                    className="text-xs text-primary underline underline-offset-2 hover:text-primary-dark transition-colors"
                  >
                    {STEP_LABELS[stepId]}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Desktop: full step circles */}
          <div className="hidden sm:flex items-center justify-between">
            {progressSteps.map((stepId, i) => (
              <div key={stepId} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  disabled={i >= safeIndex}
                  className={cn(
                    "flex flex-col items-center group",
                    i < safeIndex && "cursor-pointer"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                      i < safeIndex
                        ? "bg-primary text-white group-hover:bg-primary-dark group-hover:scale-110"
                        : i === safeIndex
                          ? "bg-primary text-white ring-4 ring-primary/20 scale-110"
                          : "bg-surface text-text-muted border border-border"
                    )}
                  >
                    {i < safeIndex ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs mt-2 transition-colors",
                      i < safeIndex
                        ? "text-primary font-medium group-hover:text-primary-dark"
                        : i === safeIndex
                          ? "text-text font-medium"
                          : "text-text-muted"
                    )}
                  >
                    {STEP_LABELS[stepId]}
                  </span>
                </button>
                {i < progressSteps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-[3px] mx-3 rounded-full transition-all duration-500",
                      i < safeIndex ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Step */}
      <div key={currentStepId} className="animate-fadeIn">
        {renderStep()}
      </div>
    </div>
  );
}
