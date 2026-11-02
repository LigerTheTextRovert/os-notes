---
title: "حفاظت دسترسی، معماری‌های هسته و عیب‌یابی سیستم"
date: 2026-10-26
summary: "تمایز Protection و Security، اصل تفکیک Mechanism از Policy، مدل کاربری یونیکس و مجوزهای پیشرفته SUID/SGID/Sticky، تکامل ایزولاسیون از chroot به کانتینرها، فایل‌های ویژه /dev، هایپروایزرهای Type 1 و Type 2 و نظریه پوپک-گلدبرگ، کالبدشکافی ساختارهای هسته (Monolithic, Microkernel, LKMs, Hybrid)، و عیب‌یابی سیستم با Coredump, GDB و eBPF."
tags: [os, chapter-2, protection, security, architecture, microkernel, debugging, ebpf, suid, virtualization]
series: os
chapter: 2
section: "2"
order: 2
mode: summary
book: "Operating System Concepts"
edition: "10th"
draft: false
---

این بخش به دو دغدغه اساسی در مهندسی سیستم‌عامل می‌پردازد: اول اینکه سیستم‌عامل با چه مکانیزم‌هایی از منابع خود در برابر دسترسی‌های غیرمجاز و بدافزارها محافظت می‌کند، و دوم اینکه معماری درونی هسته سیستم‌عامل چگونه سازمان‌دهی می‌شود تا تعادل میان کارایی، پایداری و نگهداری برقرار گردد.

---

## ۱. تمایز حفاظت و امنیت (Protection vs. Security)

در متون آکادمیک سیستم‌عامل (به‌ویژه سیلبرشاتز)، میان دو مفهوم حفاظت و امنیت تمایز دقیقی وجود دارد:
- **حفاظت (Protection):** به هر مکانیزمی اطلاق می‌شود که دسترسی برنامه‌ها، پروسس‌ها و کاربران را به منابع سیستم کامپیوتر (CPU، حافظه، فایل‌ها، دستگاه‌های I/O) کنترل و تحدید می‌کند. حفاظت درون مرزهای سیستم رخ می‌دهد تا اطمینان حاصل شود که هر مؤلفه تنها به منابعی دسترسی دارد که مجاز به استفاده از آن‌هاست.
- **امنیت (Security):** به مکانیزم‌ها و سیاست‌های دفاعی سیستم در برابر رفتارهای مغرضانه بیرونی (مانند احراز هویت کاربران، حملات دیداس، ویروس‌ها، کرم‌ها و شنود شبکه) گفته می‌شود.

### اصل بنیادین: تفکیک مکانیزم از سیاست (Separation of Mechanism and Policy)
یکی از مهم‌ترین اصول معماری در مهندسی نرم‌افزار و سیستم‌عامل، تفکیک مکانیزم از سیاست است:
* **مکانیزم (Mechanism):** مشخص می‌کند **«چگونه»** کاری انجام شود (How to do something).  
  * *مثال:* سخت‌افزار ثبات تایمری دارد که پس از مقدار مشخصی کلاک، وقفه ایجاد می‌کند؛ یا کرنل مکانیزمی دارد که بیت‌های دسترسی فایل را بررسی می‌نماید.
* **سیاست (Policy):** مشخص می‌کند **«چه کاری»** باید انجام شود (What will be done).  
  * *مثال:* کوانتوم زمانی برای هر پروسس چقدر باشد؟ آیا کاربر مهمان اجازه خواندن فایل‌های شاخه پروژه را دارد یا خیر؟

> **اهمیت تفکیک:** اگر سیاست‌ها درون مکانیزم‌ها به صورت هاردکد (Hardcoded) تنیده شوند، هرگونه تغییر در قوانین دسترسی نیازمند بازنویسی، بازکامپایل و ری‌استارت کل هسته خواهد بود. با تفکیک این دو، مکانیزم در پایین‌ترین لایه با حداکثر سرعت باقی می‌ماند و سیاست‌ها در فایل‌های پیکربندی یا فضای کاربر به راحتی تغییر می‌کنند.

