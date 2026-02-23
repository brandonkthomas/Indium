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
