# Design System Strategy: AI Crowd Intelligence

## 1. Overview & Creative North Star
### The North Star: "The Digital Sentinel"
The objective of this design system is to transform raw surveillance data into an authoritative, high-end editorial experience. We are moving away from the "generic SaaS dashboard" look toward a **Digital Sentinel** aesthetic: a sophisticated, deep-space environment that feels both high-tech and incredibly calm. 

By leveraging **intentional asymmetry**, we break the rigid box-model. Data visualizations should feel as though they are floating within a layered, atmospheric environment rather than being trapped in a grid. We use high-contrast typography scales and overlapping glass surfaces to create a sense of three-dimensional intelligence, ensuring the user feels in total control of a complex AI ecosystem.

---

## 2. Colors & Surface Philosophy

### The "No-Line" Rule
To achieve a premium, seamless feel, **1px solid borders are strictly prohibited for sectioning.** Structural boundaries must be defined exclusively through background color shifts. Use `surface-container-low` for large section backgrounds against the `background` (`#060e20`) to create a soft, natural separation.

### Surface Hierarchy & Nesting
Think of the UI as physical layers of frosted glass. 
*   **Base:** `background` (#060e20)
*   **Lower Tier:** `surface-container-low` (#091328) for main layout blocks.
*   **Active/Elevated Tier:** `surface-container-highest` (#192540) for cards containing critical data.
*   **Floating Elements:** Use `surface-bright` with a 60% opacity and `backdrop-blur: 20px` to create true Glassmorphism.

### The "Glass & Gradient" Rule
Standard flat buttons are insufficient for a "Sentinel" aesthetic. Main CTAs and Hero elements should utilize a subtle linear gradient from `primary` (#5eb4ff) to `primary-container` (#2aa7ff) at a 135-degree angle. This adds a "soul" to the UI, mimicking the glow of a high-resolution terminal.

### Status Semantic Palette
*   **Safe/Low:** `secondary` (#6bfe9c) — used for stable crowd densities.
*   **Medium/Warning:** `tertiary` (#ffe084) — used for approaching capacity.
*   **High/Alert:** `error` (#ff716c) — reserved for critical breaches or emergencies.

---

## 3. Typography: Editorial Authority
We utilize a dual-typeface system to balance technical precision with readability.

*   **Display & Headlines (Space Grotesk):** This is our "Tech" voice. Use `display-lg` (3.5rem) for primary data points like "Total People Count" to provide an immediate, bold impact.
*   **Body & Labels (Inter):** This is our "Functional" voice. Inter provides high legibility at small sizes. Use `label-sm` for technical metadata and `body-md` for descriptive alerts.

**Hierarchy Note:** Always pair a `display-sm` metric with a `label-md` uppercase descriptor to create an "Editorial" look (e.g., a massive "181" floating above a tiny, wide-tracked "TOTAL OCCUPANCY").

---

## 4. Elevation & Depth

### The Layering Principle
Avoid drop shadows for layout components. Instead, "stack" colors. A `surface-container-lowest` card placed inside a `surface-container-low` section creates a recessed, "Neumorphic" depth that feels integrated into the dashboard's hardware.

### Ambient Shadows
For floating Modals or Tooltips, use an **Ambient Shadow**:
*   **Color:** `on-surface` (#dee5ff) at 4% opacity.
*   **Blur:** 40px to 60px.
*   **Spread:** -5px.
This mimics the way light naturally diffuses in a dark room, avoiding the "dirty" look of black shadows on dark backgrounds.

### The "Ghost Border" Fallback
If accessibility requirements demand a container boundary, use a **Ghost Border**: `outline-variant` (#40485d) at 15% opacity. It should be barely perceptible, serving as a suggestion of a boundary rather than a hard wall.

---

## 5. Components

### Buttons
*   **Primary:** Gradient (`primary` to `primary-container`), `rounded-md` (0.375rem). Use `on-primary` for text.
*   **Secondary (Glass):** `surface-variant` at 20% opacity + `backdrop-blur`. This is essential for buttons sitting over live video feeds.

### Data Cards & Lists
*   **Forbid Dividers:** Do not use lines to separate list items. Use `spacing-4` (0.9rem) of vertical white space or alternate background tints between `surface-container` and `surface-container-low`.
*   **Crowd Metric Chips:** Use `secondary-container` for low density and `error-container` for high density. Chips must have a `full` radius (9999px) for a "pill" look that contrasts against the angularity of the dashboard.

### Input Fields
*   **State:** Default state uses `surface-container-highest` with no border. On focus, add a "Ghost Border" using the `primary` color at 40% opacity and a subtle `primary-dim` outer glow.

### Specialized AI Components
*   **Surveillance Feed:** Use `rounded-xl` (0.75rem) for the video container. Overlays (like heatmaps or bounding boxes) must use the semantic palette (Green/Yellow/Red) with a 0.5px "Ghost Border" to ensure they pop against the footage.

---

## 6. Do’s and Don'ts

### Do:
*   **Do** use asymmetrical layouts. Place a large video feed on the left and a series of vertically stacked, varying-height data cards on the right.
*   **Do** use `on-surface-variant` (#a3aac4) for secondary text to maintain a high-end, low-fatigue visual hierarchy.
*   **Do** apply `backdrop-blur` to any element that overlaps another to maintain the "Glass" aesthetic.

### Don’t:
*   **Don’t** use pure black (#000000) for backgrounds; it kills the depth. Stick to the `background` token (#060e20).
*   **Don’t** use 100% opaque borders. They create "visual noise" that distracts from the AI data.
*   **Don’t** use standard "drop shadows" (e.g., #000 50%). They look dated and muddy on dark-themed dashboards.
*   **Don’t** crowd the interface. If the data feels cramped, increase spacing using the `spacing-10` (2.25rem) or `spacing-12` (2.75rem) tokens.