### اصل حداقل امتیاز (Principle of Least Privilege - PoLP)
این اصل بیان می‌کند که در هر لحظه، هر برنامه، پروسس یا کاربر باید **فقط با کمترین سطح اختیارات لازم** برای انجام وظیفه جاری خود اجرا شود. اگر پروسسی برای کار خود نیازی به نوشتن روی فایل پیکربندی ندارد، نباید مجوز نوشتن به آن اعطا شود؛ در این صورت، باگ‌های احتمالی یا نفوذ مهاجم نمی‌تواند باعث تخریب تمام سیستم گردد.

---

## ۲. مدل حفاظت یونیکس و مجوزهای پیشرفته (Unix Protection Model)

### هویت‌ها: UID و GID
در سیستم‌های مبتنی بر POSIX و یونیکس، هر فعالیت به یک هویت نسبت داده می‌شود:
- **شناسه کاربری (User ID - UID):** عددی یکتا؛ کاربر `root` همواره دارای شناسه `UID = 0` است و از سد تمام بررسی‌های امنیتی فایل عبور می‌کند.
- **شناسه گروهی (Group ID - GID):** کاربران عضو گروه‌ها هستند تا دسترسی پروژه‌ای و مشترک تعریف شود.
- **هویت‌های سه‌گانه یک پروسس:**
  * **Real UID (RUID):** کاربری که دستور را در ترمینال اجرا کرده است.
  * **Effective UID (EUID):** هویتی که در این لحظه برای ارزیابی دسترسی‌ها به فایل‌ها و منابع مورد استفاده کرنل قرار می‌گیرد.
  * **Saved UID (SUID):** برای ذخیره موقت وضعیت و تغییر امن میان سطوح دسترسی مختلف.

### ماتریس ۹ بیتی مجوزهای فایل (POSIX Permissions)

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
    <text x="339" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Group (اعضای گروه)</text>
    <text x="282" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">r (4)</text>
    <text x="339" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--muted, #6f6a5a)">- (0)</text>
    <text x="397" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">x (1)</text>
    <text x="339" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">مجموع: 4 + 0 + 1 = 5</text>

    <!-- Others Box -->
    <rect x="455" y="30" width="195" height="115" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="552" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Others (سایر کاربران)</text>
    <text x="495" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">r (4)</text>
    <text x="552" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--muted, #6f6a5a)">- (0)</text>
    <text x="610" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="var(--accent, #b5431d)">x (1)</text>
    <text x="552" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">مجموع: 4 + 0 + 1 = 5</text>
  </svg>
  <figcaption>ماتریس ۹ بیتی مجوزهای فایل با نمایش اکتال معادل (مانند 755 برای rwxr-xr-x)</figcaption>
</figure>

مجوزهای هر فایل در اینود (Inode) ذخیره می‌شود:
- **خواندن (`r` با وزن ۴):** در فایل‌ها امکان خواندن محتوا، در دایرکتوری‌ها امکان مشاهده لیست فایل‌ها (`ls`).
- **نوشتن (`w` با وزن ۲):** در فایل‌ها امکان ویرایش داده، در دایرکتوری‌ها امکان ایجاد یا حذف فایل‌ها.
- **اجرا (`x` با وزن ۱):** در فایل‌ها امکان اجرا به عنوان برنامه، در دایرکتوری‌ها امکان ورود به آن (`cd`) یا دسترسی به اینودهای داخل آن.

### بیت‌های ویژه مجوزها (Special Permission Bits)
علاوه بر ۹ بیت استاندارد، ۳ بیت ویژه در مبنای ۸ وجود دارند که نقشی بنیادین در امنیت و عملکرد سیستم ایفا می‌کنند:
1. **بیت SetUID (وزن ۴۰۰۰ - در خروجی به شکل `rwsr-xr-x`):**
   * هنگامی که این بیت روی یک فایل اجرایی فعال باشد، هر کاربری که آن را اجرا کند، پروسس فرزند با **مجوزهای مالک فایل (EUID مالک)** اجرا می‌شود نه با مجوزهای کاربری که دستور را زده است!
   * **مثال کاربردی:** دستور `/usr/bin/passwd` دارای بیت SUID متعلق به `root` است. هنگام تغییر رمز عبور، یک کاربر عادی باید بتواند فایل محرمانه `/etc/shadow` را ویرایش کند. به کمک SUID، پروسس موقتاً با امتیاز root اجرا شده، پسورد را بازنویسی می‌کند و بسته می‌شود.
