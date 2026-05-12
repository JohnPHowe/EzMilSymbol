# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run in browser
npm run lint       # Run ESLint via expo lint
```

There is no test suite configured.

## Architecture

This is an Expo + React Native app (with web support) that demonstrates the `milsymbol` library for rendering NATO military symbols.

**Routing:** Expo Router (file-based). The `app/(tabs)/` directory defines three bottom tabs: Home (`index.tsx`), Lookup (`lookup.tsx`), and Explore (`explore.tsx`).

**Military symbol rendering:** The `milsymbol` library converts SIDC codes (NATO Standard Identity and Symbology Codes) to SVGs, which are rendered via `react-native-svg`. All unit data lives in `assets/data/landUnits.json` — each entry has a `sidc` string, `name`, `category`, `definition`, `exampleUnit`, and `tags` array.

**Lookup screen:** `app/(tabs)/lookup.tsx` is the core feature — it fuzzy-searches the unit database with `fuse.js` (field weights: name > tags > category > exampleUnit > definition), renders symbols inline, and shows a modal detail view on selection.

**Cross-platform icons:** `components/ui/icon-symbol.tsx` maps SF Symbol names to Material Icons for Android/Web. The iOS variant lives in `icon-symbol.ios.tsx` and uses native SF Symbols.

**Theming:** `constants/theme.ts` holds all colors and fonts. Dark/light mode is detected via `hooks/use-color-scheme.ts` (with a web-specific override at `use-color-scheme.web.ts`).

**Enabled experiments:** `typedRoutes`, `reactCompiler`, and React Native New Architecture are all active (see `app.json`).

**TypeScript:** Strict mode is on. The `@` path alias resolves to the project root.
