"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Award, GraduationCap, Heart } from "lucide-react";
import { motion } from "framer-motion";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

const defaultCredentials = [
  { icon: <Award className="h-5 w-5" />, text: "מעסה תאילנדי מוסמכת" },
  { icon: <GraduationCap className="h-5 w-5" />, text: "מדריכת יוגה ופילאטיס" },
  { icon: <Heart className="h-5 w-5" />, text: "גישה הוליסטית לגוף ונפש" },
];

const credentialIcons = [
  <Award key="a" className="h-5 w-5" />,
  <GraduationCap key="g" className="h-5 w-5" />,
  <Heart key="h" className="h-5 w-5" />,
];

export default function AboutPreview() {
  const [aboutImage, setAboutImage] = useState<string | null>(null);
  const { t } = useSiteContent();

  const credentials = [
    { icon: credentialIcons[0], text: t("about", "credential1", defaultCredentials[0].text) },
    { icon: credentialIcons[1], text: t("about", "credential2", defaultCredentials[1].text) },
    { icon: credentialIcons[2], text: t("about", "credential3", defaultCredentials[2].text) },
  ];

  useEffect(() => {
    fetch("/api/site-images", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.about?.imagePath) setAboutImage(json.data.about.imagePath);
      })
      .catch(() => {});
  }, []);

  return (
    <Section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="order-2 lg:order-1"
        >
          <div className="relative overflow-hidden">
            <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden">
              {aboutImage ? (
                <Image
                  src={aboutImage}
                  alt="הילה - מעסה רפואית ומורה ליוגה"
                  width={600}
                  height={800}
                  className="w-full h-auto rounded-2xl"
                />
              ) : (
                <div className="text-center p-8">
                  <div className="w-32 h-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Heart className="h-16 w-16 text-primary" strokeWidth={1} />
                  </div>
                  <p className="text-text-muted text-sm">תמונה תתווסף בקרוב</p>
                </div>
              )}
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-secondary/20 rounded-2xl -z-10" />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="order-1 lg:order-2"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
            {t("about", "title", "קצת עליי")}
          </h2>

          <div className="space-y-4 text-text-secondary leading-relaxed mb-8">
            {t("about", "paragraph1", "בעיסוי אני שואפת לעזור לגוף לשחרר ולפרק אנרגיות שלא משרתות אותו, לפתוח חסימות ולהחזיר תחושת זרימה טבעית.").split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {t("about", "paragraph2", "ביוגה אני מתמקדת בהכנסת אנרגיה חדשה, דרך תנועה, נשימה ונוכחות.").split("\n\n").map((p, i) => (
              <p key={`p2-${i}`}>{p}</p>
            ))}
            {t("about", "paragraph3", "דרך פילאטיס נלמד לחזק את הגוף בלי לקצר אותו, לחבר אותנו לעבודה ממוקדת, פעולות שיסייעו לנו ביום יום וישמרו עלינו בריאים וחזקים.").split("\n\n").map((p, i) => (
              <p key={`p3-${i}`}>{p}</p>
            ))}
          </div>

          {/* Credentials */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
            {credentials.map((cred, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface text-sm text-text"
              >
                <span className="text-primary">{cred.icon}</span>
                {cred.text}
              </div>
            ))}
          </div>

          <Link href="/about">
            <Button variant="outline" className="gap-2">
              {t("about", "buttonText", "קראו עוד")}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </Section>
  );
}
