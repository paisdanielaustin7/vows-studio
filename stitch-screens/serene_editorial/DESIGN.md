---
name: Serene Editorial
colors:
  surface: '#f5fbf4'
  surface-dim: '#d6dcd5'
  surface-bright: '#f5fbf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff5ef'
  surface-container: '#eaefe9'
  surface-container-high: '#e4eae3'
  surface-container-highest: '#dee4de'
  on-surface: '#171d19'
  on-surface-variant: '#424843'
  inverse-surface: '#2c322e'
  inverse-on-surface: '#ecf2ec'
  outline: '#737972'
  outline-variant: '#c3c8c1'
  surface-tint: '#4c6452'
  primary: '#4c6452'
  on-primary: '#ffffff'
  primary-container: '#829b87'
  on-primary-container: '#1c3223'
  inverse-primary: '#b3cdb7'
  secondary: '#4b6451'
  on-secondary: '#ffffff'
  secondary-container: '#ceead2'
  on-secondary-container: '#516a57'
  tertiary: '#5a605b'
  on-tertiary: '#ffffff'
  tertiary-container: '#909690'
  on-tertiary-container: '#282f2a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cfe9d3'
  primary-fixed-dim: '#b3cdb7'
  on-primary-fixed: '#092012'
  on-primary-fixed-variant: '#354c3b'
  secondary-fixed: '#ceead2'
  secondary-fixed-dim: '#b2cdb6'
  on-secondary-fixed: '#082011'
  on-secondary-fixed-variant: '#344c3b'
  tertiary-fixed: '#dee4dd'
  tertiary-fixed-dim: '#c2c8c2'
  on-tertiary-fixed: '#171d19'
  on-tertiary-fixed-variant: '#424843'
  background: '#f5fbf4'
  on-background: '#171d19'
  surface-variant: '#dee4de'
typography:
  display:
    fontFamily: Inter
    fontSize: 2.75rem
    fontWeight: '600'
    lineHeight: 3.25rem
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '500'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-lg:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies an editorial, gallery-grade aesthetic tailored for a high-end cinematic and stills wedding studio. Rather than relying on traditional wedding tropes—such as swirly scripts, gilded accents, and heavy ornamentation—the visual identity adopts the posture of an understated contemporary architectural monograph or boutique production house. 

The personality is tranquil, deliberate, and deeply organized:
- **Tone:** Quiet luxury, artistic discipline, and operational precision.
- **Audience:** Discerning couples, creative directors, and high-production event planners seeking narrative depth and visual poise.
- **Design Movement:** Warm Minimalist Modernism. Heavy breathing room, razor-thin structural dividers, soft organic neutrals, and a strict typographical cadence that lets high-resolution imagery and cinematic footage serve as the sole emotional focal point.

## Colors

The palette draws directly from botanical and architectural hues, rejecting clinical whites in favor of an organic, atmospheric warmth.

### Primary Palette & Roles
- **Primary (`#829B87`):** Muted Sage Green. Used for primary interactive triggers, active tab indicators, key selections, and primary branding moments.
- **Secondary / Deep Emphasis (`#526B58`):** Deep Forest Sage. Used for interactive hover/pressed states, high-priority icons, and strong text links.
- **Tertiary / Soft Tint (`#EAF0E9`):** Soft Sage Mist. Applied to chips, badge backgrounds, table row selections, and delicate tonal highlights.
- **Neutral Main (`#252B27`):** Deep Olive Charcoal. High-contrast, soft-black text that avoids the harshness of `#000000`.
- **Secondary Text (`#747D75`):** Muted Stone Slate. For metadata, timestamps, input placeholders, and inactive icons.
- **Canvas (`#F7F9F6`):** Soft Alabaster. The foundational background tone, providing warmth beneath pure white surfaces.
- **Surface (`#FFFFFF`):** Crisp pure white reserved for elevated cards, modal panels, and floating dropdowns.
- **Borders (`#E5EAE4`):** Whisper-line dividers providing delicate 1px architectural definition.

## Typography

The typography is built entirely on `Inter` to provide rationalized, documentary-like precision. By relying on a single geometric-grotesque family across all roles, the interface preserves neutrality and visual quietude.

### Hierarchy & Style Rules
- **Weights:** Confined to three core weights: Regular (`400`) for bodies and long-form production notes; Medium (`500`) for navigational hierarchy, metadata titles, and form labels; SemiBold (`600`) exclusively for titles, section headers, and primary data summaries.
- **Letter Spacing:** Headlines utilize slight negative tracking (`-0.01em` to `-0.03em`) for a compact, editorial title presence. Micro-labels and status indicators use subtle positive tracking (`+0.01em` to `+0.04em`) to ensure instant legibility at small scale.
- **Restraint:** Avoid oversized, theatrical display text. Even the largest hero headlines remain grounded to maintain the feel of a curated workspace.

