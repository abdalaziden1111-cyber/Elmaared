# Brand Guidelines — تطبيق المعارض

> **المشروع**: تطبيق المعارض / App Exhibition
> **الشعار**: "مستقبل الفعاليات.. صار أذكى"
> **الجوهر**: B2B Marketplace رسمي + شفافية + AI + ضمان مالي
> **هذا الملف**: قواعد الهوية البصرية واللفظية — Do's & Don'ts لكل شاشة من الـ 13 مجموعة شاشات (راجع رد المرجعيات السابق).

---

## 1. شخصية العلامة (Brand Personality)

| نحن | لسنا |
|----|-----|
| موثوقون بهدوء (Quietly trustworthy) | متباهون / ضجيجيون |
| محترفون بدفء سعودي | جامدون كبنك تقليدي |
| واضحون وصريحون في التسعير | غامضون أو "كَلَّم محاسبنا" |
| مبتكرون (AI + Escrow) | مهووسون بالتقنية على حساب الإنسان |
| محليون متجذرون في السوق السعودي | عالميون مستوردون بلا سياق |
| شركاء نمو طويل المدى | بائعون لمعاملة واحدة |

**اختبار الجملة الواحدة**: لو قرأ مدير تسويق سعودي (سارة العتيبي - ICP 2) أي نص لدينا، يجب أن يشعر: *"هؤلاء يفهمونني، ولن يستفيدوا من جهلي."*

---

## 2. لوحة الألوان (Color System)

### المنطق
ابتعدنا عن الأخضر السعودي الكليشيهي وعن الأزرق المؤسسي البارد. اخترنا **خضرة الليل (Midnight Green)** لأنها توحي بالعمق + الثقة + بالأرض السعودية في وقت متأخر من الليل (إشارة دقيقة بدون مباشرة)، ومعها **ذهب الكثبان** للدفء، و**أزرق الفعل** للـ CTA الواضح.

### Primary Palette

| الاسم | Hex | الاستخدام |
|------|-----|----------|
| **Midnight Green** | `#0E3B43` | اللون الأساسي — Header, Logo, Hero text, Primary buttons (dark variant) |
| **Midnight Green 700** | `#155560` | Hover states, Secondary surfaces |
| **Midnight Green 100** | `#E6EFF1` | Backgrounds, Soft sections, Selected rows |

### Secondary — Brand Warmth

| الاسم | Hex | الاستخدام |
|------|-----|----------|
| **Dune Gold** | `#C8A24C` | Brand accent, Highlight callouts, Premium badges (CEO Eye, Pro), Star ratings |
| **Dune Gold 100** | `#FAF1DC` | Soft accent backgrounds (banners, "Wow Moment") |

### Action / CTA

| الاسم | Hex | الاستخدام |
|------|-----|----------|
| **Action Blue** | `#2563EB` | Primary CTAs (Submit, Create RFQ, Award Winner), Active links |
| **Action Blue 700** | `#1D4ED8` | Hover/Pressed |

### Neutrals (Warm)

| الاسم | Hex | الاستخدام |
|------|-----|----------|
| **Cream** | `#FAF8F4` | Page background (لا أبيض ناصع — يكسر RTL ويسبب إجهاد بصري) |
| **Stone 100** | `#F2EEE7` | Card backgrounds, Skeleton loading |
| **Stone 300** | `#D8D2C7` | Borders, Dividers |
| **Stone 600** | `#7A766F` | Secondary text, Captions |
| **Charcoal** | `#1A1A1A` | Primary text (لا أسود `#000` — قاسٍ على العين في النص العربي) |

### Semantic (موحدة عبر كل النظام)

| الحالة | Hex | الاستخدام |
|-------|-----|----------|
| **Success** | `#16A34A` | RFQ approved, Payment confirmed, Delivery accepted |
| **Warning** | `#F59E0B` | Pending review, Awaiting Admin, Negotiating |
| **Danger** | `#DC2626` | Panic Button, Disputed, Rejected, Errors |
| **Info** | `#0284C7` | Admin presence indicator, Tooltips |

### قواعد الاستخدام (Do / Don't)

**✅ Do**:
- Primary surfaces دائماً Cream أو White، النص Charcoal — للراحة في القراءة العربية الطويلة (RFQ details).
- Midnight Green هو لون الـ "headline + brand presence" فقط — ليس لون الأزرار العادية.
- Action Blue للأزرار التي تنفذ شيئاً حقيقياً (يحفظ، يرسل، يدفع).
- Dune Gold بحذر — كاكسسوار، ليس لون رئيسي. لا يتجاوز 5% من المساحة في أي شاشة.
- Danger أحمر فقط لـ: زر الفزعة، تأكيد الدفع، رفض. لا تستخدمه للـ "delete" العادي.

