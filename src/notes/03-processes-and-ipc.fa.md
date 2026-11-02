---
title: "مفهوم پروسس، چرخه حیات، زمان‌بندی و مکانیزم‌های IPC"
date: 2026-10-26
summary: "کالبدشکافی پروسس و چیدمان حافظه (Text, Data, BSS, Heap, Stack, ASLR)، مدل ۵ حالته چرخه حیات، ساختار PCB و task_struct، کانتکست‌سوییچ و هزینه‌های TLB، سیستم‌کال‌های fork, exec, wait, exit همراه با کدهای کامل C، مهار پروسس‌های Zombie و Orphan، انواع زمان‌بندها و Swapping، و پیاده‌سازی جامع مدل‌های IPC (حافظه اشتراکی POSIX، پایپ‌ها، سوکت‌ها، RPC و سیگنال‌ها با sigaction)."
tags: [os, chapter-3, process, pcb, context-switch, fork, scheduling, ipc, shared-memory, sockets, rpc, signals, cow]
series: os
chapter: 3
section: "3"
order: 3
mode: summary
book: "Operating System Concepts"
edition: "10th"
draft: false
---

پروسس (Process) اساسی‌ترین و مرکزی‌ترین موجودیت در تمام سیستم‌های عامل امروزی است. تمامی پردازش‌های دنیای دیجیتال، از اجرای یک دستور ساده در ترمینال تا پردازش میلیاردها تراکنش در سرورهای ابری، در کالبد پروسس‌ها جریان دارند. این فصل به بررسی دقیق ساختار پروسس در حافظه، مکانیزم‌های سخت‌افزاری تعویض پروسس‌ها روی پردازنده، چرخه حیات، زمان‌بندی و کانال‌های تبادل داده میان آن‌ها (IPC) می‌پردازد.

---

## ۱. مبانی پروسس و چیدمان حافظه (Process Memory Layout)

یک پروسس، یک **برنامه در حال اجرا (Active Entity)** در حافظه رم است. در حالی که یک برنامه روی دیسک تنها کدهای باینری ایستا است، پروسس دارای منابع زنده سخت‌افزاری و وضعیت پویا در هر کلاک پردازنده است.

### ساختار فضای آدرس پروسس در حافظه مجازی
هنگامی که سیستم‌عامل برنامه‌ای را بارگذاری می‌کند، یک فضای آدرس‌دهی مجازی پیوسته (مثلاً در معماری‌های ۶۴ بیتی با آدرس‌های ۰ تا $2^{48}-1$) برای آن می‌سازد که به بخش‌های زیر تقسیم می‌شود:

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 340" role="img" aria-label="Process Address Space Layout" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="340" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- High Address Label -->
    <text x="340" y="25" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--muted, #6f6a5a)">آدرس‌های بالای حافظه مجازی (High Memory: 0x7FFFFFFFFFFF)</text>

    <!-- Stack Box -->
    <rect x="190" y="38" width="300" height="50" rx="4" fill="var(--ink, #16150f)"/>
    <text x="340" y="60" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--paper, #f3efe6)">Stack (پشته محلی)</text>
    <text x="340" y="78" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--paper-2, #ece7db)">متغیرهای محلی، فریم توابع، آدرس بازگشت (رشد رو به پایین ↓)</text>

    <!-- Free Space with arrows -->
    <rect x="190" y="94" width="300" height="60" rx="4" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)" stroke-dasharray="4 4"/>
    <text x="340" y="120" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--muted, #6f6a5a)">فضای خالی بین استک و هیپ (Unallocated Space)</text>
    <path d="M 320 98 L 320 115" stroke="var(--accent, #b5431d)" stroke-width="1.5"/>
    <path d="M 360 148 L 360 131" stroke="var(--accent, #b5431d)" stroke-width="1.5"/>

    <!-- Heap Box -->
    <rect x="190" y="160" width="300" height="50" rx="4" fill="var(--accent, #b5431d)"/>
    <text x="340" y="182" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--paper, #f3efe6)">Heap (فضای پویا)</text>
    <text x="340" y="200" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--paper, #f3efe6)">حافظه تخصیص‌یافته با malloc/new (رشد رو به بالا ↑)</text>

    <!-- BSS Box -->
    <rect x="190" y="216" width="300" height="35" rx="4" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="340" y="238" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--ink, #16150f)">BSS Segment (متغیرهای سراسری/ایستا بدون مقدار اولیه)</text>

    <!-- Data Box -->
    <rect x="190" y="255" width="300" height="35" rx="4" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="340" y="277" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--ink, #16150f)">Data Segment (متغیرهای سراسری مقداردهی‌شده)</text>

    <!-- Text Box -->
    <rect x="190" y="294" width="300" height="35" rx="4" fill="var(--ink, #16150f)"/>
    <text x="340" y="316" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--paper, #f3efe6)">Text / Code Segment (دستورالعمل‌های ماشین - فقط خواندنی)</text>
  </svg>
  <figcaption>چیدمان ساختار فضای آدرس‌دهی یک پروسس در حافظه مجازی</figcaption>
