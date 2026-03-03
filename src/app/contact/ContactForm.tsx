"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { contactSchema, type ContactFormData } from "@/lib/validations";
import { CONTACT_SUBJECTS } from "@/lib/constants";

export default function ContactForm() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success("ההודעה נשלחה בהצלחה! נחזור אליכם בהקדם");
        reset();
      } else {
        const result = await res.json();
        toast.error(result.error || "שגיאה בשליחת ההודעה");
      }
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב מאוחר יותר");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="שם מלא *"
        placeholder="השם המלא שלכם"
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        label="טלפון *"
        type="tel"
        placeholder="050-1234567"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Input
        label="אימייל"
        type="email"
        placeholder="your@email.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Select
        label="נושא"
        options={CONTACT_SUBJECTS}
        placeholder="בחרו נושא..."
        error={errors.subject?.message}
        {...register("subject")}
      />
      <Textarea
        label="הודעה *"
        placeholder="ספרו לנו במה נוכל לעזור..."
        rows={5}
        error={errors.message?.message}
        {...register("message")}
      />
      <Button type="submit" isLoading={isLoading} fullWidth size="lg">
        שליחת הודעה
      </Button>
    </form>
  );
}
