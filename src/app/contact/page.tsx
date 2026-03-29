import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import ContactForm from "./ContactForm";
import ContactHero from "@/components/contact/ContactHero";
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
        <ContactHero />

        <Section>
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
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

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(CONTACT_ADDRESS)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-4 rounded-xl bg-white border border-border hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-secondary-dark" />
                  </div>
                  <div>
                    <p className="font-medium text-text">כתובת</p>
                    <p className="text-sm text-text-secondary">
                      {CONTACT_ADDRESS}
                    </p>
                  </div>
                </a>

                {/* Working hours */}
                <div className="bg-surface rounded-xl p-4 sm:p-6">
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

            {/* Map */}
            <div className="mt-10 lg:mt-16 rounded-xl overflow-hidden border border-border">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(CONTACT_ADDRESS)}&output=embed&hl=he`}
                width="100%"
                height="350"
                className="lg:h-[400px]"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="מיקום על המפה"
              />
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
