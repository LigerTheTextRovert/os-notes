# Vulkon

راهنمای تحلیلی، عمیق و مهندسی درس سیستم‌عامل (بر مبنای اسلایدهای OS01 تا OS03 و کتاب *Operating System Concepts*).

## ویژگی‌ها
- **۳ فصل جامع** متناظر با اسلایدهای درسی OS01، OS02 و OS03.
- **تصویرسازی‌های برداری اختصاصی (SVG)** بدون وابستگی به کتابخانه‌های حجیم بیرونی.
- **تایپوگرافی مهندسی** با فونت‌های Vazirmatn و JetBrains Mono.
- **کدهای نمونه و سینتکس هایلایتینگ** با پالت هماهنگ با طراحی.
- **بیلد فوق‌العاده سریع** مبتنی بر Vite و Shiki.

## راه‌اندازی و اجرا

```bash
# نصب وابستگی‌ها
npm install

# اجرای سرور توسعه با Live Reload
npm run dev

# تولید بیلد استاتیک نهایی (dist)
npm run build

# پیش‌نمایش بیلد نهایی
npm run preview
```

## ساختار پروژه
```
vulkon/
├── scripts/
│   └── build-notes.mjs       # اسکریپت بیلد و تبدیل Markdown به HTML
├── src/
│   ├── notes/                # فصول سه‌گانه با فرمت Markdown
│   │   ├── 01-hardware-and-structure.fa.md
│   │   ├── 02-protection-security-structure.fa.md
│   │   └── 03-processes-and-ipc.fa.md
│   ├── templates/            # قالب‌های HTML برای صفحه فهرست و فصل‌ها
│   │   ├── index.html
│   │   └── note.html
│   ├── main.ts               # اسکریپت‌های تعاملی (کپی کد، اسکرول، موشن)
│   └── style.css             # سیستم طراحی، پالت رنگ و استایل‌ها
├── vite.config.ts
└── package.json
```

## مجوز
[MIT License](LICENSE) — Abolfazl Samarghandi
