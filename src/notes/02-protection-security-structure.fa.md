---
title: "حفاظت دسترسی، معماری‌های هسته و عیب‌یابی سیستم"
date: 2026-10-26
summary: "حفاظت دسترسی در یونیکس (UID/GID، مجوزهای ۹ بیتی و مبنای ۸)، فایل‌های مجازی، اسنپ‌شات و کش دیسک، تهدیدات امنیتی (ویروس، کرم، DoS)، محیط‌های محاسباتی (کلاینت-سرور، P2P، مجازی‌سازی)، ساختارهای هسته (Monolithic, Microkernel, Modules, Layered, Hybrid) و ابزارهای دیباگ (Coredump, Profiling, dmesg)."
tags: [os, chapter-2, protection, security, architecture, microkernel, debugging]
series: os
chapter: 2
section: "2"
order: 2
mode: summary
book: "Operating System Concepts"
edition: "10th"
draft: false
---

این بخش به دو دغدغه اساسی در مهندسی سیستم‌عامل می‌پردازد: اول اینکه چگونه سیستم‌عامل از خود و کاربرانش در برابر خطاها و حملات محافظت می‌کند، و دوم اینکه معماری درونی هسته سیستم‌عامل با چه الگوهایی طراحی می‌شود.

---

## ۱. حفاظت و کنترل دسترسی (Protection / Access Control)

**هدف:** حفاظت (Protection) مکانیزمی است که دسترسی برنامه‌ها، پروسس‌ها و کاربران را به منابع سیستم کنترل می‌کند تا هیچ پروسسی نتواند بدون مجوز به منابع پروسس دیگر دست‌درازی کرده یا عملکرد آن را مختل کند.

### مدل کاربری یونیکس (User / Group / Others)
در سیستم‌های یونیکسی، تمام فعالیت‌ها به یک هویت نسبت داده می‌شوند:
- **کاربران و شناسه‌ها (UID):** هر کاربر یک شناسه عددی یکتا دارد. کاربر ریشه (`root`) با UID برابر با `0` بالاترین اختیارات را داراست.
- **گروه‌ها و شناسه‌ها (GID):** کاربران می‌توانند عضو یک یا چند گروه باشند تا دسترسی مشترک به منابع تعریف شود.
- هر پروسسی که در سیستم اجرا می‌شود، با سطح دسترسی و اعتبارنامه‌های (Credentials) کاربری اجرا می‌شود که آن را ساخته است.

### مجوزهای فایل (File Permissions)
سیستم‌عامل مجوزهای دسترسی به هر فایل را در قالب یک ساختار ۹ بیتی نگه می‌دارد که به سه دسته تقسیم می‌شود:

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 180" role="img" aria-label="POSIX 9-Bit Permission Matrix" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="180" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Owner Box -->
    <rect x="30" y="30" width="195" height="115" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="127" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">User / Owner (مالک)</text>
    <text x="70" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">r (4)</text>
    <text x="127" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">w (2)</text>
    <text x="185" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">x (1)</text>
    <text x="127" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">مجموع: 4 + 2 + 1 = 7</text>

    <!-- Group Box -->
    <rect x="242" y="30" width="195" height="115" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="339" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Group (گروه)</text>
    <text x="282" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">r (4)</text>
    <text x="339" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--muted, #6f6a5a)">- (0)</text>
    <text x="397" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">x (1)</text>
    <text x="339" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">مجموع: 4 + 0 + 1 = 5</text>

    <!-- Others Box -->
    <rect x="455" y="30" width="195" height="115" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="552" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Others (سایرین)</text>
    <text x="495" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">r (4)</text>
    <text x="552" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--muted, #6f6a5a)">- (0)</text>
    <text x="610" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">x (1)</text>
    <text x="552" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">مجموع: 4 + 0 + 1 = 5</text>
  </svg>
  <figcaption>ماتریس ۹ بیتی مجوزهای فایل با نمایش اکتال معادل (مانند 755 برای rwxr-xr-x)</figcaption>
