---
title: "مفهوم پروسس، چرخه حیات، زمان‌بندی و مکانیزم‌های IPC"
date: 2026-10-26
summary: "مفهوم Process، کالبدشکافی PCB، کانتکست سوییچ، درخت پروسس‌ها و init، سیستم‌کال‌های fork، exec، wait، exit، مهار پروسس‌های زامبی و یتیم، انواع زمان‌بندها (بلندمدت، کوتاه‌مدت، میان‌مدت)، و مکانیزم‌های جامع IPC (حافظه مشترک، ارسال پیام، پایپ‌ها، سوکت‌ها، RPC و سیگنال‌ها)."
tags: [os, chapter-3, process, pcb, context-switch, fork, scheduling, ipc, shared-memory, sockets, rpc]
series: os
chapter: 3
section: "3"
order: 3
mode: summary
book: "Operating System Concepts"
edition: "10th"
draft: false
---

پروسس (Process) اساسی‌ترین و مرکزی‌ترین انتزاع در تمام سیستم‌های عامل امروزی است. این فصل به بررسی دقیق ساختار پروسس در حافظه، چگونگی تعویض پروسس‌ها روی پردازنده، چرخه حیات و در نهایت راه‌های تبادل داده بین آنها (IPC) می‌پردازد.

---

## ۱. مبانی پروسس (Process Fundamentals)

یک پروسس، برنامه‌ای در حال اجرا در حافظه رم است. پروسس برخلاف فایل برنامه روی دیسک، دارای وضعیت پویا و ثبات‌های اختصاصی است.

### ساختار داده شناسنامه پروسس: Process Control Block (PCB)
کرنل سیستم‌عامل برای ردیابی، کنترل و مدیریت هر پروسس، یک ساختار داده اختصاصی در حافظه محافظت‌شده خود ایجاد می‌کند که **PCB** نامیده می‌شود:
- **شناسه پروسس (Process ID - PID):** یک عدد یکتا که پروسس را در سراسر سیستم مشخص می‌کند.
- **وضعیت پروسس (Process State):** پروسس در چه مرحله‌ای است (Ready، Running، Waiting، Zombie).
- **مالکیت (Ownership):** شناسه‌های کاربری (UID) و گروهی (GID) سازنده پروسس.
- **ثبات‌های پردازنده (Saved Registers):** مقادیر ثبات‌ها نظیر Program Counter (PC)، Stack Pointer (SP) و ثبات‌های عمومی که هنگام توقف پروسس در PCB ذخیره می‌شوند تا بعداً از همان نقطه ادامه یابد.
- **اطلاعات مدیریت حافظه (Memory Management):** اشاره‌گر به جدول صفحات (Page Tables) و محدوده حافظه اختصاص‌یافته به پروسس.
- **لیست فایل‌های باز (Open Files):** جدولی از شناسه‌های فایل (File Descriptors) که پروسس باز کرده است.

