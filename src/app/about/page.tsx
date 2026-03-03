import type { Metadata } from "next";
import Link from "next/link";
import { Award, GraduationCap, Heart, BookOpen, Leaf, Shield } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import AboutImage from "@/components/about/AboutImage";

export const metadata: Metadata = {
  title: "אודות",
  description: "הכירו את הילה — מעסה רפואית מוסמכת ומורה ליוגה עם ניסיון של למעלה מ-10 שנים בתחום הטיפול הגופני.",
};

const certifications = [
  { icon: <Award className="h-6 w-6" />, title: "עיסוי רפואי מוסמך", year: "2014" },
  { icon: <GraduationCap className="h-6 w-6" />, title: "הוראת יוגה — תעודת 500 שעות", year: "2016" },
  { icon: <BookOpen className="h-6 w-6" />, title: "רפלקסולוגיה קלינית", year: "2015" },
  { icon: <Shield className="h-6 w-6" />, title: "שיקום פציעות ספורט", year: "2018" },
  { icon: <Leaf className="h-6 w-6" />, title: "יוגה טיפולית", year: "2020" },
  { icon: <Heart className="h-6 w-6" />, title: "טיפול בכאב כרוני", year: "2021" },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <div className="relative h-[40vh] min-h-[300px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-24 w-full">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              אודות
            </h1>
            <p className="text-white/70 text-lg">
              הסיפור שלי, הדרך שלי, הגישה שלי
            </p>
          </div>
        </div>

        {/* Bio */}
        <Section>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
              {/* Profile Image */}
              <div className="lg:col-span-2">
                <AboutImage />
              </div>

              {/* Text */}
              <div className="lg:col-span-3 space-y-6">
                <h2 className="text-3xl font-bold text-text">שלום, אני הילה</h2>

                <div className="space-y-4 text-text-secondary leading-relaxed">
                  <p>
                    מאז שאני זוכרת את עצמי, הגוף האנושי ריתק אותי. הדרך שבה שרירים,
                    עצמות ואנרגיה עובדים יחד ליצור תנועה, הרגשה וחיים. הסקרנות הזו
                    הובילה אותי ללמוד עיסוי רפואי, ומשם הדרך ליוגה הייתה טבעית —
                    שתי הדרכים שמחברות בין גוף לנפש.
                  </p>
                  <p>
                    למעלה מעשר שנים אני מלווה אנשים בדרך לריפוי, לשחרור כאב,
                    ולהרגשה טובה יותר בגוף שלהם. כל אדם שמגיע אליי מביא איתו סיפור
                    אחר — כאב גב שלא נותן לישון, שריר תפוס אחרי אימון, או פשוט
                    צורך עמוק בהרפיה ושקט.
                  </p>
                  <p>
                    הגישה שלי משלבת ידע אנטומי מעמיק עם הקשבה אמיתית. אני לא מאמינה
                    בטיפולים שבלוניים — כל מפגש מותאם אישית, כי כל גוף הוא עולם
                    ומלואו. בין אם זה עיסוי רקמות עמוקות לספורטאי, שיעור יוגה
                    מרגיע, או תוכנית שיקום לכאבי גב — המטרה תמיד אותה מטרה: שתצאו
                    מרגישים טוב יותר ממה שנכנסתם.
                  </p>
                </div>

                {/* Quote */}
                <blockquote className="border-r-4 border-primary pr-6 py-2 my-8">
                  <p className="text-lg text-text italic leading-relaxed">
                    &ldquo;אני מאמינה שריפוי אמיתי מתחיל כשהגוף והנפש עובדים
                    יחד. המגע שלי הוא הגשר ביניהם.&rdquo;
                  </p>
                </blockquote>

                {/* Approach */}
                <h3 className="text-2xl font-semibold text-text pt-4">
                  הגישה שלי
                </h3>
                <div className="space-y-4 text-text-secondary leading-relaxed">
                  <p>
                    בכל טיפול אני משלבת כמה עקרונות מנחים:
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-text">הקשבה לגוף</strong> — לפני
                        שאני נוגעת, אני מקשיבה. לסיפור שלכם, לתנוחת הגוף, לנקודות
                        הכאב.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-text">התאמה אישית</strong> — אין
                        שני טיפולים זהים. כל מפגש נבנה בהתאם למה שהגוף שלכם צריך
                        באותו רגע.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-text">גישה הוליסטית</strong> — אני
                        מסתכלת על התמונה הרחבה. לא רק על השריר הכואב, אלא על כל מה
                        שמסביב — תנוחה, מתח, אורח חיים.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-text">כלים להמשך</strong> — אני
                        נותנת לכם תרגילים וטיפים להמשך עצמאי, כדי שתוכלו לשמור על
                        ההרגשה הטובה גם בבית.
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