**❌ Don't**:
- لا تستخدم الأخضر السعودي الفاقع `#006C35` — مرتبط بالعَلَم وله دلالة سياسية، يحرق الموقف.
- لا تخلط Midnight Green مع Action Blue في نفس المكون — تتنافس بصرياً.
- لا تستخدم أبيض ناصع `#FFFFFF` كخلفية صفحة — استخدم Cream `#FAF8F4`.
- لا تستخدم أسود ناصع `#000000` — استخدم Charcoal `#1A1A1A`.
- لا "gradient backgrounds" مفرطة — لون مسطح أو gradient لطيف جداً (15% فرق فقط).
- لا تستخدم 3+ ألوان Brand في نفس الشاشة (Midnight + Gold + Blue = حد أقصى).

---

## 3. الخطوط (Typography)

### الاختيار
- **العربي**: IBM Plex Sans Arabic (Variable) عبر `next/font/google` — مذكور في `01-tech-stack-decisions.md`
- **اللاتيني / English**: Inter (Variable) عبر `next/font/google`
- **Display اختياري للـ Hero**: IBM Plex Sans Arabic Bold + Inter Display (نفس العائلة، أوزان أثقل)

### Type Scale (Mobile-First)

| Token | Mobile | Desktop | الخط | الوزن | الاستخدام |
|-------|--------|---------|-----|------|----------|
| `display-xl` | 32 / 40 | 56 / 64 | Plex Arabic | 700 | Hero الصفحة الرئيسية فقط |
| `display-lg` | 28 / 36 | 44 / 52 | Plex Arabic | 700 | Marketing pages headlines |
| `h1` | 24 / 32 | 32 / 40 | Plex Arabic | 600 | Page titles |
| `h2` | 20 / 28 | 24 / 32 | Plex Arabic | 600 | Section headers |
| `h3` | 18 / 26 | 20 / 28 | Plex Arabic | 600 | Card headers, Subsections |
| `body-lg` | 16 / 26 | 16 / 28 | Plex Arabic | 400 | Body in paragraphs (RFQ details, Agreement) |
| `body` | 14 / 22 | 14 / 24 | Plex Arabic | 400 | Default UI body |
| `caption` | 12 / 18 | 12 / 18 | Plex Arabic | 500 | Labels, Timestamps, Metadata |
| `mono` | 14 / 20 | 14 / 20 | Inter (LTR forced) | 400 | Numbers (CR, prices, IDs) |

### قواعد لا تُكسر

**✅ Do**:
- الأرقام (الأسعار، CR Numbers، Dates) **دائماً LTR** حتى في صفحة RTL — استخدم `dir="ltr"` على الـ `<span>`.
  - مثال: `<span dir="ltr">15,000 ﷼</span>` لا `15,000 ﷼`.
- Line-height للنص العربي **أعلى بـ 10-15%** من اللاتيني (الحروف العربية أطول رأسياً).
- استخدم Variable Font weights — ليس Bold-Italic-Underline معاً (Stack one emphasis only).
- العربي **بدون Italic** — لا توجد italics طبيعية في العربي. للتمييز استخدم Weight أو لون.

**❌ Don't**:
- لا تستخدم خطوط Display Arabic مزخرفة (Diwani, Reqaa) — لا تتسق مع B2B SaaS.
- لا تستخدم `text-align: justify` للنص العربي القصير — يخلق فجوات قبيحة بين الكلمات. استخدمه فقط للفقرات 4+ أسطر.
- لا تخلط حجمين مختلفين في نفس السطر (المهم: لا تكتب رقم بحجم أكبر داخل عبارة).
- لا تستخدم All-Caps للعربي — لا توجد case في العربي، وللاتيني استخدم Caps فقط للـ Tags/Badges (max 12 حرف).

---

## 4. التباعد والشبكة (Spacing & Grid)

### Spacing Scale (4-base)
```
4 — 8 — 12 — 16 — 24 — 32 — 48 — 64 — 96
```
- المسافة الافتراضية بين العناصر: **16px** (mobile), **24px** (desktop).
- المسافة بين الأقسام (Sections): **48px** (mobile), **96px** (desktop).
- داخل Card: padding **16-24px**.