</figure>

- **حالت‌های دسترسی (Access Modes):**
  - **خواندن (`r` با وزن ۴):** مشاهده متن فایل یا خواندن لیست فایل‌های درون یک دایرکتوری.
  - **نوشتن (`w` با وزن ۲):** تغییر محتوای فایل یا ایجاد و حذف فایل‌ها در یک دایرکتوری.
  - **اجرا (`x` با وزن ۱):** اجرای فایل به عنوان یک برنامه یا ورود (`cd`) و پیمایش در دایرکتوری.
- **نمایش اکتال (مبنای ۸):** با جمع زدن بیت‌های هر دسته محاسبه می‌شود؛ مثلاً `rwxr-xr-x` به صورت `755` و `rw-r--r--` به صورت `644` نمایش داده می‌شود.

### سیستم فایل، فایل‌های مجازی، اسنپ‌شات و کش
- **ساختار درختی فایل‌سیستم:** سیستم‌عامل انتزاع دیسک را به شکل یک درخت یکپارچه با ریشه `/` درمی‌آورد که شامل فایل‌ها و دایرکتوری‌هاست.
- **فایل‌های مجازی (Virtual Files):** فایل‌های ویژه‌ای که وجود فیزیکی روی هارد ندارند و به صورت آنی توسط کرنل کنترل می‌شوند:
  - `/dev/null`: سیاه‌چاله داده‌ها! هر داده‌ای که در آن نوشته شود بلافاصله ناپدید می‌شود و هر عملیات خواندن فوراً پایان فایل (EOF) بازمی‌گرداند.
  - `/dev/zero`: جریان بی‌پایانی از بایت‌های صفر (`0x00`) تولید می‌کند؛ بسیار کاربردی برای فرمت و پر کردن حافظه خالی.
- **اسنپ‌شات و آرشیو (Snapshots / Archival):** تصویر منجمدشده و فقط‌خواندنی از وضعیت سیستم‌فایل در یک لحظه مشخص از زمان، بدون نیاز به کپی کامل بلاک‌های دیسک.
- **رمزنگاری (Encryption):** رمزنگاری بلاک‌های دیسک برای محافظت از داده‌ها در صورت سرقت فیزیکی هارد دیسک.
- **حافظه موقت کش (Caching):** نگه‌داشتن کپی داده‌های خوانده‌شده از دیسک در حافظه رم. از آنجا که سرعت رم هزاران برابر دیسک است، درخواست‌های بعدی بدون درگیر کردن هارد دیسک مستقیماً از رم پاسخ داده می‌شوند.

---

## ۲. تهدیدات امنیتی (Security Threats)

امنیت یعنی دفاع از سیستم در برابر رفتارهای مغرضانه یا خرابکارانه از بیرون:

1. **ویروس‌ها (Viruses):** کدهای مخربی که نمی‌توانند به صورت مستقل اجرا شوند؛ بلکه به برنامه‌ها و فایل‌های اجرایی معتبر می‌چسبند و هنگام باز شدن فایل توسط کاربر، در سیستم تکثیر می‌شوند.
2. **کرم‌ها (Worms):** برنامه‌های مخرب مستقل که خود به خود و بدون نیاز به چسبیدن به فایل‌های دیگر، از طریق رخنه‌های شبکه اینترنت کپی‌های خود را به سایر کامپیوترها می‌فرستند و پخش می‌شوند.
3. **حملات محروم‌سازی از سرویس (DoS - Denial of Service):** ارسال سیل‌آسای درخواست‌های جعلی به سیستم به منظور پر کردن صف پروسس‌ها، رم یا پهنای باند، تا حدی که سیستم از کار بیفتد و نتواند به کاربران واقعی پاسخ دهد.

---

## ۳. محیط‌های رایانشی (Computing Environments)

