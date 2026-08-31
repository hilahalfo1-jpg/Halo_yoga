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
} from "@/lib/constants";
import { getSiteContent } from "@/lib/getSiteContent";
import { getWorkingHours } from "@/lib/working-hours";
import { normalizeWhatsAppNumber } from "@/lib/phone";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "צור קשר",
  description: "צרו קשר עם הילה לשאלות, ייעוץ או קביעת תור. טלפון, וואטסאפ, אימייל.",
};

export default async function ContactPage() {
  const [content, workingHours] = await Promise.all([
    getSiteContent(),
    getWorkingHours(),
  ]);

  const info = content["contact_info"] ?? {};
  const phone = info.phone || CONTACT_PHONE;
  // CMS value may be typed as "054-3135182" — wa.me links need bare 972… digits
  const whatsapp = normalizeWhatsAppNumber(info.whatsapp || "") || CONTACT_WHATSAPP;
  const email = info.email || CONTACT_EMAIL;
  const address = info.address || CONTACT_ADDRESS;

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
                  href={`tel:${phone.replace(/-/g, "")}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-border hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text">טלפון</p>
                    <p className="text-sm text-text-secondary" dir="ltr">
                      {phone}
                    </p>
                  </div>
                </a>

                <a
                  href={`https://wa.me/${whatsapp}`}
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
                  href={`mailto:${email}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-border hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="font-medium text-text">אימייל</p>
                    <p className="text-sm text-text-secondary" dir="ltr">
                      {email}
                    </p>
                  </div>
                </a>

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
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
                      {address}
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
                      {workingHours.map((item) => (
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
                src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&hl=he`}
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
