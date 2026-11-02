---
title: "مبانی سیستم‌عامل، لایه‌های انتزاع، وقفه‌ها و فرآیند بوت"
date: 2026-10-26
summary: "چرا به سیستم‌عامل نیاز داریم؟ انتزاع سخت‌افزار، ایزولاسیون پروسس‌ها، حفاظت دوگانه User/Kernel Mode، مکانیزم وقفه‌ها و Trap، روش‌های ورودی/خروجی (Polling, Interrupts, DMA)، PMIO در برابر MMIO، و فرآیند بوت (BIOS, MBR, Bootloader)."
tags: [os, chapter-1, hardware, syscalls, io, dma, boot]
series: os
chapter: 1
section: "1"
order: 1
mode: summary
book: "Operating System Concepts"
edition: "10th"
draft: false
---

سیستم‌عامل (Operating System) نرم‌افزار بنیادی و مدیریت‌کننده‌ای است که به عنوان واسط (Intermediary) میان برنامه‌های کاربردی و سخت‌افزار فیزیکی کامپیوتر عمل می‌کند. بدون وجود سیستم‌عامل، توسعه هر نرم‌افزار نیازمند نوشتن کدهای مستقیم اسمبلی برای کنترل تک‌تک مدارها، تنظیمات زمان‌بندی کلاک، و درایورهای اختصاصی تراشه‌های مادربرد می‌بود.

---

## ۱. چرا به سیستم‌عامل نیاز داریم؟ (Why an Operating System?)

یک کامپیوتر مدرن مجموعه‌ای ناهمگون و خشن از پردازنده‌ها، تراشه‌های حافظه، کنترلرهای ذخیره‌سازی، پورت‌های شبکه و کارت‌های گرافیک است. سیستم‌عامل با چهار هدف حیاتی بر روی این سخت‌افزار مستقر می‌شود:

### وظایف و مسئولیت‌های کلیدی
1. **انتزاع و مدیریت سخت‌افزار (Hardware Abstraction & Management):**
   * سخت‌افزار واقعی پر از جزئیات فنی سطح پایین، حساس به زمان و وابسته به شرکت‌های سازنده است. سیستم‌عامل این پیچیدگی‌ها را پنهان کرده و انتزاع‌های نرم و استانداردی ارائه می‌دهد:
     * **پردازنده (CPU):** به مفهوم **Process** (پروسس یا برنامه در حال اجرا) انتزاع می‌شود.
     * **حافظه اصلی (RAM):** به مفهوم **Address Space** (فضای آدرس‌دهی مجزا و تمیز) تبدیل می‌شود.
     * **تجهیزات I/O (دیسک، شبکه، گرافیک):** دیسک‌ها به **Files و Directories**، کارت شبکه به **Packets و Sockets**، و مانیتور به پنجره‌ها و پیکسل‌ها تبدیل می‌شوند.
2. **اشتراک منابع (Resource Sharing):**
   * سیستم‌عامل به چندین برنامه در حال اجرا اجازه می‌دهد که منابع محدود فیزیکی را بدون تداخل با یکدیگر به اشتراک بگذارند، به طوری که هر پروسس تصور کند تمام سخت‌افزار به صورت انحصاری در اختیار خودش قرار دارد:
     * **تسهیم زمانی (Time-Multiplexing):** تقسیم کردن زمان استفاده از یک منبع (مثل تقسیم کلاک‌های CPU میان ده‌ها برنامه در هر ثانیه).
     * **تسهیم مکانی (Space-Multiplexing):** قطعه‌بندی و تقسیم فیزیکی یک منبع (مثل تقسیم گیگابایت‌های رم یا بلاک‌های هارد میان برنامه‌ها).
