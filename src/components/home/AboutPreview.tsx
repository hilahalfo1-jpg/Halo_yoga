"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Award, GraduationCap, Heart } from "lucide-react";
import { motion } from "framer-motion";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";

const credentials = [
  { icon: <Award className="h-5 w-5" />, text: "מעסה רפואי מוסמך" },
  { icon: <GraduationCap className="h-5 w-5" />, text: "מורה ליוגה מוסמכת" },
  { icon: <Heart className="h-5 w-5" />, text: "ניסיון של למעלה מ-10 שנים" },
];

export default function AboutPreview() {
  const [aboutImage, setAboutImage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/site-images")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.about?.imagePath) setAboutImage(json.data.about.imagePath);
      })
      .catch(() => {});
  }, []);

  return (
    <Section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="order-2 lg:order-1"
        >
          <div className="relative">
            <div className="w-full aspect-square max-w-md mx-auto rounded-2xl bg-gradient-to-br from-primary-light/20 to-secondary/20 flex items-center justify-center overflow-hidden">
              {aboutImage ? (
                <Image
                  src={aboutImage}
                  alt="הילה - מעסה רפואית ומורה ליוגה"
                  fill
                  className="object-cover"
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
            קצת עליי
          </h2>

          <div className="space-y-4 text-text-secondary leading-relaxed mb-8">
            <p>
              שמי הילה, ואני מעסה רפואית מוסמכת ומורה ליוגה עם ניסיון של למעלה
              מעשר שנים בתחום הטיפול הגופני והרוחני.
            </p>
            <p>
              הגישה שלי משלבת ידע אנטומי מעמיק עם הקשבה אמיתית לגוף ולנפש.
              כל טיפול מותאם אישית, כי כל גוף הוא עולם ומלואו.
            </p>
            <p>
              אני מאמינה שריפוי אמיתי מתחיל כשהגוף והנפש עובדים יחד — וזה
              בדיוק מה שאני מביאה לכל טיפול ולכל שיעור.
            </p>
          </div>

          {/* Credentials */}
          <div className="flex flex-wrap gap-3 mb-8">
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
              קראו עוד
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </Section>
  );
}
