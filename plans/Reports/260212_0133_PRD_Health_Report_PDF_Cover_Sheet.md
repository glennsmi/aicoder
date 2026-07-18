# PRD: Health Report PDF Cover Sheet

## Document Control
- **Created:** 2026-02-12
- **Owner:** Product / Reports
- **Status:** Draft
- **Related Reference:** `plans/Reports/Report cover Implementation.md`

## Problem Statement
The **Generate Health Report** flow in the **Reports** tab currently lacks a polished, dedicated PDF cover sheet. This makes exported reports feel incomplete and reduces perceived quality for recipients.

## Goal
Add a branded, single-page cover sheet to the Health Report PDF export that appears before analytics/content pages and follows the visual style defined in `Report cover Implementation.md`, with updated sizing requested in review feedback.

## Users
- Team admins generating health reports for distribution.
- Team managers sharing reports with stakeholders.
- End recipients consuming exported PDF reports.

## Scope
### In Scope
- Build a dedicated cover sheet page for Health Report PDF export.
- Include logo, title, subtitle, and neon radar chart visual.
- Apply typography/spacing/sizing refinements listed below.
- Ensure output renders correctly in PDF export and print mode.

### Out of Scope
- Changes to non-health reports.
- Any animated behavior.
- Changes to report data calculations.

## Functional Requirements
1. The first page of generated Health Report PDFs must be a dedicated cover sheet.
2. The cover sheet must include:
   - Brand logo.
   - Title text (`Personal Report` unless product copy is changed later).
   - Subtitle text (`Professional Analysis for Glenn Smith` placeholder support, with dynamic name support in implementation).
   - Radar chart with six metric labels: Nutrition, Activity, Recovery, Sleep, Stress, Health.
3. The cover page must preserve the dramatic gradient and texture style from the implementation guide.
4. The cover page must remain printable on A4 and appear correctly in browser-print PDF generation.

## Visual and Layout Requirements (Updated Sizing Pass)
Apply these relative adjustments to the current implementation baseline:

1. **Logo size**
   - Reduce by an additional **20%** from current size.

2. **Title (`Personal Report`)**
   - Reduce font size by **10%** from current size.

3. **Subtitle (`Professional Analysis for Glenn Smith`)**
   - Keep this subtitle text.
   - Reduce font size by **40%** from current size.

4. **Radar axis label fonts**
   - Labels affected: Nutrition, Activity, Recovery, Sleep, Stress, Health.
   - Reduce font size by **20%** from current size.

5. **Radar chart scale**
   - Increase overall chart size by **10%** from current size.

6. **Top spacing / vertical position**
   - Add more top spacing by moving the full visual/content block slightly downward by **10%**.

## UX Notes
- Cover sheet should still look balanced after reductions, with no collision between logo, title, subtitle, and chart labels.
- Label legibility must be maintained despite smaller text sizes.
- Glow effects should remain visible and not clip against page boundaries.

## Technical Notes
- Use React + Tailwind + native SVG approach outlined in `Report cover Implementation.md`.
- Keep constants (colors, chart data, spacing multipliers) configurable so future tuning can be done without structural rewrites.
- Prefer defining explicit scale constants, for example:
  - `LOGO_SCALE = 0.8`
  - `TITLE_SCALE = 0.9`
  - `SUBTITLE_SCALE = 0.6`
  - `AXIS_LABEL_SCALE = 0.8`
  - `RADAR_SCALE = 1.1`
  - `VERTICAL_OFFSET_SCALE = 1.1` (or equivalent Y-offset strategy)

## Acceptance Criteria
1. Generating a Health Report PDF includes a new first-page cover sheet.
2. Logo appears 20% smaller than current reviewed version.
3. Title appears approximately 10% smaller than current reviewed version.
4. Subtitle appears approximately 40% smaller than current reviewed version.
5. All six radar axis labels appear approximately 20% smaller than current reviewed version.
6. Radar chart appears approximately 10% larger than current reviewed version.
7. Cover content appears lower on the page by approximately 10% compared to current reviewed version.
8. No overlapping text/graphics on common desktop viewport and printed A4 PDF output.
9. Existing report body pages still generate as before.

## QA Checklist
- Generate PDF from Reports tab and confirm cover appears as page 1.
- Validate visual hierarchy and spacing at 100% browser zoom.
- Validate final exported PDF in at least one external viewer.
- Confirm no clipping in logo glow, chart glow, or labels.
- Confirm report generation performance remains acceptable.

## Risks / Open Questions
- The exact baseline values must be measured from the current cover implementation file to apply percentages precisely.
- Confirm whether subtitle name should be dynamic (current user/report target) or remain static placeholder in v1.
- Confirm whether these tuning percentages apply to desktop preview only or both preview and print with same constants.