</figure>

1. **بخش کد یا متن (Text / Code Segment):** کدهای باینری دستورالعمل‌های کامپایل‌شده ماشین. این بخش به صورت **فقط‌خواندنی (Read-Only)** نگاشت می‌شود تا پروسس نتواند دستورات خود را تغییر دهد. همچنین میان تمام نمونه‌های باز یک برنامه (مثلاً ده زبانه فایرفاکس) به اشتراک گذاشته می‌شود.
2. **بخش داده (Data Segment):** متغیرهای سراسری (Global) و ایستا (Static) که در زمان کدنویسی مقداردهی اولیه شده‌اند (مانند `int count = 10;`).
3. **بخش BSS (Block Started by Symbol):** متغیرهای سراسری و ایستایی که مقداردهی نشده‌اند (مانند `int buffer[1024];`). این داده‌ها فضایی در فایل باینری روی دیسک اشغال نمی‌کنند و در زمان بارگذاری توسط کرنل با بایت صفر (`0x00`) پر می‌شوند.
4. **فضای هیپ (Heap):** حافظه پویایی که در طول اجرای برنامه با توابعی نظیر `malloc()`، `calloc()` در زبان C یا عملگر `new` در ++C تخصیص داده می‌شود. هیپ به سمت آدرس‌های بالاتر رشد می‌کند و مرز آن توسط سیستم‌کال‌های `brk()` یا نگاشت‌های حافظه `mmap()` جابه‌جا می‌شود.
5. **پشته محلی (Stack):** برای مدیریت فراخوانی توابع، فریم‌های پشته، متغیرهای محلی، و آدرس‌های بازگشت (Return Addresses). پشته از بالاترین آدرس به سمت پایین رشد می‌کند.
6. **امنیت چیدمان با ASLR (Address Space Layout Randomization):** برای جلوگیری از حملات تزریق کد و سرریز بافر، سیستم‌عامل‌های مدرن در هر بار اجرای برنامه، آدرس شروع استک، هیپ و کتابخانه‌ها را در حافظه تصادفی‌سازی می‌کنند تا مهاجم نتواند آدرس دقیق متغیرها را حدس بزند.

---

## ۲. مدل پنج‌حالته پروسس و شناسنامه PCB (Process State & PCB)

یک پروسس در طول چرخه حیات خود از لحظه تولد تا نابودی، همواره در یکی از پنج حالت زیر قرار دارد:

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 230" role="img" aria-label="Process 5-State Transition Diagram" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="230" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- New -->
    <rect x="25" y="85" width="95" height="50" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="72" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">New</text>

    <!-- Arrow New -> Ready -->
    <path d="M 120 110 L 165 110" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="142" y="102" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">پذیرش</text>

    <!-- Ready -->
    <rect x="165" y="85" width="105" height="50" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="217" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Ready</text>

    <!-- Arrow Ready -> Running -->
    <path d="M 270 100 L 375 100" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="322" y="92" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">تخصیص زمان‌بند</text>

    <!-- Arrow Running -> Ready (Interrupt) -->
    <path d="M 375 120 L 270 120" stroke="var(--muted, #6f6a5a)" stroke-width="1.5" stroke-dasharray="3 3"/>
    <text x="322" y="133" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">وقفه تایمر</text>

    <!-- Running -->
    <rect x="375" y="85" width="105" height="50" rx="6" fill="var(--ink, #16150f)"/>
    <text x="427" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--paper, #f3efe6)">Running</text>

    <!-- Arrow Running -> Terminated -->
    <path d="M 480 110 L 535 110" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="507" y="102" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">exit()</text>

    <!-- Terminated -->
    <rect x="535" y="85" width="115" height="50" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="592" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Terminated</text>

    <!-- Waiting Box -->
    <rect x="260" y="165" width="130" height="45" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="325" y="193" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--accent, #b5431d)">Waiting (Blocked)</text>

    <!-- Arrow Running -> Waiting -->
    <path d="M 427 135 L 427 185 L 390 185" fill="none" stroke="var(--accent, #b5431d)" stroke-width="1.5"/>
    <text x="440" y="165" text-anchor="start" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">انتظار I/O یا سیگنال</text>

    <!-- Arrow Waiting -> Ready -->
    <path d="M 260 185 L 217 185 L 217 135" fill="none" stroke="var(--accent, #b5431d)" stroke-width="1.5"/>
    <text x="210" y="165" text-anchor="end" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">اتمام I/O</text>
  </svg>
  <figcaption>نمودار گذار حالات پنج‌گانه پروسس در سیستم‌عامل (۵-State Model)</figcaption>
