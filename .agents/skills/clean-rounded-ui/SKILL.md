---
name: clean-rounded-ui
description: >-
  Design and implement ultra-clean, minimal, 'roundy' UI/UX inspired by Clucky,
  modern iOS, and premium neo-pop app design. Enforces removing borders, shadows,
  and AI slop; adopts high-contrast squircle cards and pill buttons; simplifies
  complex technical jargon into friendly, bite-sized copy for non-dev end users.
---

# Clean Rounded UI/UX Skill Guide (Anti-AI-Slop & Neo-Minimalism)

Use this skill whenever designing, refactoring, or building user interfaces to deliver a modern, delightful, and human-friendly experience.

---

## 1. The Anti-"AI Slop" Manifesto

Traditional AI-generated web and mobile designs suffer from predictable, cluttered patterns ("AI Slop"):
- ❌ **Hairline border addiction**: 1px subtle gray borders (`border border-slate-200`) wrapping every single box, table row, badge, and divider.
- ❌ **Fuzzy drop shadow clutter**: Layered, muddy box-shadows (`shadow-md`, `shadow-xl`, glowing colored drop shadows).
- ❌ **Glassmorphism & rainbow gradient overload**: Heavy backdrop-blurs with blue-to-purple gradient fills everywhere.
- ❌ **Technical dumps & developer bias**: Displaying raw database IDs, technical statuses, UUIDs, unformatted dates, or dense paragraph blocks to everyday users.

### The Replacement Philosophy:
- ✅ **Flat, confident surface contrast**: Separate surfaces using distinct background colors (e.g. jet-black squircle cards on a milk-white or soft-gray page), not borders.
- ✅ **Chunky, playful roundness**: Generous radii (`rounded-3xl`, `rounded-full`) that feel tactile, physical, and friendly.
- ✅ **High-impact bold typography**: Punchy headlines with tight letter-spacing paired with clean, readable body copy.
- ✅ **Conversational, non-dev copy**: Speak human. 3 to 7 words per label. Big numbers, short badges, zero jargon.

---

## 2. Geometry & Shape System

| Component Type | Shape Style | Recommended Tailwind / CSS Values | Notes |
| :--- | :--- | :--- | :--- |
| **Cards & Containers** | Deep Squircle | `rounded-3xl` (24px) or `rounded-4xl` (32px) | Large, generous curved corners. Never sharp 4px or 8px corners. |
| **Interactive Buttons** | Complete Pill | `rounded-full` (`border-radius: 9999px`) | Chunky pill buttons with ample horizontal padding (`px-6 py-3.5`). |
| **Status Chips & Tags** | Pill or Mini-Squircle | `rounded-full` or `rounded-2xl` | Small, tight, readable badges. |
| **Inputs & Search Bars** | Continuous Pill | `rounded-full` (`px-5 py-3`) | Soft solid background fill without harsh outlines. |
| **Modals & Bottom Sheets** | Floating Rounded Tile | `rounded-[32px]` to `rounded-[40px]` | Seamless curves that match modern iOS/Android native sheet designs. |

---

## 3. Surface, Color & High-Fidelity Taste Rules

### Impeccable Taste & Visual Restraint:
1. **Zero drop shadows by default**: Do not add `box-shadow` or `shadow-md`. Modern minimal UI achieves depth through **solid background contrast**.
2. **Zero hairline container borders & ZERO avatar rings**: 
   - Remove all `border border-slate-200`. 
   - **Never add outline rings to avatars** (e.g., avoid `ring-2 ring-black` or `ring-2 ring-brand`). Let circular and rounded avatar crops remain clean, pure, and borderless.
3. **Harmonious Active States (No Jarring Inversions)**:
   - When items reside within a light list or table (e.g. user directory, data rows), selecting an item must **never invert into a heavy, pitch-black monolith** (`bg-black text-white`) that punctures the composition.
   - Instead, use sleek, low-friction **tonal canvas fills** (`bg-[#F0F0EC]` or `bg-zinc-100`) with high-contrast text (`text-[#0D0D11]`), mimicking native iOS and high-fidelity product design.
4. **Purposeful Micro-Interactions Over AI Slop Dots**:
   - Do not stick arbitrary colored indicator dots on active cards.
   - Replace them with delightful, actionable micro-icons (such as a soft squircle chat button, quick action pill, or subtle chevron).
5. **Intentional 3-Color Palette Restraint**:
   - **Monochrome Foundation**: Pitch Black (`#0D0D11`) + Clean White (`#FFFFFF`) + Warm Shell Canvas (`#F6F5F2` / `#F0F0EC`).
   - **Single Cohesive Accent Pop**: SerbiSure Warm Apricot Peach (`#FFB380`), with soft tint (`#FFF4ED`) for icon badges and subtle tags. Never mix random blues, purples, or reds.