2. **بیت SetGID (وزن ۲۰۰۰ - در خروجی به شکل `rwxr-sr-x`):**
   * اگر روی فایل اجرایی باشد، پروسس با دسترسی گروه فایل اجرا می‌شود.
   * اگر روی یک **دایرکتوری** تنظیم شود، هر فایل جدیدی که توسط هر کاربری در آن دایرکتوری ایجاد شود، گروه مالکیت دایرکتوری را به ارث می‌برد (بسیار کاربردی در پروژه‌های تیمی مشترک).
3. **بیت چسبنده (Sticky Bit - وزن ۱۰۰۰ - در خروجی به شکل `rwxrwxrwt`):**
   * روی دایرکتوری‌های عمومی مانند `/tmp` قرار می‌گیرد. در `/tmp` تمام کاربران مجوز نوشتن (`w`) دارند؛ بیت استیکی تضمین می‌کند که **تنها مالک واقعی یک فایل یا کاربر root** حق دارد آن فایل را پاک کند یا نام آن را تغییر دهد، و هیچ کاربری نمی‌تواند فایل‌های کاربران دیگر را حذف نماید.

### تکامل ایزولاسیون: از `chroot` تا کانتینرها
- **زندان `chroot` (Chroot Jail):** سیستمی که با سیستم‌کال `chroot()` دایرکتوری ریشه (`/`) را برای یک پروسس به شاخه‌ای محدود تغییر می‌دهد تا پروسس نتواند فایل‌های والد را ببیند.
  * **آسیب‌پذیری (Chroot Escape):** اگر پروسسی دسترسی root درون زندان داشته باشد، با باز کردن یک File Descriptor به بیرون یا با ساخت دایرکتوری جدید می‌تواند به راحتی از زندان chroot فرار کند.
- **کانتینرها و تفکیک مدرن در لینوکس:**
  * امروزه برای ایزولاسیون از دو قابلیت درونی کرنل لینوکس استفاده می‌شود:
    1. **فضاهای نام (Namespaces):** هر پروسس کپی انتزاعی خود را از منابع سیستم می‌بیند: PID Namespace (پروسس خود را PID 1 می‌بیند)، Mount Namespace (درخت فایل‌سیستم مجزا)، Network Namespace (کارت شبکه و IP مجازی مجزا)، و IPC Namespace.
    2. **گروه‌های کنترل (cgroups):** محدود کردن فیزیکی منابع (مثلاً حداکثر ۲ گیگابایت رم و ۵۰٪ یک هسته CPU به این پروسس تخصیص یابد). این دو شالوده پلتفرم‌های کانتینری مدرن نظیر Docker و Podman هستند.

---

## ۳. سیستم فایل، حافظه موقت و فایل‌های مجازی ویژه

در معماری‌های یونیکسی، فلسفه بنیادین **«همه چیز یک فایل است» (Everything is a file)** حاکم است؛ تجهیزات جانبی، جریان‌های اطلاعات و استخرهای تصادفی همگی در قالب فایل در مسیر `/dev` ظاهر می‌شوند.

### فایل‌های مجازی در `/dev` (Virtual Devices)
فایل‌هایی که روی دیسک فیزیکی حضور ندارند و مستقیماً توسط کرنل مدیریت می‌شوند:
- **`/dev/null`:** سیاه‌چاله اطلاعاتی! نوشتن روی آن داده‌ها را درجا نابود می‌کند؛ خواندن از آن فوراً سیگنال اتمام فایل (`EOF`) با مقدار ۰ بایت بازمی‌گرداند.  
  *کاربرد:* سرکوب خروجی خطاهای ناخواسته با `command 2> /dev/null`.
- **`/dev/zero`:** جریانی نامحدود از بایت‌های صفر خام (`0x00`) تولید می‌کند.  
  *کاربرد:* ایجاد فایل‌های خالی حجیم برای فضای Swap با دستور `dd`.
- **`/dev/full`:** شبیه‌ساز دیسک پر! هر تلاشی برای نوشتن روی آن بلافاصله با خطای **`ENOSPC` (No space left on device)** شکست می‌خورد.  
  *کاربرد:* مهندسان تست نرم‌افزار از این فایل برای ارزیابی مقاومت برنامه‌ها هنگام پر شدن هارددیسک و اطمینان از عدم کرش سیستم استفاده می‌کنند.
