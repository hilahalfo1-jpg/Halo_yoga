"use client";

import { useState } from "react";
import { Phone, MessageCircle, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import Section from "@/components/ui/Section";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import {
  CONTACT_PHONE,
  CONTACT_WHATSAPP,
  CONTACT_ADDRESS,
  WORKING_HOURS,
} from "@/lib/constants";

export default function QuickContact() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          subject: "פנייה מדף הבית",
        }),
      });

      if (res.ok) {
        toast.success("ההודעה נשלחה בהצלחה! נחזור אליכם בהקדם");
        setFormData({ name: "", phone: "", message: "" });
      } else {
        const data = await res.json();
        toast.error(data.error || "שגיאה בשליחת ההודעה");
      }
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב מאוחר יותר");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section bg="surface">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
          רוצים לשמוע עוד?
        </h2>
        <p className="text-text-secondary">
          השאירו פרטים ואחזור אליכם בהקדם, או צרו קשר ישירות
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="שם מלא"
            placeholder="השם שלכם"
            value={formData.name}
            onChange={(e) =>
              setFormData((p) => ({ ...p, name: e.target.value }))
            }
            required
          />
          <Input
            label="טלפון"
            type="tel"
            placeholder="050-1234567"
            value={formData.phone}
            onChange={(e) =>
              setFormData((p) => ({ ...p, phone: e.target.value }))
            }
            required
          />
          <Textarea
            label="הודעה"
            placeholder="ספרו לי במה אוכל לעזור..."
            rows={4}
            value={formData.message}
            onChange={(e) =>
              setFormData((p) => ({ ...p, message: e.target.value }))
            }
            required
          />
          <Button type="submit" isLoading={isLoading} fullWidth>
            שליחה
          </Button>
        </form>

        {/* Contact Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={`https://wa.me/${CONTACT_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-white border border-border hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-text text-sm">WhatsApp</p>
                <p className="text-xs text-text-muted">שלחו הודעה</p>
              </div>
            </a>
            <a
              href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`}
              className="flex items-center gap-3 p-4 rounded-xl bg-white border border-border hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-text text-sm">התקשרו</p>
                <p className="text-xs text-text-muted" dir="ltr">
                  {CONTACT_PHONE}
                </p>
              </div>
            </a>
          </div>

          {/* Address & Hours */}
          <div className="bg-white rounded-xl border border-border p-4 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-text text-sm">כתובת</p>
                <p className="text-sm text-text-secondary">{CONTACT_ADDRESS}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-text text-sm mb-1">שעות פעילות</p>
                {WORKING_HOURS.map((item) => (
                  <p key={item.day} className="text-sm text-text-secondary">
                    {item.day}: {item.hours}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
