// ts/internal/logging.ts
var loggerImpl = null;
function logEvent(component, event, data, note, level = "info") {
  if (loggerImpl) {
    loggerImpl(component, event, data ?? void 0, note, level);
    return;
  }
  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  const fieldSegment = data ? Object.entries(data).filter(([, value]) => value !== void 0).map(([key, value]) => `${key}=${value === null ? "null" : String(value)}`).join(" ") : "";
  const noteSegment = note ? ` (${note})` : "";
  const message = fieldSegment ? `[${component}] ${event} - ${fieldSegment}${noteSegment}` : `[${component}] ${event}${noteSegment}`;
  logger(message);
}

// ts/config.ts
var defaults = {
  routeRoot: "/webamp",
  apiBasePath: "/api/webamp",
  assetBasePath: "/apps/indium",
  appRootSelector: "[data-wa-app]",
  brandLogoSrc: "",
  brandLogoAlt: "Brand logo",
  version: "dev".trim().length ? "dev".trim() : "dev",
  exposeLegacyWindowDialogs: false
};
var config = { ...defaults };
function normalizeRoot(path) {
  const raw = (path || "/").trim();
  if (!raw) return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) {
    return withSlash.slice(0, -1);
  }
  return withSlash;
}
function joinPath(base, path) {
  const b = normalizeRoot(base);
  const p = (path || "").trim();
  if (!p) return b;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p === "/") return b;
  if (p.startsWith("/")) return b === "/" ? p : `${b}${p}`;
  return b === "/" ? `/${p}` : `${b}/${p}`;
}
function assetPath(path) {
  return joinPath(config.assetBasePath, path);
}