- **`/dev/random` در برابر `/dev/urandom`:**
  * هر دو از نویزهای فیزیکی محیط سخت‌افزار (زمان‌بندی وقفه‌های کیبورد، کلاک‌های ناپایدار شبکه) به عنوان منبع آنتروپی (Entropy Pool) استفاده می‌کنند.
  * **`/dev/random`:** اگر استخر آنتروپی خالی شود، خواندن از آن **مسدود (Block)** می‌شود تا داده جدید تصادفی تولید شود.
  * **`/dev/urandom`:** در صورت خالی شدن آنتروپی مسدود نمی‌شود؛ بلکه استخر را وارد یک الگوریتم رمزنگاری شبه‌تصادفی (CSPRNG) می‌کند و بدون توقف بایت‌های امن پس می‌دهد (پیشنهاد استاندارد در اکثر کاربردهای مدرن).

### حافظه موقت (Page Cache) و اسنپ‌شات
- **Page Cache:** کرنل لینوکس حافظه رم بلااستفاده را به عنوان کش دیسک به کار می‌گیرد. عملیات نوشتن ابتدا در رم ذخیره شده (Dirty Pages) و بعداً توسط ترد هسته به دیسک نوشته می‌شود (**Write-Back**). برای اجبار به تخلیه فوری کش روی دیسک، از سیستم‌کال یا دستور `sync` استفاده می‌شود.
- **اسنپ‌شات (Snapshots / Copy-on-Write):** در سیستم‌فایل‌های مدرن مانند Btrfs و ZFS (و در گذشته ایده سیستم‌فایل Fossil در سیستم‌عامل نوآورانه Plan 9)، می‌توان یک عکس منجمد از کل سیستم‌فایل در چند میلی‌ثانیه ثبت کرد. تنها هنگام تغییر بلاک‌ها، نسخه جدید کپی می‌شود (**Copy-on-Write**)، بنابراین اسنپ‌شات‌ها در آغاز فضای دیسک مصرف نمی‌کنند.

---

## ۴. محیط‌های رایانشی و مبانی مجازی‌سازی (Virtualization)

### مدل‌های توزیع‌شده: Client-Server در برابر Peer-to-Peer
- **کلاینت-سرور:** یک سرور متمرکز به درخواست‌های متعدد پاسخ می‌دهد.
  * *چالش:* بروز گلوگاه، سربار ترافیک و ایجاد **نقطه تک‌شکست (Single Point of Failure - SPOF)**؛ با خرابی سرور، کل سرویس از دسترس خارج می‌شود.
- **نظیر-به-نظیر (P2P):** گره‌ها هم‌زمان کلاینت و سرور هستند (مانند پروتکل BitTorrent).
  * *مزیت:* مقیاس‌پذیری بی‌نظیر؛ با اضافه شدن کاربران پهنای باند شبکه افزایش یافته و حذف چند گره خللی در شبکه ایجاد نمی‌کند.

### مجازی‌سازی سخت‌افزاری (Hardware Virtualization)
مجازی‌سازی یعنی اجرای هم‌زمان چندین سیستم‌عامل مهمان (Guest OS) روی یک سیستم‌عامل میزبان (Host OS) به وسیله مدیر ماشین مجازی (**VMM / Hypervisor**).

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 280" role="img" aria-label="Type 1 vs Type 2 Hypervisors" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="280" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Type 1 Bare-Metal -->
    <rect x="30" y="25" width="300" height="230" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="180" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--ink, #16150f)">Type 1: Bare-Metal Hypervisor</text>
    <rect x="50" y="65" width="120" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="110" y="87" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">Guest OS 1 (Linux)</text>
    <rect x="190" y="65" width="120" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="250" y="87" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">Guest OS 2 (Win)</text>
    
    <rect x="50" y="115" width="260" height="60" rx="4" fill="var(--ink, #16150f)"/>
    <text x="180" y="142" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--paper, #f3efe6)">Hypervisor (ESXi / KVM / Xen)</text>
    <text x="180" y="160" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">مستقیماً روی سخت‌افزار می‌نشیند</text>

    <rect x="50" y="190" width="260" height="45" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="180" y="217" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--ink, #16150f)">Physical Hardware (CPU/RAM/I/O)</text>

    <!-- Type 2 Hosted -->
    <rect x="350" y="25" width="300" height="230" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="500" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--ink, #16150f)">Type 2: Hosted Hypervisor</text>
    <rect x="370" y="65" width="120" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="430" y="87" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">Guest OS 1</text>
    <rect x="510" y="65" width="120" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="570" y="87" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">Guest OS 2</text>

    <rect x="370" y="110" width="260" height="35" rx="4" fill="var(--accent, #b5431d)"/>
    <text x="500" y="132" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--paper, #f3efe6)">Hypervisor (VirtualBox / VMware)</text>

    <rect x="370" y="152" width="260" height="35" rx="4" fill="var(--ink, #16150f)"/>
    <text x="500" y="174" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--paper, #f3efe6)">Host OS (Linux / Windows / macOS)</text>

    <rect x="370" y="195" width="260" height="40" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="500" y="220" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--ink, #16150f)">Physical Hardware</text>
  </svg>
  <figcaption>مقایسه دو مدل هایپروایزر نوع ۱ (Bare-Metal) و نوع ۲ (Hosted)</figcaption>
