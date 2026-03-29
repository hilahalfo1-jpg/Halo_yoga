import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-8xl sm:text-9xl font-bold text-primary/30 mb-2 select-none">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-text mb-3">
            העמוד לא נמצא
          </h2>
          <p className="text-text-secondary mb-8 leading-relaxed">
            מצטערים, העמוד שחיפשתם לא קיים או שהוסר.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button>חזרה לדף הבית</Button>
            </Link>
            <Link href="/booking">
              <Button variant="outline">קביעת תור</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