- **رایانه‌های شخصی و موبایل (Personal / Mobile):** سیستم‌های تک‌کاربره با تمرکز بر مصرف بهینه باتری و پاسخ‌دهی سریع رابط گرافیکی.
- **سیستم‌های توزیع‌شده (Distributed Systems):** مجموعه‌ای از کامپیوترهای مستقل و مجزا که از طریق شبکه به هم متصل شده و برای انجام یک پردازش واحد همکاری می‌کنند.
- **مدل کلاینت-سرور (Client-Server):** کلاینت‌ها درخواست خدمات را به یک سرور مرکزی می‌فرستند.
  * **نقطه ضعف:** فشار بیش از حد و ایجاد **نقطه تک‌شکست (Single Point of Failure - SPOF)**؛ اگر سرور از کار بیفتد، کل سیستم متوقف می‌شود.
- **مدل نظیر-به-نظیر (Peer-to-Peer یا P2P):** هر گره در شبکه به صورت هم‌زمان هم نقش کلاینت و هم نقش سرور را ایفا می‌کند.
  * **مزیت:** مقیاس‌پذیری بالا و فقدان نقطه تک‌شکست؛ با خروج یک گره، سیستم به کار خود ادامه می‌دهد.
- **مجازی‌سازی (Virtualization):** اجرای یک سیستم‌عامل مهمان (Guest OS) درون یک سیستم‌عامل میزبان (Host OS) به وسیله مدیر ماشین مجازی (**VMM / Hypervisor**).
- **رایانش ابری (Cloud Computing):** فراهم کردن منابع پردازشی، حافظه و سرورها بنا به تقاضا (On-demand) بر بستر اینترنت که بر پایه تکنولوژی مجازی‌سازی ساخته شده است.
- **سیستم‌های تعبیه‌شده و بلادرنگ (Embedded & Real-Time):** کامپیوترهای خاص‌منظوره درون اتومبیل‌ها، ربات‌ها و تجهیزات پزشکی که دارای قیود زمانی فوق‌العاده سخت هستند و پردازش باید دقیقاً در موعد مقرر تحویل داده شود.

---