3. **ایزولاسیون پروسس‌ها (Process Isolation):**
   * جدا نگه داشتن کامل فضای حافظه پروسس‌ها از یکدیگر. اگر یک برنامه باگی داشته باشد (مثلاً به حافظه غیرمجاز دست بزند یا کرش کند)، دیواره‌های حفاظتی سیستم‌عامل مانع از سرایت خرابی به سایر برنامه‌ها یا از کار افتادن هسته سیستم می‌شوند.
4. **تعامل پروسس‌ها (Process Interaction):**
   * فراهم کردن کانال‌های مطمئن، ساختاریافته و دارای مجوز برای اینکه پروسس‌های همکار بتوانند در صورت نیاز بدون نقض امنیت، داده‌ها و اطلاعات را میان خود رد و بدل کنند.

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 300" role="img" aria-label="Hardware Abstraction Layers" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="300" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>
    
    <!-- Apps Layer -->
    <rect x="50" y="25" width="580" height="55" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="340" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="600" fill="var(--ink, #16150f)">User Applications (Browser, Database, Shell, Compilers)</text>
    <text x="340" y="68" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--muted, #6f6a5a)">تنها با رابط‌های انتزاعی سیستم‌عامل تعامل دارند</text>
    
    <!-- OS Abstraction Layer -->
    <rect x="50" y="105" width="580" height="85" rx="6" fill="var(--ink, #16150f)"/>
    <text x="340" y="133" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="600" fill="var(--paper, #f3efe6)">Operating System Abstraction Layer</text>
    <text x="140" y="165" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="var(--accent, #b5431d)">Processes</text>
    <text x="270" y="165" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="var(--accent, #b5431d)">Virtual Memory</text>
    <text x="410" y="165" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="var(--accent, #b5431d)">File Systems</text>
    <text x="540" y="165" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="var(--accent, #b5431d)">Sockets / Packets</text>

    <!-- Hardware Layer -->
    <rect x="50" y="215" width="580" height="60" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="340" y="240" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="600" fill="var(--ink, #16150f)">Physical Hardware Layer</text>
    <text x="340" y="260" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--muted, #6f6a5a)">CPU Cores | DRAM Chips | Disk Controllers | Network Cards | GPU</text>

    <!-- Connectors -->
    <line x1="340" y1="80" x2="340" y2="105" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <line x1="340" y1="190" x2="340" y2="215" stroke="var(--accent, #b5431d)" stroke-width="2"/>
  </svg>
  <figcaption>لایه‌های انتزاع سیستم‌عامل میان سخت‌افزار فیزیکی و برنامه‌های کاربر</figcaption>
</figure>

### تمایز بنیادین: Program در برابر Process
- **برنامه (Program):** یک فایل اجرایی غیرفعال (Passive Entity) است که روی دیسک ذخیره شده (مانند `/usr/bin/firefox`). برنامه کدهای باینری، داده‌های ثابت و دستورالعمل‌های کامپایل‌شده‌ای است که تا زمان اجرا هیچ چرخه‌ای از CPU یا فضایی از RAM را اشغال نمی‌کند.
- **پروسس (Process):** یک برنامه در حال اجرا (Active Entity) است که در حافظه اصلی (RAM) بارگذاری شده است. پروسس موجودیتی زنده است که دارای ثبات‌های پردازنده، پشته محلی، فضای هیپ و منابع باز است.

---

## ۲. جداسازی سیستم‌عامل و برنامه‌ها (حفاظت و حالت‌های پردازنده)

اگر برنامه‌ها اجازه دسترسی مستقیم به کنترلرهای سخت‌افزاری را داشته باشند، یک باگ کوچک یا کد مخرب می‌تواند داده‌های دیسک را پاک کند، حافظه برنامه‌های دیگر را بخواند یا پردازنده را متوقف کند. راه‌حل این مسئله، پیاده‌سازی تفکیک سخت‌افزاری سطوح دسترسی است.