</figure>

1. **New (تازه ایجاد شده):** پروسس در حال تولد است و ساختارهای اولیه آن در حال ساخت است.
2. **Ready (آماده):** پروسس در حافظه رم مقیم است و در صف انتظار قرار دارد تا یک هسته CPU خالی شود.
3. **Running (در حال اجرا):** دستورات پروسس مستقیماً روی ثبات‌ها و مدارهای منطقی پردازنده در حال محاسبه و اجرا هستند.
4. **Waiting / Blocked (مسدود):** پروسس منتظر وقوع یک رویداد خارجی (مانند رسیدن بایت‌ها از دیسک، ورودی کیبورد، یا دریافت بسته شبکه) است. پروسس در این حالت **هیچ کلاکی از CPU مصرف نمی‌کند**. با پایان رویداد، مستقیماً به حالت Running نمی‌رود، بلکه وارد صف **Ready** می‌شود تا نوبت پردازش بگیرد.
5. **Terminated (خاتمه‌یافته):** پروسس کار خود را به اتمام رسانده و منتظر خوانده شدن کد وضعیت خروج توسط والدش است.

### شناسنامه پروسس: Process Control Block (PCB)
کرنل برای هر پروسس یک ساختار داده اختصاصی در فضای حافظه حفاظت‌شده خود نگهداری می‌کند که در یونیکس و لینوکس با ساختار زبان C معروف به **`struct task_struct`** تعریف می‌شود:
- **Process ID (PID):** شناسه عددی یکتای پروسس در سراسر سیستم.
- **وضعیت پروسس (Process State):** پروسس هم‌اکنون در کدام‌یک از وضعیت‌های ۵‌گانه است.
- **شمارنده برنامه (Program Counter - PC / RIP):** آدرس دقیق دستور بعدی که باید اجرا شود.
- **ثبات‌های پردازنده (CPU Registers):** مقادیر تمامی ثبات‌های عمومی (`rax`, `rbx` و...)، پشته (`rsp`)، اشاره‌گر فریم (`rbp`) و ثبات‌های محاسبات ممیز شناور (FPU/SSE/AVX).
- **اطلاعات زمان‌بندی (CPU Scheduling Info):** اولویت پروسس (Nice value)، اشاره‌گر به صف‌های زمان‌بندی، و میزان اعتبار زمانی.
- **اطلاعات مدیریت حافظه (Memory Management):** اشاره‌گر به جدول صفحات حافظه مجازی (`pgd` / `cr3`) و محدوده حافظه.
- **اطلاعات حسابداری (Accounting Info):** مقدار زمان سپری‌شده در User Mode و Kernel Mode، شناسه‌های کاربری (UID/GID)، و محدودیت‌های مصرف منابع (rlimits).
- **وضعیت ورودی/خروجی (I/O Status):** جدول توصیف‌گرهای فایل بازشده (**File Descriptor Table**).

---

## ۳. کانتکست سوییچ و سربار سخت‌افزاری (Context Switch Overhead)