## ۴. ساختارها و معماری‌های سیستم‌عامل (OS Structures)

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 280" role="img" aria-label="Monolithic vs Microkernel Structures" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="280" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Monolithic -->
    <rect x="30" y="25" width="300" height="230" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="180" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--ink, #16150f)">Monolithic Kernel</text>
    <rect x="50" y="65" width="260" height="30" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="180" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">User Space (Applications)</text>
    
    <rect x="50" y="105" width="260" height="135" rx="4" fill="var(--ink, #16150f)"/>
    <text x="180" y="130" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--paper, #f3efe6)">Kernel Space (یک فضای آدرس یکپارچه)</text>
    <text x="180" y="155" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--paper-2, #ece7db)">VFS | File Systems | Network Stack</text>
    <text x="180" y="180" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--paper-2, #ece7db)">CPU Scheduling | Memory Management</text>
    <text x="180" y="205" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--paper-2, #ece7db)">Hardware Device Drivers</text>
    <text x="180" y="228" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">سریع، اما خطای یک درایور کل OS را متوقف می‌کند</text>

    <!-- Microkernel -->
    <rect x="350" y="25" width="300" height="230" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="500" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--ink, #16150f)">Microkernel (μ-kernel)</text>
    <rect x="370" y="65" width="260" height="30" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="500" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">User Space (Applications)</text>

    <rect x="370" y="105" width="260" height="65" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--accent, #b5431d)"/>
    <text x="500" y="125" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" font-weight="600" fill="var(--accent, #b5431d)">سرورهای مجزای User Space:</text>
    <text x="500" y="145" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--ink, #16150f)">[ File Server ] [ Network Server ] [ Drivers ]</text>
    <text x="500" y="160" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">کرش درایور مهار می‌شود</text>

    <rect x="370" y="180" width="260" height="60" rx="4" fill="var(--ink, #16150f)"/>
    <text x="500" y="205" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--paper, #f3efe6)">Kernel Space (هسته حداقلی)</text>
    <text x="500" y="225" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--paper-2, #ece7db)">[ Minimal IPC ] [ Low-Level Memory ]</text>
  </svg>
  <figcaption>مقایسه دو معماری متضاد هسته یکپارچه (Monolithic) و ریزهسته (Microkernel)</figcaption>
</figure>

1. **معماری یکپارچه (Monolithic Kernel):**
   * کل کدهای سیستم‌عامل (فایل‌سیستم، زمان‌بند، درایورها، پشته شبکه) در قالب یک باینری بزرگ در فضای Kernel Mode اجرا می‌شوند (مانند MS-DOS و یونیکس‌های اولیه).
   * **مزیت:** سرعت فوق‌العاده بالا به دلیل فراخوانی‌های مستقیم تابعی درون یک فضای آدرس.
   * **عیب:** نگهداری دشوار و پایداری پایین؛ اگر یک باگ کوچک در یکی از درایورها رخ دهد، کل هسته دچار خطای فاجعه‌بار (Panic) شده و سیستم خاموش می‌شود.
2. **معماری ریزهسته (Microkernel یا μ-kernel):**
   * هسته به حداقل وظایف ممکن تقلیل می‌یابد (تنها شامل ارتباط بین پروسس‌ها - IPC و پایه‌ای‌ترین مدیریت حافظه). درایورها و سیستم‌فایل‌ها به صورت پروسس‌های عادی یوزر اسپیس اجرا می‌شوند.
   * **مزیت:** امنیت و پایداری حداکثری؛ اگر درایور کارت شبکه کرش کند، بقیه سیستم به کار خود ادامه می‌دهد و سیستم‌عامل به سادگی آن پروسس را ری‌استارت می‌کند.
   * **عیب:** کاهش سرعت به دلیل سربار مکرر ارسال پیام (Message Passing) و کانتکست سوییچ میان یوزر اسپیس و کرنل.
3. **ماژول‌های قابل بارگذاری در هسته (Loadable Kernel Modules - LKMs):**
   * مانند ریزهسته ساختاری منعطف دارد، اما درایورها و ماژول‌ها در صورت نیاز در زمان اجرای زنده سیستم، مستقیماً وارد فضای آدرس کرنل می‌شوند و با سرعت بالا اجرا می‌گردند (الگوی اصلی لینوکس).
4. **ساختار لایه‌ای (Layered Structure):**
   * سیستم‌عامل به لایه‌های متوالی افقی تفکیک می‌شود که هر لایه فقط مجاز به ارتباط با لایه پایینی خود است. در عمل به دلیل افت کارایی کمتر به شکل خالص پیاده‌سازی می‌شود.
5. **معماری ترکیبی (Hybrid):**
   * ادغام الگوهای مختلف؛ مانند لینوکس که از نظر سرعت و یکپارچگی مونوپلتیک است، اما از ماژول‌های پویای LKM بهره می‌برد.

---

## ۵. دیباگ و ارزیابی عملکرد (Debugging & Performance)

- **Coredump:** فایلی که در لحظه کرش کردن ناگهانی یک پروسس یوزر اسپیس تولید شده و محتوای رم و ثبات‌های پردازنده را برای دیباگر ذخیره می‌کند.
- **Crashdump:** مشابه کُردامپ، اما زمانی ذخیره می‌شود که کل هسته سیستم‌عامل (Kernel) کرش می‌کند.
- **پروفایلینگ (Profiling):** ابزارهایی مانند `gprof` یا `Valgrind` که اجرای برنامه را زیر ذره‌بین قرار می‌دهند تا نقاط گلوگاه (بخش‌هایی از کد که بیشترین کلاک‌های CPU را مصرف می‌کنند) را بیابند.
- **ثبت وقایع (Logging):** ثبت رویدادهای سخت‌افزاری و نرم‌افزاری توسط کرنل در یک بافر حلقوی که با فرمان معروف `dmesg` در لینوکس قابل مشاهده است.