### کانتکست سوییچ (Context Switch)
کانتکست سوییچ یعنی عمل ذخیره وضعیت اجرایی پروسس جاری (پروسس A) درون `PCB_A` و بارگذاری وضعیت ذخیره‌شده پروسس دیگر (پروسس B) از درون `PCB_B` به منظور تغییر دادن اجرای CPU از A به B.

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 260" role="img" aria-label="Context Switch Timeline" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="260" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Process A -->
    <rect x="30" y="25" width="170" height="210" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="115" y="48" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Process A</text>
    <rect x="45" y="60" width="140" height="45" rx="4" fill="var(--ink, #16150f)"/>
    <text x="115" y="87" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--paper, #f3efe6)">در حال اجرا روی CPU</text>
    <rect x="45" y="115" width="140" height="100" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-dasharray="3 3"/>
    <text x="115" y="165" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">معلق (سوییچ شده)</text>

    <!-- Kernel Switch Logic -->
    <rect x="230" y="25" width="220" height="210" rx="6" fill="var(--ink, #16150f)"/>
    <text x="340" y="48" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--paper, #f3efe6)">Kernel Context Switch</text>
    <rect x="245" y="65" width="190" height="35" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="340" y="86" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--ink, #16150f)">۱. ذخیره وضعیت در PCB_A</text>
    <rect x="245" y="110" width="190" height="35" rx="4" fill="var(--accent, #b5431d)"/>
    <text x="340" y="132" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" font-weight="600" fill="var(--paper, #f3efe6)">۲. انتخاب پروسس B توسط زمان‌بند</text>
    <rect x="245" y="155" width="190" height="35" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="340" y="176" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--ink, #16150f)">۳. بازیابی وضعیت از PCB_B</text>

    <!-- Process B -->
    <rect x="480" y="25" width="170" height="210" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="565" y="48" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Process B</text>
    <rect x="495" y="60" width="140" height="100" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-dasharray="3 3"/>
    <text x="565" y="110" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">در انتظار نوبت در صف</text>
    <rect x="495" y="170" width="140" height="45" rx="4" fill="var(--ink, #16150f)"/>
    <text x="565" y="197" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--paper, #f3efe6)">آغاز اجرا روی CPU</text>
  </svg>
  <figcaption>روند ذخیره‌سازی و بازیابی وضعیت پردازنده حین کانتکست سوییچ بین دو پروسس</figcaption>
</figure>

کانتکست سوییچ یک کار پردازشی خالص برای سیستم‌عامل است و در مدت زمان انجام آن، هیچ کد مفیدی از برنامه‌های کاربران اجرا نمی‌شود (Pure Overhead).

### درخت پروسس‌ها (Process Tree)
پروسس‌ها در سیستم‌های یونیکسی به صورت سلسله‌مراتبی و درختی ایجاد می‌شوند:
- ریشه این درخت اولین پروسس سیستم یعنی **`init` (با PID = 1)** است.
- تمام پروسس‌های دیگر از طریق سیستم‌کال `fork()` توسط یک والد (Parent) متولد می‌شوند و هر پروسس همواره والد خود را می‌شناسد.

---

## ۲. عملیات روی پروسس‌ها (Process Operations در POSIX)

چرخه حیات پروسس‌ها بر مبنای چهار فراخوانی اصلی سیستم اداره می‌شود:

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 260" role="img" aria-label="Process Lifecycle with fork, exec, wait, exit" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="260" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Parent -->
    <rect x="50" y="30" width="220" height="200" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="160" y="60" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--ink, #16150f)">Parent Process</text>
    <rect x="70" y="80" width="180" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="160" y="102" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--accent, #b5431d)">fork() =&gt; returns child PID</text>
    <rect x="70" y="135" width="180" height="60" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="160" y="160" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">wait(&amp;status)</text>
    <text x="160" y="180" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">والد در انتظار اتمام فرزند می‌ماند</text>

    <!-- Fork arrow -->
    <path d="M 270 97 L 410 97" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="340" y="87" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--accent, #b5431d)">تکثیر کپی دقیق</text>

    <!-- Child -->
    <rect x="410" y="30" width="220" height="200" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="520" y="60" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--ink, #16150f)">Child Process</text>
    <rect x="430" y="80" width="180" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="520" y="102" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--accent, #b5431d)">fork() =&gt; returns 0</text>
    <rect x="430" y="125" width="180" height="35" rx="4" fill="var(--ink, #16150f)"/>
    <text x="520" y="147" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--paper, #f3efe6)">exec(...) جایگزینی باینری</text>
    <rect x="430" y="170" width="180" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="520" y="192" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">exit(status) پایان کار</text>

    <!-- Reap arrow -->
    <path d="M 430 187 L 250 187" stroke="var(--accent, #b5431d)" stroke-width="1.5" stroke-dasharray="3 3"/>
  </svg>
  <figcaption>سیستم‌کال‌های چهارگانه عملیات پروسس و همگام‌سازی والد و فرزند</figcaption>
</figure>

1. **`fork()`:**
   * یک پروسس فرزند جدید می‌سازد که یک نسخه کاملاً همسان و کپی دقیق از والد است.
   * حافظه والد و فرزند مجزاست اما در لحظه ساخت، محتوای یکسان دارند.
   * **مقادیر بازگشتی:** درون پروسس فرزند عدد `0` بازگردانده می‌شود؛ درون پروسس والد شناسه فرزند (Child PID) بازمی‌گردد.
2. **`exec()`:**
   * فضای آدرس و حافظه پروسس جاری را کاملاً پاک کرده و آن را با یک فایل اجرایی جدید از روی دیسک (مثلاً اجرای `/usr/bin/firefox`) جایگزین می‌کند. در صورت موفقیت، هرگز به خط بعدی کد بازنمی‌گردد چون کدهای قبلی از بین رفته‌اند.
3. **`exit()`:**
   * پروسس داوطلبانه اجرای خود را پایان می‌دهد و یک کد وضعیت خروجی (Status Code) برای والد خود ثبت می‌کند (معمولاً `0` به معنای موفقیت است).
4. **`wait()`:**
   * والد اجرای خود را به حالت تعلیق درمی‌آورد تا زمانی که یکی از فرزندانش پایان یافته و خروج کند. والد کد وضعیت خروج فرزند را دریافت کرده و رکورد آن را از جدول پروسس‌های سیستم پاک می‌کند.

### وضعیت‌های غیرعادی: Zombie و Orphan
- **پروسس زامبی (Zombie):** پروسس فرزندی که کارش با اجرای `exit()` تمام شده، اما والدش هنوز تابع `wait()` را برای دریافت کد خروج صدا نزده است. پروسس زامبی مرده است اما تا زمان خوانده شدن توسط والد، یک مدخل در جدول پروسس‌های کرنل باقی می‌ماند. اگر تعداد زامبی‌ها بالا برود، شناسه پروسس‌های سیستم (PIDs) تمام می‌شود.
- **پروسس یتیم (Orphan):** پروسس در حال اجرایی که والد آن زودتر از خودش مرده است. در سیستم‌های یونیکسی، سیستم‌عامل سرپرستی تمام پروسس‌های یتیم را فوراً به پروسس ریشه یعنی **`init` (PID 1)** واگذار می‌کند تا پس از پایان کارشان، آنها را از جدول پاک کند.

---

## ۳. انواع زمان‌بندی (Scheduling Types)

سیستم‌عامل فرآیند زمان‌بندی را در سه سطح مختلف کنترل می‌کند:

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 260" role="img" aria-label="Three Levels of CPU Scheduling" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="260" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Disk Pool -->
    <rect x="25" y="90" width="120" height="75" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="85" y="122" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--ink, #16150f)">Disk Pool</text>
    <text x="85" y="142" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">برنامه‌ها روی دیسک</text>

    <!-- Long Term Arrow -->
    <path d="M 145 127 L 205 127" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="175" y="117" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">پذیرش به رم</text>

    <!-- RAM Ready Queue -->
    <rect x="205" y="65" width="220" height="125" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="315" y="90" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">RAM Ready Queue</text>
    <text x="315" y="110" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">پروسس‌های مقیم حافظه</text>

    <!-- Medium Term Scheduler Box -->
    <rect x="235" y="200" width="160" height="40" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="315" y="218" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" font-weight="600" fill="var(--ink, #16150f)">زمان‌بند میان‌مدت (Swapper)</text>
    <text x="315" y="232" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="8" fill="var(--muted, #6f6a5a)">تخلیه موقت به دیسک</text>
    <path d="M 260 190 L 260 200" stroke="var(--muted, #6f6a5a)" stroke-width="1.5"/>
    <path d="M 370 200 L 370 190" stroke="var(--muted, #6f6a5a)" stroke-width="1.5"/>

    <!-- Short Term Arrow -->
    <path d="M 425 127 L 505 127" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="465" y="117" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">تخصیص CPU</text>

    <!-- CPU Core -->
    <rect x="505" y="75" width="150" height="105" rx="6" fill="var(--ink, #16150f)"/>
    <text x="580" y="122" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--paper, #f3efe6)">CPU Core</text>
    <text x="580" y="145" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">زمان‌بند کوتاه‌مدت (ms)</text>
  </svg>
  <figcaption>سه سطح مختلف زمان‌بندها در ساختار چندبرنامگی سیستم‌عامل</figcaption>
</figure>

1. **زمان‌بند بلندمدت یا کار (Long-Term / Job Scheduler):**
   * انتخاب می‌کند که کدام برنامه‌ها از روی دیسک به حافظه رم آورده شوند تا تبدیل به پروسس گردند.
   * فرکانس اجرای آن بسیار پایین است و درجه چندبرنامگی (تعداد پروسس‌های درون رم) را کنترل می‌کند.
2. **زمان‌بند کوتاه‌مدت یا پردازنده (Short-Term / CPU Scheduler):**
   * از بین پروسس‌های آماده در رم (Ready Queue)، انتخاب می‌کند چه کسی هسته CPU را تصاحب کند.
   * رایج‌ترین و سریع‌ترین زمان‌بند سیستم است که در مقیاس چند میلی‌ثانیه‌ای اجرا می‌شود.
3. **زمان‌بند میان‌مدت (Medium-Term Scheduler):**
   * در زمان پر شدن رم و سنگینی بار سیستم، پروسس‌ها را به صورت موقت از رم خارج کرده و به فضای Swap روی دیسک منتقل می‌کند تا منابع آزاد شوند (Swapping Out)، و بعداً آن‌ها را بازمی‌گرداند (Swapping In).

---

## ۴. ارتباط بین پروسس‌ها (Inter-Process Communication - IPC)

### چرا برنامه‌ها را تکه‌تکه کنیم؟
1. **پیمانه‌ای بودن (Modularity):** خرد کردن سیستم به ماژول‌های مجزا.
2. **افزایش سرعت با موازی‌سازی (Parallelism):** استفاده از چند هسته پردازنده به صورت همزمان.
3. **ایزولاسیون و امنیت:** جدا کردن بخش‌های حساس و با دسترسی بالا از کدهای معمولی.

### دو مدل اصلی IPC

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 260" role="img" aria-label="Shared Memory vs Message Passing Models" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="260" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Shared Memory Half -->
    <rect x="30" y="25" width="300" height="210" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="180" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Shared Memory Model</text>
    <rect x="50" y="65" width="100" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="100" y="87" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">Process A</text>
    <rect x="210" y="65" width="100" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="260" y="87" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">Process B</text>

    <rect x="65" y="130" width="230" height="50" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="180" y="152" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--accent, #b5431d)">ناحیه حافظه اشتراکی</text>
    <text x="180" y="170" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">تبادل داده با سرعت رم بدون دخالت کرنل</text>
    <path d="M 100 100 L 120 130" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <path d="M 260 100 L 240 130" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="180" y="210" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--ink, #16150f)">نیازمند همگام‌سازی (Mutex / Semaphore)</text>

    <!-- Message Passing Half -->
    <rect x="350" y="25" width="300" height="210" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="500" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Message Passing Model</text>
    <rect x="370" y="65" width="100" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="420" y="87" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">Process A</text>
    <rect x="530" y="65" width="100" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="580" y="87" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">Process B</text>

    <rect x="385" y="130" width="230" height="50" rx="4" fill="var(--ink, #16150f)"/>
    <text x="500" y="152" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--paper, #f3efe6)">صف پیام درون کرنل</text>
    <text x="500" y="170" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--paper-2, #ece7db)">کپی داده‌ها از طریق سیستم‌کال</text>
    <path d="M 420 100 L 420 130" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <path d="M 580 130 L 580 100" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="500" y="210" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--ink, #16150f)">مناسب برای سیستم‌های توزیع‌شده و شبکه</text>
  </svg>
  <figcaption>مقایسه دو مدل اصلی ارتباط بین پروسس‌ها: Shared Memory و Message Passing</figcaption>
</figure>

1. **حافظه مشترک (Shared Memory):**
   * دو یا چند پروسس بخش معینی از حافظه فیزیکی را به صورت مشترک در فضای آدرس خود نگاشت می‌کنند.
   * **مزیت:** سرعت سرسام‌آور؛ به محض برقراری نگاشت، خواندن و نوشتن بدون دخالت سیستم‌کال انجام می‌شود.
   * **عیب:** نیازمند همگام‌سازی (Synchronization با سمافورها یا موتکس‌ها) برای جلوگیری از شرایط مسابقه (Race Condition)، مانند **مسئله تولیدکننده-مصرف‌کننده (Producer-Consumer Problem)** که نباید همزمان بافر مشترک را دستکاری کنند.
2. **ارسال پیام (Message Passing):**
   * پروسس‌ها با توابع `send()` و `receive()` بسته‌های پیام را از طریق سیستم‌عامل با هم مبادله می‌کنند.
   * **مزیت:** هماهنگی آسان‌تر و عملکرد عالی در محیط‌های توزیع‌شده و شبکه.
   * **عیب:** کندتر بودن به دلیل ایجاد تله‌های متعدد به کرنل و کپی داده‌ها بین فضای کاربر و فضای هسته.

### ویژگی‌های ارسال پیام
- **نام‌گذاری مستقیم (Direct):** نام پروسس فرستنده و گیرنده صراحتاً قید می‌شود؛ مثلاً `send(Process_B, msg)`.
- **نام‌گذاری غیرمستقیم (Indirect):** پیام به یک صندوق پستی یا پورت اشتراکی فرستاده می‌شود؛ مثلاً `send(Mailbox_X, msg)`.
- **همگام یا مسدودکننده (Blocking / Synchronous):** فرستنده منتظر می‌ماند تا گیرنده پیام را تحویل بگیرد، یا گیرنده تا زمان رسیدن پیام مسدود می‌ماند.
- **ناهمگام یا غیرمسدودکننده (Non-blocking / Asynchronous):** فرستنده پیام را در صف رها کرده و بلافاصله به کارش ادامه می‌دهد، و گیرنده در صورت خالی بودن صف معطل نمی‌شود.

---

## ۵. مکانیزم‌های کاربردی IPC (Specific IPC Mechanisms)

### ۱. لوله‌ها (Pipes)
یک بافر حلقوی درون کرنل که یک پروسس در یک سر آن می‌نویسد و پروسس دیگر از سر دیگر می‌خواند:
- **پایپ‌های ناشناس (Anonymous Pipes):** فقط بین پروسس‌های خویشاوند (والد و فرزند که بعد از `fork` زاده شده‌اند) کار می‌کند و با بستن پروسس از بین می‌رود.
- **پایپ‌های نام‌دار (Named Pipes / FIFOs):** به صورت یک فایل ویژه در سیستم فایل ایجاد می‌شوند و پروسس‌های کاملاً نامرتبط و غریبه نیز می‌توانند با باز کردن نام آن، به صورت دوطرفه داده رد و بدل کنند.

### ۲. سوکت‌های شبکه (Network Sockets)
نقاط پایانی ارتباطی که با زوج **آدرس آی‌پی (IP Address)** برای تشخیص کامپیوتر مقصد و **شماره پورت (Port Number)** برای تشخیص پروسس یا سرویس مورد نظر روی آن کامپیوتر شناسایی می‌شوند. سوکت‌ها پایه و اساس برقراری ارتباط روی شبکه اینترنت هستند.

### ۳. فراخوانی رویه از راه دور (Remote Procedure Call - RPC)
به برنامه اجازه می‌دهد تابعی را روی یک کامپیوتر دیگر در شبکه صدا بزند طوری که انگار یک تابع محلی درون کد خود را صدا زده است:

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 230" role="img" aria-label="RPC Architecture with Stubs" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="230" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Client -->
    <rect x="30" y="25" width="280" height="180" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="170" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">CLIENT HOST</text>
    <rect x="50" y="65" width="240" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="170" y="87" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">Client calls add(10, 20)</text>

    <rect x="50" y="115" width="240" height="70" rx="4" fill="var(--ink, #16150f)"/>
    <text x="170" y="137" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--paper, #f3efe6)">Client Stub</text>
    <text x="170" y="157" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--paper-2, #ece7db)">بسته‌بندی پارامترها به بایت (Marshalling)</text>
    <text x="170" y="172" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">ارسال بسته بر روی سوکت شبکه</text>

    <!-- Network -->
    <path d="M 290 150 L 390 150" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="340" y="142" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--accent, #b5431d)">Network</text>

    <!-- Server -->
    <rect x="370" y="25" width="280" height="180" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="510" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">SERVER HOST</text>
    <rect x="390" y="65" width="240" height="35" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="510" y="87" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink, #16150f)">Server runs add(10, 20)</text>

    <rect x="390" y="115" width="240" height="70" rx="4" fill="var(--ink, #16150f)"/>
    <text x="510" y="137" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--paper, #f3efe6)">Server Stub</text>
    <text x="510" y="157" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--paper-2, #ece7db)">رمزگشایی بایت‌ها (Unmarshalling)</text>
    <text x="510" y="172" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">فراخوانی تابع و بازگرداندن پاسخ</text>
  </svg>
  <figcaption>روند اجرای RPC با استفاده از Stubها برای مارشال و آن‌مارشال کردن داده‌ها در شبکه</figcaption>
</figure>

- **Client Stub:** در سمت کلاینت نشسته و آرگومان‌های تابع را گرفته و به بایت‌های قابل انتقال در شبکه تبدیل می‌کند (**Marshalling / Serialization**).
- **Server Stub:** در سمت سرور پیام دریافتی را تحویل گرفته، آن را باز می‌کند (**Unmarshalling / Deserialization**) و تابع اصلی را اجرا کرده و حاصل را بازمی‌گرداند.

### ۴. سیگنال‌ها (Signals)
روشی سبک و محدود از IPC که برای آگاه‌سازی یک پروسس از وقوع یک رویداد ناگهانی به کار می‌رود:
- با رسیدن سیگنال، روند عادی پروسس قطع شده و یک روتین مشخص (**Signal Handler**) اجرا می‌شود.
- **`SIGINT`:** سیگنال وقفه ارسال‌شده توسط کیبورد ترمینال با فشردن `Ctrl+C`. پروسس می‌تواند این سیگنال را دریافت، مهار یا نادیده بگیرد.
- **`SIGKILL`:** دستور کشتن و خاتمه فوری پروسس توسط کرنل. این سیگنال غیرقابل بلاک کردن یا نادیده گرفتن است و پروسس بلافاصله نابود می‌شود.