### حالت‌های اجرای پردازنده (CPU Execution Modes)
پردازنده‌های امروزی دست‌کم از دو سطح دسترسی سخت‌افزاری پشتیبانی می‌کنند که وضعیت آن توسط یک بیت به نام **Mode Bit** در ثبات وضعیت پردازنده (PSW) کنترل می‌شود:

- **حالت کاربر (User-Mode - مقدار بیت = ۱):** 
  * تمام برنامه‌های کاربران (نظیر مرورگر، تلگرام، سرورهای وب) در این فضا اجرا می‌شوند.
  * در User Mode، دسترسی به حافظه محدود به فضای آدرس اختصاصی همان برنامه است و اجرای دستورات با دسترسی ویژه (Privileged Instructions مثل خاموش کردن CPU یا تغییر ثبات‌های پایه حافظه) به صورت سخت‌افزاری مسدود می‌شود.
- **حالت هسته (Kernel-Mode / Supervisor Mode - مقدار بیت = ۰):**
  * کدهای مرکزی سیستم‌عامل (Kernel) در این حالت اجرا می‌شوند.
  * دسترسی کامل و بی‌قیدوشرط به تمام دستورات ماشین، حافظه فیزیکی و ثبات‌های کنترلرهای سخت‌افزاری برقرار است.

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 320" role="img" aria-label="Dual Mode Transition via System Call" style="width: 100%; max-width: 700px; height: auto; display: block; margin: 0 auto;">
    <rect width="700" height="320" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>
    
    <!-- User Space Box -->
    <rect x="40" y="25" width="620" height="105" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="60" y="52" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--ink, #16150f)">USER MODE (Mode Bit = 1)</text>
    <rect x="60" y="65" width="180" height="45" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="150" y="88" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="var(--ink, #16150f)">User Application</text>
    <text x="150" y="102" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--muted, #6f6a5a)">read(fd, buf, n)</text>

    <rect x="290" y="65" width="180" height="45" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="380" y="88" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="var(--ink, #16150f)">Library API (libc)</text>
    <text x="380" y="102" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">تنظیم شناسه و رجیسترها</text>

    <!-- Trap Boundary -->
    <line x1="40" y1="160" x2="660" y2="160" stroke="var(--accent, #b5431d)" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="560" y="153" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--accent, #b5431d)">HARDWARE TRAP / SYSRET</text>

    <!-- Kernel Space Box -->
    <rect x="40" y="185" width="620" height="110" rx="6" fill="var(--ink, #16150f)"/>
    <text x="60" y="212" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--paper, #f3efe6)">KERNEL MODE (Mode Bit = 0)</text>
    <rect x="180" y="225" width="180" height="50" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="270" y="248" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--ink, #16150f)">Trap / Syscall Handler</text>
    <text x="270" y="265" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">تغییر استک و بررسی جدول</text>

    <rect x="410" y="225" width="200" height="50" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="510" y="248" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--ink, #16150f)">sys_read() Implementation</text>
    <text x="510" y="265" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">دسترسی به درایور و دیسک</text>

    <!-- Arrows -->
    <path d="M 240 88 L 290 88" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <path d="M 470 88 L 520 88 L 520 170 L 270 170 L 270 225" fill="none" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <path d="M 360 250 L 410 250" stroke="var(--accent, #b5431d)" stroke-width="2"/>
  </svg>
  <figcaption>جابه‌جایی امن بین User Mode و Kernel Mode به کمک دستور سخت‌افزاری Trap</figcaption>
</figure>

### سیستم‌کال‌ها (System Calls)
سیستم‌کال مکانیزم کنترل‌شده‌ای است که یک پروسس در User-Mode برای تقاضای یک سرویس انحصاری از هسته صادر می‌کند (مانند `open()`, `read()`, `write()`, `fork()`). اجرای سیستم‌کال باعث ایجاد یک تله نرم‌افزاری (Trap) و سوئیچ سخت‌افزاری پردازنده از User-Mode به Kernel-Mode می‌شود.

