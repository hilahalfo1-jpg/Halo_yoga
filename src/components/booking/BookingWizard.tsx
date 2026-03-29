"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Clock, CalendarPlus, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import StepServiceSelect from "./StepServiceSelect";
import StepDateSelect from "./StepDateSelect";
import StepTimeSelect from "./StepTimeSelect";
import StepDetailsForm from "./StepDetailsForm";
import StepConfirmation from "./StepConfirmation";
import StepMedicalForm from "./StepMedicalForm";
import type { ServiceItem, TimeSlot } from "@/types";

const STEPS = [
  { label: "בחירת שירות" },
  { label: "בחירת תאריך" },
  { label: "בחירת שעה" },
  { label: "פרטים אישיים" },
  { label: "אישור" },
  { label: "הצהרת בריאות" },
];

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

export default function BookingWizard({ services }: BookingWizardProps) {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [bookingResult, setBookingResult] = useState<Record<string, unknown> | null>(null);

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

  // Pre-select service from query param
  useEffect(() => {
    const serviceSlug = searchParams.get("service");
    if (serviceSlug && !data.service) {
      const found = services.find((s) => s.slug === serviceSlug);
      if (found) {
        setData((prev) => ({ ...prev, service: found }));
        setCurrentStep(1);
      }
    }
  }, [searchParams, services, data.service]);

  const generateCalendarUrl = () => {
    if (!data.service || !data.date || !data.timeSlot) return "";
    const [startH, startM] = data.timeSlot.startTime.split(":").map(Number);
    const [endH, endM] = data.timeSlot.endTime.split(":").map(Number);
    const start = new Date(data.date);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(data.date);
    end.setHours(endH, endM, 0, 0);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const title = encodeURIComponent(`${data.service.name} - HALO`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}`;
  };

  const downloadIcsFile = () => {
    if (!data.service || !data.date || !data.timeSlot) return;
    const [startH, startM] = data.timeSlot.startTime.split(":").map(Number);
    const [endH, endM] = data.timeSlot.endTime.split(":").map(Number);
    const start = new Date(data.date);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(data.date);
    end.setHours(endH, endM, 0, 0);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${data.service.name} - HALO`,
      "END:VEVENT",
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

  const goNext = () => {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateData = (partial: Partial<BookingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Progress Bar */}
      {currentStep < 6 && (
        <div className="mb-10">
          {/* Mobile: simple text indicator */}
          <div className="sm:hidden text-center mb-4">
            <span className="text-sm font-medium text-text">
              שלב {currentStep + 1} מתוך {STEPS.length}
            </span>
            <span className="text-sm text-text-muted mr-2">
              — {STEPS[currentStep].label}
            </span>
            <div className="mt-2 h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
          {/* Desktop: full step circles */}
          <div className="hidden sm:flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                      i < currentStep
                        ? "bg-primary text-white"
                        : i === currentStep
                          ? "bg-primary text-white ring-4 ring-primary/20"
                          : "bg-surface text-text-muted border border-border"
                    )}
                  >
                    {i < currentStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs mt-2",
                      i <= currentStep ? "text-text font-medium" : "text-text-muted"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2",
                      i < currentStep ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      {currentStep === 0 && (
        <StepServiceSelect
          services={services}
          selected={data.service}
          onSelect={(service) => {
            updateData({ service, date: null, timeSlot: null });
          }}
          onNext={goNext}
        />
      )}

      {currentStep === 1 && data.service && (
        <StepDateSelect
          serviceId={data.service.id}
          selected={data.date}
          onSelect={(date) => {
            updateData({ date, timeSlot: null });
          }}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {currentStep === 2 && data.service && data.date && (
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
      )}

      {currentStep === 3 && (
        <StepDetailsForm
          data={data}
          onUpdate={updateData}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {currentStep === 4 && (
        <StepConfirmation
          data={data}
          onBack={goBack}
          onSuccess={(result) => {
            setBookingResult(result);
            setCurrentStep(5);
          }}
        />
      )}

      {currentStep === 5 && bookingResult && (
        <StepMedicalForm
          bookingId={bookingResult.id as string}
          customerName={data.customerName}
          customerPhone={data.customerPhone}
          onSuccess={() => setCurrentStep(6)}
          onSkip={() => setCurrentStep(6)}
        />
      )}

      {currentStep === 6 && bookingResult && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="h-10 w-10 text-warning" />
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
      )}
    </div>
  );
}
