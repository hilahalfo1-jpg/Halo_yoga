import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import { SITE_NAME, CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "מדיניות פרטיות",
  description: `מדיניות הפרטיות של ${SITE_NAME} — כיצד אנו אוספים, משתמשים ומגנים על המידע שלכם.`,
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main aria-label="מדיניות פרטיות">
        <Section>
          <article className="max-w-3xl mx-auto" dir="rtl">
            <h1 className="text-3xl md:text-4xl font-bold text-text mb-8">
              מדיניות פרטיות
            </h1>

            <p className="text-text-secondary mb-6">
              עדכון אחרון: <time dateTime="2026-03">מרץ 2026</time>
            </p>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              1. כללי
            </h2>
            <p className="text-text-secondary mb-4 leading-relaxed">
              {SITE_NAME} (להלן: &quot;האתר&quot;) מכבד את פרטיות המשתמשים באתר.
              מדיניות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על מידע אישי
              שנמסר לנו באמצעות האתר.
            </p>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              2. מידע שאנו אוספים
            </h2>
            <p className="text-text-secondary mb-4 leading-relaxed">
              אנו אוספים מידע שאתם מוסרים לנו באופן ישיר בעת:
            </p>
            <ul className="list-disc list-inside text-text-secondary mb-4 space-y-2">
              <li>קביעת תור — שם, טלפון, אימייל, הערות</li>
              <li>שליחת טופס יצירת קשר — שם, טלפון, אימייל, הודעה</li>
              <li>כתיבת המלצה — שם, דירוג, תוכן ההמלצה</li>
            </ul>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              3. שימוש במידע
            </h2>
            <p className="text-text-secondary mb-4 leading-relaxed">
              המידע שנאסף משמש אותנו למטרות הבאות בלבד:
            </p>
            <ul className="list-disc list-inside text-text-secondary mb-4 space-y-2">
              <li>ניהול תורים ותיאום טיפולים</li>
              <li>יצירת קשר חוזר בעקבות פניות</li>
              <li>הצגת המלצות באתר (לאחר אישור)</li>
              <li>שיפור השירות והאתר</li>
            </ul>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              4. שיתוף מידע עם צדדים שלישיים
            </h2>
            <p className="text-text-secondary mb-4 leading-relaxed">
              אנו לא מוכרים, סוחרים או מעבירים את המידע האישי שלכם לצדדים
              שלישיים. המידע נשמר אצלנו בלבד ומשמש לצורכי מתן השירות.
            </p>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              5. אבטחת מידע
            </h2>
            <p className="text-text-secondary mb-4 leading-relaxed">
              אנו נוקטים באמצעי אבטחה סבירים כדי להגן על המידע האישי שלכם מפני
              גישה בלתי מורשית, שינוי, חשיפה או הרס.
            </p>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              6. זכויות המשתמש
            </h2>
            <p className="text-text-secondary mb-4 leading-relaxed">
              בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981, אתם זכאים לעיין
              במידע שנשמר אודותיכם ולבקש את תיקונו או מחיקתו. לבקשות כאלה,
              אנא פנו אלינו בפרטים שלהלן.
            </p>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              7. עוגיות (Cookies)
            </h2>
            <p className="text-text-secondary mb-4 leading-relaxed">
              האתר עשוי להשתמש בעוגיות לצורך תפעול תקין (כגון ניהול התחברות
              למערכת הניהול). אנו לא משתמשים בעוגיות למטרות פרסום או מעקב.
            </p>

            <h2 className="text-xl font-semibold text-text mt-8 mb-4">
              8. יצירת קשר
            </h2>
            <p className="text-text-secondary mb-4 leading-relaxed">
              לשאלות או בקשות בנוגע למדיניות הפרטיות, ניתן לפנות אלינו:
            </p>
            <ul className="list-disc list-inside text-text-secondary mb-4 space-y-2">
              <li>
                אימייל:{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-primary-dark hover:underline font-medium"
                  dir="ltr"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                טלפון:{" "}
                <a
                  href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`}
                  className="text-primary-dark hover:underline font-medium"
                  dir="ltr"
                >
                  {CONTACT_PHONE}
                </a>
              </li>
            </ul>
          </article>
        </Section>
      </main>
      <Footer />
    </>
  );
}