## Layout & Spacing

The layout philosophy follows a structured fluid grid with open framing, evoking the rhythm of an art direction storyboard.

### Grid Model
- **Desktop (1024px+):** 12-column fluid grid, `margin: 3rem`, `gutter: 1.5rem`. Max inner content container bounded at `1280px` for optimal viewing distance.
- **Tablet (768px - 1023px):** 8-column grid, `margin: 2rem`, `gutter: 1.25rem`.
- **Mobile (< 768px):** 4-column grid, `margin: 1.25rem`, `gutter: 1rem`.

### Rhythmic Discipline
Layout spacing uses an 8pt baseline rhythm:
- Spacing inside functional components (cards, lists, modals) should rely heavily on `space-md` (`1rem`) and `space-lg` (`1.5rem`) to prevent UI clutter.
- Canvas sections and distinct dashboard panels use `space-xl` (`2.5rem`) or direct margins to produce deliberate negative space.

## Elevation & Depth

This design system avoids high-blur, heavy drop-shadows. Depth is articulated purely through surface tonal contrast and 1px borders.

### Surface Tiers
- **Canvas Base (`#F7F9F6`):** The ground floor for application framing, global sidebars, and inactive layout areas.
- **Level 1 Surface (`#FFFFFF`):** Cards, canvas segments, and data tables. Outlined strictly with a solid `1px` border of `#E5EAE4`.
- **Level 2 Surface (Floating Layers):** Modals, flyouts, and dropdown pickers sit on pure `#FFFFFF` with the standard `1px` border `#E5EAE4` augmented by a subtle ambient shadow: `0 8px 24px -4px rgba(37, 43, 39, 0.04)`.

## Shapes

The geometric silhouette is modern yet soft. The base unit uses a clean 8px (`roundedness: 2`) border radius, balancing precision with approachable craft.

- **Inputs, Buttons, Badges, Dropdowns:** `0.5rem` (8px).
- **Cards, Preview Containers, Image Holders:** `1rem` (16px / `rounded-lg`).
- **Full Modals, Main Hero Panels:** `1.5rem` (24px / `rounded-xl`).
- **Circular Media / Avatars:** Standard 50% circle clip without heavy outer bezels.

## Components

### Buttons
- **Primary:** Background `#829B87`, text `#FFFFFF`, font weight `500`. No drop shadow. Hover state smoothly transitions background to `#526B58`.
- **Secondary (Outlined):** Background `#FFFFFF`, border `1px solid #E5EAE4`, text `#252B27`. Hover state changes background to `#F7F9F6` and border to `#829B87`.
- **Ghost:** Background transparent, text `#747D75`. Hover state applies `#EAF0E9` background with `#526B58` text.

### Chips & Status Badges
- **Neutral / Draft Status:** Background `#F7F9F6`, text `#747D75`, border `1px solid #E5EAE4`.
- **Active / Confirmed / Studio Selection:** Background `#EAF0E9`, text `#526B58`, border `1px solid transparent`. Height is fixed to `24px` with horizontal padding of `8px` (`space-sm`).

### Form Inputs
- Background `#FFFFFF`, border `1px solid #E5EAE4`, text `#252B27`, placeholder `#747D75`.
- **Focus State:** 1px border colored with `#829B87`, accompanied by an outer soft focus ring `0 0 0 3px #EAF0E9`.
- **Labels:** Set strictly in `label-md`, text `#747D75`, positioned `6px` above the input field.

### Selection Controls (Checkboxes & Radios)
- Base border `1px solid #E5EAE4` on `#FFFFFF` base.
- **Checked State:** Fill `#829B87` with `#FFFFFF` iconography. Never use saturated blues or generic OS styling.

### Cards & Media Frames
- Base fill `#FFFFFF` with `1px solid #E5EAE4`.
- Inner content padding is strictly uniform: `1.5rem` (`space-lg`).
- For media/cinematic previews, image containers use an internal `rounded-md` (8px) border radius with an aspect ratio of `16:9` for video stills and `3:2` for photographic proofing.

### Data Tables & Project Lists
- Table headers: `#747D75` text, `label-sm` uppercase, bottom border `1px solid #E5EAE4`.
- Table rows: Background `#FFFFFF`, height `56px`, bottom border `1px solid #E5EAE4`. Hover state initiates subtle `#F7F9F6` row highlight. Selected row uses `#EAF0E9`.