6. **Strictly Uniform Active Filter Pills (Zero Rainbow Divergence)**:
   - Filter pill bars (e.g. *Pending*, *Verified*, *Rejected*, *All*) must share the **exact same active visual treatment**.
   - **Never dye active icons in random semantic colors** (no pink/rose icons for rejected, no green icons for verified).
   - All active pills must use the identical dark container (`bg-[#0D0D11] text-white`), unified accent icon (`text-[#FFB380]`), and unified count badge (`bg-[#FFB380] text-white`). When inactive, all use neutral gray (`bg-zinc-100 text-zinc-600`).

---

## 4. Typography Rules

### Display / Hero Headlines:
- **Font**: Ultra-bold rounded sans-serif (e.g., **Nunito** at weight `800` or `900`, or **Fredoka**).
- **Styling**:
  - `font-weight: 800` or `900`
  - `letter-spacing: -0.02em` to `-0.03em` (tight tracking removes childish looseness and makes rounded fonts feel premium).
  - Sentence case or punchy lowercase moments; avoid overly stiff all-caps sentences.

### Body & Interface Details:
- **Font**: Clean, high-legibility geometric sans-serif (e.g., **Plus Jakarta Sans**, **Geist Sans**, or **Inter**).
- **Styling**:
  - Weights: `400` (Regular) for body text, `600`/`700` (SemiBold/Bold) for metric numbers and button labels.
  - High line-height (`leading-relaxed` or `1.6`) for comfortable scanning.

---

## 5. Non-Dev UX & Copywriting (Simplification Guide)

Everyday users and non-devs want immediate clarity. Always translate raw data into human outcomes:

| ❌ Dev / Technical / AI Slop | ✅ Friendly, Rounded Minimal (Non-Dev) |
| :--- | :--- |
| `DOC-UUID: 6024-8539-1064-1905` | `ID: 6024-8539` *(masked or cleanly formatted)* |
| `STATUS: PENDING_VERIFICATION_CHECK_L1` | `Under Review` *(warm yellow pill)* |
| `MediaPipe Face Landmark Confidence: 0.98412` | `Photo Verified` *(green check pill)* |
| `Failed due to OCR substring similarity threshold < 0.6` | `Name on card does not match account name` |
| `Click here to initiate document re-evaluation transaction` | `Try Again` or `Re-upload Scan` |
| Long paragraphs of instructions | 3 chunky squircle icon cards with 1-word titles |

---

## 6. Standard Component Blueprints

### A. The Clean Squircle Card (No Borders, No Shadows)
```tsx
// React / Tailwind Blueprint
<div className="bg-[#18181B] text-white rounded-3xl p-6 flex flex-col justify-between">
  <div className="flex items-center justify-between">
    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Quick Task</span>
    <span className="bg-amber-400/20 text-amber-300 text-[11px] font-bold px-3 py-1 rounded-full">
      Active
    </span>
  </div>
  <div className="my-4">
    <h3 className="text-2xl font-black tracking-tight font-display">Math Mission</h3>
    <p className="text-zinc-400 text-xs mt-1">Solve 3 quick puzzles to stop the alarm.</p>
  </div>
  <button className="w-full py-3 bg-white text-black font-extrabold text-xs rounded-full hover:bg-zinc-200 transition-all cursor-pointer">
    Start Now
  </button>
</div>
```

### B. High-Contrast Pill Action Button
```tsx
// Solid, tactile, zero fuzzy drop shadows
<button className="px-6 py-3.5 bg-black text-white hover:bg-zinc-800 rounded-full font-black text-xs tracking-tight transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2">
  <span>Download the app</span>
</button>
```

### C. Clean Surface List (Replacing Border-Heavy Tables)
```tsx
// Soft background separation instead of 1px border grids
<div className="bg-[#F6F6F4] rounded-3xl p-6 space-y-2">
  {items.map(item => (
    <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center justify-between">
      <div>
        <h4 className="font-extrabold text-sm text-zinc-900">{item.title}</h4>
        <p className="text-xs text-zinc-500 font-medium mt-0.5">{item.subtitle}</p>
      </div>
      <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-100 text-zinc-700">
        {item.status}
      </span>
    </div>
  ))}
</div>
```

---

## 7. Execution Checklist Before Handing Off UI

- [ ] Are all hairline `border` classes removed from content cards?
- [ ] Are fuzzy `shadow-*` drop shadows eliminated in favor of clean solid contrast?
- [ ] Are main action buttons and tags shaped as complete pills (`rounded-full`)?
- [ ] Are cards using deep squircles (`rounded-3xl` or `rounded-4xl`)?
- [ ] Is display typography bold and tight (`Nunito` 800/900 or equivalent with negative tracking)?
- [ ] Is technical jargon shortened into friendly, human terminology?
- [ ] Does the design have generous breathing room (ample padding `p-6` or `p-8`)?