### Container
- Max-width: **1280px** على Desktop.
- Side gutters: **16px** mobile, **24px** tablet, **48px** desktop.
- Dashboard sidebar: **240px** ثابت (RTL: على اليمين).

### Border Radius
| الاستخدام | Radius |
|----------|--------|
| Buttons, Inputs, Tags | **8px** |
| Cards, Modals, Sheets | **12px** |
| Hero blocks, Featured | **16px** |
| Avatar, Logo container | Full (50%) |

**❌ Don't**: لا تستخدم `border-radius: 0` (يبدو قديم) ولا `border-radius: 24px+` (يبدو كرتوني/Web3).

---

## 5. الأشكال والـ Assets

### الـ Iconography
- **المكتبة**: Lucide React (مذكور في `01-tech-stack-decisions.md`).
- **Stroke**: 1.5px (لا 2px — ثقيل جداً مع العربي).
- **Size scale**: 16, 20, 24, 32, 48.
- **اللون**: يرث من النص (`currentColor`) — ليس لوناً ثابتاً.
- **محظور**: Emoji decorative (✨🚀💰) في UI الـ B2B. مسموح فقط في: نتائج تقييم العميل (يكتبها هو)، إشعار "Wow Moment" (مرة واحدة).

### Illustration Direction
**النمط**: Editorial flat illustrations مع لمسة تكسير (texture grain خفيف 2-5%).
- **مرجع**: أسلوب Stripe / Mercury / Linear (تجريدي، ليس كرتوني).
- **اللون**: Palette الـ Brand فقط (Midnight Green + Dune Gold + Cream) + accent warm.
- **محظور**: 
  - ❌ 3D blob illustrations الترندي 2021-2022 — انتهت صلاحيته.
  - ❌ Generic Memphis pattern (دوائر وخطوط متقاطعة).
  - ❌ Stick-figure حرفياً (يبدو رخيصاً للـ B2B).
- **استخدامها في**: Empty states (12 illustration max للـ MVP)، Onboarding "Wow Moment"، Marketing pages.

### Photography
**النمط**: تصوير حقيقي للسوق السعودي + Studio shots للموردين.

**✅ Do**:
- صور حقيقية لمعارض LEAP / سيتي سكيب / Big 5 Saudi (بإذن).
- طاقم Saudi/Khaleeji authentic — رجال بالثوب وأحياناً بدون، نساء محتشمات بالعباية أو pantsuit (varied).
- لقطات tight crops على الأيدي + المنتج (طباعة، booth structure، هدية مغلفة) — تركز على الحرفة.
- إضاءة طبيعية دافئة (Golden hour-ish) — Tone warm، ليست حادة blue cool.
- Studio shots للموردين Profile: white seamless + lighting واحد، لا backgrounds مزدحمة.

**❌ Don't**:
- ❌ Stock photos الكلاسيكية: handshake عام، فريق متعدد الأعراق يضحك بفنجان قهوة، رجل شركة مع laptop في فضاء أبيض.
- ❌ AI-generated faces — عيون غير متناسقة، أصابع 6، أحياناً نص عربي مشوه.
- ❌ Generic "Middle East" stock — صور رجال في agal بصحراء مع جمل (كليشيه، يهين الجمهور).
- ❌ صور women uncovered بشكل لا يناسب الجمهور المستهدف (محافظ + مهني).

### Patterns & Textures
- **Pattern 1 — Tatreez Modern**: تجريد لزخرفة هندسية إسلامية (نجمة 8 أضلاع) بـ 8% opacity على Hero backgrounds.
- **Pattern 2 — Grain Noise**: SVG noise filter 3% opacity على Cards لإضافة "ملمس" — يكسر التسطح الـ flat الممل.
- **❌ لا**: Mosque silhouettes، palm trees، دلة قهوة literal — كليشيه.

### Logo (مبدئي حتى تصميم نهائي)
- **شكل**: نص عربي + Mark بسيط (لو موجود).
- **Clear space**: مساحة فارغة حول اللوغو = ارتفاع الحرف "أ".
- **Min size**: 24px ارتفاع للـ digital، 12mm للطباعة.
- **Variants required**: Full color، monochrome dark، monochrome light، favicon (32×32).

---

## 6. توجيه التصوير حسب الشاشة (Imagery per Screen Group)

ربط مباشر بمجموعات الشاشات الـ 13 من رد المرجعيات السابق:

