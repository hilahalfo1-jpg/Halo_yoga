import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import { SITE_NAME } from "@/lib/constants";
import { getSiteContent } from "@/lib/getSiteContent";
import { TERMS_TITLE, TERMS_BODY } from "@/lib/terms-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "תקנון טיפולים והצהרת בריאות",
  description: `תקנון הטיפולים והצהרת הבריאות של ${SITE_NAME} — תנאי קבלת הטיפול, חובת גילוי רפואי ושמירה על פרטיות המידע.`,
};

export default async function TermsPage() {
  const content = await getSiteContent();
  const terms = content["terms"] ?? {};
  const title = terms.title || TERMS_TITLE;
  const body = terms.body || TERMS_BODY;

  // Plain text: paragraphs separated by blank lines, numbering kept as written
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <Header />
      <main aria-label="תקנון טיפולים והצהרת בריאות">
        <Section>
          <article className="max-w-3xl mx-auto" dir="rtl">
            <h1 className="text-3xl md:text-4xl font-bold text-text mb-8">
              {title}
            </h1>

            {paragraphs.map((paragraph, i) => (
              <p
                key={i}
                className="text-text-secondary mb-4 leading-relaxed whitespace-pre-wrap"
              >
                {paragraph}
              </p>
            ))}
          </article>
        </Section>
      </main>
      <Footer />
    </>
  );
}
