<div align="center">
  <a href="https://github.com/brandonkthomas/Indium">
    <img src="assets/branding/indium-branding-512.png" alt="Indium Logo" width="200" height="200">
  </a>

  <h3 align="center">Indium</h3>

  <p align="center">
    CSS-first UI kit with Razor templates and lightweight TypeScript behavior wiring
    <br />
    <i>Work in progress.</i>
    <br />
    <br />
    <a href="https://dotnet.microsoft.com/en-us/apps/aspnet"><img alt="ASP.NET Core" src="https://img.shields.io/badge/ASP.NET%20Core-512BD4?logo=dotnet&logoColor=white"></a>
    <a href="https://learn.microsoft.com/en-us/aspnet/core/razor-pages"><img alt="Razor" src="https://img.shields.io/badge/Razor-5C2D91?logo=.net&logoColor=white"></a>
    <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF"></a>
    <a href="https://www.w3.org/Style/CSS/Overview.en.html"><img alt="CSS" src="https://shields.io/badge/CSS-009CFF?logo=css&logoColor=white&labelColor=009CFF"></a>
  </p>
</div>

## About the Project
Indium is a reusable, CSS-first UI-core package for host applications that need a consistent shell, component library, and static asset contract.

It ships as a Razor Class Library with static web assets and full-shell/per-component bundles.
Templates + CSS define the look/layout contract; TypeScript focuses on state, accessibility, and host wiring.

### Feature Highlights
- **CSS-First Architecture**: Layout, visual states, and component presentation are primarily authored in CSS/templates.
- **Full Shell Boot**: `bootIndium(...)` wires host config, branding, and behavior contracts.
- **Optional Components**: Dialogs, glass surface, infinite scroll, sidebar, grad-noise canvas, and navbar can be consumed independently.
- **Config + Path Helpers**: `setIndiumConfig(...)`, `routePath(...)`, `apiPath(...)`, and `assetPath(...)`.
- **Theme System**: System-default color mode with host force classes, scoped `[data-wa-theme]` container overrides, and runtime theme mode APIs.
- **Host-Compatible Navbar**: Canonical `wa-navbar*` selectors with legacy `url-*` compatibility support.
- **Runtime Test Coverage**: Browser-executed UI contract tests via Portfolio host route `/internal/indium/tests`.

## Screenshots
Work in progress...

## Getting Started
```bash
npm install
npm run check
npm run build
dotnet build Indium.csproj /v:minimal
```

## API
- `bootIndium()` (full-shell bootstrap + layout/sidebar/branding contracts)
- `createNavbarController()`
- `createSidebarController()`
- `attachInfiniteScroll()`
- `showAlert()`, `showConfirm()`, `showPrompt()` (dialogs)
- `createGlassSurface()`
- `createGradNoiseCanvas()`
- `routePath()`, `apiPath()`, `assetPath()`, `setIndiumConfig()`
- `setIndiumThemeMode()`, `getIndiumThemeMode()`, `getResolvedIndiumTheme()`

## Build Outputs
- Full bundle:
  - `build/indium.js`
  - `build/indium.css`
- Component JS bundles:
  - `build/components/dialogs.js`
  - `build/components/glassSurface.js`
  - `build/components/infiniteScroll.js`
  - `build/components/sidebar.js`
  - `build/components/gradNoiseCanvas.js`
  - `build/components/navbar.js`
- Component CSS bundles:
  - `build/components/dialogs.css`
  - `build/components/glassSurface.css`
  - `build/components/infiniteScroll.css`
  - `build/components/sidebar.css`
  - `build/components/cards.css`
  - `build/components/navbar.css`
  - `build/components/shell.css`
