export type LogLevel = 'info' | 'warn' | 'error';
export type LogData = Record<string, string | number | boolean | null | undefined>;

export type IndiumLogger = (
    component: string,
    event: string,
    data?: LogData,
    note?: string,
    level?: LogLevel
) => void;

let loggerImpl: IndiumLogger | null = null;

export function setIndiumLogger(logger?: IndiumLogger | null) {
    loggerImpl = logger ?? null;
}

export function logEvent(
    component: string,
    event: string,
    data?: LogData | null,
    note?: string,
    level: LogLevel = 'info'
) {
    if (loggerImpl) {
        loggerImpl(component, event, data ?? undefined, note, level);
        return;
    }

    const logger =
        level === 'error' ? console.error :
        level === 'warn' ? console.warn :
        console.log;

    const fieldSegment = data
        ? Object.entries(data)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${key}=${value === null ? 'null' : String(value)}`)
            .join(' ')
        : '';

    const noteSegment = note ? ` (${note})` : '';
    const message =
        fieldSegment
            ? `[${component}] ${event} - ${fieldSegment}${noteSegment}`
            : `[${component}] ${event}${noteSegment}`;

    logger(message);
}

/**
 * Check if browser supports SVG filters with backdrop-filter.
 */
export function supportsSVGFilters(filterId: string): boolean {
    const ua: string = navigator.userAgent || '';
    const isIOS: boolean = /iP(hone|ad|od)/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isFirefox: boolean = /Firefox/i.test(ua);
    const isWebkit: boolean = /Safari/.test(ua) && !/Chrome/.test(ua);

    if (isIOS || isWebkit || isFirefox) {
        return false;
    }

    const hasBackdrop: boolean = !!(
        window.CSS &&
        (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))
    );

    if (!hasBackdrop) {
        return false;
    }

    const div: HTMLDivElement = document.createElement('div');
    div.style.backdropFilter = `url(#${filterId})`;
    return div.style.backdropFilter !== '';
}
