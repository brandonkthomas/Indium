import { setIndiumLogger } from './internal/logging';
import type { IndiumLogger } from './internal/logging';

declare const __INDIUM_APP_VERSION__: string;

export interface IndiumConfig {
    routeRoot: string;
    apiBasePath: string;
    assetBasePath: string;
    appRootSelector: string;
    brandLogoSrc?: string;
    brandLogoAlt: string;
    logger?: IndiumLogger;
    version: string;
    exposeLegacyWindowDialogs: boolean;
}

const defaults: IndiumConfig = {
    routeRoot: '/webamp',
    apiBasePath: '/api/webamp',
    assetBasePath: '/apps/indium',
    appRootSelector: '[data-wa-app]',
    brandLogoSrc: '',
    brandLogoAlt: 'Brand logo',
    version:
        typeof __INDIUM_APP_VERSION__ === 'string' && __INDIUM_APP_VERSION__.trim().length
            ? __INDIUM_APP_VERSION__.trim()
            : 'dev',
    exposeLegacyWindowDialogs: false
};

let config: IndiumConfig = { ...defaults };

function normalizeRoot(path: string): string {
    const raw = (path || '/').trim();
    if (!raw) return '/';
    const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
    if (withSlash.length > 1 && withSlash.endsWith('/')) {
        return withSlash.slice(0, -1);
    }
    return withSlash;
}

function joinPath(base: string, path: string): string {
    const b = normalizeRoot(base);
    const p = (path || '').trim();
    if (!p) return b;
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    if (p === '/') return b;
    if (p.startsWith('/')) return b === '/' ? p : `${b}${p}`;
    return b === '/' ? `/${p}` : `${b}/${p}`;
}

function applyNormalization(next: IndiumConfig): IndiumConfig {
    const normalizedBrandLogoAlt = (next.brandLogoAlt || defaults.brandLogoAlt).trim();

    return {
        ...next,
        routeRoot: normalizeRoot(next.routeRoot),
        apiBasePath: normalizeRoot(next.apiBasePath),
        assetBasePath: normalizeRoot(next.assetBasePath),
        appRootSelector: next.appRootSelector || defaults.appRootSelector,
        brandLogoSrc: (next.brandLogoSrc || '').trim(),
        brandLogoAlt: normalizedBrandLogoAlt || defaults.brandLogoAlt,
        version: next.version || defaults.version,
        exposeLegacyWindowDialogs: !!next.exposeLegacyWindowDialogs
    };
}

export function getIndiumConfig(): Readonly<IndiumConfig> {
    return config;
}

export function setIndiumConfig(partial?: Partial<IndiumConfig>): Readonly<IndiumConfig> {
    if (!partial) return config;
    config = applyNormalization({ ...config, ...partial });
    if (partial.logger) {
        setIndiumLogger(partial.logger);
    }
    return config;
}

export function getRouteRoot(): string {
    return config.routeRoot;
}

export function getApiBasePath(): string {
    return config.apiBasePath;
}

export function getAssetBasePath(): string {
    return config.assetBasePath;
}

export function routePath(path: string): string {
    return joinPath(config.routeRoot, path);
}

export function apiPath(path: string): string {
    return joinPath(config.apiBasePath, path);
}

export function assetPath(path: string): string {
    return joinPath(config.assetBasePath, path);
}

export function initIndiumConfig(partial?: Partial<IndiumConfig>): Readonly<IndiumConfig> {
    config = applyNormalization({ ...defaults, ...partial });
    if (config.logger) {
        setIndiumLogger(config.logger);
    }
    return config;
}
