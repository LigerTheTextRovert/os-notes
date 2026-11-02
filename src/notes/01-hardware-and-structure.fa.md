---
title: "مبانی سیستم‌عامل، لایه‌های انتزاع، وقفه‌ها و فرآیند بوت"
date: 2026-10-26
summary: "چرا به سیستم‌عامل نیاز داریم؟ معماری‌های تک‌پردازنده و چندپردازنده (SMP, NUMA)، حفاظت سخت‌افزاری و Dual-Mode، کالبدشکافی سیستم‌کال با x86-64 و strace، وقفه‌ها و تایمر سخت‌افزاری، روش‌های I/O (Polling, Interrupt-driven, DMA)، تفاوت PMIO و MMIO، و کالبدشکافی زنجیره بوت از Reset Vector تا PID 1."
tags: [os, chapter-1, hardware, syscalls, io, dma, boot, numa, interrupts]
series: os
chapter: 1
section: "1"
order: 1
mode: summary
book: "Operating System Concepts"
edition: "10th"
draft: false
---

سیستم‌عامل (Operating System) بنیادی‌ترین نرم‌افزار سیستمی است که به عنوان واسط (Intermediary) میان سخت‌افزار فیزیکی کامپیوتر و برنامه‌های کاربردی عمل می‌کند. بدون وجود سیستم‌عامل، هر نرم‌افزاری برای کوچک‌ترین کارها (نظیر خواندن یک بایت از دیسک یا کشیدن یک خط روی صفحه نمایش) نیازمند کدهای مستقیم به زبان اسمبلی، مدیریت زمان‌بندی دقیق کلاک‌ها، و کدنویسی برای ده‌ها مدل مختلف کنترلر سخت‌افزاری می‌بود.

کتاب مرجع *Operating System Concepts* (معروف به کتاب دایناسور) سیستم‌عامل را از دو دیدگاه مکمل تعریف می‌کند:
1. **دیدگاه کاربر (User View):** سیستم‌عامل باید استفاده از کامپیوتر را آسان، شفاف، کارآمد و شهودی کند.
2. **دیدگاه سیستم (System View):** سیستم‌عامل دو وظیفه بزرگ دارد:
   - **تخصیص‌دهنده منابع (Resource Allocator):** پردازنده، حافظه رم، پهنای باند شبکه و فضای دیسک منابعی محدود و گران‌بها هستند؛ سیستم‌عامل به عنوان داور عادل، این منابع را به طور بهینه و منصفانه میان پروسس‌های متقاضی تقسیم می‌کند.
   - **برنامه کنترل (Control Program):** اجرای برنامه‌های کاربران را مهار و کنترل می‌کند تا از بروز خطاهای سیستمی، تصادم داده‌ها و استفاده غیرمجاز از منابع سخت‌افزاری جلوگیری نماید.

---

## ۱. چرا به سیستم‌عامل نیاز داریم؟ (Why an Operating System?)

سخت‌افزار مدرن مجموعه‌ای ناهمگون و خشن از مدارهای سیلیکونی، پردازنده‌های چندهسته‌ای، خطوط باس، کنترلرهای ذخیره‌سازی، پورت‌های شبکه و کارت‌های گرافیک است. سیستم‌عامل با چهار هدف حیاتی مستقر می‌شود:

### وظایف و مسئولیت‌های کلیدی
1. **انتزاع سخت‌افزار (Hardware Abstraction):**
   * سخت‌افزار واقعی پر از جزئیات پیچیده سطح پایین و کدهای وابسته به سازندگان چیپ‌ها است. سیستم‌عامل این پیچیدگی‌ها را در پشت انتزاع‌هایی پاک، استاندارد و قابل‌فهم پنهان می‌کند:
     * **پردازنده فیزیکی (CPU Cores):** به مفهوم پویا و زنده **Process** (پروسس یا برنامه در حال اجرا) تبدیل می‌شود.
     * **تراشه‌های حافظه (DRAM Chips):** به مفهوم **Virtual Address Space** (فضای آدرس‌دهی مجازی، پیوسته و ایزوله) انتزاع می‌شود.
     * **درایوهای ذخیره‌سازی (NVMe, SSD, HDD):** به مفهوم درخت سلسله‌مراتبی **Files & Directories** تبدیل می‌شوند.
     * **کارت‌های شبکه فیزیکی (NICs):** به مفاهیم **Packets & Sockets** انتزاع پیدا می‌کنند.
2. **اشتراک منابع (Resource Sharing):**
   * سیستم‌عامل امکان اجرای هم‌زمان ده‌ها برنامه را روی تعداد محدودی هسته سخت‌افزاری فراهم می‌کند به گونه‌ای که هر برنامه تصور کند تمام کامپیوتر به طور انحصاری به آن تعلق دارد. این اشتراک به دو شیوه اعمال می‌شود:
     * **تسهیم زمانی (Time-Multiplexing):** تخصیص منبع در برش‌های زمانی پیاپی به برنامه‌ها (مانند تقسیم کلاک‌های پردازنده میان صدها پروسس در کسری از ثانیه).
     * **تسهیم مکانی (Space-Multiplexing):** تقسیم فیزیکی منبع میان متقاضیان (مانند قطعه‌بندی گیگابایت‌های رم یا بلاک‌های حافظه دیسک).
