import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Admin User ─────────────────────────
  const hashedPassword = await bcrypt.hash("Admin123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@healing.co.il" },
    update: {},
    create: {
      email: "admin@healing.co.il",
      hashedPassword,
      name: "הילה",
      role: "ADMIN",
    },
  });
  console.log("Admin user created");

  // ─── Services ───────────────────────────
  const services = [
    {
      slug: "deep-tissue",
      name: "עיסוי רקמות עמוק",
      category: "MASSAGE",
      duration: 70,
      price: 350,
      shortDesc: "טיפול בשמן חם ממוקד בשכבות העמוקות של השריר",
      description: "עיסוי רקמות עמוק בשמן חם, טיפול ממוקד בשכבות העמוקות של השריר. מסייע בשחרור מתחים כרוניים, הידבקויות ומגבלות תנועה.",
      sortOrder: 1,
    },
    {
      slug: "thai-massage",
      name: "עיסוי תאילנדי",
      category: "MASSAGE",
      duration: 70,
      price: 300,
      shortDesc: "עיסוי תאילנדי מסורתי – הרגעת שרירים, תנועה למפרקים ומתיחות",
      description: "עיסוי תאילנדי מסורתי המתמקד בהרגעת השרירים, הכנסת תנועה למפרקים ומתיחות מאריכות גוף.",
      sortOrder: 2,
    },
    {
      slug: "medical-massage",
      name: "עיסוי רפואי – אקוספורה תאילנדית",
      category: "MASSAGE",
      duration: 60,
      price: 300,
      shortDesc: "שיטה מבוססת נקודות לחיצה לבעיות ספציפיות בגוף",
      description: "אקוספורה תאילנדית – שיטה מבוססת נקודות לחיצה לבעיות ספציפיות בגוף. מבוצעת בבתי חולים בתאילנד וניתנת לטיפול ביותר מ-60 בעיות בגוף. יש ליצור קשר לבדיקת התאמה.",
      sortOrder: 3,
    },
    {
      slug: "foot-massage",
      name: "פוט מאסז׳",
      category: "MASSAGE",
      duration: 40,
      price: 200,
      shortDesc: "עיסוי כפות רגליים הכולל שהייה במי מלח חמים",
      description: "עיסוי בכפות הרגליים הכולל 10 דקות של שהייה במי מלח חמים המטהרים את הגוף, עיסוי בהתמקדות על נקודות לחיצה רלוונטיות ומתיחות לאורך הרגליים.",
      sortOrder: 4,
    },
    {
      slug: "private-yoga",
      name: "שיעור יוגה פרטי",
      category: "YOGA",
      duration: 60,
      price: 150,
      shortDesc: "שיעור מותאם אישית הכולל ציוד, עם אפשרות הגעה לבית הלקוח",
      description: "שיעור יוגה מותאם אישית הכולל ציוד ובמידת הצורך הגעה לבית הלקוח. מתאים לכולם – גיל שלישי, פיברומיאלגיה, הריון ועוד.",
      sortOrder: 5,
    },
    {
      slug: "wellness-retreat",
      name: "ריטריט יום חוויתי",
      category: "YOGA",
      duration: 0,
      price: 0,
      shortDesc: "אירועי יום בסגנון Wellness לקבוצה של 8 אנשים ומעלה",
      description: "מארגנת אירועי יום בסגנון Wellness לקבוצה של 8 אנשים ומעלה. לפרטים והתאמת אירוע אנא צרו קשר.",
      sortOrder: 6,
    },
    {
      slug: "rehab-pilates",
      name: "פילאטיס שיקומי",
      category: "PILATES",
      duration: 60,
      price: 180,
      shortDesc: "שיעור פרטי בהתאמה אישית – גיל שלישי, הריון, אוסטאופורוזיס",
      description: "שיעור פילאטיס פרטי בהתאמה אישית, מתאים לגיל השלישי, הריון, אוסטאופורוזיס, פיברומיאלגיה ועוד. כולל ציוד והגעה עד בית הלקוח.",
      sortOrder: 7,
    },
    {
      slug: "sculpt-pilates",
      name: "פילאטיס מחטב",
      category: "PILATES",
      duration: 60,
      price: 140,
      shortDesc: "שיעור קבוצתי (עד 4 משתתפים) לחיטוב וחיזוק הגוף",
      description: "שיעור פילאטיס (עד 4 משתתפים) כולל ציוד ואופציה להגעה עד בית הלקוח. מתמקד בחיטוב הגוף, הארכה וחיזוק השרירים.",
      sortOrder: 8,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
  }
  console.log(`${services.length} services created`);

  // ─── Availability Rules ─────────────────
  const existingRules = await prisma.availabilityRule.count();
  if (existingRules === 0) {
    const rules = [
      { dayOfWeek: 0, startTime: "11:00", endTime: "20:00" },
      { dayOfWeek: 1, startTime: "07:00", endTime: "20:00" },
      { dayOfWeek: 3, startTime: "07:00", endTime: "20:00" },
      { dayOfWeek: 4, startTime: "07:00", endTime: "20:00" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 6, startTime: "11:00", endTime: "18:30" },
    ];
    for (const rule of rules) {
      await prisma.availabilityRule.create({
        data: { ...rule, isActive: true },
      });
    }
    console.log("Availability rules created");
  }

  // ─── Reviews ────────────────────────────
  const existingReviews = await prisma.review.count();
  if (existingReviews === 0) {
    const reviews = [
      {
        name: "שרה לוי",
        rating: 5,
        content: "טיפול מדהים! הגעתי עם כאבי גב חזקים ואחרי שלושה טיפולים ההבדל היה דרמטי. ממליצה בחום!",
        service: "עיסוי רקמות עמוק",
        isApproved: true,
      },
      {
        name: "דוד כהן",
        rating: 5,
        content: "המקצועיות והאווירה פשוט מושלמים. מרגיש שהגוף שלי מודה לי אחרי כל ביקור.",
        service: "עיסוי תאילנדי",
        isApproved: true,
      },
      {
        name: "מיכל ברק",
        rating: 4,
        content: "שיעורי היוגה הכי טובים שהיו לי. תשומת לב אישית ואווירה נהדרת.",
        service: "יוגה פרטי",
        isApproved: true,
      },
      {
        name: "אלון דגן",
        rating: 5,
        content: "הפילאטיס השיקומי עזר לי מאוד עם כאבי הגב. מקצועי ומדויק.",
        service: "פילאטיס שיקומי",
        isApproved: true,
      },
      {
        name: "רונית שמש",
        rating: 5,
        content: "הפוט מאסז׳ היה חוויה מדהימה. ההשריה במי מלח חמים והעיסוי - מומלץ!",
        service: "פוט מאסז׳",
        isApproved: true,
      },
    ];
    for (const review of reviews) {
      await prisma.review.create({ data: review });
    }
    console.log(`${reviews.length} reviews created`);
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
