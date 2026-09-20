---
name: VoiceFlow Studio
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#3a495f'
  on-tertiary: '#ffffff'
  tertiary-container: '#516177'
  on-tertiary-container: '#ccdcf7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  title-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a high-performance, distraction-free environment tailored for conversational AI builders, audio engineers, and prompt designers. The brand aesthetic merges precise Swiss-inspired minimalism with modern SaaS clarity. Every view prioritizes workflow throughput, audio waveform fidelity, and instant data scannability.

The emotional goal is absolute operational confidence: effortless orchestration, clean hierarchy, and zero enterprise clutter. Visual weight is strictly allocated to interactive flows, operational metrics, and real-time conversation state.

## Colors

The palette employs a purposeful separation between chrome, background canvas, and operational status indicators.

- **Canvas & Surfaces**: The base application background uses slate-50 (`#F8FAFC`) to provide gentle separation from pure white surface containers (`#FFFFFF`). Thin hairline borders in slate-200 (`#E2E8F0`) ground the modules.
- **Typography & Neutrals**: Primary text is rendered in deep charcoal slate-900 (`#0F172A`), secondary supporting text in slate-500 (`#64748B`), and subtle captions or borders in slate-400 (`#94A3B8`).
- **Brand Primary**: Electric Indigo (`#4F46E5`) serves as the action color for primary buttons, active link indicators, node connectors, and focused states. Hover states shift to Indigo-700 (`#4338CA`).
- **Semantic & State**:
  - `Active / Healthy / Deployed`: Emerald (`#10B981`) background tint (`#ECFDF5`) with dark emerald label (`#059669`).
  - `Inactive / Draft / Neutral`: Slate (`#64748B`) background tint (`#F1F5F9`) with slate label (`#475569`).
  - `Alert / Error`: Crimson (`#EF4444`) with soft rose backing (`#FEF2F2`).

## Typography

The typography strategy leverages Geist for its geometric legibility, neutral vertical proportions, and exceptional performance across dense tabular and structured workspace layouts. JetBrains Mono is strictly utilized for technical parameters, audio latency metrics, and API payload inspection.

Typographic hierarchy relies on weight and color contrast over exaggerated size differences, ensuring information density remains clean and scannable without visual fatigue.

## Layout & Spacing

The layout is built on an adaptive multi-pane system tailored for studio workspaces:

- **Structure**: Permanent 256px collapsible left navigation, variable primary workspace with flexible 12-column grid, and optional 360px collapsible inspector panel on the right.
- **Canvas Rhythm**: Section paddings strictly follow a 4px base increment (`4px`, `8px`, `16px`, `24px`, `32px`).
- **Breakpoints**:
  - Mobile (<768px): Navigation collapses to a sheet; grid reflows to single-column; inspector pane drops beneath the active flow.
  - Tablet (768px–1024px): Navigation compresses to icon-rail (64px); 2-column card layouts.
  - Desktop (>1024px): Full layout with persistent navigation, side-by-side node graph or analytics dashboards.

## Elevation & Depth

Visual depth is achieved through quiet, diffuse ambient shadows paired with razor-thin structural borders:

- **Surface Base**: `#FFFFFF` cards resting on `#F8FAFC` background.
- **Hairline Borders**: Every card, modal, and popover uses a crisp 1px solid border (`#E2E8F0`), eliminating heavy shadow dependencies.
- **Ambient Shadow Levels**:
  - `Card Resting`: `0 1px 2px 0 rgba(15, 23, 42, 0.04)` with `#E2E8F0` border.
  - `Interactive / Hover`: `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
  - `Dropdown & Popover`: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)` with `#CBD5E1` border.
  - `Modal Dialog`: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.

## Shapes

The design system standardizes on a calibrated corner radius scale:

- **Cards & Data Tables**: `rounded-lg` (10px to 12px) for balanced modern enclosures.
- **Controls & Inputs**: `rounded-md` (8px) for buttons, text boxes, and select triggers.
- **Status Pills & Tags**: Fully rounded pill geometry (`rounded-full` / 9999px) to distinctly contrast against rectangular data modules.

## Components

- **Buttons**:
  - `Primary`: Solid Indigo (`#4F46E5`), white text, 8px radius, subtle active scale press (`scale-[0.99]`). Focus visible with 2px Indigo ring and 2px white offset.
  - `Secondary / Outline`: White background, 1px border (`#E2E8F0`), slate-700 text (`#334155`), hover slate-50 (`#F8FAFC`).
  - `Ghost`: Transparent background, slate-600 text, hover to slate-100 (`#F1F5F9`).

- **Status Pills**:
  - `Active`: Emerald-50 background (`#ECFDF5`), 1px border (`#A7F3D0`), Emerald-700 text (`#047857`), 6px solid green pulsing dot on the left.
  - `Disabled / Staged`: Slate-100 background (`#F1F5F9`), 1px border (`#E2E8F0`), Slate-600 text (`#475569`), static slate indicator dot.

- **Inputs & Textareas**:
  - Pure white base, 1px border (`#CBD5E1`), 8px radius, 13px typography. Transition border-color on focus to Indigo-600 (`#4F46E5`) with 3px Indigo-50 glow ring.

- **Cards & Data Surfaces**:
  - Pure white interior, 1px border (`#E2E8F0`), 12px border radius, 20px internal padding. Clean line divider (`#F1F5F9`) separating headers from card body.

- **Audio Node Blocks**:
  - Distinct studio component: White card container, 8px radius, featuring top Indigo-500 accent pin, monospaced latency badge (`12ms`), and inline mini-waveform display.