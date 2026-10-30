# پلنر جامع (Next.js + PostgreSQL)

یک پلنر حرفه‌ای شامل: پلنر هفتگی، تقویم شمسی، تایم‌لاین روزانه (برنامه در برابر واقعیت)، تایم‌شیت،
هبیت ترکر، ردیاب مالی، پلنر تحصیلی، اهداف و ارزیابی عملکرد هفتگی.

## اجرا
**ویندوز (ساده‌ترین راه):** روی `run-windows.bat` دوبار کلیک کن. (فقط Node.js لازم است؛ دیتابیس داخلی است.)

**دستی:**
```bash
npm install
npm run build
npm start                # http://localhost:3000
```
دیتابیس با `DATABASE_URL` انتخاب می‌شود:
- `pglite://./data` → دیتابیس داخلی (بدون نصب چیزی) — در فایل `.env.local` بگذار
- `postgresql://user:pass@host:5432/db` → PostgreSQL واقعی (سرور / Docker)

جداول به‌صورت خودکار در اولین اجرا ساخته می‌شوند. در داشبورد دکمه «بارگذاری داده نمونه» داده‌های آزمایشی می‌سازد.

## تنظیمات (صفحه‌ی «تنظیمات» در منو)
- **حساب کاربری:** نام، ایمیل، موبایل و رمز عبور (رمز برای تأیید عملیات حساس استفاده می‌شود؛ صفحه‌ی ورود بعداً)
- **ظاهر و تم:** ۷ رنگ اصلی + حالت روشن/تیره/خودکار (دکمه‌ی ماه/خورشید در منو برای تغییر سریع)
- **داده‌ها:** آمار، پشتیبان‌گیری JSON، بازیابی، داده‌ی نمونه، و پاک‌کردن کامل یا بخشی از داده‌ها

## ساختار
- `src/db/schema.ts` – جداول (tasks, habits, habit_logs, transactions, budgets, financial_goals, courses, study_sessions, exams, timesheet_entries, goals, reviews, settings, profiles)
- `src/db/bootstrap.ts` – SQL ساخت خودکار جداول (با تغییر schema باید به‌روز شود)
- `src/lib/theme.ts` + `src/app/globals.css` – سیستم تم (پالت‌ها روی توکن‌های `emerald-*` نگاشت می‌شوند)
- `src/app/api/settings`, `src/app/api/profile`, `src/app/api/data/[action]` – تنظیمات، پروفایل، پشتیبان/بازیابی/پاک‌سازی
- `src/app/api/[resource]` – API عمومی CRUD برای همه منابع (`GET /api/tasks?from=&to=`, `POST`, `PATCH /api/tasks/:id`, `DELETE`)
- `src/app/api/dashboard`, `src/app/api/review` – آمار و امتیاز عملکرد
- `src/lib/jalali.ts` – تقویم شمسی
- `src/app/*` – صفحات (planner, calendar, timeline, timesheet, habits, budget, study, goals, review)

## خروجی ویندوز، اندروید و iOS
راهنمای کامل قدم‌به‌قدم در **[`packaging/README.md`](packaging/README.md)**:
- **ویندوز:** `build-exe-windows.bat` → EXE خودکفا (سرور + دیتابیس داخلی، بدون Docker). با Ctrl + , به سرور اینترنتی هم وصل می‌شود.
- **اندروید:** `build-android-windows.bat` (Capacitor + Android Studio) یا GitHub Actions (`.github/workflows/android.yml`، بدون نصب) — اپ **آفلاین** است و دیتابیس داخلی (PGlite) دارد؛ اتصال به سرور اختیاری است
- **سرور:** `docker compose` (فایل‌های `Dockerfile`، `docker-compose.yml`، `.env.production.example`)
