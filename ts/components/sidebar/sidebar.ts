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
    private readonly unbind: Array<() => void> = [];
    private destroyed = false;

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
        if (this.destroyed) return;
        this.appRoot.dataset.waSidebarOpen = 'true';
    }

    /**
     * Closes the sidebar
     */
    close() {
        if (this.destroyed) return;
        delete this.appRoot.dataset.waSidebarOpen;
    }

    /**
     * Toggles open/closed
     */
    toggle() {
        if (this.destroyed) return;
        const isOpen = this.appRoot.dataset.waSidebarOpen === 'true';
        if (isOpen) this.close();
        else this.open();
    }

    /**
     * Removes event handlers and closes the sidebar.
     */
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        delete this.appRoot.dataset.waSidebarOpen;

        while (this.unbind.length) {
            const dispose = this.unbind.pop();
            try { dispose?.(); } catch { /* no-op */ }
        }
    }

    /**
     * Binds click/escape handlers and auto-close on nav click
     */
    private bind() {
        const onOpen = () => this.open();
        const onClose = () => this.close();
        const onOverlayClick = () => this.close();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') this.close();
        };
        const onSidebarClick = (e: MouseEvent) => {
            const t = e.target as Element | null;
            if (t?.closest('[data-wa-nav]')) {
                this.close();
            }
        };

        this.openBtn?.addEventListener('click', onOpen);
        if (this.openBtn) {
            this.unbind.push(() => this.openBtn?.removeEventListener('click', onOpen));
        }

        this.closeBtn?.addEventListener('click', onClose);
        if (this.closeBtn) {
            this.unbind.push(() => this.closeBtn?.removeEventListener('click', onClose));
        }

        this.overlay.addEventListener('click', onOverlayClick);
        this.unbind.push(() => this.overlay.removeEventListener('click', onOverlayClick));

        document.addEventListener('keydown', onKeyDown);
        this.unbind.push(() => document.removeEventListener('keydown', onKeyDown));

        // Close after selecting a nav item (mobile slide-over convenience)
        this.sidebar.addEventListener('click', onSidebarClick);
        this.unbind.push(() => this.sidebar.removeEventListener('click', onSidebarClick));
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