### دسته‌بندی وقفه‌ها (Interrupts)
وقفه سیگنالی است که جریان عادی اجرای دستورات را متوقف کرده و پردازنده را وادار به پرش به یک روتین مشخص در کرنل (Interrupt Service Routine - ISR) می‌کند:
1. **وقفه‌های سخت‌افزاری (Hardware Interrupts):** سیگنال‌های الکتریکی ناهمگام (Asynchronous) که توسط قطعات خارجی تولید می‌شوند (مانند فشردن کلید کیبورد، حرکت ماوس، یا دریافت بسته شبکه).
2. **سیستم‌کال‌ها (System Calls):** تله‌های نرم‌افزاری عمدی و برنامه‌ریزی‌شده که برنامه‌ها برای استفاده از امکانات کرنل به وجود می‌آورند.
3. **تله‌های نرم‌افزاری و خطاها (Software Traps / Faults):** رویدادهای همگام (Synchronous) ناشی از اشتباهات کد در حال اجرا روی CPU؛ مانند تقسیم بر صفر (Division by zero) یا خطای دسترسی غیرمجاز به حافظه (Segmentation Fault).

### رابطه API با System Call
برنامه‌نویسان به ندرت مستقیماً دستور اسمبلی سیستم‌کال را فراخوانی می‌کنند. در عوض از توابع کتابخانه‌ای استاندارد (APIها مثل `printf()` در زبان C) بهره می‌برند. تابع `printf()` متن‌ها را در یک بافر در یوزر اسپیس تجمیع می‌کند و تنها زمانی که بافر پر شد یا به خط جدید (`\n`) رسید، یک‌بار سیستم‌کال خام `write()` را صدا می‌زند. این کار هزینه سنگین پرش‌های مداوم به Kernel Mode را مهار می‌کند.

---

## ۳. مبانی سخت‌افزار و ورودی/خروجی (Hardware Basics & I/O)

- **پردازنده و حافظه اصلی:** پردازنده (CPU) تنها می‌تواند دستورات را از حافظه اصلی (RAM) واکشی و اجرا کند؛ تمام داده‌ها برای پردازش باید ابتدا در رم حاضر باشند.
- **کنترلر دستگاه و درایور (Device Controllers & Drivers):**
  * **کنترلر سخت‌افزاری (Device Controller):** مدار یا چیپ الکترونیکی اختصاصی است که قطعه فیزیکی را اداره می‌کند و دارای رجیسترهای وضعیت (Status)، فرمان (Control) و بافرهای موقت داده است.
  * **درایور (Device Driver):** نرم‌افزاری درون کرنل است که نحوه کار با رجیسترهای کنترلر خاص را می‌داند و رابطی یکپارچه به سایر اجزای سیستم‌عامل ارائه می‌دهد.

