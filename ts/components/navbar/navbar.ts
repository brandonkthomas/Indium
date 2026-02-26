import {
    createGlassSurface,
    type GlassSurfaceInstance,
    type GlassSurfaceOptions
} from '../glassSurface';
import {
    logEvent,
    type LogData,
    type LogLevel
} from '../../internal/logging';

export interface NavbarItem {
    id: string;
    label: string;
    href: string;
    iconSrc?: string;
    iconAlt?: string;
    mobileLabel?: string;
    mobileIconSrc?: string;
    external?: boolean;
    target?: string;
    rel?: string;
    ariaLabel?: string;
    className?: string;
}

export interface NavbarNavigateContext {
    item: NavbarItem;
    itemId: string;
    event: MouseEvent;
    source: 'desktop' | 'mobile';
    controller: NavbarController;
}

export interface NavbarSelectors {
    root: string;
    glassWrapper: string;
    content: string;
    brand: string;
    burger: string;
    desktopNav: string;
    mobileNav: string;
    navLink: string;
}

export interface NavbarControllerOptions {
    root?: HTMLElement | null;
    selectors?: Partial<NavbarSelectors>;
    enableGlass?: boolean;
    glassOptions?: GlassSurfaceOptions;
    mobileBreakpoint?: number;
    openClass?: string;
    legacyOpenClass?: string;
    onNavigate?: (context: NavbarNavigateContext) => 'prevent' | void;
}

export interface NavbarController {
    readonly root: HTMLElement;
    readonly readyPromise: Promise<void>;
    open(): void;
    close(): void;
    toggle(): void;
    setItems(items: NavbarItem[]): void;
    setActive(itemId: string | null): void;
    destroy(): void;
}

const defaultSelectors: NavbarSelectors = {
    root: '.wa-navbar, .url-display',
    glassWrapper: '.wa-navbar__surface-wrap, .glass-surface-wrapper',
    content: '.wa-navbar__content, .url-display-content',
    brand: '.wa-navbar__brand, .url-text',
    burger: '.wa-navbar__burger, .burger-menu',
    desktopNav: '.wa-navbar__links--desktop, .url-nav-links.desktop',
    mobileNav: '.wa-navbar__links--mobile, .url-nav-links.mobile',
    navLink: 'a[data-wa-nav-id], a[data-nav-link], a.wa-navbar__link, a.url-link'
};

const defaultGlassOptions: GlassSurfaceOptions = {
    width: 'auto',
    height: 'auto',
    borderRadius: 24,
    borderWidth: 0.07,
    brightness: 50,
    opacity: 0.93,
    blur: 50,
    displace: 0,
    backgroundOpacity: 0.12,
    saturation: 0.8,
    distortionScale: -15,
    redOffset: 8,
    greenOffset: 8,
    blueOffset: 8,
    xChannel: 'R',
    yChannel: 'G',
    mixBlendMode: 'difference',
    className: 'wa-navbar__surface url-display-glass',
    style: {
        minHeight: '48px',
        transition: 'height 0.3s ease'
    }
};

function query(root: ParentNode, selector: string): HTMLElement | null {
    const el = root.querySelector(selector);
    return el instanceof HTMLElement ? el : null;
}

function normalizeRel(rel: string | undefined, external: boolean): string | undefined {
    if (!external) return rel;
    if (!rel) return 'noopener noreferrer';
    const next = new Set(rel.split(/\s+/).filter(Boolean));
    next.add('noopener');
    next.add('noreferrer');
    return Array.from(next).join(' ');
}

class NavbarControllerImpl implements NavbarController {
    readonly root: HTMLElement;
    readonly readyPromise: Promise<void>;

    private readonly selectors: NavbarSelectors;
    private readonly mobileBreakpoint: number;
    private readonly openClass: string;
    private readonly legacyOpenClass: string;
    private readonly onNavigate?: (context: NavbarNavigateContext) => 'prevent' | void;

    private glassSurface: GlassSurfaceInstance | null = null;
    private brandEl: HTMLElement | null = null;
    private burgerEl: HTMLElement | null = null;
    private desktopNavEl: HTMLElement | null = null;
    private mobileNavEl: HTMLElement | null = null;
    private isMenuOpen = false;
    private unbind: Array<() => void> = [];
    private _resolveReady: (() => void) | null = null;
    private itemLookup = new Map<string, NavbarItem>();

    constructor(options: NavbarControllerOptions) {
        const selectors = { ...defaultSelectors, ...(options.selectors || {}) };
        const root = options.root ?? query(document, selectors.root);
        if (!root) {
            throw new Error(`Indium navbar root not found for selector: ${selectors.root}`);
        }

        this.root = root;
        this.selectors = selectors;
        this.mobileBreakpoint = options.mobileBreakpoint ?? 768;
        this.openClass = options.openClass || 'wa-navbar--open';
        this.legacyOpenClass = options.legacyOpenClass || 'menu-open';
        this.onNavigate = options.onNavigate;
        this.readyPromise = new Promise((resolve) => {
            this._resolveReady = resolve;
        });

        this.setup(options);
    }

