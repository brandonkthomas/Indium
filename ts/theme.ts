export type IndiumThemeMode = 'system' | 'light' | 'dark';
export type ResolvedIndiumTheme = 'light' | 'dark';

const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';
const THEME_ATTR = 'data-wa-theme';
const THEME_OWNER_ATTR = 'data-wa-theme-owner';
const THEME_MODE_ATTR = 'data-wa-theme-mode';
const THEME_RESOLVED_ATTR = 'data-wa-theme-resolved';
const INDIUM_OWNER = 'indium';

let activeThemeMode: IndiumThemeMode = 'system';
let mediaQueryList: MediaQueryList | null = null;
let detachMediaListener: (() => void) | null = null;

function isThemeValue(value: string | null): value is ResolvedIndiumTheme {
    return value === 'light' || value === 'dark';
}

function getManualClassTheme(root: HTMLElement): ResolvedIndiumTheme | null {
    if (root.classList.contains('wa-theme-light')) return 'light';
    if (root.classList.contains('wa-theme-dark')) return 'dark';
    return null;
}

function getManualAttributeTheme(root: HTMLElement): ResolvedIndiumTheme | null {
    const value = root.getAttribute(THEME_ATTR);
    if (!isThemeValue(value)) return null;

    // If Indium owns this attribute, it's not a host/manual override.
    const owner = root.getAttribute(THEME_OWNER_ATTR);
    if (owner === INDIUM_OWNER) return null;

    return value;
}

function getExternalForcedTheme(root: HTMLElement): ResolvedIndiumTheme | null {
    return getManualClassTheme(root) || getManualAttributeTheme(root);
}

function teardownMediaListener() {
    if (detachMediaListener) {
        detachMediaListener();
        detachMediaListener = null;
    }
    mediaQueryList = null;
}

function applyResolvedThemeMarker(root: HTMLElement) {
    const resolved = getResolvedIndiumTheme(root);
    root.setAttribute(THEME_RESOLVED_ATTR, resolved);
}

function ensureMediaListener() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    if (detachMediaListener) return;

    mediaQueryList = window.matchMedia(SYSTEM_THEME_QUERY);

    const handleChange = () => {
        if (activeThemeMode !== 'system') return;
        if (typeof document === 'undefined') return;
        applyResolvedThemeMarker(document.documentElement);
    };

    if (typeof mediaQueryList.addEventListener === 'function') {
        mediaQueryList.addEventListener('change', handleChange);
        detachMediaListener = () => {
            mediaQueryList?.removeEventListener('change', handleChange);
        };
        return;
    }

    mediaQueryList.addListener(handleChange);
    detachMediaListener = () => {
        mediaQueryList?.removeListener(handleChange);
    };
}

export function getIndiumThemeModeValue(): IndiumThemeMode {
    return activeThemeMode;
}

export function setIndiumThemeModeValue(mode: IndiumThemeMode): IndiumThemeMode {
    activeThemeMode = mode;
    return activeThemeMode;
}

export function resolveSystemTheme(): ResolvedIndiumTheme {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return 'dark';
    }

    try {
        return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
    } catch {
        return 'dark';
    }
}

export function getResolvedIndiumTheme(root?: HTMLElement): ResolvedIndiumTheme {
    const targetRoot = root || (typeof document !== 'undefined' ? document.documentElement : null);

    if (!targetRoot) {
        return activeThemeMode === 'light' || activeThemeMode === 'dark'
            ? activeThemeMode
            : 'dark';
    }

    const forcedTheme = getExternalForcedTheme(targetRoot);
    if (forcedTheme) return forcedTheme;

    if (activeThemeMode === 'light' || activeThemeMode === 'dark') {
        return activeThemeMode;
    }

    return resolveSystemTheme();
}

export function applyThemeMode(mode: IndiumThemeMode): ResolvedIndiumTheme {
    activeThemeMode = mode;

    if (typeof document === 'undefined') {
        return getResolvedIndiumTheme();
    }

    const root = document.documentElement;
    root.setAttribute(THEME_MODE_ATTR, mode);

    if (mode === 'light' || mode === 'dark') {
        const externalForcedTheme = getExternalForcedTheme(root);

        if (externalForcedTheme) {
            if (root.getAttribute(THEME_OWNER_ATTR) === INDIUM_OWNER) {
                root.removeAttribute(THEME_ATTR);
                root.removeAttribute(THEME_OWNER_ATTR);
            }
        } else {
            root.setAttribute(THEME_ATTR, mode);
            root.setAttribute(THEME_OWNER_ATTR, INDIUM_OWNER);
        }
    } else {
        // In system mode, clear only attributes that Indium itself applied.
        if (root.getAttribute(THEME_OWNER_ATTR) === INDIUM_OWNER) {
            root.removeAttribute(THEME_ATTR);
            root.removeAttribute(THEME_OWNER_ATTR);
        }
    }

    if (mode === 'system') ensureMediaListener();
    else teardownMediaListener();

    applyResolvedThemeMarker(root);
    return getResolvedIndiumTheme(root);
}