| مجموعة الشاشات | نوع التصوير | اقتراح محدد |
|----------------|-------------|-------------|
| 1. Landing / Marketing | Hero photo + 3 ICP photos | Hero: مدير تسويق سعودي يحضر معرض (perspective wide). ICP1: قاعة مؤتمر تنفيذية. ICP2: مكتب open space. ICP3: founder بـ hoodie في warehouse. |
| 2. Supplier Directory | Cover thumbnails | Studio crop على نتاج المورد (booth angle، gift unboxed). تجنب صورة المالك في الكارت. |
| 3. Supplier Profile | Hero + Portfolio gallery | Cover: lifestyle wide للـ booth في معرض حقيقي. Portfolio: 3:4 ratio، minimal background. |
| 4. Sign Up | Illustrations (no photos) | 4 illustrations: account / company / verification / done — flat editorial. |
| 5. Client Dashboard | لا صور — UI نقي + KPI cards | Empty states: illustration واحدة "أنشئ أول طلب". |
| 6. RFQ Wizard | أيقونات الخدمات الأربع فقط | 4 icons تجريدية للخدمات (booth, gift, event, print) — بنفس الـ stroke style. |
| 7. Proposals Compare | Avatar + Logo فقط | لوغو المورد (square)، لا صور تنفيذيين. |
| 8. Chat | Avatar فقط | Avatar 32px round. Empty state: illustration "ابدأ المحادثة". |
| 9. Agreement AI | Document mockup | mockup A4 portrait مع highlighting شرائح ملونة (Success/Warning/Danger). |
| 10. Escrow Flow | Bank logos + Lock icon | Logos للبنوك السعودية (الراجحي، الأهلي، الرياض، SAB). Icon قفل بسيط (Lucide). |
| 11. Project Timeline | Photos من المورد | الصور التي يرفعها المورد (Designs + Delivery). UI ينظمها فقط. |
| 12. Admin Dashboard | لا صور — Data only | Charts + Numbers. Avatar للموظف الإداري في sidebar. |
| 13. Earnings / Wallet | Bank logos + Receipt mockup | Receipt PDF preview + bank transfer flow icons. |

---

## 7. الحركة (Motion & Animation)

### المبادئ
- **Subtle, not showy** — حركة تخدم الفهم لا تستعرض.
- **Duration**: 150ms (micro), 250ms (default), 400ms (large transitions). لا تتجاوز 600ms.
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out) للـ entrances. `ease-in-out` للـ position changes.

### Do
- ✅ Skeleton loading يطابق layout النهائي (مذكور في `04-screens-inventory.md`).
- ✅ Toast notifications: slide من الأعلى (RTL: يمين) → fade out بعد 4s.
- ✅ Tab switches: opacity fade فقط، لا slide.
- ✅ Modal: scale 95% → 100% + fade in (200ms).

### Don't
- ❌ Parallax scrolling — كثير، يربك في الموبايل.
- ❌ Auto-playing carousels في Marketing — توقف القراءة.
- ❌ "Pop" / Bounce easings — يبدو كرتوني.
- ❌ Page transitions كاملة بين الـ Routes — يضيف زمن إدراك بدون قيمة.

---

## 8. RTL Specifics

من ملف `CLAUDE.md` العام والوثائق:

**✅ Do**:
- `dir="rtl"` على `<html>` للعربي عبر `next-intl` middleware.
- Mirror الأيقونات الاتجاهية: `<ArrowLeft />` يصبح `<ArrowRight />` في RTL (Lucide يدعم هذا).
- Sidebar في الـ Dashboard: على **اليمين** في RTL، على اليسار في LTR.
- Logical CSS properties: `padding-inline-start` بدل `padding-left`.

**❌ Don't**:
- ❌ Flip الأيقونات غير الاتجاهية: `<Phone />`, `<Heart />`, `<Bell />` تبقى كما هي.
- ❌ Mirror الأرقام والـ logos — تبقى LTR.
- ❌ تستخدم `margin-left/right` مباشر — استخدم `margin-inline-start/end`.

---

## 9. الأيقونات الـ Brand-Specific

ميزات تنافسية لها أيقونات مخصصة (تُرسم يدوياً، ليست من Lucide):

| الميزة | الأيقونة المقترحة |
|-------|-------------------|
| Escrow / الضمان المالي | Shield + Lock في المنتصف (Midnight Green) |
| زر الفزعة | Bell shape مع تموج صوتي (Danger Red) — متحركة عند Hover فقط |
| عين الـ CEO | Eye outline داخل دائرة (Dune Gold) — read-only signifier |
| AI Comparison | 3 شرائط (bars) متفاوتة + sparkle (Action Blue) |
| AI Agreement | Document مع Checkmark + Magnifier (Action Blue) |
| ZATCA Invoice | Document A4 مع Stamp circle (Midnight Green) |
| Corporate Wallet | Wallet outline + رقم (Midnight Green) |
| CRM Free | Heart + Handshake (Dune Gold) |

