/**
 * Sidebar wiring options
 */
export interface SidebarControllerOptions {
    appRoot: HTMLElement;
    sidebar: HTMLElement;
    overlay: HTMLElement;
    openBtn: HTMLElement | null;
    closeBtn: HTMLElement | null;
}

/**
 * Optional selector-based factory options for auto-wiring the sidebar.
 */
export interface CreateSidebarControllerOptions {
    appRoot?: HTMLElement | null;
    sidebar?: HTMLElement | null;
    overlay?: HTMLElement | null;
    openBtn?: HTMLElement | null;
    closeBtn?: HTMLElement | null;
    appRootSelector?: string;
    sidebarSelector?: string;
    overlaySelector?: string;
    openBtnSelector?: string;
    closeBtnSelector?: string;
}

/**
 * Controls mobile-style sidebar open/close via `data-wa-sidebar-open`
 */
export class SidebarController {
    private readonly appRoot: HTMLElement;
    private readonly sidebar: HTMLElement;
    private readonly overlay: HTMLElement;
    private readonly openBtn: HTMLElement | null;
    private readonly closeBtn: HTMLElement | null;

    constructor(opts: SidebarControllerOptions) {
        this.appRoot = opts.appRoot;
        this.sidebar = opts.sidebar;
        this.overlay = opts.overlay;
        this.openBtn = opts.openBtn;
        this.closeBtn = opts.closeBtn;

        this.bind();
    }

    /**
     * Opens the sidebar
     */
    open() {
        this.appRoot.dataset.waSidebarOpen = 'true';
    }

    /**
     * Closes the sidebar
     */
    close() {
        delete this.appRoot.dataset.waSidebarOpen;
    }

    /**
     * Toggles open/closed
     */
    toggle() {
        const isOpen = this.appRoot.dataset.waSidebarOpen === 'true';
        if (isOpen) this.close();
        else this.open();
    }

    /**
     * Binds click/escape handlers and auto-close on nav click
     */
    private bind() {
        this.openBtn?.addEventListener('click', () => this.open());
        this.closeBtn?.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        // Close after selecting a nav item (mobile slide-over convenience)
        this.sidebar.addEventListener('click', (e) => {
            const t = e.target as Element | null;
            if (t?.closest('[data-wa-nav]')) {
                this.close();
            }
        });
    }
}

function querySelector(root: ParentNode, selector: string): HTMLElement | null {
    const el = root.querySelector(selector);
    return el instanceof HTMLElement ? el : null;
}

/**
 * Convenience factory for hosts using the standard `data-wa-*` contract.
 * Returns null when required elements are not present.
 */
export function createSidebarController(
    options: CreateSidebarControllerOptions = {}
): SidebarController | null {
    if (typeof document === 'undefined') return null;

    const appRoot =
        options.appRoot ??
        querySelector(document, options.appRootSelector || '[data-wa-app]');
    if (!appRoot) return null;

    const sidebar =
        options.sidebar ??
        querySelector(appRoot, options.sidebarSelector || '[data-wa-sidebar]') ??
        querySelector(document, options.sidebarSelector || '[data-wa-sidebar]');

    const overlay =
        options.overlay ??
        querySelector(appRoot, options.overlaySelector || '[data-wa-sidebar-overlay]') ??
        querySelector(document, options.overlaySelector || '[data-wa-sidebar-overlay]');

    if (!sidebar || !overlay) return null;

    const openBtn =
        options.openBtn ??
        querySelector(appRoot, options.openBtnSelector || '[data-wa-sidebar-toggle]') ??
        querySelector(document, options.openBtnSelector || '[data-wa-sidebar-toggle]');

    const closeBtn =
        options.closeBtn ??
        querySelector(sidebar, options.closeBtnSelector || '[data-wa-sidebar-close]') ??
        querySelector(document, options.closeBtnSelector || '[data-wa-sidebar-close]');

    return new SidebarController({
        appRoot,
        sidebar,
        overlay,
        openBtn,
        closeBtn
    });
}