3. **ایزولاسیون پروسس‌ها (Process Isolation):**
   * جداسازی مطلق فضای حافظه و دسترسی برنامه‌ها از یکدیگر. اگر برنامه‌ای دچار باگ، سرریز بافر (Buffer Overflow) یا حلقه بی‌نهایت شود، دیواره‌های حفاظتی سیستم‌عامل مانع از سرایت خرابی به سایر برنامه‌ها یا توقف کل هسته سیستم می‌شوند.
4. **تعامل پروسس‌ها (Process Interaction):**
   * تعریف کانال‌های امن، منظم و مدیریت‌شده برای ارتباط بین‌پروسسی (IPC)، تا پروسس‌های همکار بتوانند بدون نقض امنیت و ایزولاسیون، داده‌ها را میان خود مبادله کنند.

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 320" role="img" aria-label="Hardware Abstraction Layers" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="320" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>
    
    <!-- Apps Layer -->
    <rect x="50" y="25" width="580" height="55" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="340" y="50" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="600" fill="var(--ink, #16150f)">User Applications (Web Browser, DB Engine, Compilers, Shell)</text>
    <text x="340" y="68" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--muted, #6f6a5a)">تنها با APIهای انتزاعی سیستم‌عامل در ارتباط هستند</text>
    
    <!-- OS Abstraction Layer -->
    <rect x="50" y="105" width="580" height="95" rx="6" fill="var(--ink, #16150f)"/>
    <text x="340" y="132" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="600" fill="var(--paper, #f3efe6)">Operating System Abstraction Layer (Kernel)</text>
    <rect x="70" y="145" width="120" height="40" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="130" y="170" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--accent, #b5431d)">Processes</text>
    <rect x="205" y="145" width="130" height="40" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="270" y="170" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--accent, #b5431d)">Virtual Memory</text>
    <rect x="350" y="145" width="120" height="40" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="410" y="170" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--accent, #b5431d)">VFS / Files</text>
    <rect x="485" y="145" width="125" height="40" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="547" y="170" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--accent, #b5431d)">Sockets / Packets</text>

    <!-- Hardware Layer -->
    <rect x="50" y="230" width="580" height="65" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="340" y="255" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="600" fill="var(--ink, #16150f)">Physical Hardware Layer</text>
    <text x="340" y="278" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--muted, #6f6a5a)">CPU Cores (Registers/ALU) | DRAM DIMMs | NVMe Controllers | NICs | GPU</text>

    <!-- Connectors -->
    <line x1="340" y1="80" x2="340" y2="105" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <line x1="340" y1="200" x2="340" y2="230" stroke="var(--accent, #b5431d)" stroke-width="2"/>
  </svg>
  <figcaption>لایه‌های انتزاع سیستم‌عامل میان سخت‌افزار فیزیکی خشن و برنامه‌های کاربر</figcaption>
</figure>

### تمایز بنیادین: Program در برابر Process
یکی از مفاهیم پایه‌ای در مهندسی سیستم‌عامل، تفاوت برنامه و پروسس است:
- **برنامه (Program):** موجودیتی ایستا و غیرفعال (**Passive Entity**) است. فایلی باینری است که روی دیسک ذخیره شده (مانند `/usr/bin/firefox` یا `main.exe`). برنامه مجموعه‌ای از کدهای باینری، ثوابت و دستورالعمل‌هاست که تا زمان فراخوانی، هیچ باری بر CPU یا RAM تحمیل نمی‌کند.
- **پروسس (Process):** موجودیتی پویا، زنده و فعال (**Active Entity**) است. هنگامی که یک برنامه در رم لود شده و شروع به اجرا می‌کند، تبدیل به پروسس می‌شود. پروسس صاحب شمارنده برنامه (Program Counter - PC)، ثبات‌های پردازنده، پشته محلی (Stack)، فضای هیپ (Heap)، و لیستی از منابع باز در سیستم است.

### معماری‌های سخت‌افزاری پردازنده‌ها (Computer-System Architecture)
سیستم‌عامل‌ها بسته به ساختار چینش پردازنده‌ها رفتارهای متفاوتی در مدیریت منابع اتخاذ می‌کنند:
1. **سیستم‌های تک‌پردازنده‌ای (Single-Processor Systems):** یک CPU اصلی برای اجرای کدهای برنامه‌ها وجود دارد (ممکن است کنترلرهای اختصاصی ریزپردازنده‌ای برای دیسک یا گرافیک نیز حاضر باشند).
2. **سیستم‌های چندپردازنده‌ای (Multiprocessor Systems / Parallel Systems):** دارای دو یا چند پردازنده در ارتباط نزدیک هستند که باس، کلاک، حافظه و تجهیزات جانبی را به اشتراک می‌گذارند:
   * **چندپردازنده‌ای نامتقارن (Asymmetric Multiprocessing):** یک پردازنده اصلی (Master) سیستم‌عامل را اجرا کرده و کارها را میان پردازنده‌های فرعی (Slave) توزیع می‌کند یا هر پردازنده وظیفه مشخصی دارد.
   * **چندپردازنده‌ای متقارن (Symmetric Multiprocessing - SMP):** تمام پردازنده‌ها هم‌تراز هستند و هر پردازنده می‌تواند تمام کدهای کرنل و برنامه‌ها را بدون وجود یک سرور مرکزی اجرا کند. سیستم‌های مدرن همگی SMP هستند.