### روش‌های انجام ورودی/خروجی (I/O Methods)

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 260" role="img" aria-label="I/O Communication Methods" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="260" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Polling -->
    <rect x="30" y="25" width="195" height="210" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="127" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Polling (Busy-Wait)</text>
    <text x="127" y="85" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--ink, #16150f)">سرکشی مداوم وضعیت</text>
    <rect x="45" y="105" width="165" height="40" rx="4" fill="var(--accent, #b5431d)" fill-opacity="0.1" stroke="var(--accent, #b5431d)"/>
    <text x="127" y="130" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--accent, #b5431d)">while (status == BUSY);</text>
    <text x="127" y="175" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--accent, #b5431d)">اتلاف ۱۰۰٪ توان CPU</text>
    <text x="127" y="195" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">ساده، اما پردازنده را هدر می‌دهد</text>

    <!-- Interrupt-Driven -->
    <rect x="242" y="25" width="195" height="210" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="339" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Interrupt-Driven I/O</text>
    <text x="339" y="85" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--ink, #16150f)">صدور فرمان و انجام کار دیگر</text>
    <rect x="257" y="105" width="165" height="40" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="339" y="130" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">CPU runs other tasks</text>
    <text x="339" y="175" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--ink, #16150f)">دستگاه با وقفه خبر می‌دهد</text>
    <text x="339" y="195" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">استاندارد سیستم‌های امروزی</text>

    <!-- DMA -->
    <rect x="455" y="25" width="195" height="210" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="552" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">DMA (Direct Memory)</text>
    <text x="552" y="85" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--ink, #16150f)">انتقال مستقیم به رم</text>
    <rect x="470" y="105" width="165" height="40" rx="4" fill="var(--ink, #16150f)"/>
    <text x="552" y="130" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--paper, #f3efe6)">Device &lt;==&gt; RAM Bus</text>
    <text x="552" y="175" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--accent, #b5431d)">یک وقفه به ازای هر بلوک</text>
    <text x="552" y="195" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">آزادسازی کامل CPU در دیسک/شبکه</text>
  </svg>
  <figcaption>مقایسه سه الگوی Polling، ورودی/خروجی مبتنی بر وقفه و دسترسی مستقیم حافظه (DMA)</figcaption>
</figure>

1. **سرکشی یا انتظار فعال (Polling / Busy-Waiting):** سیستم‌عامل در یک حلقه تکرارشونده مدام رجیستر وضعیت دستگاه را می‌خواند تا آماده شود. ساده است، اما در زمان انتظار طولانی دیسک یا شبکه، چرخه‌های باارزش CPU را به هدر می‌دهد.
2. **ورودی/خروجی مبتنی بر وقفه (Interrupt-Driven I/O):** سیستم‌عامل فرمان را صادر کرده و CPU را به پروسس‌های دیگر اختصاص می‌دهد. هر زمان کنترلر کار انتقال داده را تمام کرد، یک وقفه سخت‌افزاری ایجاد می‌کند تا به سیستم‌عامل اطلاع دهد.
3. **دسترسی مستقیم به حافظه (DMA - Direct Memory Access):** برای انتقال حجم بالای داده (مانند فایل‌های چند مگابایتی از NVMe یا شبکه گیگابیتی)، ایجاد وقفه برای تک‌تک بایت‌ها بار زیادی به سیستم تحمیل می‌کند. کنترلر DMA بلوک‌های بزرگ داده را بدون دخالت پردازنده مستقیماً بین بافر دستگاه و حافظه رم منتقل می‌کند و در پایانِ کل جابه‌جایی، فقط یک وقفه برای اطلاع‌رسانی ارسال می‌نماید.

### آدرس‌دهی دستگاه‌ها: Port-Mapped در برابر Memory-Mapped I/O
- **Port-Mapped I/O:** پردازنده فضای آدرس سخت‌افزاری جداگانه‌ای برای پورت‌های ورودی/خروجی دارد که تنها با دستورات اسمبلی مخصوص (نظیر `in` و `out` در معماری x86) قابل دسترسی است.
- **Memory-Mapped I/O:** رجیسترهای کنترلرهای سخت‌افزاری مستقیماً به بخشی از همان فضای آدرس رم معمولی متصل می‌شوند. پردازنده با همان دستورات استاندارد خواندن و نوشتن حافظه (`mov` یا `store`) با دستگاه‌ها ارتباط برقرار می‌کند.

---

## ۴. بوت و راه‌اندازی سیستم‌عامل (Booting the OS)

