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

const GLOBAL_CONFIG_KEY = '__indium_config_state_v1__';

interface IndiumConfigState {
    config: IndiumConfig;
}

function getConfigState(): IndiumConfigState {
    const host = globalThis as Record<string, unknown>;
    const existing = host[GLOBAL_CONFIG_KEY];
    if (existing && typeof existing === 'object' && 'config' in (existing as Record<string, unknown>)) {
        return existing as IndiumConfigState;
    }

    const created: IndiumConfigState = { config: { ...defaults } };
    host[GLOBAL_CONFIG_KEY] = created;
    return created;
}

function readConfig(): IndiumConfig {
    return getConfigState().config;
}

function writeConfig(next: IndiumConfig): IndiumConfig {
    getConfigState().config = next;
    return next;
}

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
    return readConfig();
}

export function setIndiumConfig(partial?: Partial<IndiumConfig>): Readonly<IndiumConfig> {
    if (!partial) return readConfig();
    const config = writeConfig(applyNormalization({ ...readConfig(), ...partial }));
    if (partial.logger) {
        setIndiumLogger(partial.logger);
    }
    return config;
}

export function getRouteRoot(): string {
    return readConfig().routeRoot;
}

export function getApiBasePath(): string {
    return readConfig().apiBasePath;
}

export function getAssetBasePath(): string {
    return readConfig().assetBasePath;
}

export function routePath(path: string): string {
    return joinPath(readConfig().routeRoot, path);
}

export function apiPath(path: string): string {
    return joinPath(readConfig().apiBasePath, path);
}

export function assetPath(path: string): string {
    return joinPath(readConfig().assetBasePath, path);
}

export function initIndiumConfig(partial?: Partial<IndiumConfig>): Readonly<IndiumConfig> {
    const config = writeConfig(applyNormalization({ ...defaults, ...partial }));
    if (config.logger) {
        setIndiumLogger(config.logger);
    }
    return config;
}
