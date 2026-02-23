import {
    getIndiumConfig,
    initIndiumConfig,
    setIndiumConfig,
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

export interface BootIndiumOptions extends Partial<IndiumConfig> {
    sidebar?: false | Omit<CreateSidebarControllerOptions, 'appRoot'>;
}

export interface BootIndiumResult {
    config: Readonly<IndiumConfig>;
    appRoot: HTMLElement | null;
    sidebarController: SidebarController | null;
}

const observedPlayerbarRoots = new WeakSet<HTMLElement>();

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

    configureLegacyWindowDialogs(config.exposeLegacyWindowDialogs);

    if (typeof document === 'undefined') {
        return {
            config,
            appRoot: null,
            sidebarController: null
        };
    }

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
    attachInfiniteScroll,
    createGlassSurface,
    createGradNoiseCanvas,
    createSidebarController,
    getIndiumConfig,
    setGradNoiseCanvasFrameCap,
    setIndiumConfig,
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
    PromptOptions,
    SidebarController
};