3. **دسترسی یکنواخت (UMA) در برابر دسترسی غیریکنواخت به حافظه (NUMA):**
   * در **UMA (Uniform Memory Access)** زمان دسترسی هر CPU به هر آدرس از حافظه رم برابر است.
   * در سرورهای چندسوکت بزرگ با معماری **NUMA (Non-Uniform Memory Access)**، هر پردازنده به بخشی از رم محلی خود سریع‌تر دسترسی دارد تا رم متصل به سوکت پردازنده دیگر. زمان‌بند سیستم‌عامل باید تلاش کند هر پروسس را روی همان پردازنده‌ای نگه دارد که حافظه‌اش در رم محلی آن سوکت قرار دارد.
4. **سیستم‌های خوشه‌ای (Clustered Systems):** دو یا چند سیستم مستقل که از طریق یک شبکه محلی پرسرعت (Storage Area Network - SAN) به یکدیگر پیوند خورده‌اند و فضای ذخیره‌سازی مشترک دارند تا قابلیت دسترسی بالا (High Availability) و مقاومت در برابر خرابی گره‌ها (Fault Tolerance) را تضمین کنند.

---

## ۲. جداسازی سیستم‌عامل و برنامه‌ها (حالت‌های پردازنده و سیستم‌کال‌ها)

اگر به برنامه‌های کاربران اجازه داده می‌شد که مستقیماً به ثبات‌های سخت‌افزاری دسترسی پیدا کنند، هر خطای کوچک یا بدافزاری می‌توانست کل دیسک را پاک کند، حافظه برنامه‌های دیگر را بخواند یا پردازنده را متوقف نماید. سیستم‌عامل این امنیت را با تکیه بر **پشتیبانی سخت‌افزاری پردازنده** پیاده می‌کند.

### حالت‌های اجرای پردازنده (CPU Execution Modes)
پردازنده‌های امروزی دست‌کم از دو حالت اجرایی متمایز پشتیبانی می‌کنند که توسط یک بیت سخت‌افزاری به نام **Mode Bit** در ثبات وضعیت پردازنده (مانند PSW یا EFLAGS/RFLAGS) تعیین وضعیت می‌شود:

- **حالت کاربر (User Mode - بیت حالت = ۱):**
  * برنامه‌های کاربردی (مرورگر، ویرایشگر، شل، سرورهای وب) در این فضا اجرا می‌شوند.
  * پردازنده اجازه اجرای دستورات حساس را نمی‌دهد. دسترسی به حافظه محدود به فضای آدرس اختصاصی همان پروسس است.
- **حالت هسته (Kernel Mode / Supervisor / Privileged - بیت حالت = ۰):**
  * کدهای هسته مرکزی سیستم‌عامل (Kernel) در این سطح اجرا می‌شوند.
  * پردازنده دسترسی بی‌قیدوشرط به تمام دستورات ماشین، تمام فضای حافظه فیزیکی و رجیسترهای کنترلرهای ورودی/خروجی دارد.

> **دستورات ممتاز (Privileged Instructions):** دستوراتی در معماری ماشین هستند که اجرای آن‌ها منحصراً در Kernel Mode مجاز است. تلاش برای اجرای این دستورات در User Mode باعث ایجاد یک خطای سخت‌افزاری فوری (**General Protection Fault / Trap**) و سلب کنترل از برنامه خاطی می‌شود.  
> نمونه دستورات ممتاز در معماری x86:
> - دستور خاموش کردن وقفه‌ها (`cli`) یا فعال‌سازی آن‌ها (`sti`).
> - دستور متوقف کردن کامل پردازنده (`hlt`).
> - تغییر ثبات کنترل پایه جدول صفحات حافظه مجازی (`cr3`).
> - دستورات ورودی/خروجی پورت مستقیم (`in` و `out`).

### مکانیزم تله (Trap) و سوئیچ به Kernel Mode
برای اینکه یک برنامه کاربردی بتواند فایلی را بخواند یا بسته‌ای در شبکه بفرستد، باید داوطلبانه از هسته کمک بخواهد. این کار از طریق **سیستم‌کال (System Call)** صورت می‌پذیرد.

