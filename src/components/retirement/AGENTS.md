# Retirement Tool

Projects portfolio in real $ → finds earliest feasible retirement age. Grows savings to retirement, draws to top up guaranteed income (CPP/OAS/DB) to target gross income. Methodology: `docs/retirement/swr-methodology.md`.

## Files
- `Main.tsx` — state container, persists via `src/utils/retirement/storage.ts`
- `RetirementApp.tsx` — `"use client"` wrapper, lazy-loads Main (`ssr:false`)
- `InputForm.tsx` — user inputs (age, income, savings, guaranteed income, target %)
- `Result.tsx` — renders feasibility result
- `Headline.tsx` — earliest retirement age summary
- `ProjectionChart.tsx` — portfolio projection chart (Recharts)
- `Assumptions.tsx` — key assumption display
- `SwrTechnicalNote.tsx` — static SWR methodology note

## Engine (`src/utils/retirement/`)
- `projection.ts` — deterministic single-return projection engine
- `monteCarlo.ts` — MC engine (planned; deterministic is current default)
- `presets.ts`, `validation.ts`, `storage.ts`, `types.ts`