</figure>

- **هایپروایزر نوع ۱ (Bare-Metal / Type 1):** هایپروایزر خود نقش سیستم‌عامل پایه را دارد و مستقیماً روی سرور فیزیکی می‌نشیند (مانند VMware ESXi, KVM, Xen). حداکثر راندمان برای دیتاسنترها.
- **هایپروایزر نوع ۲ (Hosted / Type 2):** هایپروایزر به عنوان یک نرم‌افزار کاربردی روی سیستم‌عامل میزبان نصب می‌شود (مانند VirtualBox یا VMware Workstation).
- **الزامات نظریه پوپک-گلدبرگ (Popek-Goldberg Virtualization Requirements):**
  * طبق این نظریه کلاسیک، یک معماری زمانی بدون بازنویسی باینری قابل مجازی‌سازی سخت‌افزاری است که تمام دستورات حساس (**Sensitive Instructions** - دستوراتی که رفتار سخت‌افزار یا جدول حافظه را تغییر می‌دهند) زیرمجموعه دستورات ممتاز (**Privileged Instructions**) باشند تا با اجرای آن‌ها در حالت کاربر ماشین مجازی، تله ایجاد شده و هایپروایزر وارد عمل شود.
  * **معضل معماری x86:** در گذشته x86 این شرط را نقض می‌کرد؛ ۱۷ دستور حساس وجود داشت (مانند `POPF` و `SGDT`) که بدون ایجاد تله در User Mode شکست می‌خوردند! این معضل با معرفی پشتیبانی مستقیم سخت‌افزاری **Intel VT-x** و **AMD-V** (با افزودن مدهای VMX Root و VMX Non-Root) در پردازنده‌ها برای همیشه حل شد.

---

## ۵. معماری‌ها و ساختارهای درونی هسته سیستم‌عامل (OS Structures)

