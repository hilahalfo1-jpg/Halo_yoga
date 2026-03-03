import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import ContactForm from "./ContactForm";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import {
  CONTACT_PHONE,
  CONTACT_EMAIL,
  CONTACT_ADDRESS,
  CONTACT_WHATSAPP,
  WORKING_HOURS,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "צור קשר",
  description: "צרו קשר עם הילה לשאלות, ייעוץ או קביעת תור. טלפון, וואטסאפ, אימייל.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <div className="relative h-[35vh] min-h-[260px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-24 w-full">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              צור קשר
            </h1>
            <p className="text-white/70 text-lg">
              נשמח לשמוע מכם ולענות על כל שאלה
            </p>
          </div>
        </div>

        <Section>
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Form */}
              <div>
                <h2 className="text-2xl font-bold text-text mb-6">
                  שלחו לנו הודעה
                </h2>
                <ContactForm />
              </div>

              {/* Info */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text mb-6">
                  פרטי התקשרות
                </h2>

                {/* Contact cards */}
                <a
                  href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-border hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text">טלפון</p>
                    <p className="text-sm text-text-secondary" dir="ltr">
                      {CONTACT_PHONE}
                    </p>
                  </div>
                </a>

                <a
                  href={`https://wa.me/${CONTACT_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-border hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-text">WhatsApp</p>
                    <p className="text-sm text-text-secondary">שלחו הודעה ישירה</p>
                  </div>
                </a>

                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-border hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="font-medium text-text">אימייל</p>
                    <p className="text-sm text-text-secondary" dir="ltr">
                      {CONTACT_EMAIL}
                    </p>
                  </div>
                </a>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-border">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-secondary-dark" />
                  </div>
                  <div>
                    <p className="font-medium text-text">כתובת</p>
                    <p className="text-sm text-text-secondary">
                      {CONTACT_ADDRESS}
                    </p>
                  </div>
                </div>

                {/* Working hours */}
                <div className="bg-surface rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-text">שעות פעילות</h3>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {WORKING_HOURS.map((item) => (
                        <tr key={item.day} className="border-b border-border/50 last:border-0">
                          <td className="py-2 text-text font-medium">
                            {item.day}
                          </td>
                          <td className="py-2 text-text-secondary text-left" dir="ltr">
                            {item.hours}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
