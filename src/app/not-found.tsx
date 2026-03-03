import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-secondary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-text mb-3">
            העמוד לא נמצא
          </h2>
          <p className="text-text-secondary mb-8">
            מצטערים, העמוד שחיפשתם לא קיים או שהוסר.
          </p>
          <Link href="/">
            <Button>חזרה לדף הבית</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