مراحل گذر از User Mode به Kernel Mode:
1. برنامه کاربری شناسه سیستم‌کال و آرگومان‌های آن را در ثبات‌های مشخصی بارگذاری می‌کند.
2. برنامه یک دستور تله نرم‌افزاری به پردازنده صادر می‌کند (در معماری‌های مدرن x86-64 دستور اختصاصی `syscall`، و در معماری‌های قدیمی‌تر وقفه نرم‌افزاری `int 0x80`).
3. **سخت‌افزار پردازنده** در یک سیکل غیرقابل‌شکست:
   - بیت حالت (Mode Bit) را از ۱ به ۰ تغییر می‌دهد.
   - شمارنده برنامه (PC/RIP) و ثبات‌های پروسس جاری را روی پشته کرنل (Kernel Stack) ذخیره می‌کند.
   - به آدرس از پیش ثبت‌شده تابع رسیدگی سیستم‌کال در کرنل (System Call Handler) پرش می‌کند.
4. کرنل با بررسی جدول سیستم‌کال‌ها (**System Call Table**)، صحت آرگومان‌ها را ارزیابی کرده و تابع درخواستی (مثلاً `sys_read`) را اجرا می‌کند.
5. پس از پایان، کرنل با دستور سخت‌افزاری بازگشت (`sysret` یا `iret`) بیت حالت را به ۱ برگردانده و کنترل را مجدداً به برنامه کاربر تحویل می‌دهد.

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
    <text x="380" y="102" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">تنظیم رجیسترها و اجرای syscall</text>

    <!-- Trap Boundary -->
    <line x1="40" y1="160" x2="660" y2="160" stroke="var(--accent, #b5431d)" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="560" y="153" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--accent, #b5431d)">HARDWARE TRAP / SYSRET</text>

    <!-- Kernel Space Box -->
    <rect x="40" y="185" width="620" height="110" rx="6" fill="var(--ink, #16150f)"/>
    <text x="60" y="212" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="var(--paper, #f3efe6)">KERNEL MODE (Mode Bit = 0)</text>
    <rect x="180" y="225" width="180" height="50" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="270" y="248" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--ink, #16150f)">Syscall Dispatcher</text>
    <text x="270" y="265" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">بررسی جدول سیستم‌کال‌ها</text>

    <rect x="410" y="225" width="200" height="50" rx="4" fill="var(--paper-2, #ece7db)"/>
    <text x="510" y="248" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="var(--ink, #16150f)">sys_read() Implementation</text>
    <text x="510" y="265" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">دسترسی به درایور و قطعه فیزیکی</text>

    <!-- Arrows -->
    <path d="M 240 88 L 290 88" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <path d="M 470 88 L 520 88 L 520 170 L 270 170 L 270 225" fill="none" stroke="var(--accent, #b5431d)" stroke-width="2"/>
    <path d="M 360 250 L 410 250" stroke="var(--accent, #b5431d)" stroke-width="2"/>
  </svg>
  <figcaption>جابه‌جایی امن بین User Mode و Kernel Mode با دستور سخت‌افزاری تله (Trap)</figcaption>
</figure>

### فراخوانی مستقیم سیستم‌کال در سطح اسمبلی (x86-64)
در معماری ۶۴ بیتی x86-64 تحت استاندارد System V ABI، شماره سیستم‌کال در ثبات `rax` و آرگومان‌های آن به ترتیب در ثبات‌های `rdi`، `rsi`، `rdx`، `r10`، `r8` و `r9` قرار می‌گیرند. قطعه کد زیر یک سیستم‌کال مستقیم برای نوشتن رشته روی خروجی استاندارد (`sys_write` با شناسه ۱) و سپس خروج امن (`sys_exit` با شناسه ۶۰) را بدون وابستگی به هیچ کتابخانه‌ای نشان می‌دهد:

```asm
section .data
    msg db "Hello, Kernel Space!", 0xA
    len equ $ - msg

section .text
    global _start

_start:
    ; صدور سیستم‌کال sys_write(int fd, const char *buf, size_t count)
    mov rax, 1          ; شماره سیستم‌کال write در x86-64 لینوکس
    mov rdi, 1          ; آرگومان اول: file descriptor 1 = stdout
    mov rsi, msg        ; آرگومان دوم: آدرس بافر متن در حافظه
    mov rdx, len        ; آرگومان سوم: طول داده بر حسب بایت
    syscall             ; تله سخت‌افزاری به Kernel Mode

    ; صدور سیستم‌کال sys_exit(int error_code)
    mov rax, 60         ; شماره سیستم‌کال exit
    xor rdi, rdi        ; کد خروج 0 (خروج موفقیت‌آمیز)
    syscall
```

### کالبدشکافی اجرای سیستم‌کال‌ها با `strace`
ابزار قدرتمند `strace` در لینوکس تمام سیستم‌کال‌هایی را که یک پروسس صادر می‌کند، شنود کرده و روی ترمینال نمایش می‌دهد. با ردیابی اجرای دستور ساده `ls`:

```bash
$ strace ls
execve("/usr/bin/ls", ["ls"], [/* 48 vars */]) = 0
brk(NULL)                               = 0x55d218844000
arch_prctl(0x3001 /* ARCH_SET_FS */, 0x7fa28974a740) = 0
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
fstat(3, {st_mode=S_IFREG|0644, st_size=89124, ...}) = 0
mmap(NULL, 89124, PROT_READ, MAP_PRIVATE, 3, 0) = 0x7fa289734000
close(3)                                = 0
write(1, "file1.txt  notes.md\n", 20)   = 20
exit_group(0)                           = ?
```
مشاهده می‌کنیم که پروسس ابتدا با `execve` کد باینری را بارگذاری کرده، با `mmap` کتابخانه‌های مورد نیاز را در حافظه نگاشت نموده و در نهایت با سیستم‌کال `write` متن را روی ترمینال (شناسه ۱) چاپ کرده است.

### مقایسه API کتابخانه‌ای با System Call خام
برنامه‌نویسان به ندرت مستقیماً دستور اسمبلی `syscall` را می‌نویسند؛ بلکه از رابط‌های برنامه‌نویسی نرم‌افزار (**API**ها مانند POSIX libc در یونیکس یا Win32 API در ویندوز) استفاده می‌کنند.  
چرا توابعی مثل `printf()` به وجود آمدند؟
* **قابلیت حمل (Portability):** برنامه نوشته‌شده با `printf` بدون تغییر روی لینوکس، مک‌او‌اس و ویندوز کامپایل می‌شود، در حالی که شماره سیستم‌کال `write` در سیستم‌عامل‌ها و پردازنده‌های مختلف کاملاً متفاوت است.
* **بافرینگ در فضای کاربر (User-Space Buffering):** هر بار سوئیچ به Kernel Mode صدها چرخه کلاک پردازنده هزینه دارد. تابع `printf()` کاراکترها را در یک بافر محلی در User-Space نگه می‌دارد و تنها زمانی که بافر پر شد یا به خط جدید (`\n`) رسید، یک‌بار سیستم‌کال سنگین `write()` را صادر می‌کند.

---

## ۳. مکانیزم وقفه‌ها، تایمر و مالتی‌پروگرمینگ (Interrupts & Multiprogramming)

یک سیستم‌عامل مدرن ماهیتی **مبتنی بر وقفه (Interrupt-Driven)** دارد؛ اگر هیچ پروسسی برای اجرا وجود نداشته باشد و هیچ رویدادی از سمت سخت‌افزار رخ ندهد، سیستم‌عامل در یک حلقه کم‌مصرف خاموش باقی می‌ماند تا وقفه‌ای آن را بیدار کند.

### دسته‌بندی سه‌گانه وقفه‌ها
1. **وقفه‌های سخت‌افزاری (Hardware Interrupts):**
   * سیگنال‌های الکتریکی ناهمگام (**Asynchronous**) هستند که توسط خطوط IRQ قطعات فیزیکی خارجی (فشردن کلید کیبورد، رسیدن فریم شبکه به کارت شبکه، اتمام چرخش دیسک) تولید می‌شوند. این رویدادها ارتباطی با دستور جاری در حال اجرای CPU ندارند.
2. **تله‌ها و استثناهای نرم‌افزاری (Software Traps / Exceptions / Faults):**
   * رویدادهای همگام (**Synchronous**) هستند که مستقیماً در اثر اجرای یک دستور توسط پردازنده ایجاد می‌شوند؛ مانند خطای تقسیم بر صفر (`Division by Zero`)، تلاش برای اجرای دستور نامعتبر (`Illegal Instruction`)، یا خطای عدم دسترسی به حافظه (`Page Fault` / `Segmentation Fault`).
3. **سیستم‌کال‌ها (System Calls):**
   * تله‌های نرم‌افزاری عمدی و برنامه‌ریزی‌شده که پروسس برای درخواست خدمات کرنل اجرا می‌کند.

### جدول بردار وقفه (IVT / IDT)
هنگامی که سیگنال وقفه به پایه‌های CPU می‌رسد، کنترلر وقفه (مانند APIC) شماره بردار وقفه را به CPU می‌دهد. پردازنده بلافاصله اجرای پروسس جاری را معلق کرده، مقادیر Program Counter و رجیسترهای پروسس را روی پشته کرنل ذخیره نموده و با نگاه به جدول توصیف‌گر وقفه (**Interrupt Descriptor Table - IDT**) به آدرس روتین خدمت‌رسانی به وقفه (**Interrupt Service Routine - ISR**) پرش می‌کند. پس از پایان ISR، با دستور `iret` وضعیت پروسس بازیابی شده و اجرای برنامه معلق از سر گرفته می‌شود.

