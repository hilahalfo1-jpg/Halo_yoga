"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import StepServiceSelect from "./StepServiceSelect";
import StepDateSelect from "./StepDateSelect";
import StepTimeSelect from "./StepTimeSelect";
import StepDetailsForm from "./StepDetailsForm";
import StepConfirmation from "./StepConfirmation";
import type { ServiceItem, TimeSlot } from "@/types";

const STEPS = [
  { label: "בחירת שירות" },
  { label: "בחירת תאריך" },
  { label: "בחירת שעה" },
  { label: "פרטים אישיים" },
  { label: "אישור" },
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

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const updateData = (partial: Partial<BookingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Progress Bar */}
      {currentStep < 5 && (
        <div className="mb-10">
          <div className="flex items-center justify-between">
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
                      "text-xs mt-2 hidden sm:block",
                      i <= currentStep ? "text-text font-medium" : "text-text-muted"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 mt-[-1rem] sm:mt-0",
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
            goNext();
          }}
        />
      )}

      {currentStep === 1 && data.service && (
        <StepDateSelect
          serviceId={data.service.id}
          selected={data.date}
          onSelect={(date) => {
            updateData({ date, timeSlot: null });
            goNext();
          }}
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
            goNext();
          }}
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
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="h-10 w-10 text-success" />
          </div>
          <h2 className="text-3xl font-bold text-text mb-3">
            התור נקבע בהצלחה!
          </h2>
          <p className="text-text-secondary mb-6">
            פרטי התור נשלחו. ניתן לבטל עד 24 שעות לפני המועד.
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
        </div>
      )}
    </div>
  );
}
