import {
    apiPath,
    assetPath,
    getIndiumConfig,
    initIndiumConfig,
    routePath,
    setIndiumConfig as setIndiumConfigInternal,
    type IndiumConfig
} from './config';
import { setIndiumLogger, type IndiumLogger } from './internal/logging';
import {
    createSidebarController,
    type CreateSidebarControllerOptions,
    type SidebarController
} from './components/sidebar/sidebar';
import {
    showAlert,
    showConfirm,
    showPrompt,
    configureLegacyWindowDialogs,
    type AlertOptions,
    type ConfirmOptions,
    type PromptOptions
} from './components/dialogs';
import {
    createGlassSurface,
    type GlassSurfaceInstance,
    type GlassSurfaceOptions
} from './components/glassSurface';
import {
    attachInfiniteScroll,
    type InfiniteScrollController
} from './ui/infiniteScroll';
import {
    createGradNoiseCanvas,
    setGradNoiseCanvasFrameCap
} from './components/gradNoiseCanvas';
import {
    createNavbarController,
    type NavbarController,
    type NavbarControllerOptions,
    type NavbarItem,
    type NavbarNavigateContext,
    type NavbarSelectors
} from './components/navbar/navbar';
import {
    applyThemeMode,
    getResolvedIndiumTheme as getResolvedIndiumThemeInternal,
    setIndiumThemeModeValue,
    type IndiumThemeMode,
    type ResolvedIndiumTheme
} from './theme';

export interface BootIndiumOptions extends Partial<IndiumConfig> {
    sidebar?: false | Omit<CreateSidebarControllerOptions, 'appRoot'>;
}

export interface BootIndiumResult {
    config: Readonly<IndiumConfig>;
    appRoot: HTMLElement | null;
    sidebarController: SidebarController | null;
}

const observedPlayerbarRoots = new WeakSet<HTMLElement>();

export function setIndiumConfig(partial?: Partial<IndiumConfig>): Readonly<IndiumConfig> {
    const config = setIndiumConfigInternal(partial);

    if (partial && partial.themeMode !== undefined) {
        setIndiumThemeModeValue(config.themeMode);
        if (typeof document !== 'undefined') {
            applyThemeMode(config.themeMode);
        }
    }

    return config;
}

export function setIndiumThemeMode(mode: IndiumThemeMode): Readonly<IndiumConfig> {
    const config = setIndiumConfigInternal({ themeMode: mode });
    setIndiumThemeModeValue(config.themeMode);

    if (typeof document !== 'undefined') {
        applyThemeMode(config.themeMode);
    }

    return config;
}

export function getIndiumThemeMode(): IndiumThemeMode {
    return getIndiumConfig().themeMode;
}

export function getResolvedIndiumTheme(): ResolvedIndiumTheme {
    return getResolvedIndiumThemeInternal();
}

function applyBranding(appRoot: HTMLElement, config: Readonly<IndiumConfig>) {
    const logoSrc = (config.brandLogoSrc || '').trim();
    const logoAlt = (config.brandLogoAlt || 'Brand logo').trim();

    const marks = appRoot.querySelectorAll<HTMLElement>('[data-wa-brand-mark]');
    const logos = appRoot.querySelectorAll<HTMLImageElement>('[data-wa-brand-logo]');

    marks.forEach((mark) => {
        if (logoSrc) mark.removeAttribute('hidden');
        else mark.setAttribute('hidden', 'true');
    });

    logos.forEach((logo) => {
        if (logoSrc) {
            logo.src = logoSrc;
            logo.alt = logoAlt;
            logo.removeAttribute('hidden');
        } else {
            logo.removeAttribute('src');
            logo.alt = '';
            logo.setAttribute('hidden', 'true');
        }
    });
}

function computePlayerbarOffsetPx(appRoot: HTMLElement): number {
    const playerbar =
        appRoot.querySelector<HTMLElement>('.wa-playerbar')
        || document.querySelector<HTMLElement>('.wa-playerbar');

    if (!playerbar) return 0;

    const style = getComputedStyle(playerbar);
    if (style.display === 'none' || style.visibility === 'hidden') return 0;

    const rect = playerbar.getBoundingClientRect();
    if (rect.height <= 0) return 0;

    // Reserve from the top of the fixed player bar to the viewport bottom,
    // so layout works with/without bottom gaps and safe-area insets.
    return Math.max(0, Math.ceil(window.innerHeight - rect.top));
}

function syncPlayerbarOffset(appRoot: HTMLElement) {
    const offset = computePlayerbarOffsetPx(appRoot);
    appRoot.style.setProperty('--wa-playerbar-offset', `${offset}px`);
}

function ensurePlayerbarOffsetObserver(appRoot: HTMLElement) {
    syncPlayerbarOffset(appRoot);
    if (observedPlayerbarRoots.has(appRoot)) return;

    observedPlayerbarRoots.add(appRoot);

    const onResize = () => syncPlayerbarOffset(appRoot);
    window.addEventListener('resize', onResize, { passive: true });

    const observer = new MutationObserver(() => syncPlayerbarOffset(appRoot));
    const observeRoot = document.body || appRoot;
    observer.observe(observeRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden']
    });

    requestAnimationFrame(() => syncPlayerbarOffset(appRoot));
    setTimeout(() => syncPlayerbarOffset(appRoot), 250);
}

/**
 * Initializes Indium config and optional host wiring.
 * This is intentionally light: app-specific view/player boot remains in consumers.
 */
export function bootIndium(options: BootIndiumOptions = {}): BootIndiumResult {
    const { sidebar, ...configOptions } = options;
    const config = initIndiumConfig(configOptions);
    setIndiumThemeModeValue(config.themeMode);

    configureLegacyWindowDialogs(config.exposeLegacyWindowDialogs);

    if (typeof document === 'undefined') {
        return {
            config,
            appRoot: null,
            sidebarController: null
        };
    }

    applyThemeMode(config.themeMode);

    const appRoot = document.querySelector<HTMLElement>(config.appRootSelector);
    if (appRoot) {
        applyBranding(appRoot, config);
        ensurePlayerbarOffsetObserver(appRoot);
    }

    const sidebarController =
        appRoot && sidebar !== false
            ? createSidebarController({ appRoot, ...(sidebar || {}) })
            : null;

    return {
        config,
        appRoot,
        sidebarController
    };
}

export {
    apiPath,
    attachInfiniteScroll,
    assetPath,
    createGlassSurface,
    createGradNoiseCanvas,
    createNavbarController,
    createSidebarController,
    getIndiumConfig,
    routePath,
    setGradNoiseCanvasFrameCap,
    setIndiumLogger,
    showAlert,
    showConfirm,
    showPrompt
};

export type {
    AlertOptions,
    ConfirmOptions,
    CreateSidebarControllerOptions,
    GlassSurfaceInstance,
    GlassSurfaceOptions,
    IndiumConfig,
    IndiumLogger,
    InfiniteScrollController,
    NavbarController,
    NavbarControllerOptions,
    NavbarItem,
    NavbarNavigateContext,
    NavbarSelectors,
    IndiumThemeMode,
    ResolvedIndiumTheme,
    PromptOptions,
    SidebarController
};
