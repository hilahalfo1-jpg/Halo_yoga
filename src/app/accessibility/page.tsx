import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import { SITE_NAME, CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "הצהרת נגישות",
  description: `הצהרת הנגישות של ${SITE_NAME} — מחויבותנו להנגשת האתר לכלל הציבור.`,
};

export default function AccessibilityPage() {
  return (
    <>
      <Header />
      <main>
        <Section>
          <div className="max-w-3xl mx-auto prose prose-lg" dir="rtl">
            <h1 className="text-3xl md:text-4xl font-bold text-text mb-8">
              הצהרת נגישות
            </h1>

            <p className="text-text-secondary mb-6">
              עדכון אחרון: מרץ 2026
            </p>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              מחויבותנו לנגישות
            </h2>
            <p className="text-text-secondary mb-4">
              {SITE_NAME} מחויב להנגשת האתר לכלל האוכלוסייה, לרבות אנשים עם
              מוגבלויות, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות
              נגישות לשירות), התשע&quot;ג-2013, ותקן הנגישות הישראלי (ת&quot;י
              5568).
            </p>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              מה עשינו כדי להנגיש את האתר
            </h2>
            <ul className="list-disc list-inside text-text-secondary mb-4 space-y-2">
              <li>שימוש בניגודיות צבעים מספקת בין טקסט לרקע</li>
              <li>מבנה כותרות היררכי ותקני</li>
              <li>טפסים עם תוויות (labels) מתאימות</li>
              <li>תמיכה בניווט מקלדת</li>
              <li>תמיכה בכיוון טקסט מימין לשמאל (RTL)</li>
              <li>טקסט חלופי (alt) לתמונות</li>
              <li>עיצוב רספונסיבי המותאם למגוון מכשירים</li>
            </ul>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              דרכי פנייה בנושא נגישות
            </h2>
            <p className="text-text-secondary mb-4">
              אם נתקלתם בבעיית נגישות באתר או שיש לכם הצעות לשיפור, אנא פנו
              אלינו ונטפל בכך בהקדם:
            </p>
            <ul className="list-disc list-inside text-text-secondary mb-4 space-y-2">
              <li>
                אימייל:{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-primary hover:underline"
                  dir="ltr"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                טלפון:{" "}
                <a
                  href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`}
                  className="text-primary hover:underline"
                  dir="ltr"
                >
                  {CONTACT_PHONE}
                </a>
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              פרטים נוספים
            </h2>
            <p className="text-text-secondary mb-4">
              אנו ממשיכים לפעול לשיפור הנגישות באתר ומעדכנים את הצהרת הנגישות
              בהתאם. נשמח לקבל משוב כדי לשפר את חוויית השימוש עבור כולם.
            </p>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