---

## 10. مكونات shadcn/ui — Customization

من `01-tech-stack-decisions.md`، نستخدم shadcn/ui. التخصيصات الإلزامية:

```css
/* tokens.css */
:root {
  --background: 36 33% 97%;        /* Cream */
  --foreground: 0 0% 10%;          /* Charcoal */
  --primary: 188 65% 16%;          /* Midnight Green */
  --primary-foreground: 36 33% 97%;
  --secondary: 39 53% 54%;         /* Dune Gold */
  --accent: 217 91% 53%;           /* Action Blue */
  --destructive: 0 73% 50%;        /* Danger */
  --border: 35 19% 81%;            /* Stone 300 */
  --radius: 0.75rem;               /* 12px default */
}
```

**Custom variants required**:
- `<Button variant="panic">` — أحمر + shake animation عند Hover (لـ زر الفزعة).
- `<Button variant="ai">` — Action Blue + sparkle icon قبل النص (لـ "اطلب توصية AI").
- `<Badge variant="admin">` — Dune Gold border + "Admin" text (لـ Admin presence).

---

## 11. الأخطاء الشائعة (Common Mistakes To Avoid)

| الخطأ | الأثر | الصواب |
|------|------|--------|
| استخدام أخضر العَلَم السعودي | يحرق الموقف سياسياً + كليشيه | Midnight Green |
| Stock photos لرجال gulf مع جمال | يهين الجمهور المستهدف | تصوير real من معارض حقيقية |
| All-Caps لعناوين عربية | لا case في العربي — مستحيل | Weight bold بدلاً من ذلك |
| Border-radius 24px+ على cards | Web3/كرتوني | 12-16px max |
| Italics للنص العربي | غير موجودة طبيعياً | Weight أو لون |
| 3D blob illustrations | Trend منتهي 2022 | Editorial flat 2D |
| Justify text قصير | فجوات قبيحة بين الكلمات | Start-aligned |
| Emoji decorative في UI | يكسر الـ B2B trust | Lucide icons فقط |
| ✨🚀💰 في CTAs | Hype غير مبرر | كلمات واضحة |
| Auto-play video on load | يربك + يستهلك data | Click-to-play |

---

## 12. Brand Voice — الإطار العام

**نقول**:
- "أرسل طلبك" (واضح، ضمير المخاطب)
- "تابع 4 موردين بالتوازي" (رقم محدد)
- "Admin يستمع للمحادثة" (شفافية)
- "خصم 5% فقط" (شفافية تسعير)

**لا نقول**:
- "احصل على عروض فورية!" (مبالغة)
- "استمتع بتجربتنا الفريدة" (فارغ)
- "اشترك الآن وتميّز" (hype)
- "أفضل منصة في الشرق الأوسط" (ادعاء غير قابل للإثبات)

> التفاصيل الكاملة للـ Voice + Copy لكل شاشة → ملف **[`09-copy-voice.md`](./09-copy-voice.md)**.

---

## 13. ملف تنفيذي (Implementation Checklist)

قبل أي شاشة تذهب للـ Production، تأكد من:

- [ ] الألوان من tokens فقط (لا hex مكتوب inline)
- [ ] Typography من Type Scale (لا font-size عشوائي)
- [ ] Border-radius من Spacing Scale
- [ ] الأرقام `dir="ltr"` حتى في RTL
- [ ] Empty / Loading / Error states موجودة (راجع `04-screens-inventory.md` Section 6)
- [ ] Mobile 375px + Desktop 1440px مختبرة
- [ ] لا stock photos clichéd (راجع Section 5)
- [ ] Lucide icons مع stroke 1.5px فقط
- [ ] تباعد متسق (4-base scale)
- [ ] RTL Mirror للأيقونات الاتجاهية فقط
- [ ] Copy متطابق مع `09-copy-voice.md`

---

## 14. مراجع تصميمية مرتبطة

- لوحة المرجعيات الكاملة لكل شاشة: راجع رد المحادثة السابق ("Design References by Screen Group").
- Top 3 مرجعيات Aesthetic مماثل قريب: **Linear**, **Mercury**, **Stripe Atlas** — درس Tone + Spacing + Typography.
- مرجع محلي: **Marn** (سعودي) — درس RTL execution.
