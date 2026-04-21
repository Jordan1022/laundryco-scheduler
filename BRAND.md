# The Laundry Co. — Brand Style Guide

> Agent-readable brand reference. When building UI, marketing assets, or any visual output for The Laundry Co. (League City, TX), treat this file as the source of truth for colors, typography, voice, and usage rules.

---

## 1. Brand Identity

**Name:** The Laundry Co. (full) / Laundry Co. (short) / Laundry Co. League City (with locale)
**Location:** League City, TX
**Category:** Laundromat / wash-and-fold / dry cleaning
**Brand archetype:** The neighborhood regular — friendly, dependable, hand-crafted, a little nostalgic.
**Visual era:** 1950s–1960s American roadside signage. Think: mid-century diners, bowling alleys, gas stations, baseball parks, old laundromat neon.

**Voice keywords:** nostalgic, friendly, trustworthy, neighborhood, hand-crafted, playful, unpretentious.

---

## 2. Color System

All colors sampled directly from approved logo artwork. Use these exact values — do not eyeball substitutes.

### Primary Palette

| Token | Hex | RGB | Role |
|---|---|---|---|
| `brand-navy` | `#13304F` | `19, 48, 79` | Primary. Logotype, outlines, headings, body text on light backgrounds. |
| `brand-red` | `#C73A29` | `199, 58, 41` | Accent. "League City" wordmark, star/sparkle, badge fill, CTAs, highlights. |
| `brand-cream` | `#F5F1E8` | `245, 241, 232` | Base. Default background. Preferred over pure white. |

### Supporting Palette

| Token | Hex | RGB | Role |
|---|---|---|---|
| `brand-sneaker-blue` | `#3180B0` | `49, 128, 176` | Mascot-only accent (shoes). Do not use elsewhere without reason. |
| `brand-gray-blue` | `#BFD0D0` | `191, 208, 208` | Mascot body / soft neutral highlight. |
| `brand-off-white` | `#FFFFFF` | `255, 255, 255` | Only when cream is not appropriate (e.g., photo backgrounds, printed apparel where cream would read dirty). |

### Semantic Pairings

- **Navy + cream** = default UI, body copy, long-form reading
- **Navy + red** = hero/logo lockup, always balanced (not primary/secondary — co-equal)
- **Red + cream** = badges, buttons, pricing callouts, "limited time" moments
- **Navy fill + cream text** = inverse/dark mode, footers, hero sections
- **Red fill + cream text** = promotional banners, alert bars

### Color Rules

1. **Never pair navy with another dark color.** Navy owns "dark" in this system.
2. **Red is not decorative.** It's either the accent in a navy-led composition or the fill color — never both in the same element.
3. **Pure `#000` and pure `#FFF` are discouraged** for large areas. Use `brand-navy` and `brand-cream` instead. Pure white is acceptable for product mockup backgrounds and apparel.
4. **Do not introduce gradients, drop shadows, or glossy effects.** The brand is flat, printed, and honest.
5. **Do not use neon, pastel, or jewel tones.** If you need more colors, lean into warmer off-whites, desaturated navy tints, or faded red washes.

### Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#13304F',
          red: '#C73A29',
          cream: '#F5F1E8',
          'sneaker-blue': '#3180B0',
          'gray-blue': '#BFD0D0',
        },
      },
    },
  },
}
```

### CSS Variables

```css
:root {
  --brand-navy: #13304F;
  --brand-red: #C73A29;
  --brand-cream: #F5F1E8;
  --brand-sneaker-blue: #3180B0;
  --brand-gray-blue: #BFD0D0;

  /* Semantic tokens */
  --color-bg: var(--brand-cream);
  --color-text: var(--brand-navy);
  --color-accent: var(--brand-red);
  --color-bg-inverse: var(--brand-navy);
  --color-text-inverse: var(--brand-cream);
}
```

---

## 3. Typography

### Type System

| Role | Typeface | Fallback Stack | Usage |
|---|---|---|---|
| **Display Script** | Lobster (or similar heavy script) | `'Lobster', 'Pacifico', cursive` | The "Laundry" wordmark style. Reserve for hero moments, section headers, feature callouts. Never body copy. |
| **Display Condensed** | Alfa Slab One / Bungee / Ultra | `'Alfa Slab One', 'Ultra', 'Bungee', serif` | Block-letter "LEAGUE CITY" style. All caps, slogans, category labels, stamps. |
| **Secondary Script** | Lobster Two Italic | `'Lobster Two', 'Pacifico', cursive` | Casual "League City" lockup, decorative subheads. Lighter weight than the display script. |
| **Body / UI** | Inter or Work Sans | `'Inter', 'Work Sans', system-ui, sans-serif` | All body copy, UI labels, forms, navigation, anywhere readability matters. |

> **Note on the logotype itself:** The "Laundry" script in the logo is customized with hand-drawn ligatures and terminal swashes. Do NOT try to recreate the logotype in CSS — always use the provided logo asset files.

### Type Scale (web)

```css
:root {
  --font-script: 'Lobster', cursive;
  --font-display: 'Alfa Slab One', serif;
  --font-body: 'Inter', system-ui, sans-serif;

  /* Scale (1.25 ratio) */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px - body */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px - h3 */
  --text-3xl: 1.875rem;  /* 30px - h2 */
  --text-4xl: 2.5rem;    /* 40px - h1 */
  --text-5xl: 3.5rem;    /* 56px - hero */
}
```

### Heading Patterns

```css
/* Hero: script over block */
.hero-title {
  font-family: var(--font-script);
  font-size: var(--text-5xl);
  color: var(--brand-navy);
  line-height: 1;
}
.hero-subtitle {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--brand-red);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Section headers */
h2 {
  font-family: var(--font-display);
  color: var(--brand-navy);
  text-transform: uppercase;
}

/* Body */
body {
  font-family: var(--font-body);
  color: var(--brand-navy);
  background: var(--brand-cream);
}
```

### Typography Rules

1. **Never use the display script in all caps.** It's cursive — caps destroys it.
2. **Never use the block display for body copy.** It's a signage face, not a reading face.
3. **Script + block together = on-brand.** This is the signature hierarchy pattern from the logos.
4. **Body copy is always sans-serif.** No serifs in running text — it fights the retro display fonts.
5. **Keep line-height generous on body (`1.6`)** and tight on display (`1.0–1.1`).

---

## 4. Logo Usage

### Logo Variants (all in `/assets/logos/`)

| File | When to use |
|---|---|
| `wordmark-variant-01.png` | Default horizontal logo. Most digital and print uses. |
| `wordmark-horizontal-with-leaguecity.png` | When locale context matters (signage, storefront, local marketing). |
| `wordmark-navy-fill.png` | On light backgrounds where more visual weight is needed. |
| `badge-diamond-red-primary.png` | Apparel, stickers, stamps, "seal of approval" moments. |
| `badge-diamond-inverse-red-bg.png` | On red backgrounds or dark photography. |
| `mascot-washer-character.png` | Friendly/playful contexts, kids' areas, mascot-forward merch. |

### Logo Rules

1. **Minimum clear space:** Leave padding equal to the height of the "L" in "Laundry" around the logo on all sides.
2. **Minimum size:** 120px wide for digital; 1 inch wide for print. Below this, legibility breaks.
3. **Never stretch, skew, rotate, or recolor** the logo. Use the provided color variants.
4. **Never place the logo on a busy photo without a solid backing** (white card, color block, or scrim).
5. **The star/sparkle above "Laundry"** is a signature element. It can be lifted and reused as a standalone micro-graphic (loading spinner, bullet point, decorative accent) — always in `brand-red`.

---

## 5. Imagery & Iconography

- **Photography:** Warm, natural light. Avoid overly polished/stock feel. Fabric textures, folded laundry, everyday objects.
- **Illustrations:** Flat, thick outlines, limited palette (navy + red + cream + one accent max). Follow the mascot's style — chunky, slightly imperfect, hand-drawn feel. No gradients. No drop shadows.
- **Icons:** Use outlined (not filled) icon sets. Stroke width 2px. Lucide or Heroicons outline set is fine.
- **Textures:** Subtle paper grain, halftone dot patterns, or faded print textures are on-brand. Use sparingly.

---

## 6. Voice & Tone

**Write like a neighbor, not a corporation.**

- ✅ "Drop it off, we'll handle it."
- ❌ "We provide comprehensive laundry solutions for the discerning customer."

**Tone attributes:**
- Direct over flowery
- Warm over formal
- Confident over boastful
- Specific over vague ("wash, dry, fold by 5pm" > "fast service")

**Do use:** short sentences, contractions, plain words, active voice, local references (League City, Clear Lake, Galveston Bay area).

**Don't use:** jargon, superlatives ("world-class," "premium"), exclamation point spam, emoji in primary copy.

---

## 7. Component Examples

### Primary Button

```jsx
<button className="
  bg-brand-red text-brand-cream
  px-6 py-3
  font-display uppercase tracking-wider text-sm
  hover:bg-brand-navy transition-colors
  border-2 border-brand-navy