### تایمر سخت‌افزاری (Hardware Timer) و اشتراک زمانی
اگر برنامه‌ای درون یک حلقه نامحدود (`while(1);`) بیفتد، چگونه سیستم‌عامل کنترل CPU را پس می‌گیرد؟
راه‌حل سخت‌افزاری، تراشه **Timer** است:
- کرنل پیش از واگذاری پردازنده به پروسس کاربر، یک شمارنده را در تایمر سخت‌افزاری با مقداری مشخص (مثلاً معادل ۱۰ میلی‌ثانیه) مقداردهی می‌کند.
- با هر نوسان کلاک سیستم، مقدار شمارنده کاهش می‌یابد. هنگامی که شمارنده به صفر رسید، تایمر یک وقفه سخت‌افزاری به CPU می‌فرستد.
- با رسیدن وقفه تایمر، پردازنده فارغ از اینکه کد کاربر در کجای حلقه بی‌نهایت است، بلافاصله وارد کرنل می‌شود. زمان‌بند سیستم‌عامل پروسس جاری را متوقف کرده و پردازنده را به پروسس دیگری واگذار می‌کند.
- این مکانیزم شالوده **چندبرنامگی قبضه‌کردنی (Preemptive Multitasking)** و اشتراک زمانی (Time-Sharing) در تمام سیستم‌های عامل امروزی است.
- همچنین در سیستم‌های حساس، از مکانیزمی به نام **Watchdog Timer** استفاده می‌شود؛ اگر نرم‌افزار به دلیل باگ نتواند در بازه زمانی تعیین‌شده تایمر را بازنشانی کند، تایمر فرض را بر قفل شدن سیستم گذاشته و کل سخت‌افزار را ریست می‌کند.

---

## ۴. مبانی ورودی/خروجی و روش‌های ارتباط با کنترلرها (I/O Architecture)

ارتباط پردازنده با دنیای خارج از طریق کنترلرهای دستگاه (Device Controllers) انجام می‌شود:
- **کنترلر سخت‌افزاری (Device Controller):** مدار یا تراشه الکترونیکی روی مادربرد یا کارت الحاقی است که موتور مکانیکی، لیزر یا سیگنال‌های الکتریکی قطعه را اداره می‌کند. هر کنترلر شامل چهار نوع ثبات اصلی است:
  * **Data-in:** داده‌های دریافت‌شده از دستگاه برای خواندن توسط CPU.
  * **Data-out:** داده‌های ارسالی از سوی CPU برای نوشته شدن در دستگاه.
  * **Status:** بیت‌های وضعیت (آیا دستگاه آماده است؟ آیا خطایی رخ داده؟).
  * **Control:** بیت‌های فرمان ارسالی توسط پردازنده (دستور خواندن سکتور، چرخش، انتقال داده).
- **درایور نرم‌افزاری (Device Driver):** ماژول نرم‌افزاری درون هسته سیستم‌عامل است که با ساختار ثبات‌های کنترلر آشناست و یک رابط برنامه‌نویسی یکپارچه و استاندارد به لایه‌های بالاتر ارائه می‌دهد.

### سه الگوی بنیادین اجرای ورودی/خروجی

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
    <text x="127" y="195" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">تنها برای قطعات فوق‌سریع</text>

    <!-- Interrupt-Driven -->
    <rect x="242" y="25" width="195" height="210" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="339" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">Interrupt-Driven I/O</text>
    <text x="339" y="85" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--ink, #16150f)">صدور فرمان و انجام کار دیگر</text>
    <rect x="257" y="105" width="165" height="40" rx="4" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="339" y="130" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink, #16150f)">CPU runs other tasks</text>
    <text x="339" y="175" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--ink, #16150f)">دستگاه با وقفه خبر می‌دهد</text>
    <text x="339" y="195" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">استاندارد دستگاه‌های کند (کیبورد)</text>

    <!-- DMA -->
    <rect x="455" y="25" width="195" height="210" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="552" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="var(--ink, #16150f)">DMA (Direct Memory)</text>
    <text x="552" y="85" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--ink, #16150f)">انتقال بلوکی مستقیم به رم</text>
    <rect x="470" y="105" width="165" height="40" rx="4" fill="var(--ink, #16150f)"/>
    <text x="552" y="130" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--paper, #f3efe6)">Device &lt;==&gt; RAM Bus</text>
    <text x="552" y="175" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="11" fill="var(--accent, #b5431d)">یک وقفه به ازای کل بلوک</text>
    <text x="552" y="195" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">حیاتی برای NVMe، دیسک و 10GbE</text>
  </svg>
  <figcaption>مقایسه سه الگوی Polling، ورودی/خروجی مبتنی بر وقفه و دسترسی مستقیم حافظه (DMA)</figcaption>
</figure>

1. **سرکشی یا انتظار فعال (Polling / Busy-Waiting):**
   * پردازنده در یک حلقه فشرده دائماً بیت وضعیت کنترلر را می‌خواند تا آماده شود (`while (status & BUSY);`).
   * **مزیت:** سرعت پاسخ آنی بدون سربار وقفه.
   * **عیب:** هدر دادن ۱۰۰٪ توان محاسباتی CPU در حین انتظار برای دستگاه‌های کند. تنها زمانی استفاده می‌شود که دستگاه بسیار سریع باشد و ارسال وقفه سرباری بیش از زمان انتظار داشته باشد.
