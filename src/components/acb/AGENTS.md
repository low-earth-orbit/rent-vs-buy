# ACB Tool

Upload Wealthsimple CSV → compute adjusted cost basis for non-registered holdings.

## Files
- `Main.tsx` — state container, persists to localStorage via `src/utils/storage.ts`
- `AcbApp.tsx` — `"use client"` wrapper, lazy-loads Main (`ssr:false`)
- `FileUpload.tsx` — CSV drag-drop input
- `FilePreviewModal.tsx` — preview parsed rows before processing
- `HoldingsTable.tsx` — per-symbol ACB table with lot tracking
- `YearlyACBTable.tsx` — year-by-year ACB breakdown
- `AccountView.tsx` — account-level summary
- `SummaryBar.tsx` — top-level summary stats
- `T3Modal.tsx` — T3 slip input for return-of-capital adjustments

## Engine
`src/utils/acb/parser.ts` — parses Wealthsimple activity export CSV → ACB calculation logic