عمل تعویض پردازنده از یک پروسس به پروسس دیگر را **کانتکست سوییچ (Context Switch)** می‌نامند.

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
    <text x="340" y="86" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--ink, #16150f)">۱. ذخیره ثبات‌ها در PCB_A</text>
    <rect x="245" y="110" width="190" height="35" rx="4" fill="var(--accent, #b5431d)"/>
    <text x="340" y="132" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" font-weight="600" fill="var(--paper, #f3efe6)">۲. انتخاب پروسس B و سوئیچ CR3</text>
    <rect x="245" y="155" width="190" height="35" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="340" y="176" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--ink, #16150f)">۳. بازیابی وضعیت از PCB_B</text>

    <!-- Process B -->
    <rect x="480" y="25" width="170" height="210" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="565" y="48" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Process B</text>
    <rect x="495" y="60" width="140" height="100" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-dasharray="3 3"/>
    <text x="565" y="110" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">در صف انتظار Ready</text>
    <rect x="495" y="170" width="140" height="45" rx="4" fill="var(--ink, #16150f)"/>
    <text x="565" y="197" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--paper, #f3efe6)">آغاز اجرا روی CPU</text>
  </svg>
  <figcaption>روند گام‌به‌گام ذخیره‌سازی وضعیت و تعویض پروسس جاری پردازنده</figcaption>
</figure>

### کالبدشکافی هزینه‌های پنهان کانتکست سوییچ
کانتکست سوییچ یک کار پردازشی خالص برای سیستم‌عامل است (**Pure Overhead**)؛ یعنی در مدت زمان انجام آن، هیچ خط مفیدی از کدهای برنامه‌های کاربران اجرا نمی‌شود. این هزینه شامل دو بخش است:
1. **هزینه مستقیم (Direct Cost):** ذخیره ده‌ها رجیستر پردازنده در حافظه RAM و بارگذاری ثبات‌های پروسس جدید، و تغییر رجیستر پایه حافظه مجازی (مانند رجیستر `cr3` در معماری x86-64).
2. **هزینه غیرمستقیم (Indirect Cost - فاجعه در کارایی):**
   * **تخلیه TLB (Translation Lookaside Buffer Invalidation):** با تغییر فضای آدرس، آدرس‌های ترجمه‌شده در کش سخت‌افزاری TLB نامعتبر می‌شوند (مگر اینکه از برچسب‌گذاری سخت‌افزاری نظیر PCID استفاده شود).
   * **آلودگی و سرد شدن کش پردازنده (Cache Pollution / Cold Cache):** کش‌های فوق‌سریع L1، L2 و L3 پردازنده پر از داده‌های پروسس قبلی هستند. با ورود پروسس جدید، مکرراً خطای نقص کش (**Cache Miss**) رخ می‌دهد تا داده‌های پروسس جدید دوباره از رم کند به کش آورده شوند.

---

## ۴. عملیات روی پروسس‌ها در POSIX و کدهای عملی C

چرخه حیات پروسس‌ها بر پایه چهار سیستم‌کال بنیادین `fork`، `exec`، `wait` و `exit` بنا شده است.

### پیاده‌سازی کامل چرخه حیات با زبان C

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

int main(void) {
    pid_t pid;

    printf("[Parent] Initializing, PID = %d\n", getpid());

    // ایجاد پروسس فرزند جدید
    pid = fork();

    if (pid < 0) {
        perror("fork failed");
        exit(EXIT_FAILURE);
    } 
    else if (pid == 0) {
        // این بخش منحصراً درون پروسس فرزند اجرا می‌شود
        printf("[Child] Running, PID = %d (PPID = %d)\n", getpid(), getppid());
        
        // جایگزینی باینری فعلی با دستور ls
        char *args[] = {"ls", "-l", "/tmp", NULL};
        execvp("ls", args);

        // اگر execvp موفق باشد، هرگز به این خط نمی‌رسد
        perror("execvp failed");
        exit(EXIT_FAILURE);
    } 
    else {
        // این بخش منحصراً درون پروسس والد اجرا می‌شود
        printf("[Parent] Spawned child with PID = %d. Waiting for it...\n", pid);

        int status;
        pid_t terminated_child = waitpid(pid, &status, 0);

        if (WIFEXITED(status)) {
            printf("[Parent] Child %d terminated normally with exit status: %d\n",
                   terminated_child, WEXITSTATUS(status));
        } else {
            printf("[Parent] Child terminated abnormally.\n");
        }
    }

    return 0;
}
```

### تحلیل مکانیزم بهینه‌سازی Copy-on-Write (COW) در `fork()`
سیستم‌کال `fork()` یک کپی دقیق از فضای حافظه والد برای فرزند می‌سازد. در سیستم‌های سنتی، کپی کردن گیگابایت‌ها حافظه رم عملیاتی فوق‌العاده کند بود (به‌ویژه اگر فرزند بلافاصله بخواهد `exec` کند!).  
امروزه سیستم‌عامل‌ها از مکانیزم **Copy-on-Write (COW)** استفاده می‌کنند:
- در لحظه فراخوانی `fork()`، هیچ کپی فیزیکی از صفحات رم انجام نمی‌شود!
- جدول صفحات فرزند به همان صفحات فیزیکی والد اشاره می‌کند، اما دسترسی تمامی صفحات روی حالت **فقط‌خواندنی (Read-Only)** تنظیم می‌شود.
- تا زمانی که هر دو پروسس فقط در حال خواندن حافظه هستند، هیچ کپی اضافی انجام نمی‌گیرد.
- به محض اینکه یکی از پروسس‌ها تلاش کند مقداری را در حافظه بنویسد، سخت‌افزار پردازنده یک خطای **Page Fault** به کرنل ارسال می‌کند.
- کرنل بلافاصله وارد عمل شده، یک کپی اختصاصی از همان صفحه ۴ کیلوبایتی برای پروسس نویسنده ایجاد کرده، صفحه را به حالت خواندن/نوشتن برمی‌گرداند و دستور را دوباره اجرا می‌کند.

### وضعیت‌های بحرانی: Zombie در برابر Orphan
- **پروسس زامبی (Zombie Process):**
  * پروسس فرزندی که کارش با اجرای `exit()` تمام شده، اما والد آن هنوز تابع `wait()` را برای دریافت کد خروج صدا نزده است.
  * پروسس زامبی تمام حافظه رم، پشته و هیپ خود را آزاد کرده است، اما رکورد آن در جدول پروسس‌های کرنل باقی می‌ماند تا کد خروج را حفظ کند.
  * اگر والد `wait` را صدا نزند و فرزندان زامبی بی‌شماری بسازد، جدول پروسس‌های کرنل پر شده و سیستم دیگر قادر به باز کردن هیچ پروسس جدیدی نخواهد بود (**PID Exhaustion**). در خروجی `ps aux`، این پروسس‌ها با وضعیت `Z` یا برچسب `<defunct>` دیده می‌شوند.
- **پروسس یتیم (Orphan Process):**
  * پروسسی که در حال اجراست اما والد آن قبل از او مرده است.
  * سیستم‌عامل‌های یونیکسی بلافاصله سرپرستی پروسس‌های یتیم را به پروسس ریشه یعنی **`init` / `systemd` (PID 1)** یا مکانیزم Subreaper واگذار می‌کنند. پروسس `init` دائماً تابع `wait()` را صدا می‌زند تا به محض مرگ پروسس‌های یتیم، رکوردهای آن‌ها را از سیستم پاک کند.

---

## ۵. سطوح زمان‌بندی و صف‌های پروسس (Scheduling Queues)

سیستم‌عامل فرآیند زمان‌بندی را در سه سطح مختلف کنترل می‌کند:

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 260" role="img" aria-label="Three Levels of CPU Scheduling" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="260" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Disk Pool -->
    <rect x="25" y="90" width="120" height="75" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="85" y="122" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--ink, #16150f)">Job Pool (Disk)</text>
    <text x="85" y="142" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">برنامه‌ها روی دیسک</text>

    <!-- Long Term Arrow -->
    <path d="M 145 127 L 205 127" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="175" y="117" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">پذیرش به رم</text>

    <!-- RAM Ready Queue -->
    <rect x="205" y="65" width="220" height="125" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="315" y="90" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">RAM Ready Queue</text>
    <text x="315" y="110" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">صف پروسس‌های مقیم رم</text>

    <!-- Medium Term Scheduler Box -->
    <rect x="235" y="200" width="160" height="40" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="315" y="218" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" font-weight="600" fill="var(--ink, #16150f)">زمان‌بند میان‌مدت (Swapper)</text>
    <text x="315" y="232" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="8" fill="var(--muted, #6f6a5a)">Swap-out به دیسک / Swap-in به رم</text>
    <path d="M 260 190 L 260 200" stroke="var(--muted, #6f6a5a)" stroke-width="1.5"/>
    <path d="M 370 200 L 370 190" stroke="var(--muted, #6f6a5a)" stroke-width="1.5"/>

    <!-- Short Term Arrow -->
    <path d="M 425 127 L 505 127" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="465" y="117" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">تخصیص هسته</text>

    <!-- CPU Core -->
    <rect x="505" y="75" width="150" height="105" rx="6" fill="var(--ink, #16150f)"/>
    <text x="580" y="122" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--paper, #f3efe6)">CPU Core</text>
    <text x="580" y="145" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">زمان‌بند کوتاه‌مدت (ms)</text>
  </svg>
  <figcaption>سطوح سه‌گانه زمان‌بندی و چرخه جابه‌جایی پروسس‌ها در حافظه و پردازنده</figcaption>
</figure>

1. **زمان‌بند بلندمدت یا کار (Long-Term / Job Scheduler):**
   * از استخر برنامه‌های روی دیسک، آن‌هایی را که باید وارد رم شوند انتخاب می‌کند.
   * وظیفه کلیدی: کنترل **درجه چندبرنامگی (Degree of Multiprogramming)** و ایجاد تعادل مناسب میان پروسس‌های مقید به محاسبات (**CPU-Bound**) و مقید به ورودی/خروجی (**I/O-Bound**).
2. **زمان‌بند کوتاه‌مدت یا پردازنده (Short-Term / CPU Scheduler):**
   * پروسسی را از میان پروسس‌های آماده در رم (**Ready Queue**) انتخاب کرده و هسته CPU را به آن واگذار می‌کند.
   * فرکانس اجرای فوق‌العاده بالا (هر چند میلی‌ثانیه یک‌بار).
3. **زمان‌بند میان‌مدت (Medium-Term Scheduler - Swapping):**
   * هنگام اشباع شدن حافظه رم، پروسس‌های غیرفعال را به طور موقت از رم خارج کرده و به فضای Swap روی دیسک منتقل می‌کند (**Swap-Out**)، و با سبک شدن بار سیستم آن‌ها را به رم بازمی‌گرداند (**Swap-In**).

---

## ۶. ارتباط بین پروسس‌ها (IPC) — دو مدل بنیادین

پروسس‌های حاضر در سیستم یا مستقل (Independent) هستند یا همکار (Cooperating). برنامه‌نویسان برنامه‌ها را به پروسس‌های همکار تفکیک می‌کنند تا به مزایایی مانند **اشتراک اطلاعات**، **افزایش سرعت محاسبات با موازی‌سازی چند‌هسته‌ای** و **پیمانه‌ای بودن ساختار نرم‌افزار** دست یابند.

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
    <text x="180" y="152" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--accent, #b5431d)">ناحیه حافظه اشتراکی فیزیکی</text>
    <text x="180" y="170" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">تبادل داده با حداکثر سرعت رم بدون دخالت هسته</text>
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
    <text x="500" y="152" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--paper, #f3efe6)">صف پیام تحت کنترل کرنل</text>
    <text x="500" y="170" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--paper-2, #ece7db)">کپی داده‌ها با سیستم‌کال‌های send / recv</text>
    <path d="M 420 100 L 420 130" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <path d="M 580 130 L 580 100" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <text x="500" y="210" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--ink, #16150f)">ایده‌آل برای محیط‌های توزیع‌شده و شبکه</text>
  </svg>
  <figcaption>مقایسه ساختاری دو الگوی بنیادین حافظه اشتراکی و ارسال پیام</figcaption>
</figure>

### ۱. حافظه اشتراکی (Shared Memory)
- سیستم‌عامل قطعه‌ای از حافظه فیزیکی را در فضای آدرس دو یا چند پروسس نگاشت می‌کند.
- **مزیت:** بیشترین سرعت ممکن؛ داده‌ها با سرعت خواندن/نوشتن حافظه رم مبادله می‌شوند و پس از برقراری نگاشت، هیچ سیستم‌کالی صادر نمی‌گردد.
- **چالش:** مسئولیت همگام‌سازی و جلوگیری از شرایط مسابقه (**Race Condition**) کاملاً بر عهده برنامه‌نویس است. برای مثال در مسئله **تولیدکننده-مصرف‌کننده (Producer-Consumer)** با یک بافر حلقوی، اگر تولیدکننده و مصرف‌کننده همزمان اشاره‌گرهای `in` و `out` را تغییر دهند، داده‌ها تخریب خواهند شد.

#### پیاده‌سازی POSIX Shared Memory در C

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <sys/shm.h>
#include <sys/stat.h>
#include <sys/mman.h>
#include <unistd.h>

int main(void) {
    const char *name = "/os_shared_mem";
    const int SIZE = 4096;
    const char *message = "Hello from Process Memory!";

    // ۱. ایجاد شیء حافظه اشتراکی در کرنل
    int shm_fd = shm_open(name, O_CREAT | O_RDWR, 0666);
    
    // ۲. تنظیم اندازه بلاک حافظه به ۴۰۹۶ بایت
    ftruncate(shm_fd, SIZE);

    // ۳. نگاشت بلاک اشتراکی به فضای آدرس پروسس جاری
    void *ptr = mmap(0, SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, shm_fd, 0);

    // ۴. نوشتن داده در حافظه با سرعت رم
    sprintf(ptr, "%s", message);
    printf("[Producer] Wrote to shared memory: %s\n", (char *)ptr);

    // ۵. بستن دیسکریپتور (نگاشت باقی می‌ماند)
    close(shm_fd);
    return 0;
}
```

### ۲. ارسال پیام (Message Passing)
پروسس‌ها داده‌ها را در قالب پیام با کمک هسته رد و بدل می‌کنند:
- **نام‌گذاری مستقیم (Direct Communication):** شناسه پروسس‌ها صراحتاً در توابع قید می‌شود: `send(P, message)` و `receive(Q, message)`.
- **نام‌گذاری غیرمستقیم (Indirect Communication):** پیام‌ها به یک صندوق پستی یا درگاه اشتراکی ارسال می‌شوند: `send(mailbox_A, message)`.
- **همگام‌سازی (Synchronization):**
  * **مسدودکننده (Blocking / Synchronous):** فرستنده منتظر می‌ماند تا گیرنده پیام را دریافت کند، یا گیرنده منتظر می‌ماند تا پیامی برسد. اگر هر دو مسدودکننده باشند، وضعیت ملاقات (**Rendezvous**) شکل می‌گیرد.
  * **غیرمسدودکننده (Non-blocking / Asynchronous):** فرستنده پیام را در صف رها کرده و به کار خود ادامه می‌دهد.
- **ظرفیت بافر (Buffering):**
  * **ظرفیت صفر (Zero Capacity):** صف وجود ندارد؛ فرستنده تا زمان تحویل به گیرنده مسدود می‌شود.
  * **ظرفیت کران‌دار (Bounded Capacity):** صفی با طول $N$؛ اگر صف پر شود فرستنده معطل می‌ماند.
  * **ظرفیت بی‌کران (Unbounded Capacity):** صف نامحدود؛ فرستنده هرگز معطل نمی‌شود.

---

## ۷. مکانیزم‌های کاربردی IPC در سیستم‌های مدرن

### ۱. لوله‌ها (Pipes)
لوله‌ها بافرهای حلقوی درون حافظه کرنل هستند:
- **لوله‌های ناشناس (Ordinary / Anonymous Pipes):**
  * ویژگی یک‌طرفه (**Half-Duplex**).
  * تنها میان پروسس‌های دارای رابطه خویشاوندی والد و فرزند که از طریق `fork()` پدید آمده‌اند کار می‌کنند.
  * **نکته حیاتی مهندسی:** هر پروسس باید فوراً سر بلااستفاده لوله را ببندد؛ اگر انتهای نویسنده لوله بسته نشود، انتهای خواننده هرگز کاراکتر پایان فایل (`EOF`) را دریافت نکرده و تا ابد قفل (Hang) می‌ماند!

#### کد نمونه کامل کار با Pipe در C

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>

int main(void) {
    int fd[2]; // fd[0]: خواندن، fd[1]: نوشتن
    char write_msg[] = "Data via UNIX Pipe";
    char read_msg[100];

    if (pipe(fd) == -1) {
        perror("Pipe creation failed");
        return 1;
    }

    pid_t pid = fork();

    if (pid > 0) {
        // والد: داده می‌نویسد
        close(fd[0]); // بستن سر خواندن در والد
        write(fd[1], write_msg, strlen(write_msg) + 1);
        close(fd[1]); // بستن پس از اتمام نوشتن (ارسال EOF به فرزند)
    } else {
        // فرزند: داده می‌خواند
        close(fd[1]); // بستن سر نوشتن در فرزند
        read(fd[0], read_msg, sizeof(read_msg));
        printf("[Child] Read from pipe: %s\n", read_msg);
        close(fd[0]);
    }

    return 0;
}
```

- **لوله‌های نام‌دار (Named Pipes / FIFOs):**
  * به صورت یک فایل ویژه نوع FIFO در دایرکتوری ایجاد می‌شوند (`mkfifo /tmp/my_fifo`).
  * دوطرفه هستند و پروسس‌های کاملاً بیگانه و بدون خویشاوندی می‌توانند با باز کردن این مسیر فایل به صورت هماهنگ داده مبادله نمایند.

### ۲. سوکت‌های شبکه و یونیکس (Sockets)
- یک نقطه پایانی ارتباطی که با زوج **IP Address** (شناسایی هاست) و **Port Number** (شناسایی پروسس مقصد) مشخص می‌شود.
- **انواع سوکت‌های شبکه:**
  * **TCP (Stream Sockets):** اتصال‌گرا، با تضمین ترتیب رسیدن بسته‌ها و کنترل ازدحام (مناسب وب و دیتابیس).
  * **UDP (Datagram Sockets):** بدون اتصال، غیرقابل اعتماد اما با کمترین تأخیر ممکن (مناسب بازی‌های آنلاین، DNS، استریم صدا و تصویر).
- **سوکت‌های دامنه یونیکس (Unix Domain Sockets - `AF_UNIX`):**
  * هنگامی که هر دو پروسس روی یک سیستم‌عامل محلی هستند، نیازی به کپسوله‌سازی بسته‌های IP و بررسی چک‌سام کارت شبکه نیست. سوکت‌های `AF_UNIX` داده‌ها را مستقیماً درون بافرهای رم جابه‌جا کرده و سرعتی چندین برابر سوکت‌های شبکه محلی دارند.

### ۳. فراخوانی رویه از راه دور (RPC)

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
    <text x="170" y="157" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--paper-2, #ece7db)">بسته‌بندی پارامترها (Marshalling / XDR)</text>
    <text x="170" y="172" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">ارسال بسته روی پروتکل شبکه</text>

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
    <text x="510" y="172" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--accent, #b5431d)">اجرای متد محلی و ارسال بازگشت</text>
  </svg>
  <figcaption>روند اجرای RPC با استفاده از Stubها برای مارشال و آن‌مارشال کردن داده‌ها در شبکه</figcaption>
</figure>

- **Client Stub:** پارامترها را دریافت کرده و به یک قالب مستقل از معماری نظیر **XDR (External Data Representation)** تبدیل می‌کند تا تفاوت‌های Big-Endian و Little-Endian حل شود (**Marshalling**).
- **Server Stub:** بسته را تحویل گرفته، آن را باز می‌کند (**Unmarshalling**) و تابع اصلی را فراخوانی می‌نماید.
- **معناشناسی تحویل (Semantics):**
  * **At-most-once:** پیام حاوی شناسه یکتا است؛ اگر بسته به دلیل تأخیر شبکه تکرار شد، سرور از اجرای مجدد آن خودداری می‌کند.
  * **Exactly-once:** پیچیده‌ترین حالت با پروتکل تاییدیه قطعی دوطرفه (ACK).
- **نمونه پیشرفته مدرن:** سیستم **Android Binder IPC** که بر پایه پروتکل پیام‌رسانی و درایور اختصاصی `/dev/binder` در کرنل لینوکس ساخته شده و ستون فقرات ارتباط میان اپلیکیشن‌ها و سرویس‌های سیستمی اندروید است.

### ۴. سیگنال‌ها (Signals)
سیگنال‌ها اعلان‌های ناهمگام (**Asynchronous Notifications**) درون سیستم‌عامل هستند که وقوع یک رخداد مهم را به پروسس اطلاع می‌دهند:
- **سیگنال‌های حیاتی POSIX:**
  * `SIGINT` (کد ۲): وقفه از کیبورد با فشردن `Ctrl+C`.
  * `SIGTERM` (کد ۱۵): درخواست محترمانه برای خاتمه پروسس.
  * `SIGKILL` (کد ۹): نابودی فوری پروسس توسط کرنل؛ **غیرقابل مهار، نادیده‌گرفتن یا بلاک کردن**.
  * `SIGSEGV` (کد ۱۱): خطای دسترسی غیرمجاز به حافظه (Segmentation Fault).
  * `SIGCHLD` (کد ۱۷): ارسال به والد هنگام اتمام اجرای یکی از فرزندان.

#### مهار سیگنال با `sigaction` در C

```c
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>

void sigint_handler(int sig) {
    printf("\n[Signal Caught] Caught SIGINT (signal #%d). Exiting cleanly...\n", sig);
    exit(0);
}

int main(void) {
    struct sigaction sa;
    sa.sa_handler = sigint_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;

    // ثبت هندلر برای مهار سیگنال Ctrl+C
    sigaction(SIGINT, &sa, NULL);

    printf("Process PID = %d. Press Ctrl+C to test signal handler...\n", getpid());

    while (1) {
        sleep(1);
    }

    return 0;
}
```
به کمک این ساختار، برنامه‌های مهندسی می‌توانند سوکت‌ها و فایل‌های باز خود را پیش از خروج ناگهانی به صورت امن ببندند (**Graceful Shutdown**).