2. **ورودی/خروجی مبتنی بر وقفه (Interrupt-Driven I/O):**
   * پردازنده فرمان خواندن/نوشتن را صادر کرده و بلافاصله پردازنده را در اختیار پروسس‌های آماده دیگر قرار می‌دهد.
   * کنترلر در زمان آماده شدن داده‌ها، سیگنال وقفه ارسال می‌کند.
   * مناسب برای حجم کم داده (مثل فشرده شدن کلید کیبورد یا ماوس).
3. **دسترسی مستقیم به حافظه (DMA - Direct Memory Access):**
   * اگر قرار باشد برای یک فایل گیگابایتی از حافظه SSD، به ازای هر بایت یا کلمه یک وقفه صادر شود، پردازنده غرق در پاسخ به وقفه‌ها شده و قفل می‌کند (**Interrupt Livelock**).
   * در DMA، پردازنده آدرس مبدأ در کنترلر، آدرس مقصد در رم و تعداد بایت‌ها را به کنترلر DMA می‌دهد. کنترلر DMA باس حافظه را در اختیار گرفته و تمام بلوک مگابایتی را مستقیماً میان بافر دستگاه و رم منتقل می‌کند.
   * **نتیجه:** در طول جابه‌جایی هزاران بایت، هیچ چرخه‌ای از CPU مصرف نمی‌شود و در پایان کل انتقال، تنها **یک وقفه** به پردازنده اعلام می‌گردد.

### آدرس‌دهی ثبات‌های سخت‌افزار: PMIO در برابر MMIO
پردازنده برای دسترسی به ثبات‌های کنترلرها از دو روش سخت‌افزاری بهره می‌برد:
- **Port-Mapped I/O (PMIO):**
  * پردازنده یک فضای آدرس مستقل و مجزا (جدا از حافظه رم) برای درگاه‌های ورودی/خروجی دارد.
  * دسترسی به این فضا تنها با دستورات اختصاصی اسمبلی نظیر `in` و `out` در معماری x86 صورت می‌گیرد (مانند خواندن بایت از پورت کیبورد `0x60` با `in al, 0x60`).
- **Memory-Mapped I/O (MMIO):**
  * ثبات‌های کنترلرهای سخت‌افزاری مستقیماً به بخشی از همان فضای آدرس حافظه اصلی رم نگاشت می‌شوند.
  * پردازنده برای خواندن یا نوشتن روی ثبات دستگاه‌ها، از همان دستورات عادی دسترسی به حافظه (`mov` یا اشاره‌گرهای زبان C) استفاده می‌کند. بخش عمده قطعات امروزی نظیر کارت‌های گرافیک PCIe از MMIO بهره می‌برند.

---

## ۵. فرآیند جامع بوت و راه‌اندازی سیستم‌عامل (Bootstrapping)

فرآیند بوت گام‌به‌گام سیستم را از مدارات الکترونیکی بی‌حافظه در لحظه اتصال برق، به نقطه‌ای می‌رساند که کرنل در رم مقیم شده و اولین پروسس یوزر اسپیس سیستم بالا آمده باشد.

<figure>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 180" role="img" aria-label="OS Bootstrapping Flow" style="width: 100%; max-width: 680px; height: auto; display: block; margin: 0 auto;">
    <rect width="680" height="180" rx="8" fill="var(--paper, #f3efe6)" stroke="var(--rule-strong, #c3bcaa)" stroke-width="1.5"/>

    <!-- Step 1 -->
    <rect x="25" y="30" width="135" height="120" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="92" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--accent, #b5431d)">گام ۱</text>
    <text x="92" y="77" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--ink, #16150f)">Reset Vector</text>
    <text x="92" y="100" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">پرش به ROM BIOS/UEFI</text>
    <text x="92" y="120" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="9" fill="var(--muted, #6f6a5a)">تست POST و قطعات</text>

    <!-- Arrow 1 -->
    <path d="M 160 90 L 195 90" stroke="var(--accent, #b5431d)" stroke-width="2"/>

    <!-- Step 2 -->
    <rect x="195" y="30" width="135" height="120" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="262" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--accent, #b5431d)">گام ۲</text>
    <text x="262" y="77" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--ink, #16150f)">Stage 1 Loader</text>
    <text x="262" y="100" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">MBR (0x7C00) یا</text>
    <text x="262" y="120" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--muted, #6f6a5a)">ESP: /EFI/BOOT/...</text>

    <!-- Arrow 2 -->
    <path d="M 330 90 L 365 90" stroke="var(--accent, #b5431d)" stroke-width="2"/>

    <!-- Step 3 -->
    <rect x="365" y="30" width="135" height="120" rx="6" fill="var(--paper-2, #ece7db)" stroke="var(--rule-strong, #c3bcaa)"/>
    <text x="432" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--accent, #b5431d)">گام ۳</text>
    <text x="432" y="77" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--ink, #16150f)">Bootloader (GRUB)</text>
    <text x="432" y="100" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--muted, #6f6a5a)">تغییر به 64-bit Long Mode</text>
    <text x="432" y="120" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--muted, #6f6a5a)">لود vmlinuz و initramfs</text>

    <!-- Arrow 3 -->
    <path d="M 500 90 L 535 90" stroke="var(--accent, #b5431d)" stroke-width="2"/>

    <!-- Step 4 -->
    <rect x="535" y="30" width="125" height="120" rx="6" fill="var(--ink, #16150f)"/>
    <text x="597" y="55" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="var(--accent, #b5431d)">گام ۴</text>
    <text x="597" y="77" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="var(--paper, #f3efe6)">Kernel &amp; Init</text>
    <text x="597" y="100" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="10" fill="var(--paper-2, #ece7db)">راه‌اندازی IDT و حافظه</text>
    <text x="597" y="120" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--accent, #b5431d)">systemd (PID 1)</text>
  </svg>
  <figcaption>زنجیره فرآیند بوت سیستم از روشن شدن تا آغاز اجرای پروسس والد اولیه (init / systemd)</figcaption>
