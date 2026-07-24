---
name: Lumina POS
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a3d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7b6c'
  outline-variant: '#bccbb9'
  surface-tint: '#006e2f'
  primary: '#006e2f'
  on-primary: '#ffffff'
  primary-container: '#22c55e'
  on-primary-container: '#004b1e'
  inverse-primary: '#4ae176'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#005ac2'
  on-tertiary: '#ffffff'
  tertiary-container: '#82abff'
  on-tertiary-container: '#003d88'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6bff8f'
  primary-fixed-dim: '#4ae176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  gutter: 20px
  margin: 24px
---

## Brand & Style

The design system is engineered for a high-efficiency Point of Sale (POS) environment where speed, clarity, and trust are paramount. The brand personality is **Professional, Efficient, and Refreshing**, moving away from the cluttered, legacy feel of traditional retail software toward a modern SaaS aesthetic.

The visual style is **Corporate / Modern** with a focus on **Minimalism**. It prioritizes heavy whitespace to reduce cognitive load during fast-paced transactions. The interface uses high-fidelity touches—such as subtle gradients and soft elevation—to create a premium feel that reassures both the merchant and the customer. The emotional response should be one of "effortless control."

## Colors

The palette is anchored by a vibrant **Success Green** (#22C55E), which serves as the primary action color. This reinforces positive outcomes (payments, completions, additions) and provides a "fresh" energy to the workspace.

- **Primary (#22C55E):** Used for "Complete Sale," "Add to Cart," and active toggles.
- **Secondary (#0F172A):** A deep slate used for high-contrast text and sidebar backgrounds to provide grounding.
- **Neutral (#64748B):** Used for secondary text, icons, and borders.
- **Surface:** The background is a crisp white (#FFFFFF) with subtle off-white (#F8FAFC) used for layout nesting and item grouping.
- **Semantic:** Use #EF4444 for deletions/errors and #F59E0B for warnings or pending statuses.

## Typography

The design system utilizes **Inter** across all levels to ensure maximum legibility and a systematic, utilitarian feel. The hierarchy is strictly enforced to guide the cashier's eye toward the total price and the "Complete Sale" triggers.

- **Headlines:** Use SemiBold (600) for section headers and Bold (700) for price displays.
- **Body:** Standardized at 16px for readability at arm's length on desktop/tablet displays.
- **Labels:** Use a slightly tighter tracking and uppercase for category labels or table headers to distinguish them from actionable data.
- **Monospace (Optional):** Use `JetBrains Mono` specifically for receipt previews or SKU numbers to ensure character alignment.

## Layout & Spacing

This design system uses a **Fluid Grid** approach optimized for 16:9 and 16:10 aspect ratios common in POS hardware. 

- **The Three-Pane Layout:** 
  1. **Navigation (Left):** Slim, 80px-wide sidebar for main modules.
  2. **Product Grid (Center):** 8 or 12-column fluid area for item selection.
  3. **Cart/Checkout (Right):** Fixed 380px-420px panel for real-time order tracking.
- **Rhythm:** An 8px linear scale is used for all spacing. Gutters are consistently 20px to maintain an "airy" feel even when the screen is full of products. 
- **Mobile/Handheld:** On smaller devices, the Cart panel collapses into a bottom sheet or a full-screen secondary view triggered by a floating action button (FAB).

## Elevation & Depth

To maintain a modern SaaS aesthetic, this design system avoids heavy shadows. Instead, it uses **Tonal Layers** supplemented by **Ambient Shadows**.

- **Level 0 (Base):** #F8FAFC (Canvas).
- **Level 1 (Cards/Sidebar):** White (#FFFFFF) with a very soft, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)).
- **Level 2 (Modals/Dropdowns):** White (#FFFFFF) with a more defined shadow (0px 8px 24px rgba(0,0,0,0.1)) and a 1px border (#E2E8F0).
- **Interaction:** Hovering over a product card should slightly increase the shadow depth and add a 1px primary-colored border.

## Shapes

The shape language is friendly and contemporary, utilizing **Rounded** corners to make the UI feel approachable and tactile.

- **Base Components:** Buttons and inputs use a 0.5rem (8px) radius.
- **Large Components:** Product cards and checkout containers use `rounded-lg` (16px) or `rounded-xl` (24px) for a soft, modern container look.
- **Selection:** Active states for product categories should use "Pill-shaped" buttons to distinguish them from product cards.

## Components

- **Buttons:** Primary buttons use a solid green background with white text. Secondary buttons use a light gray ghost style with slate text. Use "Large" heights (min 48px) for touch-friendly interaction.
- **Product Cards:** Feature a top-aligned image, followed by a bold price and a medium-weight title. On-click, a brief green "pulse" animation confirms the item was added.
- **Cart List:** Highly condensed with high-contrast text for the item name and price. Use a "swipe-to-delete" gesture for mobile or a simple 'X' icon on hover for desktop.
- **Input Fields:** Use a subtle 1px border (#CBD5E1) that thickens and turns Green (#22C55E) on focus. Labels should be floating or positioned above the field in `label-sm`.
- **Chips:** Used for "Quick-filters" (e.g., Categories like "Drinks," "Food"). These should be pill-shaped with a background that matches the text color at 10% opacity.
- **Checkboxes/Radios:** Customized to use the primary green color with a smooth transition from an empty state to a filled checkmark state.