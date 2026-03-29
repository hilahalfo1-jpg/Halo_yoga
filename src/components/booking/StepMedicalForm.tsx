"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Heart,
  Upload,
  FileCheck,
  AlertCircle,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Card from "@/components/ui/Card";
import SignaturePad from "./SignaturePad";

const MEDICAL_CONDITIONS = [
  { id: "heart", label: "בעיות לב / לחץ דם" },
  { id: "diabetes", label: "סוכרת" },
  { id: "back", label: "בעיות גב / פריצת דיסק" },
  { id: "injuries", label: "פציעות / ניתוחים אחרונים" },
  { id: "pregnancy", label: "הריון" },
  { id: "allergies", label: "אלרגיות" },
  { id: "chronic", label: "מחלות כרוניות" },
  { id: "medications", label: "נוטל/ת תרופות באופן קבוע" },
  { id: "other", label: "אחר" },
];

const DECLARATIONS = [
  "מסרתי מידע רפואי נכון ומלא ככל הידוע לי",
  "ידוע לי כי טיפול עיסוי אינו מהווה תחליף לטיפול רפואי",
  "אני נושא/ת באחריות לעדכן על כל שינוי במצבי הבריאותי",
  "אני נותן/ת הסכמתי לקבלת טיפול עיסוי",
];

interface StepMedicalFormProps {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  onSuccess: () => void;
  onSkip: () => void;
}

export default function StepMedicalForm({
  bookingId,
  customerName,
  customerPhone,
  onSuccess,
  onSkip,
}: StepMedicalFormProps) {
  const [idNumber, setIdNumber] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [otherCondition, setOtherCondition] = useState("");
  const [conditionDetails, setConditionDetails] = useState("");
  const [declarations, setDeclarations] = useState<boolean[]>(
    new Array(DECLARATIONS.length).fill(false)
  );
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [medicalDocFile, setMedicalDocFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCondition = (id: string) => {
    setConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleDeclaration = (index: number) => {
    setDeclarations((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const allDeclared = declarations.every(Boolean);

  const handleMedicalDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("סוג קובץ לא נתמך. השתמשו ב-PDF, JPG או PNG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי. מקסימום 5MB");
      return;
    }
    setMedicalDocFile(file);
  };

  const handleSubmit = async () => {
    if (!allDeclared) {
      toast.error("יש לאשר את כל ההצהרות לפני השליחה");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload medical document if provided
      let medicalDocUrl: string | null = null;
      if (medicalDocFile) {
        const formData = new FormData();
        formData.append("file", medicalDocFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadResult = await uploadRes.json();
          medicalDocUrl = uploadResult.url;
        } else {
          toast.error("שגיאה בהעלאת המסמך הרפואי");
          setIsSubmitting(false);
          return;
        }
      }

      // Build conditions list
      const finalConditions = conditions.map((id) => {
        if (id === "other") return `אחר: ${otherCondition}`;
        return MEDICAL_CONDITIONS.find((c) => c.id === id)?.label || id;
      });

      // Submit medical form
      const res = await fetch("/api/medical-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          idNumber: idNumber || null,
          conditions: finalConditions,
          conditionDetails: conditionDetails || null,
          signatureData,
          medicalDocUrl,
        }),
      });

      if (res.ok) {
        toast.success("הטופס הרפואי נשלח בהצלחה");
        onSuccess();
      } else {
        const result = await res.json();
        toast.error(result.error || "שגיאה בשליחת הטופס");
      }
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Heart className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-text mb-2">הצהרת בריאות</h2>
        <p className="text-text-secondary">
          למען בטיחותכם, אנא מלאו את הטופס הבא
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Pre-filled info */}
        <Card className="p-4 bg-surface/50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">שם:</span>{" "}
              <span className="font-medium text-text">{customerName}</span>
            </div>
            <div>
              <span className="text-text-muted">טלפון:</span>{" "}
              <span className="font-medium text-text" dir="ltr">
                {customerPhone}
              </span>
            </div>
          </div>
        </Card>

        {/* ID Number */}
        <Input
          label="תעודת זהות (אופציונלי)"
          placeholder="מספר תעודת זהות"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          dir="ltr"
        />

        {/* Medical Conditions */}
        <div>
          <label className="block text-sm font-medium text-text mb-3">
            מצב רפואי — סמנו את הרלוונטי
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MEDICAL_CONDITIONS.map((condition) => (
              <button
                key={condition.id}
                type="button"
                onClick={() => toggleCondition(condition.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-right text-sm ${
                  conditions.includes(condition.id)
                    ? "border-primary bg-primary/5 text-text"
                    : "border-border hover:border-text-muted text-text-secondary"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                    conditions.includes(condition.id)
                      ? "bg-primary border-primary text-white"
                      : "border-border"
                  }`}
                >
                  {conditions.includes(condition.id) && (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                {condition.label}
              </button>
            ))}
          </div>
        </div>

        {/* Other condition text input */}
        {conditions.includes("other") && (
          <Input
            label='פירוט "אחר"'
            placeholder="תארו את המצב הרפואי..."
            value={otherCondition}
            onChange={(e) => setOtherCondition(e.target.value)}
          />
        )}

        {/* Condition details textarea */}
        {conditions.length > 0 && (
          <Textarea
            label="פירוט נוסף על המצב הרפואי"
            placeholder="ניתן לפרט על המצב הרפואי, תרופות, הגבלות תנועה וכו'..."
            rows={3}
            value={conditionDetails}
            onChange={(e) => setConditionDetails(e.target.value)}
          />
        )}

        {/* Declarations */}
        <div>
          <label className="block text-sm font-medium text-text mb-3">
            הצהרות — יש לאשר את כולן
          </label>
          <div className="space-y-2">
            {DECLARATIONS.map((text, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDeclaration(i)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-right text-sm ${
                  declarations[i]
                    ? "border-success bg-success/5 text-text"
                    : "border-border hover:border-text-muted text-text-secondary"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-colors ${
                    declarations[i]
                      ? "bg-success border-success text-white"
                      : "border-border"
                  }`}
                >
                  {declarations[i] && (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                {text}
              </button>
            ))}
          </div>
          {!allDeclared && (
            <p className="mt-2 text-xs text-text-muted flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              יש לאשר את כל ההצהרות לפני שליחת הטופס
            </p>
          )}
        </div>

        {/* Signature Pad */}
        <SignaturePad onChange={setSignatureData} />

        {/* Medical Document Upload */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            העלאת מסמך רפואי (אופציונלי)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleMedicalDocChange}
            className="hidden"
          />
          {medicalDocFile ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface/50">
              <FileCheck className="h-5 w-5 text-success flex-shrink-0" />
              <span className="text-sm text-text flex-1 truncate">
                {medicalDocFile.name}
              </span>
              <button
                type="button"
                onClick={() => setMedicalDocFile(null)}
                className="p-1 rounded-full hover:bg-surface"
              >
                <X className="h-4 w-4 text-text-muted" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-sm text-text-muted"
            >
              <Upload className="h-5 w-5" />
              PDF, JPG או PNG (עד 5MB)
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!allDeclared}
            fullWidth
          >
            שליחת הצהרת בריאות
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={isSubmitting}
            fullWidth
            className="sm:w-auto"
          >
            דלג
          </Button>
        </div>
      </div>
    </div>
  );
}