</figure>

### کالبدشکافی دقیق مراحل بوت

1. **بردار بازنشانی و سفت‌افزار (Reset Vector & BIOS / UEFI):**
   * با برقراری جریان برق، ثبات شمارنده پردازنده (PC/RIP) به صورت سیم‌کشی‌شده روی یک آدرس مشخص در حافظه فقط‌خواندنی ROM نگاشت می‌شود (در معماری x86 آدرس `0xFFFFFFF0`).
   * برنامه اولیه سفت‌افزار (**BIOS** سنتی یا **UEFI** مدرن) شروع به اجرا می‌کند.
   * **آزمون خودکار روشن شدن (POST - Power-On Self-Test):** مقدار حافظه رم موجود تست شده، پردازنده‌ها شمارش می‌شوند و کارت گرافیک و رسانه‌های ذخیره‌سازی کشف می‌گردند.
2. **کشف دیسک راه‌انداز و لودر مرحله اول:**
   * **در سیستم‌های سنتی (Legacy BIOS):** اولین سکتور درایو بوت به نام **MBR (Master Boot Record)** با اندازه ۵۱۲ بایت خوانده شده و دقیقاً در آدرس فیزیکی `0x7C00` حافظه رم بارگذاری می‌شود. ۵۱۲ بایت MBR شامل ۴۴۶ بایت کد اجرایی، ۶۴ بایت جدول پارتیشن‌ها و ۲ بایت امضای بوت (`0x55AA`) است.
   * **در سیستم‌های مدرن (UEFI + GPT):** نیازی به محدودیت ۵۱۲ بایتی MBR نیست. سفت‌افزار UEFI توانایی خواندن مستقیم فایل‌سیستم استاندارد FAT32 را داراست و مستقیماً فایل باینری لودر را از پارتیشن **ESP (EFI System Partition)** در مسیر `/EFI/BOOT/BOOTX64.EFI` اجرا می‌کند.
3. **بوت‌لودر اصلی (Second-Stage Bootloader - GRUB):**
   * به دلیل کمبود فضا در کد ۵۱۲ بایتی، لودر مرحله اول کار خود را به لودر کامل‌تری نظیر GRUB می‌سپارد.
   * وظایف GRUB:
     * تغییر حالت پردازنده از **Real Mode** ۱۶ بیتی به **Protected Mode** ۳۲ بیتی و سپس فعال کردن **Long Mode** ۶۴ بیتی.
     * خواندن فایل‌سیستم‌های پیشرفته (ext4, XFS, btrfs) برای پیدا کردن هسته فشرده لینوکس (`vmlinuz`).
     * بارگذاری کرنل و یک فایل سیستم اولیه در حافظه رم به نام **`initramfs` (Initial RAM File System)**.
4. **شروع اجرای کرنل (Kernel Initialization):**
   * کرنل کدهای خود را از حالت فشرده خارج می‌کند.
   * زیرسیستم مدیریت حافظه مجازی را فعال کرده و جدول صفحات اولیه را در رجیستر `cr3` قرار می‌دهد.
   * جدول بردار وقفه (IDT) را تنظیم می‌کند تا وقفه‌های سخت‌افزاری قابل مدیریت شوند.
   * با کمک درایورهای درون `initramfs`، کنترلر دیسک اصلی را فعال کرده و فایل‌سیستم ریشه واقعی (`/`) را سوار (**mount**) می‌کند.
5. **تولد اولین پروسس فضای کاربر: `init` (PID 1):**
   * کرنل اولین پروسس یوزر اسپیس خود را با شناسه **PID = 1** (در لینوکس‌های مدرن نرم‌افزار **`systemd`** و در سیستم‌های سنتی **`SysV init`**) به عنوان والد تمام پروسس‌های بعدی اجرا می‌کند.
   * پروسس `init` سرویس‌های پس‌زمینه (Daemons)، مدیریت شبکه، رابط گرافیکی (Display Manager) و درگاه‌های ترمینال را راه‌اندازی می‌نماید.
