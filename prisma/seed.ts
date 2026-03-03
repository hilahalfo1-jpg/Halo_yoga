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
      name: "ישראל כהן",
      role: "ADMIN",
    },
  });
  console.log("Admin user created");

  // ─── Services ───────────────────────────
  const services = [
    {
      slug: "swedish-massage",
      name: "עיסוי שוודי רפואי",
      category: "MASSAGE",
      duration: 60,
      price: 350,
      shortDesc: "עיסוי קלאסי להרפיית שרירים ושיפור זרימת הדם",
      description:
        "עיסוי שוודי רפואי הוא טכניקת העיסוי הנפוצה והמוכרת ביותר בעולם. הטיפול משלב תנועות ארוכות וזורמות עם לחיצות עדינות עד בינוניות, המסייעות להרפיית השרירים, שיפור זרימת הדם והלימפה, והפחתת מתח ולחץ. מתאים במיוחד למי שמחפש חוויית הרפיה עמוקה ושיפור כללי בתחושת הגוף.",
      sortOrder: 1,
    },
    {
      slug: "deep-tissue",
      name: "עיסוי רקמות עמוקות",
      category: "MASSAGE",
      duration: 75,
      price: 400,
      shortDesc: "טיפול ממוקד בשכבות העמוקות של השריר",
      description:
        "עיסוי רקמות עמוקות מתמקד בשכבות הפנימיות של רקמת השריר, הגידים והפאסיה. באמצעות לחץ ממוקד ותנועות איטיות, הטיפול מסייע בשחרור הידבקויות ומתחים כרוניים. מומלץ במיוחד לסובלים מכאבים כרוניים, מגבלות תנועה, או לאחר פציעות ספורט.",
      sortOrder: 2,
    },
    {
      slug: "sports-massage",
      name: "עיסוי ספורטאים",
      category: "MASSAGE",
      duration: 60,
      price: 380,
      shortDesc: "שיקום ומניעת פציעות ספורט",
      description:
        "עיסוי ספורטאים מותאם במיוחד לצרכים של אנשים פעילים גופנית. הטיפול משלב טכניקות מתקדמות לשיפור גמישות, מניעת פציעות, וזירוז תהליכי התאוששות. מתאים לספורטאים מקצועיים וחובבים כאחד, לפני או אחרי אימון, ולמניעה וטיפול בפציעות ספורט.",
      sortOrder: 3,
    },
    {
      slug: "reflexology",
      name: "רפלקסולוגיה",
      category: "MASSAGE",
      duration: 45,
      price: 280,
      shortDesc: "טיפול בנקודות לחיצה בכפות הרגליים",
      description:
        "רפלקסולוגיה היא שיטת טיפול הוליסטית המבוססת על לחיצה ממוקדת בנקודות רפלקס בכפות הרגליים. כל נקודה מייצגת איבר או מערכת בגוף. הטיפול מסייע באיזון הגוף, שיפור זרימת האנרגיה, הפחתת מתחים, ושיפור איכות השינה.",
      sortOrder: 4,
    },
    {
      slug: "group-yoga",
      name: "שיעור יוגה קבוצתי",
      category: "YOGA",
      duration: 75,
      price: 60,
      shortDesc: "שיעור יוגה בקבוצה קטנה ואינטימית",
      description:
        "שיעורי יוגה קבוצתיים בקבוצות קטנות של עד 8 משתתפים, המאפשרות תשומת לב אישית לכל מתרגל. השיעורים משלבים אסאנות (תנוחות), תרגילי נשימה ומדיטציה, ומותאמים לכל הרמות. סביבה תומכת ומכילה לפיתוח הפרקטיקה האישית שלכם.",
      sortOrder: 5,
    },
    {
      slug: "private-yoga",
      name: "שיעור יוגה פרטי",
      category: "YOGA",
      duration: 60,
      price: 200,
      shortDesc: "תרגול יוגה מותאם אישית",
      description:
        "שיעור יוגה פרטי מותאם אישית לצרכים, ליכולות ולמטרות שלכם. בין אם אתם מתחילים שרוצים ללמוד את הבסיס, או מתרגלים מנוסים שרוצים להעמיק — השיעור נבנה במיוחד עבורכם. כולל הנחיה אישית, תיקונים, והתאמות.",
      sortOrder: 6,
    },
    {
      slug: "back-rehab",
      name: "שיקום כאבי גב",
      category: "REHABILITATION",
      duration: 60,
      price: 350,
      shortDesc: "תוכנית טיפול ייעודית לכאבי גב תחתון ועליון",
      description:
        "תוכנית שיקום מקיפה לכאבי גב, המשלבת טכניקות עיסוי רפואי עם תרגילים ייעודיים. הטיפול כולל הערכה מקצועית, טיפול ידני ממוקד, ובניית תוכנית תרגילים אישית להמשך עצמאי. מתאים לכאבי גב תחתון, עליון, צוואר וכתפיים.",
      sortOrder: 7,
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

  // ─── Availability Rules (Sun-Thu 09:00-18:00) ─
  const existingRules = await prisma.availabilityRule.count();
  if (existingRules === 0) {
    for (const day of [0, 1, 2, 3, 4]) {
      await prisma.availabilityRule.create({
        data: {
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          isActive: true,
        },
      });
    }
    console.log("Availability rules created (Sun-Thu)");
  }

  // ─── Reviews ────────────────────────────
  const reviews = [
    {
      name: "שרה לוי",
      rating: 5,
      content:
        "טיפול מדהים! הגעתי עם כאבי גב חזקים ואחרי שלושה טיפולים ההבדל היה דרמטי. ממליצה בחום!",
      service: "עיסוי רקמות עמוקות",
      isApproved: true,
    },
    {
      name: "דוד כהן",
      rating: 5,
      content:
        "המקצועיות והאווירה פשוט מושלמים. מרגיש שהגוף שלי מודה לי אחרי כל ביקור.",
      service: "עיסוי שוודי",
      isApproved: true,
    },
    {
      name: "מיכל ברק",
      rating: 4,
      content:
        "שיעורי היוגה הכי טובים שהיו לי. הקבוצה קטנה ויש תשומת לב אישית.",
      service: "יוגה קבוצתית",
      isApproved: true,
    },
    {
      name: "אלון דגן",
      rating: 5,
      content:
        "כספורטאי חובב, העיסוי עזר לי לחזור מפציעה מהר יותר. מקצועי ומדויק.",
      service: "עיסוי ספורטאים",
      isApproved: true,
    },
    {
      name: "רונית שמש",
      rating: 5,
      content:
        "הרפלקסולוגיה עשתה פלאים לשינה שלי. אחרי שנים של נדודי שינה, סוף סוף אני ישנה טוב.",
      service: "רפלקסולוגיה",
      isApproved: true,
    },
  ];

  const existingReviews = await prisma.review.count();
  if (existingReviews === 0) {
    for (const review of reviews) {
      await prisma.review.create({ data: review });
    }
    console.log(`${reviews.length} reviews created`);
  }

  // ─── Sample Bookings ───────────────────
  const existingBookings = await prisma.booking.count();
  if (existingBookings === 0) {
    const allServices = await prisma.service.findMany();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const bookings = [
      {
        serviceId: allServices[0].id,
        startAt: new Date(tomorrow),
        endAt: new Date(
          tomorrow.getTime() + allServices[0].duration * 60 * 1000
        ),
        status: "CONFIRMED",
        customerName: "יעל אברהם",
        customerPhone: "0541234567",
        customerEmail: "yael@example.com",
        notes: "כאבים בגב תחתון",
      },
      {
        serviceId: allServices[1].id,
        startAt: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        endAt: new Date(
          tomorrow.getTime() +
            2 * 60 * 60 * 1000 +
            allServices[1].duration * 60 * 1000
        ),
        status: "PENDING",
        customerName: "משה גולן",
        customerPhone: "0529876543",
      },
      {
        serviceId: allServices[4].id,
        startAt: new Date(tomorrow.getTime() + 5 * 60 * 60 * 1000),
        endAt: new Date(
          tomorrow.getTime() +
            5 * 60 * 60 * 1000 +
            allServices[4].duration * 60 * 1000
        ),
        status: "CONFIRMED",
        customerName: "נועה ישראלי",
        customerPhone: "0507654321",
        customerEmail: "noa@example.com",
      },
    ];

    for (const booking of bookings) {
      await prisma.booking.create({ data: booking });
    }
    console.log(`${bookings.length} sample bookings created`);
  }

  // ─── Sample Leads ──────────────────────
  const existingLeads = await prisma.lead.count();
  if (existingLeads === 0) {
    await prisma.lead.createMany({
      data: [
        {
          name: "רחל מזרחי",
          phone: "0531112233",
          email: "rachel@example.com",
          subject: "עיסויים",
          message:
            "שלום, אני מתעניינת בעיסוי רפואי לכאבי צוואר כרוניים. אשמח לפרטים נוספים על סוגי הטיפולים ומחירים.",
          status: "NEW",
        },
        {
          name: "עמית ברון",
          phone: "0544455566",
          subject: "יוגה",
          message:
            "היי, אני מחפש שיעורי יוגה למתחילים. מתי יש שיעורים קבוצתיים ומה המחיר?",
          status: "IN_PROGRESS",
          adminNotes: "חזרתי אליו בטלפון, מעוניין להתחיל בשבוע הבא",
        },
      ],
    });
    console.log("2 sample leads created");
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
