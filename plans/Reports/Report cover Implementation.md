# Report Cover Implementation Guide

This guide details how to programmatically generate the "Personal Report" cover page featuring a custom, glowing neon radar chart against a dark, dramatic background. This component is designed for PDF generation via browser print functionality.

## 1. Technical Stack & Dependencies

*   **Framework**: React
*   **Styling**: Tailwind CSS (v4)
*   **Graphics**: Native SVG (No external charting libraries required)
*   **Assets**: Standard image imports for logos.

## 2. Visual Design System

### Color Palette

**Background Gradient (Dramatic Spotlight)**
*   **Top-Right (Light Source)**: `#226b7d` (Medium-Bright Teal)
*   **Mid-Tone**: `#0f3b49` (Deep Teal)
*   **Bottom-Left (Shadow)**: `#05181c` (Near Black)
*   **Gradient Syntax**: `radial-gradient(130% 140% at 100% 0%, #226b7d 0%, #0f3b49 50%, #05181c 100%)`

**Radar Chart Axis Colors (Neon)**
The chart uses distinct colors for each metric axis:
1.  **Nutrition**: `#0097D7` (Blue)
2.  **Activity**: `#00D7AC` (Teal)
3.  **Recovery**: `#50C878` (Emerald)
4.  **Sleep**: `#D7AC00` (Gold)
5.  **Stress**: `#FF7F50` (Coral)
6.  **Health**: `#D70097` (Pink)

### Texture
A subtle noise texture is applied over the background using a CSS `mix-blend-overlay` and an SVG `feTurbulence` filter encoded as a data URI. This prevents color banding and adds a premium paper feel.

## 3. Component Structure (`ReportCover.tsx`)

The component consists of a wrapper for print/screen layout and the SVG chart logic.

### Layout Container
*   **Aspect Ratio**: A4 (`1/1.414`).
*   **Dimensions**: Max width `595px` (standard A4 at 72dpi), responsive on mobile.
*   **Print Styles**: `print:shadow-none`, `print:w-full`, `print:h-full`, `print:p-0` to ensure it fills the page when printed.

### Topography
*   **Title**: "Personal Report" - `text-4xl md:text-[3.2rem]`, Bold, Tight tracking.
*   **Subtitle**: "Professional Analysis for **Glenn Smith**" - Teal-100 text with white bold name.

## 4. Custom Radar Chart Implementation (SVG)

The chart is built from scratch using SVG to allow for complex glow effects that standard libraries cannot easily achieve.

### Coordinate Logic
Convert polar coordinates (value, angle) to Cartesian (x, y):
```javascript
x = center + radius * cos(angle)
y = center + radius * sin(angle)
```
*Note: Subtract Math.PI/2 from the angle to start at 12 o'clock.*

### Key Features & SVG Elements

1.  **SVG Filters (`<defs>`)**:
    *   **Dot Glow**: `feGaussianBlur` (stdDeviation="8") + `feMerge` to create a colored halo around data points.
    *   **Line Glow**: `feGaussianBlur` (stdDeviation="4") applied to the connecting path to simulate a neon tube.

2.  **Grid Lines**:
    *   Concentric polygons at 33%, 66%, and 100% radius.
    *   Stroke: `#E5E7EB` with `0.2` opacity.

3.  **Axes**:
    *   Spokes extending from center to edge.
    *   Decorative dots at 33% and 66% marks.
    *   **Labels (Dynamic Spacing)**:
        *   **Standard Position**: Nutrition (Index 0) and Sleep (Index 3) are positioned at **130% radius**.
        *   **Extended Position**: Activity, Recovery, Stress, and Health are positioned further out at **150% radius** to prevent overlap with glow effects.
        *   **Typography**: `text-[11px] md:text-[13px]`, Bold, Uppercase, Tracking-widest.
        *   **Styling**: Text has a colored shadow (`textShadow`) matching the axis color.

4.  **Curved Connectors (Spider-Web Effect)**:
    *   Instead of straight lines (`<line>`), use `<path>` with Quadratic Bezier curves (`Q`).
    *   **Control Point Calculation**:
        *   Find midpoint between two data points.
        *   Interpolate that midpoint towards the center of the chart by 20% (Curve factor `0.8`).
    *   **Result**: Lines curve inwardly, creating an organic, tension-based shape.
    *   **Gradient**: Each segment uses a `linearGradient` transitioning from the start point's axis color to the end point's axis color.

5.  **Data Points**:
    *   **Outer Circle**: Radius `9px`, Axis Color, Filter `url(#glow-i)`.
    *   **Inner Circle**: Radius `5px`, White fill (creates the "hot" core look).

## 5. Current Data Configuration

To recreate the specific asymmetric shape currently displayed, use these values:

```javascript
const DATA = [
  { subject: 'Nutrition', value: 85, fullMark: 100 },
  { subject: 'Activity',  value: 92, fullMark: 100 },
  { subject: 'Recovery',  value: 50, fullMark: 100 }, // Asymmetric dip
  { subject: 'Sleep',     value: 90, fullMark: 100 }, // High point
  { subject: 'Stress',    value: 30, fullMark: 100 }, // Sharp dip (Low stress is good/bad depending on metric, here it's a value)
  { subject: 'Health',    value: 82, fullMark: 100 },
];
```

## 6. Implementation Checklist for LLMs

When generating this code:
1.  **Static Implementation**: Do not use animation libraries like framer-motion. This is a static reporting page.
2.  **Logo Assets**: Use standard relative imports for images (e.g., `import logo from './assets/logo.png'`).
3.  **Define Constants**: Move Colors and Data outside the component to keep logic clean.
4.  **Math Helper**: Create a reusable `getCoordinates` function inside the chart component.
5.  **Layering**: Ensure SVG Filters are defined in `<defs>` at the top of the `<svg>`.
6.  **Z-Index**: Ensure the text content layer has `z-10` and `relative` positioning to sit above the background texture.
7.  **Label Logic**: Implement the conditional radius logic: `const labelRadius = (i === 0 || i === 3) ? 130 : 150;`