">
  Get Started
</button>
```

### Secondary Button

```jsx
<button className="
  bg-brand-cream text-brand-navy
  px-6 py-3
  font-display uppercase tracking-wider text-sm
  hover:bg-brand-navy hover:text-brand-cream transition-colors
  border-2 border-brand-navy
">
  Learn More
</button>
```

### Hero Section

```jsx
<section className="bg-brand-cream text-brand-navy py-20 px-6">
  <p className="font-display uppercase tracking-widest text-brand-red text-sm mb-4">
    League City, TX
  </p>
  <h1 className="font-script text-6xl md:text-8xl leading-none mb-6">
    Fresh from the neighborhood.
  </h1>
  <p className="text-lg max-w-xl mb-8">
    Wash, dry, fold. Drop it off by 10, pick it up by 5.
  </p>
  <button className="...">Schedule a Pickup</button>
</section>
```

### Badge / Seal

```jsx
<div className="
  inline-flex items-center justify-center
  bg-brand-red text-brand-cream
  font-display uppercase tracking-wider
  px-4 py-2 -rotate-2
">
  Est. 2024
</div>
```

---

## 8. Quick Reference for AI Agents

When generating any visual output for this brand, default to these choices unless overridden:

- **Background:** `#F5F1E8` (cream)
- **Text:** `#13304F` (navy)
- **Accent / CTA:** `#C73A29` (red)
- **Heading font:** Alfa Slab One (condensed display) or Lobster (script)
- **Body font:** Inter
- **Border radius:** `0` or `2px` max (sharp corners are period-appropriate)
- **Shadows:** none, or very subtle (`0 1px 2px rgba(19,48,79,0.1)` max)
- **Animations:** minimal; if any, use ease-out and keep under 250ms

**Anti-patterns to avoid automatically:**
- Glassmorphism, neumorphism, or any glossy/3D effect
- Gradients (single-color or multi-stop)
- Sans-serif headlines without the display font
- Emoji in body copy
- Stock "SaaS landing page" aesthetic (soft pastels, floating cards, hero illustrations of diverse cartoon people)
- Purple, teal, or any color not in the palette above

---

## 9. Files & Assets

Logo artwork lives in `/assets/logos/` (or wherever the project stores brand assets). Reference the file list in `BRAND_ASSETS.md` if present, or list contents with `ls assets/logos/`.

If an agent needs a logo variant that doesn't exist, **stop and ask** rather than generating a new one. The logos are finished artwork; regenerating them in code will produce off-brand output.
