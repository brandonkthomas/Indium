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
function supportsSVGFilters(filterId) {
  const ua = navigator.userAgent || "";
  const isIOS = /iP(hone|ad|od)/i.test(ua) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isFirefox = /Firefox/i.test(ua);
  const isWebkit = /Safari/.test(ua) && !/Chrome/.test(ua);
  if (isIOS || isWebkit || isFirefox) {
    return false;
  }
  const hasBackdrop = !!(window.CSS && (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)")));
  if (!hasBackdrop) {
    return false;
  }
  const div = document.createElement("div");
  div.style.backdropFilter = `url(#${filterId})`;
  return div.style.backdropFilter !== "";
}

// ts/components/glassSurface.ts
var logGlass = (event, data, note, level = "info") => {
  logEvent("glassSurface", event, data, note, level);
};
var uniqueIdCounter = 0;
function createGlassSurface(options = {}) {
  if (!options) options = {};
  const width = options.width !== void 0 ? options.width : 200;
  const height = options.height !== void 0 ? options.height : 80;
  const borderRadius = options.borderRadius !== void 0 ? options.borderRadius : 20;
  const borderWidth = options.borderWidth !== void 0 ? options.borderWidth : 0.07;
  const brightness = options.brightness !== void 0 ? options.brightness : 50;
  const opacity = options.opacity !== void 0 ? options.opacity : 0.93;
  const blur = options.blur !== void 0 ? options.blur : 11;
  const displace = options.displace !== void 0 ? options.displace : 0;
  const backgroundOpacity = options.backgroundOpacity !== void 0 ? options.backgroundOpacity : 0;
  const saturation = options.saturation !== void 0 ? options.saturation : 1;
  const distortionScale = options.distortionScale !== void 0 ? options.distortionScale : -180;
  const redOffset = options.redOffset !== void 0 ? options.redOffset : 0;
  const greenOffset = options.greenOffset !== void 0 ? options.greenOffset : 10;
  const blueOffset = options.blueOffset !== void 0 ? options.blueOffset : 20;
  const xChannel = options.xChannel !== void 0 ? options.xChannel : "R";
  const yChannel = options.yChannel !== void 0 ? options.yChannel : "G";
  const mixBlendMode = options.mixBlendMode !== void 0 ? options.mixBlendMode : "difference";
  const className = options.className !== void 0 ? options.className : "";
  const style = options.style !== void 0 ? options.style : {};
  const uniqueId = `glass-${Date.now()}-${uniqueIdCounter++}`;
  const filterId = `glass-filter-${uniqueId}`;
  const redGradId = `red-grad-${uniqueId}`;
  const blueGradId = `blue-grad-${uniqueId}`;
  const container = document.createElement("div");
  const isSVGSupported = supportsSVGFilters(filterId);
  var glassSurfaceClass = isSVGSupported ? "glass-surface--svg" : "glass-surface--fallback";
  glassSurfaceClass = "glass-surface--fallback";
  container.className = `glass-surface ${glassSurfaceClass} ${className}`.trim();
  logGlass("Surface Created", {
    svgSupported: Number(isSVGSupported),
    className
  });
  Object.assign(container.style, style, {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: `${borderRadius}px`
  });
  container.style.setProperty("--glass-frost", String(backgroundOpacity));
  container.style.setProperty("--glass-saturation", String(saturation));
  container.style.setProperty("--filter-id", `url(#${filterId})`);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "glass-surface__filter");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", filterId);
  filter.setAttribute("colorInterpolationFilters", "sRGB");
  filter.setAttribute("x", "0%");
  filter.setAttribute("y", "0%");
  filter.setAttribute("width", "100%");
  filter.setAttribute("height", "100%");
  const feImage = document.createElementNS("http://www.w3.org/2000/svg", "feImage");
  feImage.setAttribute("x", "0");
  feImage.setAttribute("y", "0");
  feImage.setAttribute("width", "100%");
  feImage.setAttribute("height", "100%");
  feImage.setAttribute("preserveAspectRatio", "none");
  feImage.setAttribute("result", "map");
  const feDispRed = document.createElementNS("http://www.w3.org/2000/svg", "feDisplacementMap");
  feDispRed.setAttribute("in", "SourceGraphic");
  feDispRed.setAttribute("in2", "map");
  feDispRed.setAttribute("id", "redchannel");
  feDispRed.setAttribute("result", "dispRed");
  feDispRed.setAttribute("scale", (distortionScale + redOffset).toString());
  feDispRed.setAttribute("xChannelSelector", xChannel);
  feDispRed.setAttribute("yChannelSelector", yChannel);
  const feColorMatrixRed = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
  feColorMatrixRed.setAttribute("in", "dispRed");
  feColorMatrixRed.setAttribute("type", "matrix");
  feColorMatrixRed.setAttribute("values", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0");
  feColorMatrixRed.setAttribute("result", "red");
  const feDispGreen = document.createElementNS("http://www.w3.org/2000/svg", "feDisplacementMap");
  feDispGreen.setAttribute("in", "SourceGraphic");
  feDispGreen.setAttribute("in2", "map");
  feDispGreen.setAttribute("id", "greenchannel");
  feDispGreen.setAttribute("result", "dispGreen");
  feDispGreen.setAttribute("scale", (distortionScale + greenOffset).toString());
  feDispGreen.setAttribute("xChannelSelector", xChannel);
  feDispGreen.setAttribute("yChannelSelector", yChannel);
  const feColorMatrixGreen = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
  feColorMatrixGreen.setAttribute("in", "dispGreen");
  feColorMatrixGreen.setAttribute("type", "matrix");
  feColorMatrixGreen.setAttribute("values", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0");
  feColorMatrixGreen.setAttribute("result", "green");
  const feDispBlue = document.createElementNS("http://www.w3.org/2000/svg", "feDisplacementMap");
  feDispBlue.setAttribute("in", "SourceGraphic");
  feDispBlue.setAttribute("in2", "map");
  feDispBlue.setAttribute("id", "bluechannel");
  feDispBlue.setAttribute("result", "dispBlue");
  feDispBlue.setAttribute("scale", (distortionScale + blueOffset).toString());
  feDispBlue.setAttribute("xChannelSelector", xChannel);
  feDispBlue.setAttribute("yChannelSelector", yChannel);
  const feColorMatrixBlue = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
  feColorMatrixBlue.setAttribute("in", "dispBlue");
  feColorMatrixBlue.setAttribute("type", "matrix");
  feColorMatrixBlue.setAttribute("values", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0");
  feColorMatrixBlue.setAttribute("result", "blue");
  const feBlendRG = document.createElementNS("http://www.w3.org/2000/svg", "feBlend");
  feBlendRG.setAttribute("in", "red");
  feBlendRG.setAttribute("in2", "green");
  feBlendRG.setAttribute("mode", "screen");
  feBlendRG.setAttribute("result", "rg");
  const feBlendFinal = document.createElementNS("http://www.w3.org/2000/svg", "feBlend");
  feBlendFinal.setAttribute("in", "rg");
  feBlendFinal.setAttribute("in2", "blue");
  feBlendFinal.setAttribute("mode", "screen");
  feBlendFinal.setAttribute("result", "output");
  const feGaussianBlur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
  feGaussianBlur.setAttribute("in", "output");
  feGaussianBlur.setAttribute("stdDeviation", displace.toString());
  filter.appendChild(feImage);
  filter.appendChild(feDispRed);
  filter.appendChild(feColorMatrixRed);
  filter.appendChild(feDispGreen);
  filter.appendChild(feColorMatrixGreen);
  filter.appendChild(feDispBlue);
  filter.appendChild(feColorMatrixBlue);
  filter.appendChild(feBlendRG);
  filter.appendChild(feBlendFinal);
  filter.appendChild(feGaussianBlur);
  defs.appendChild(filter);
  svg.appendChild(defs);
  const contentDiv = document.createElement("div");
  contentDiv.className = "glass-surface__content";
  container.appendChild(svg);
  container.appendChild(contentDiv);
  const generateDisplacementMap = () => {
    const rect = container.getBoundingClientRect();
    const actualWidth = rect.width || 400;
    const actualHeight = rect.height || 200;
    const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);
    const svgContent = `
            <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#0000"/>
                        <stop offset="100%" stop-color="red"/>
                    </linearGradient>
                    <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#0000"/>
                        <stop offset="100%" stop-color="blue"/>
                    </linearGradient>
                </defs>
                <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
                <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
                <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
                <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
            </svg>
        `;
    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  };
  const updateDisplacementMap = () => {
    feImage.setAttribute("href", generateDisplacementMap());
  };
  setTimeout(updateDisplacementMap, 0);
  const resizeObserver = new ResizeObserver(() => {
    setTimeout(updateDisplacementMap, 0);
  });
  resizeObserver.observe(container);
  return {
    element: container,
    contentElement: contentDiv,
    updateDisplacementMap,
    destroy: () => {
      resizeObserver.disconnect();
      logGlass("Surface Destroyed");
    }
  };
}

// ts/components/navbar/navbar.ts
var defaultSelectors = {
  root: ".wa-navbar, .url-display",
  glassWrapper: ".wa-navbar__surface-wrap, .glass-surface-wrapper",
  content: ".wa-navbar__content, .url-display-content",
  brand: ".wa-navbar__brand, .url-text",
  burger: ".wa-navbar__burger, .burger-menu",
  desktopNav: ".wa-navbar__links--desktop, .url-nav-links.desktop",
  mobileNav: ".wa-navbar__links--mobile, .url-nav-links.mobile",
  navLink: "a[data-wa-nav-id], a[data-nav-link], a.url-link"
};
var defaultGlassOptions = {
  width: "auto",
  height: "auto",
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
  xChannel: "R",
  yChannel: "G",
  mixBlendMode: "difference",
  className: "url-display-glass",
  style: {
    minHeight: "48px",
    transition: "height 0.3s ease"
  }
};
function query(root, selector) {
  const el = root.querySelector(selector);
  return el instanceof HTMLElement ? el : null;
}
function normalizeRel(rel, external) {
  if (!external) return rel;
  if (!rel) return "noopener noreferrer";
  const next = new Set(rel.split(/\s+/).filter(Boolean));
  next.add("noopener");
  next.add("noreferrer");
  return Array.from(next).join(" ");
}
var NavbarControllerImpl = class {
  constructor(options) {
    this.glassSurface = null;
    this.brandEl = null;
    this.burgerEl = null;
    this.desktopNavEl = null;
    this.mobileNavEl = null;
    this.isMenuOpen = false;
    this.unbind = [];
    this._resolveReady = null;
    this.itemLookup = /* @__PURE__ */ new Map();
    const selectors = { ...defaultSelectors, ...options.selectors || {} };
    const root = options.root ?? query(document, selectors.root);
    if (!root) {
      throw new Error(`Indium navbar root not found for selector: ${selectors.root}`);
    }
    this.root = root;
    this.selectors = selectors;
    this.mobileBreakpoint = options.mobileBreakpoint ?? 768;
    this.openClass = options.openClass || "wa-navbar--open";
    this.legacyOpenClass = options.legacyOpenClass || "menu-open";
    this.onNavigate = options.onNavigate;
    this.readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
    this.setup(options);
  }
  log(event, data, note, level = "info") {
    logEvent("navbar", event, data, note, level);
  }
  setup(options) {
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
          ...options.glassOptions || {}
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
    this.log("Ready");
  }
  resolveReady() {
    if (!this._resolveReady) return;
    this._resolveReady();
    this._resolveReady = null;
  }
  scanCurrentItems() {
    this.itemLookup.clear();
    this.root.querySelectorAll(this.selectors.navLink).forEach((link) => {
      const id = this.readLinkId(link);
      const labelText = link.textContent?.trim() || id || link.getAttribute("href") || "";
      const icon = link.querySelector("img");
      const item = {
        id: id || labelText.toLowerCase(),
        label: labelText,
        href: link.getAttribute("href") || "#",
        iconSrc: icon?.getAttribute("src") || void 0,
        iconAlt: icon?.getAttribute("alt") || void 0,
        ariaLabel: link.getAttribute("aria-label") || void 0,
        external: link.classList.contains("url-link-external")
      };
      this.itemLookup.set(item.id, item);
    });
  }
  readLinkId(link) {
    return link.getAttribute("data-wa-nav-id") || link.getAttribute("data-nav-link") || "";
  }
  isMobileViewport() {
    return window.innerWidth <= this.mobileBreakpoint;
  }
  bindEvents() {
    const onRootClick = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const link = target.closest("a");
      if (link && this.root.contains(link) && link.matches(this.selectors.navLink)) {
        const source = this.mobileNavEl?.contains(link) ? "mobile" : "desktop";
        const itemId = this.readLinkId(link);
        const existing = this.itemLookup.get(itemId);
        const fallback = {
          id: itemId || link.textContent?.trim() || "",
          label: link.textContent?.trim() || "",
          href: link.getAttribute("href") || "#",
          iconSrc: link.querySelector("img")?.getAttribute("src") || void 0,
          ariaLabel: link.getAttribute("aria-label") || void 0,
          external: link.classList.contains("url-link-external")
        };
        const item = existing || fallback;
        const decision = this.onNavigate?.({
          item,
          itemId: item.id,
          event,
          source,
          controller: this
        });
        if (decision === "prevent") {
          event.preventDefault();
        }
        if (source === "mobile" && this.isMenuOpen) {
          this.close();
        }
        return;
      }
      if (!this.isMobileViewport()) return;
      const shouldToggle = !!(target.closest(this.selectors.burger) || target.closest(".glass-surface") || target.closest(".wa-navbar__surface") || target.closest(".url-display-main"));
      if (!shouldToggle) return;
      event.preventDefault();
      event.stopPropagation();
      this.toggle();
    };
    this.root.addEventListener("click", onRootClick);
    this.unbind.push(() => this.root.removeEventListener("click", onRootClick));
    const onDocumentClick = (event) => {
      if (!this.isMenuOpen) return;
      const target = event.target instanceof Node ? event.target : null;
      if (!target) return;
      if (!this.root.contains(target)) {
        this.close();
      }
    };
    document.addEventListener("click", onDocumentClick);
    this.unbind.push(() => document.removeEventListener("click", onDocumentClick));
    const onResize = () => {
      if (!this.isMobileViewport() && this.isMenuOpen) {
        this.close();
      }
    };
    window.addEventListener("resize", onResize, { passive: true });
    this.unbind.push(() => window.removeEventListener("resize", onResize));
  }
  open() {
    this.isMenuOpen = true;
    this.root.classList.add(this.openClass);
    this.root.classList.add(this.legacyOpenClass);
    if (this.burgerEl) {
      this.burgerEl.setAttribute("aria-expanded", "true");
    }
  }
  close() {
    this.isMenuOpen = false;
    this.root.classList.remove(this.openClass);
    this.root.classList.remove(this.legacyOpenClass);
    if (this.burgerEl) {
      this.burgerEl.setAttribute("aria-expanded", "false");
    }
  }
  toggle() {
    if (this.isMenuOpen) this.close();
    else this.open();
  }
  setItems(items) {
    this.itemLookup.clear();
    items.forEach((item) => this.itemLookup.set(item.id, item));
    this.renderNav(this.desktopNavEl, items, false);
    this.renderNav(this.mobileNavEl, items, true);
  }
  renderNav(container, items, mobile) {
    if (!container) return;
    container.replaceChildren();
    items.forEach((item) => {
      container.appendChild(this.buildItemElement(item, mobile));
    });
  }
  buildItemElement(item, mobile) {
    const link = document.createElement("a");
    link.href = item.href;
    link.className = item.className || `url-link ${item.external ? "url-link-external" : ""}`.trim();
    link.setAttribute("data-wa-nav-id", item.id);
    if (!item.className && item.id) {
      link.setAttribute("data-nav-link", item.id);
      link.classList.add(`url-link-${item.id}`);
    }
    if (item.ariaLabel) link.setAttribute("aria-label", item.ariaLabel);
    if (item.external) {
      link.target = item.target || "_blank";
      const rel = normalizeRel(item.rel, true);
      if (rel) link.rel = rel;
    } else if (item.target) {
      link.target = item.target;
    }
    const iconSrc = mobile ? item.mobileIconSrc || item.iconSrc : item.iconSrc;
    const label = mobile ? item.mobileLabel || item.label : item.label;
    if (iconSrc) {
      const icon = document.createElement("img");
      icon.src = iconSrc;
      icon.alt = item.iconAlt || "";
      icon.width = 20;
      icon.height = 20;
      link.appendChild(icon);
    }
    const span = document.createElement("span");
    span.textContent = label;
    link.appendChild(span);
    return link;
  }
  setActive(itemId) {
    const links = this.root.querySelectorAll(this.selectors.navLink);
    links.forEach((link) => {
      const active = !!itemId && this.readLinkId(link) === itemId;
      if (active) {
        link.setAttribute("data-wa-active", "true");
        link.setAttribute("aria-current", "page");
        link.classList.add("is-active");
      } else {
        link.removeAttribute("data-wa-active");
        link.removeAttribute("aria-current");
        link.classList.remove("is-active");
      }
    });
  }
  destroy() {
    while (this.unbind.length) {
      const dispose = this.unbind.pop();
      try {
        dispose?.();
      } catch {
      }
    }
    this.glassSurface?.destroy();
    this.glassSurface = null;
    this.log("Destroyed");
  }
};
function createNavbarController(options = {}) {
  return new NavbarControllerImpl(options);
}
export {
  createNavbarController
};
