import type { Metadata } from "next";
import Link from "next/link";
import { Award, GraduationCap, Heart, Leaf } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import AboutImage from "@/components/about/AboutImage";

export const metadata: Metadata = {
  title: "אודות",
  description: "הכירו את הילה — מטפלת בעיסוי תאילנדי ומדריכת יוגה, מתוך חיבור עמוק לגוף ולאנרגיה שבו.",
};

const certifications = [
  { icon: <Award className="h-6 w-6" />, title: "עיסוי תאילנדי מוסמך", year: "" },
  { icon: <GraduationCap className="h-6 w-6" />, title: "הדרכת יוגה", year: "" },
  { icon: <Heart className="h-6 w-6" />, title: "חיבור לגוף ולאנרגיה", year: "" },
  { icon: <Leaf className="h-6 w-6" />, title: "איזון גוף ונפש", year: "" },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <div className="relative h-[40vh] min-h-[260px] sm:min-h-[300px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 pt-20 sm:pt-24 w-full">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              אודות
            </h1>
            <p className="text-white/70 text-base md:text-lg">
              הסיפור שלי, הדרך שלי, הגישה שלי
            </p>
          </div>
        </div>

        {/* Bio */}
        <Section>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
              {/* Profile Image */}
              <div className="lg:col-span-2">
                <AboutImage />
              </div>

              {/* Text */}
              <div className="lg:col-span-3 space-y-6">
                <h2 className="text-3xl font-bold text-text">שלום, אני הילה</h2>

                <div className="space-y-4 text-text-secondary leading-relaxed">
                  <p>
                    אני מטפלת בעיסוי תאילנדי ומדריכת יוגה ופילאטיס, מתוך חיבור עמוק לגוף
                    ולאנרגיה שבו.
                  </p>
                  <p>
                    בעיסוי אני שואפת לעזור לגוף לשחרר ולפרק אנרגיות שלא משרתות
                    אותו, לפתוח חסימות ולהחזיר תחושת זרימה טבעית.
                  </p>
                  <p>
                    ביוגה אני מתמקדת בהכנסת אנרגיה חדשה, דרך תנועה, נשימה ונוכחות,
                    שמחזקת ומאזנת את הגוף והנפש.
                  </p>
                  <p>
                    דרך פילאטיס נלמד לחזק את הגוף בלי לקצר אותו, לחבר אותנו
                    לעבודה ממוקדת, פעולות שיסייעו לנו ביום יום וישמרו עלינו בריאים וחזקים.
                  </p>
                </div>

                {/* Quote */}
                <blockquote className="border-r-4 border-primary pr-6 py-2 my-8">
                  <p className="text-lg text-text italic leading-relaxed">
                    &ldquo;עבורי, האיזון של הגוף הוא אלמנט מרכזי וחשוב מאוד
                    בדרך לבריאות ולהרגשה טובה.&rdquo;
                  </p>
                </blockquote>

                {/* Approach */}
                <h3 className="text-2xl font-semibold text-text pt-4">
                  הגישה שלי
                </h3>
                <div className="space-y-4 text-text-secondary leading-relaxed">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-text">שחרור ופירוק</strong> — בעיסוי
                        התאילנדי אני עוזרת לגוף לשחרר אנרגיות שלא משרתות אותו
                        ולפתוח חסימות.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-text">זרימה טבעית</strong> — להחזיר
                        לגוף תחושת זרימה טבעית ואיזון פנימי.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-text">אנרגיה חדשה</strong> — ביוגה
                        אני מתמקדת בהכנסת אנרגיה חדשה דרך תנועה, נשימה ונוכחות.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-text">איזון הגוף והנפש</strong> — חיזוק
                        ואיזון הגוף והנפש כאחד, כבסיס לבריאות ולהרגשה טובה.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Certifications */}
        <Section bg="surface">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-text text-center mb-10">
              הכשרות והסמכות
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certifications.map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 bg-white rounded-xl border border-border p-4"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {cert.icon}
                  </div>
                  <div>
                    <p className="font-medium text-text text-sm">{cert.title}</p>
                    <p className="text-xs text-text-muted">{cert.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* CTA */}
        <Section>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-text mb-4">
              מוכנים להתחיל?
            </h2>
            <p className="text-text-secondary mb-8 max-w-lg mx-auto">
              קבעו את הטיפול הראשון שלכם ותרגישו את ההבדל
            </p>
            <Link href="/booking">
              <Button size="lg">קביעת תור ראשון</Button>
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