    private log(event: string, data?: LogData, note?: string, level: LogLevel = 'info') {
        logEvent('navbar', event, data, note, level);
    }

    private setup(options: NavbarControllerOptions) {
        this.brandEl = query(this.root, this.selectors.brand);
        this.burgerEl = query(this.root, this.selectors.burger);
        this.desktopNavEl = query(this.root, this.selectors.desktopNav);
        this.mobileNavEl = query(this.root, this.selectors.mobileNav);

        if (options.enableGlass !== false) {
            const glassWrapper = query(this.root, this.selectors.glassWrapper);
            const content = query(glassWrapper || this.root, this.selectors.content);
            if (glassWrapper && content) {
                const glassOptions = {
                    ...defaultGlassOptions,
                    ...(options.glassOptions || {})
                };
                this.glassSurface = createGlassSurface(glassOptions);
                this.glassSurface.contentElement.appendChild(content);
                glassWrapper.replaceWith(this.glassSurface.element);
            }
        }

        this.bindEvents();
        this.scanCurrentItems();
        this.close();
        this.resolveReady();
        this.log('Ready');
    }

    private resolveReady() {
        if (!this._resolveReady) return;
        this._resolveReady();
        this._resolveReady = null;
    }

    private scanCurrentItems() {
        this.itemLookup.clear();
        this.root.querySelectorAll<HTMLAnchorElement>(this.selectors.navLink).forEach((link) => {
            const id = this.readLinkId(link);
            const labelText = link.textContent?.trim() || id || link.getAttribute('href') || '';
            const icon = link.querySelector('img');
            const item: NavbarItem = {
                id: id || labelText.toLowerCase(),
                label: labelText,
                href: link.getAttribute('href') || '#',
                iconSrc: icon?.getAttribute('src') || undefined,
                iconAlt: icon?.getAttribute('alt') || undefined,
                ariaLabel: link.getAttribute('aria-label') || undefined,
                external: link.classList.contains('wa-navbar__link--external')
                    || link.classList.contains('url-link-external')
            };
            this.itemLookup.set(item.id, item);
        });
    }

    private readLinkId(link: HTMLAnchorElement): string {
        return link.getAttribute('data-wa-nav-id')
            || link.getAttribute('data-nav-link')
            || '';
    }

    private isMobileViewport(): boolean {
        return window.innerWidth <= this.mobileBreakpoint;
    }

    private bindEvents() {
        const onRootClick = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;

            const link = target.closest('a') as HTMLAnchorElement | null;
            if (link && this.root.contains(link) && link.matches(this.selectors.navLink)) {
                const source = this.mobileNavEl?.contains(link) ? 'mobile' : 'desktop';
                const itemId = this.readLinkId(link);
                const existing = this.itemLookup.get(itemId);
                const fallback: NavbarItem = {
                    id: itemId || link.textContent?.trim() || '',
                    label: link.textContent?.trim() || '',
                    href: link.getAttribute('href') || '#',
                    iconSrc: link.querySelector('img')?.getAttribute('src') || undefined,
                    ariaLabel: link.getAttribute('aria-label') || undefined,
                    external: link.classList.contains('wa-navbar__link--external')
                        || link.classList.contains('url-link-external')
                };
                const item = existing || fallback;
                const decision = this.onNavigate?.({
                    item,
                    itemId: item.id,
                    event,
                    source,
                    controller: this
                });
                if (decision === 'prevent') {
                    event.preventDefault();
                }
                if (source === 'mobile' && this.isMenuOpen) {
                    this.close();
                }
                return;
            }

            if (!this.isMobileViewport()) return;

            // Legacy behavior: on mobile, the full bar toggles unless the user clicked a link.
            const shouldToggle = !!(
                target.closest(this.selectors.burger)
                || target.closest('.glass-surface')
                || target.closest('.wa-navbar__surface')
                || target.closest('.wa-navbar__main')
                || target.closest('.url-display-main')
            );

            if (!shouldToggle) return;

            event.preventDefault();
            event.stopPropagation();
            this.toggle();
        };

        this.root.addEventListener('click', onRootClick);
        this.unbind.push(() => this.root.removeEventListener('click', onRootClick));

        const onDocumentClick = (event: MouseEvent) => {
            if (!this.isMenuOpen) return;
            const target = event.target instanceof Node ? event.target : null;
            if (!target) return;
            if (!this.root.contains(target)) {
                this.close();
            }
        };
        document.addEventListener('click', onDocumentClick);
        this.unbind.push(() => document.removeEventListener('click', onDocumentClick));