طراحی سیستم‌عامل‌ها همواره نیازمند موازنه‌ای میان سادگی پیاده‌سازی، سرعت اجرا و امنیت ایزولاسیون است.

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 280" role="img" aria-label="Monolithic vs Microkernel Structures" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="280" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Monolithic -->
    <rect x="30" y="25" width="300" height="230" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="180" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--ink, #16150f)">Monolithic Kernel</text>
    <rect x="50" y="65" width="260" height="30" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="180" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">User Space (Applications)</text>
    
    <rect x="50" y="105" width="260" height="135" rx="4" fill="var(--ink, #16150f)"/>
    <text x="180" y="128" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--paper, #f3efe6)">Kernel Space (یک فضای آدرس پیوسته)</text>
    <text x="180" y="152" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--paper-2, #ece7db)">VFS | File Systems | Network Stack</text>
    <text x="180" y="175" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--paper-2, #ece7db)">CPU Scheduling | Memory Management</text>
    <text x="180" y="198" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--paper-2, #ece7db)">Hardware Device Drivers</text>
    <text x="180" y="224" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">حداکثر سرعت، اما خطای یک درایور کل سیستم را Panic می‌کند</text>

    <!-- Microkernel -->
    <rect x="350" y="25" width="300" height="230" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="500" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--ink, #16150f)">Microkernel (μ-kernel)</text>
    <rect x="370" y="65" width="260" height="30" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="500" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">User Space (Applications)</text>

    <rect x="370" y="105" width="260" height="65" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--accent, #b5431d)"/>
    <text x="500" y="125" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" font-weight="600" fill="var(--accent, #b5431d)">سرویس‌های مجزا در User Space:</text>
    <text x="500" y="145" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--ink, #16150f)">[ File Server ] [ Network Server ] [ Drivers ]</text>
    <text x="500" y="160" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">کرش درایور بدون توقف کل OS مهار می‌شود</text>

    <rect x="370" y="180" width="260" height="60" rx="4" fill="var(--ink, #16150f)"/>
    <text x="500" y="205" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--paper, #f3efe6)">Kernel Space (هسته حداقلی)</text>
    <text x="500" y="225" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--paper-2, #ece7db)">[ Minimal IPC ] [ Low-Level Memory ]</text>
  </svg>
  <figcaption>مقایسه دو معماری متضاد هسته یکپارچه (Monolithic) و ریزهسته (Microkernel)</figcaption>
</figure>

### تحلیل ساختارهای پنج‌گانه هسته
1. **هسته یکپارچه (Monolithic):**
   * تمامی زیرسیستم‌ها (زمان‌بندی، حافظه، شبکه، سیستم‌فایل‌ها و کلیه درایورها) درون یک فضای آدرس واحد و به هم پیوسته در Kernel Mode اجرا می‌شوند (مانند لینوکس و یونیکس کلاسیک).
   * **مزیت:** سرعت سرسام‌آور؛ ارتباط میان بخش‌های مختلف تنها با فراخوانی مستقیم توابع C بدون سوئیچ کانتکست انجام می‌پذیرد.
   * **عیب:** فقدان ایزولاسیون درونی؛ یک باگ کوچک مثل نوشتن روی اشاره‌گر نامعتبر در درایور کارت صدا می‌تواند حافظه جدول صفحات را تخریب کرده و سیستم را متوقف کند (**Kernel Panic / BSOD**).
2. **ریزهسته (Microkernel):**
   * هسته تنها وظایف حیاتی حداقلی را نگه می‌دارد: مدیریت پایه‌ای حافظه مجازی، زمان‌بندی مقدماتی و کانال ارسال پیام (**IPC**). همه اجزای دیگر (درایورها، سیستم‌فایل، پشته پروتکل TCP/IP) به عنوان پروسس‌های سرور معمولی در **User Mode** اجرا می‌شوند (مانند Mach, QNX, L4, seL4, Minix 3).
   * **مزیت:** پایداری و امنیت فوق‌العاده؛ اگر درایور کارت شبکه کرش کند، تنها پروسس یوزر اسپیس آن بسته می‌شود و کرنل فوراً نمونه جدیدی از آن را ری‌استارت می‌کند بدون اینکه سیستم خاموش شود.
   * **عیب:** افت کارایی به دلیل سربار مکرر ارسال پیام‌های IPC و کانتکست سوییچ‌های متعدد میان فضاهای آدرس.
3. **ماژول‌های قابل بارگذاری در هسته (Loadable Kernel Modules - LKMs):**
   * معماری مدرن لینوکس؛ کرنل به صورت مونوپلتیک اجرا می‌شود، اما درایورها و سیستم‌فایل‌ها نیازی به کامپایل دائمی درون هسته ندارند. در صورت اتصال قطعه جدید (مانند فلش مموری یا کارت شبکه)، ماژول مربوطه با ابزارهای `modprobe` یا `insmod` در زمان اجرای زنده مستقیماً وارد فضای آدرس کرنل می‌شود و با ابزار `rmmod` از حافظه خارج می‌گردد.
4. **ساختار لایه‌ای (Layered Approach):**
   * سیستم به لایه‌های افقی $0$ (سخت‌افزار) تا $N$ (رابط کاربر) تفکیک می‌شود که هر لایه صرفاً لایه زیرین خود را صدا می‌زند. به دلیل پیچیدگی تعریف دقیق مرز لایه‌ها و افت سرعت، به شکل تئوریک کمتر استفاده می‌شود.
5. **معماری ترکیبی (Hybrid Systems):**
   * ترکیب مزایای هر دو دنیا:
     * **macOS (هسته XNU):** ترکیبی از ریزهسته **Mach** برای مدیریت IPC و پردازش‌ها و لایه‌ای از مونوپلتیک **FreeBSD** برای سیستم‌فایل و پشته شبکه POSIX.
     * **ویندوز NT:** یک ریزهسته مرکزی، لایه مجزای Executive در کرنل و لایه انتزاع سخت‌افزار (**HAL - Hardware Abstraction Layer**).

### روش‌های انتقال پارامتر به سیستم‌کال
هنگام فراخوانی سیستم‌کال، پارامترها به سه شیوه به سیستم‌عامل تحویل داده می‌شوند:
1. **ثبات‌های پردازنده (Pass by Registers):** ساده‌ترین و سریع‌ترین روش (مانند رجیسترهای `rdi` و `rsi` در x86-64). محدودیت: تعداد ثبات‌ها اندک است.
2. **بلاک یا جدول حافظه (Block / Table in Memory):** اگر تعداد آرگومان‌ها بیش از تعداد ثبات‌ها باشد، برنامه تمام پارامترها را درون یک ساختار پیوسته در رم می‌نویسد و تنها آدرس شروع آن بلاک را در یک ثبات به پردازنده می‌دهد.
3. **پشته برنامه (Push to Stack):** برنامه پارامترها را روی پشته محلی Push کرده و کرنل آن‌ها را از روی پشته Pop می‌کند.

---

## ۶. عیب‌یابی سیستم، لاگینگ و ردیابی پویا (Debugging & Tracing)

### تحلیل خرابی (Failure Analysis)
- **کُردامپ (Coredump):**
  * هنگامی که یک پروسس یوزر اسپیس دچار خطای فاجعه‌بار (نظیر Segmentation Fault یا تقسیم بر صفر) می‌شود، سیستم‌عامل تصویری از وضعیت حافظه مجازی و ثبات‌های پردازنده آن پروسس را در فایلی به نام `core` روی دیسک ذخیره می‌کند.
  * با ابزار `gdb ./my_program core` می‌توان دقیقاً خطایی را که منجر به کرش شده همراه با Backtrace متغیرها بازخوانی کرد.
- **کرش‌دامپ (Crashdump / Kernel Panic):**
  * هنگامی که خود هسته سیستم‌عامل کرش می‌کند، امکان اجرای دستورات عادی وجود ندارد. مکانیزم‌هایی مانند **`kdump`** با کمک یک زیرسیستم به نام **`kexec`** بلافاصله یک هسته سبک دوم را در حافظه رم رزروشده بوت می‌کنند تا محتوای رم هسته اول را پیش از خاموش شدن روی دیسک ذخیره نمایند.

### پروفایلینگ و پایش عملکرد (Profiling)
- **نمونه‌برداری آماری (Sampling Profiling):** ابزارهایی مانند `perf` در لینوکس، با فواصل منظم کلاک، ثبات PC را ثبت می‌کنند تا مشخص شود کدام توابع بیشترین زمان را تصاحب کرده‌اند (**Bottlenecks**).
- **کدگذاری (Instrumentation):** ابزارهایی مانند `gprof` در زمان کامپایل، کدهای سنجشگر را به ابتدا و انتهای هر تابع تزریق می‌کنند تا تعداد دقیق فراخوانی‌ها را بسنجند.

### لاگینگ و ردیابی پویا با eBPF
- **بافر حلقوی هسته (`dmesg`):** هسته سیستم‌عامل رویدادهای درایورها، اتصال پورت‌ها و خطاهای سخت‌افزاری را در یک بافر حلقوی درون رم ثبت می‌کند که با دستور `dmesg` خوانده می‌شود.
- **تکنولوژی مدرن eBPF (Extended Berkeley Packet Filter):**
  * یکی از برجسته‌ترین تحولات ده سال اخیر در لینوکس (مورد تاکید ویرایش دهم کتاب سیلبرشاتز).
  * به توسعه‌دهندگان اجازه می‌دهد کدهای امن بایتی (Bytecode) را بدون تغییر سورس‌کد هسته و بدون نیاز به کامپایل مجدد، مستقیماً درون هسته اجرا کرده و هر فراخوانی سیستم‌کال یا بسته شبکه را در کسری از میکروثانیه ردیابی و فیلتر کنند (با ابزارهایی مثل `bpftrace`).