// ts/ui/infiniteScroll.ts
function isDebugScrollEnabled() {
  try {
    const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (qs?.get("waDebugScroll") === "1") return true;
  } catch {
  }
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("waDebugScroll") === "1";
  } catch {
    return false;
  }
}
function debugLog(enabled, list, event, data) {
  if (!enabled) return;
  try {
    const payload = data ? JSON.parse(JSON.stringify(data)) : void 0;
    console.log(`[indium:scroll] ${list} :: ${event}`, payload ?? "");
  } catch {
    console.log(`[indium:scroll] ${list} :: ${event}`, data ?? "");
  }
}
function getListLabel(el) {
  return el.getAttribute("aria-label") || el.getAttribute("data-wa-view") || el.getAttribute("data-wa-list") || el.className || "list";
}
function findScrollParent(el) {
  let cur = el.parentElement;
  while (cur) {
    const style = getComputedStyle(cur);
    const overflow = `${style.overflow} ${style.overflowY} ${style.overflowX}`;
    if (/(auto|scroll|overlay)/.test(overflow)) return cur;
    cur = cur.parentElement;
  }
  return null;
}
function normalizeRoot2(root) {
  if (!root) return null;
  try {
    if (root === document.body || root === document.documentElement) return null;
  } catch {
  }
  return root;
}
function parseRootMarginBottomPx(rootMargin) {
  const parts = rootMargin.trim().split(/\s+/).filter(Boolean);
  const getPx = (s) => {
    if (!s) return 0;
    const m = s.match(/^(-?\d+(?:\.\d+)?)px$/);
    return m ? Number(m[1]) : 0;
  };
  if (parts.length === 1) return getPx(parts[0]);
  if (parts.length === 2) return getPx(parts[0]);
  if (parts.length === 3) return getPx(parts[2]);
  if (parts.length >= 4) return getPx(parts[2]);
  return 0;
}
function pickRoot(listEl, explicitRoot) {
  if (explicitRoot !== void 0) return normalizeRoot2(explicitRoot);
  try {
    const isDesktop = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 821px)").matches;
    if (!isDesktop) return null;
    const waContent = document.querySelector(".wa-content");
    if (waContent && waContent.contains(listEl)) return waContent;
  } catch {
  }
  return normalizeRoot2(findScrollParent(listEl));
}
function attachInfiniteScroll(opts) {
  const debug = isDebugScrollEnabled();
  const sentinel = document.createElement("div");
  sentinel.className = "wa-infinite-sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  opts.listEl.insertAdjacentElement("afterend", sentinel);
  const listLabel = getListLabel(opts.listEl);
  debugLog(debug, listLabel, "attach", {
    listTag: opts.listEl.tagName,
    listClass: opts.listEl.className,
    listId: opts.listEl.id || null,
    listParent: opts.listEl.parentElement?.className ?? null,
    sentinelParent: sentinel.parentElement?.className ?? null
  });
  const render = () => {
    const state = { hasMore: opts.hasMore(), isLoading: opts.isLoading() };
    if (opts.renderSentinel) {
      opts.renderSentinel(sentinel, state);
      return;
    }
    if (state.isLoading) {
      sentinel.style.display = "flex";
      sentinel.style.justifyContent = "center";
      sentinel.style.padding = "0.75rem 0 0.25rem";
      sentinel.style.minHeight = "auto";
      const throbberSrc = opts.throbberSrc?.trim() || assetPath("assets/svg/throbber-ring-indef.svg");
      sentinel.innerHTML = `<img class="wa-throbber" src="${throbberSrc}" alt="" />`;
    } else {
      sentinel.style.display = "block";
      sentinel.style.minHeight = "1px";
      sentinel.style.padding = "0";
      sentinel.innerHTML = "";
    }
  };
  render();
  const rootRaw = opts.root !== void 0 ? opts.root : findScrollParent(opts.listEl);
  const root = pickRoot(opts.listEl, opts.root);
  const rootMargin = opts.rootMargin ?? (root ? "200px 0px" : "600px 0px");
  const rootMarginBottomPx = parseRootMarginBottomPx(rootMargin);
  logEvent("Indium", "scroll:init", {
    list: listLabel,
    hasRoot: !!root,
    rootMargin,
    rootTag: root ? root.tagName ?? "?" : null,
    rootId: root ? root.id || null : null,
    rootClass: root ? root.className || null : null,
    // capture what the heuristic initially found (helps debug mobile issues)
    rootRawTag: rootRaw ? rootRaw.tagName ?? "?" : null,
    rootRawId: rootRaw ? rootRaw.id || null : null,
    rootRawClass: rootRaw ? rootRaw.className || null : null
  });
  debugLog(debug, listLabel, "init", {
    rootRaw: rootRaw ? { tag: rootRaw.tagName, class: rootRaw.className ?? null, id: rootRaw.id ?? null } : null,
    root: root ? { tag: root.tagName, class: root.className ?? null, id: root.id ?? null } : null,
    rootMargin,
    rootMarginBottomPx
  });
  const getScrollContainer = () => {
    try {
      if (root && root.scrollTop !== void 0) return root;
    } catch {
    }
    return document.scrollingElement || document.documentElement;
  };
  const isScrollable = () => {
    const c = getScrollContainer();
    return c.scrollHeight > c.clientHeight + 40;
  };
  let autoFillBudget = 2;
  let pendingWhileLoading = false;
  let scrollRaf = null;
  let lastScrollLogMs = 0;
  const triggerLoadMore = (reason) => {
    if (!opts.hasMore()) return;
    if (opts.isLoading()) return;
    const hasMoreAtStart = opts.hasMore();
    debugLog(debug, listLabel, "load:trigger", { reason, hasMore: hasMoreAtStart });
    logEvent("Indium", "scroll:load", { list: listLabel, hasMore: hasMoreAtStart, reason });
    const loadPromise = Promise.resolve(opts.loadMore());
    render();
    queueMicrotask(() => render());
    loadPromise.finally(() => {
      requestAnimationFrame(() => {
        render();
        if (pendingWhileLoading) {
          pendingWhileLoading = false;
          maybeLoadMoreByScrollPosition("pending");
        }
        if (autoFillBudget > 0 && !isScrollable()) {
          autoFillBudget--;
          debugLog(debug, listLabel, "autofill", { remaining: autoFillBudget });
          triggerLoadMore("autofill");
        }
      });
      const hasMoreAtEnd = opts.hasMore();
      debugLog(debug, listLabel, "load:done", { hasMore: hasMoreAtEnd, pendingWhileLoading, autoFillBudget });
      logEvent("Indium", "scroll:done", { list: listLabel, hasMore: hasMoreAtEnd });
    });
  };
  const maybeLoadMoreByScrollPosition = (reason) => {
    if (!opts.hasMore()) return;
    if (opts.isLoading()) return;
    const c = getScrollContainer();
    const scrollTop = c.scrollTop ?? window.scrollY ?? 0;
    const clientHeight = c.clientHeight ?? window.innerHeight ?? 0;
    const scrollHeight = c.scrollHeight ?? 0;
    const distToBottom = scrollHeight - (scrollTop + clientHeight);
    const threshold = Math.max(220, rootMarginBottomPx);
    const now = performance.now();
    if (debug && now - lastScrollLogMs > 750) {
      lastScrollLogMs = now;
      debugLog(debug, listLabel, "scroll:check", {
        reason,
        scrollEl: { tag: c.tagName, id: c.id || null, class: c.className || null },
        scrollTop,
        clientHeight,
        scrollHeight,
        distToBottom,
        threshold,
        hasMore: opts.hasMore(),
        isLoading: opts.isLoading()
      });
    }
    if (distToBottom <= threshold) {
      triggerLoadMore(reason);
    }
  };
  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      if (!opts.hasMore()) return;
      if (opts.isLoading()) {
        pendingWhileLoading = true;
        debugLog(debug, listLabel, "io:intersectWhileLoading", {
          intersectionRatio: entry.intersectionRatio,
          pendingWhileLoading
        });
        return;
      }
      debugLog(debug, listLabel, "io:intersect", {
        intersectionRatio: entry.intersectionRatio,
        rootBounds: entry.rootBounds ? { top: entry.rootBounds.top, bottom: entry.rootBounds.bottom, height: entry.rootBounds.height } : null,
        targetTop: entry.boundingClientRect?.top ?? null
      });
      triggerLoadMore("io");
    },
    { root, rootMargin, threshold: 0.01 }
  );
  io.observe(sentinel);
  const scrollTarget = root ?? window;
  const onScroll = () => {
    if (scrollRaf !== null) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null;
      maybeLoadMoreByScrollPosition("scroll");
    });
  };
  try {
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    debugLog(debug, listLabel, "scroll:listenerAttached", {
      scrollTarget: root ? "root" : "window"
    });
  } catch {
  }
  requestAnimationFrame(() => {
    if (autoFillBudget > 0 && !isScrollable()) {
      autoFillBudget--;
      debugLog(debug, listLabel, "autofill:init", { remaining: autoFillBudget });
      triggerLoadMore("autofill:init");
    }
  });
  return {
    /** Disconnects observer and removes sentinel */
    destroy() {
      debugLog(debug, listLabel, "destroy");
      try {
        io.disconnect();
      } catch {
      }
      try {
        scrollTarget.removeEventListener("scroll", onScroll);
      } catch {
      }
      try {
        if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
      } catch {
      }
      try {
        sentinel.remove();
      } catch {
      }
    }
  };
}
export {
  attachInfiniteScroll
};