فرآیند بوت گام‌به‌گام سیستم را از حالت خاموش و مدارات بدون حافظه، به وضعیتی می‌رساند که کرنل در رم بارگذاری شده و اولین پروسس سیستم بالا آمده باشد:

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 160" role="img" aria-label="OS Bootstrapping Flow" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="160" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Step 1 -->
    <rect x="25" y="25" width="135" height="110" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="92" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--accent, #b5431d)">گام ۱</text>
    <text x="92" y="72" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--ink, #16150f)">BIOS / ROM</text>
    <text x="92" y="95" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">تست اولیه (POST)</text>
    <text x="92" y="115" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">کشف دیسک بوت</text>

    <!-- Arrow 1 -->
    <path d="M 160 80 L 195 80" stroke="var(--accent, #b5431d)" stroke-width="2"/>

    <!-- Step 2 -->
    <rect x="195" y="25" width="135" height="110" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="262" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--accent, #b5431d)">گام ۲</text>
    <text x="262" y="72" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--ink, #16150f)">MBR (Sector 0)</text>
    <text x="262" y="95" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">۵۱۲ بایت اول دیسک</text>
    <text x="262" y="115" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">بارگذاری در 0x7C00</text>

    <!-- Arrow 2 -->
    <path d="M 330 80 L 365 80" stroke="var(--accent, #b5431d)" stroke-width="2"/>

    <!-- Step 3 -->
    <rect x="365" y="25" width="135" height="110" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="432" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--accent, #b5431d)">گام ۳</text>
    <text x="432" y="72" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--ink, #16150f)">Bootloader</text>
    <text x="432" y="95" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">خواندن فایل‌سیستم</text>
    <text x="432" y="115" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">بارگذاری باینری کرنل</text>

    <!-- Arrow 3 -->
    <path d="M 500 80 L 535 80" stroke="var(--accent, #b5431d)" stroke-width="2"/>

    <!-- Step 4 -->
    <rect x="535" y="25" width="125" height="110" rx="6" fill="var(--ink, #16150f)"/>
    <text x="597" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--accent, #b5431d)">گام ۴</text>
    <text x="597" y="72" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--paper, #f3efe6)">Kernel Space</text>
    <text x="597" y="95" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--paper-2, #ece7db)">راه‌اندازی درایورها</text>
    <text x="597" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--paper-2, #ece7db)">init (PID 1)</text>
  </svg>
  <figcaption>زنجیره فرآیند بوت سیستم از روشن شدن تا اجرای پروسس اولیه init</figcaption>
</figure>

1. **برنامه پیش‌ران و بایوس (Bootstrap / BIOS):**
   * هنگام اتصال برق، پردازنده کدهای یک برنامه کوچک ذخیره‌شده در تراشه حافظه فقط‌خواندنی (ROM) به نام BIOS را اجرا می‌کند. این برنامه با اجرای آزمون POST سلامت قطعات را بررسی کرده و درایو راه‌انداز دیسک را پیدا می‌کند.
2. **سکتور صفر و رکورد راه‌انداز اصلی (Master Boot Record - MBR):**
   * بایوس اولین سکتور دیسک (سکتور صفر با اندازه دقیق ۵۱۲ بایت) را در آدرس مشخصی از رم (`0x7C00`) لود می‌کند. این سکتور شامل کدهای مقدماتی بوت و جدول پارتیشن‌های دیسک است.
3. **بوت‌لودر (Bootloader):**
   * به دلیل کمبود فضا در ۵۱۲ بایت MBR، کدهای اولیه یک لودر بزرگ‌تر و کامل‌تر به نام Bootloader (نظیر GRUB) را اجرا می‌کنند. بوت‌لودر قادر به پیمایش ساختار فایل‌سیستم دیسک است، فایل باینری کرنل سیستم‌عامل را پیدا کرده، آن را در رم بارگذاری می‌کند و کنترل CPU را به کرنل تحویل می‌دهد.
4. **شروع به کار کرنل و ایجاد پروسس `init`:**
   * کرنل جدول وقفه‌ها را تنظیم می‌کند، حالت حفاظت‌شده حافظه مجازی را فعال می‌نماید و در نهایت اولین پروسس سیستم به نام **`init` (PID 1)** را اجرا می‌کند تا سایر سرویس‌ها و شل سیستم را راه‌اندازی کند.