        const onResize = () => {
            if (!this.isMobileViewport() && this.isMenuOpen) {
                this.close();
            }
        };
        window.addEventListener('resize', onResize, { passive: true });
        this.unbind.push(() => window.removeEventListener('resize', onResize));
    }

    open() {
        this.isMenuOpen = true;
        this.root.classList.add(this.openClass);
        this.root.classList.add(this.legacyOpenClass);
        if (this.burgerEl) {
            this.burgerEl.setAttribute('aria-expanded', 'true');
        }
    }

    close() {
        this.isMenuOpen = false;
        this.root.classList.remove(this.openClass);
        this.root.classList.remove(this.legacyOpenClass);
        if (this.burgerEl) {
            this.burgerEl.setAttribute('aria-expanded', 'false');
        }
    }

    toggle() {
        if (this.isMenuOpen) this.close();
        else this.open();
    }

    setItems(items: NavbarItem[]) {
        this.itemLookup.clear();
        items.forEach((item) => this.itemLookup.set(item.id, item));

        this.renderNav(this.desktopNavEl, items, false);
        this.renderNav(this.mobileNavEl, items, true);
    }

    private renderNav(container: HTMLElement | null, items: NavbarItem[], mobile: boolean) {
        if (!container) return;
        const existingLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>('a'));
        const existingById = new Map<string, HTMLAnchorElement>();
        existingLinks.forEach((link) => {
            const id = this.readLinkId(link);
            if (id) existingById.set(id, link);
        });

        const nextLinks: HTMLAnchorElement[] = [];
        items.forEach((item) => {
            const existing = existingById.get(item.id);
            if (existing) {
                this.syncItemElement(existing, item, mobile);
                nextLinks.push(existing);
                return;
            }
            nextLinks.push(this.buildItemElement(item, mobile));
        });

        nextLinks.forEach((link) => container.appendChild(link));
        existingLinks.forEach((link) => {
            if (!nextLinks.includes(link)) {
                link.remove();
            }
        });
    }

    private buildItemElement(item: NavbarItem, mobile: boolean): HTMLAnchorElement {
        const link = document.createElement('a');
        this.syncItemElement(link, item, mobile);
        return link;
    }

    private getLinkClassName(item: NavbarItem): string {
        return item.className
            || [
                'wa-navbar__link',
                item.external ? 'wa-navbar__link--external' : '',
                'url-link',
                item.external ? 'url-link-external' : ''
            ].filter(Boolean).join(' ');
    }

    private syncItemElement(link: HTMLAnchorElement, item: NavbarItem, mobile: boolean) {
        link.href = item.href;
        link.className = this.getLinkClassName(item);

        link.setAttribute('data-wa-nav-id', item.id);
        if (!item.className && item.id) {
            link.setAttribute('data-nav-link', item.id);
            link.classList.add(`wa-navbar__link--${item.id}`);
            link.classList.add(`url-link-${item.id}`);
        } else {
            link.removeAttribute('data-nav-link');
        }

        if (item.ariaLabel) link.setAttribute('aria-label', item.ariaLabel);
        else link.removeAttribute('aria-label');

        if (item.external) {
            link.target = item.target || '_blank';
            const rel = normalizeRel(item.rel, true);
            if (rel) link.rel = rel;
            else link.removeAttribute('rel');
        } else if (item.target) {
            link.target = item.target;
            link.removeAttribute('rel');
        } else {
            link.removeAttribute('target');
            link.removeAttribute('rel');
        }

        const iconSrc = mobile ? item.mobileIconSrc || item.iconSrc : item.iconSrc;
        const label = mobile ? item.mobileLabel || item.label : item.label;
        const hasExternalClass = link.classList.contains('wa-navbar__link--external')
            || link.classList.contains('url-link-external');

        let icon = link.querySelector(':scope > img') as HTMLImageElement | null;
        if (iconSrc) {
            if (!(icon instanceof HTMLImageElement)) {
                icon = document.createElement('img');
                link.prepend(icon);
            }
            icon.src = iconSrc;
            icon.alt = item.iconAlt || '';
            icon.width = 20;
            icon.height = 20;
        } else if (icon instanceof HTMLImageElement) {
            icon.remove();
        }

        let span = link.querySelector(':scope > span');
        if (!(span instanceof HTMLSpanElement)) {
            span = document.createElement('span');
            link.appendChild(span);
        }
        span.textContent = label;

        if (item.external || hasExternalClass) {
            const sup = document.createElement('sup');
            sup.className = 'wa-navbar__link-external-sup url-link-external-sup';
            sup.setAttribute('aria-hidden', 'true');
            sup.textContent = '↗';
            span.appendChild(document.createTextNode(' '));
            span.appendChild(sup);
        }
    }

    setActive(itemId: string | null) {
        const links = this.root.querySelectorAll<HTMLAnchorElement>(this.selectors.navLink);
        links.forEach((link) => {
            const active = !!itemId && this.readLinkId(link) === itemId;
            if (active) {
                link.setAttribute('data-wa-active', 'true');
                link.setAttribute('aria-current', 'page');
                link.classList.add('is-active');
            } else {
                link.removeAttribute('data-wa-active');
                link.removeAttribute('aria-current');
                link.classList.remove('is-active');
            }
        });
    }

    destroy() {
        while (this.unbind.length) {
            const dispose = this.unbind.pop();
            try { dispose?.(); } catch { /* no-op */ }
        }
        this.glassSurface?.destroy();
        this.glassSurface = null;
        this.log('Destroyed');
    }
}

export function createNavbarController(options: NavbarControllerOptions = {}): NavbarController {
    return new NavbarControllerImpl(options);
}
