// ts/internal/logging.ts
var loggerImpl = null;
function setIndiumLogger(logger) {
  loggerImpl = logger ?? null;
}
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
var GLOBAL_CONFIG_KEY = "__indium_config_state_v1__";
function getConfigState() {
  const host = globalThis;
  const existing = host[GLOBAL_CONFIG_KEY];
  if (existing && typeof existing === "object" && "config" in existing) {
    return existing;
  }
  const created = { config: { ...defaults } };
  host[GLOBAL_CONFIG_KEY] = created;
  return created;
}
function readConfig() {
  return getConfigState().config;
}
function writeConfig(next) {
  getConfigState().config = next;
  return next;
}
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
function applyNormalization(next) {
  const normalizedBrandLogoAlt = (next.brandLogoAlt || defaults.brandLogoAlt).trim();
  return {
    ...next,
    routeRoot: normalizeRoot(next.routeRoot),
    apiBasePath: normalizeRoot(next.apiBasePath),
    assetBasePath: normalizeRoot(next.assetBasePath),
    appRootSelector: next.appRootSelector || defaults.appRootSelector,
    brandLogoSrc: (next.brandLogoSrc || "").trim(),
    brandLogoAlt: normalizedBrandLogoAlt || defaults.brandLogoAlt,
    version: next.version || defaults.version,
    exposeLegacyWindowDialogs: !!next.exposeLegacyWindowDialogs
  };
}
function getIndiumConfig() {
  return readConfig();
}
function setIndiumConfig(partial) {
  if (!partial) return readConfig();
  const config = writeConfig(applyNormalization({ ...readConfig(), ...partial }));
  if (partial.logger) {
    setIndiumLogger(partial.logger);
  }
  return config;
}
function routePath(path) {
  return joinPath(readConfig().routeRoot, path);
}
function apiPath(path) {
  return joinPath(readConfig().apiBasePath, path);
}
function assetPath(path) {
  return joinPath(readConfig().assetBasePath, path);
}
function initIndiumConfig(partial) {
  const config = writeConfig(applyNormalization({ ...defaults, ...partial }));
  if (config.logger) {
    setIndiumLogger(config.logger);
  }
  return config;
}

// ts/components/sidebar/sidebar.ts
var SidebarController = class {
  constructor(opts) {
    this.unbind = [];
    this.destroyed = false;
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
    this.appRoot.dataset.waSidebarOpen = "true";
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
    const isOpen = this.appRoot.dataset.waSidebarOpen === "true";
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
      try {
        dispose?.();
      } catch {
      }
    }
  }
  /**
   * Binds click/escape handlers and auto-close on nav click
   */
  bind() {
    const onOpen = () => this.open();
    const onClose = () => this.close();
    const onOverlayClick = () => this.close();
    const onKeyDown = (e) => {
      if (e.key === "Escape") this.close();
    };
    const onSidebarClick = (e) => {
      const t = e.target;
      if (t?.closest("[data-wa-nav]")) {
        this.close();
      }
    };
    this.openBtn?.addEventListener("click", onOpen);
    if (this.openBtn) {
      this.unbind.push(() => this.openBtn?.removeEventListener("click", onOpen));
    }
    this.closeBtn?.addEventListener("click", onClose);
    if (this.closeBtn) {
      this.unbind.push(() => this.closeBtn?.removeEventListener("click", onClose));
    }
    this.overlay.addEventListener("click", onOverlayClick);
    this.unbind.push(() => this.overlay.removeEventListener("click", onOverlayClick));
    document.addEventListener("keydown", onKeyDown);
    this.unbind.push(() => document.removeEventListener("keydown", onKeyDown));
    this.sidebar.addEventListener("click", onSidebarClick);
    this.unbind.push(() => this.sidebar.removeEventListener("click", onSidebarClick));
  }
};
function querySelector(root, selector) {
  const el = root.querySelector(selector);
  return el instanceof HTMLElement ? el : null;
}
function createSidebarController(options = {}) {
  if (typeof document === "undefined") return null;
  const appRoot = options.appRoot ?? querySelector(document, options.appRootSelector || "[data-wa-app]");
  if (!appRoot) return null;
  const sidebar = options.sidebar ?? querySelector(appRoot, options.sidebarSelector || "[data-wa-sidebar]") ?? querySelector(document, options.sidebarSelector || "[data-wa-sidebar]");
  const overlay = options.overlay ?? querySelector(appRoot, options.overlaySelector || "[data-wa-sidebar-overlay]") ?? querySelector(document, options.overlaySelector || "[data-wa-sidebar-overlay]");
  if (!sidebar || !overlay) return null;
  const openBtn = options.openBtn ?? querySelector(appRoot, options.openBtnSelector || "[data-wa-sidebar-toggle]") ?? querySelector(document, options.openBtnSelector || "[data-wa-sidebar-toggle]");
  const closeBtn = options.closeBtn ?? querySelector(sidebar, options.closeBtnSelector || "[data-wa-sidebar-close]") ?? querySelector(document, options.closeBtnSelector || "[data-wa-sidebar-close]");
  return new SidebarController({
    appRoot,
    sidebar,
    overlay,
    openBtn,
    closeBtn
  });
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

// ts/components/dialogs.ts
function createElement(tag, classNames, attrs) {
  const el = document.createElement(tag);
  if (classNames && classNames.length) {
    el.classList.add(...classNames);
  }
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}
var DialogManager = class {
  constructor() {
    this.activeOverlay = null;
    this.glassSurface = null;
    this.lastFocusedElement = null;
    this.bodyOverflowBefore = null;
    this.activeReject = null;
    // Simple mutex to avoid overlapping dialogs; queue could be added later if needed
    this.isOpen = false;
  }
  log(event, data, note, level = "info") {
    logEvent("dialogs", event, data, note, level);
  }
  //------------------------------------------------------------------------------------------
  /**
   * Show an alert dialog
   */
  alert(options) {
    const opts = typeof options === "string" ? { message: options } : options || {};
    opts.kind = "alert";
    return new Promise((resolve) => {
      this.openInternal(opts, () => resolve(void 0), () => resolve(void 0));
    });
  }
  //------------------------------------------------------------------------------------------
  /**
   * Show a confirmation dialog
   */
  confirm(options) {
    const opts = typeof options === "string" ? { message: options } : options || {};
    opts.kind = "confirm";
    return new Promise((resolve) => {
      this.openInternal(opts, () => resolve(true), () => resolve(false));
    });
  }
  //------------------------------------------------------------------------------------------
  /**
   * Show a prompt dialog
   */
  prompt(options) {
    const opts = typeof options === "string" ? { message: options } : options || {};
    opts.kind = "prompt";
    return new Promise((resolve) => {
      this.openInternal(
        opts,
        (value) => resolve(value ?? null),
        () => resolve(null)
      );
    });
  }
  //------------------------------------------------------------------------------------------
  openInternal(options, onResolve, onReject) {
    if (this.isOpen) {
      const rejectPrevious = this.activeReject;
      this.closeInternal(false);
      rejectPrevious?.();
    }
    this.isOpen = true;
    this.activeReject = onReject;
    const kind = options.kind || ("placeholder" in options || "defaultValue" in options ? "prompt" : "alert");
    const variant = options.variant || (kind === "confirm" ? "info" : "default");
    const allowEscapeClose = options.allowEscapeClose !== false;
    const allowBackdropClose = typeof options.allowBackdropClose === "boolean" ? options.allowBackdropClose : kind !== "prompt";
    const overlay = createElement("div", ["ui-dialog-overlay"]);
    overlay.setAttribute("role", "presentation");
    const glass = createGlassSurface({
      width: "auto",
      height: "auto",
      borderRadius: 18,
      borderWidth: 0.07,
      brightness: 50,
      opacity: 0.93,
      blur: 26,
      displace: 0,
      backgroundOpacity: 0.16,
      saturation: 0.9,
      distortionScale: -18,
      redOffset: 8,
      greenOffset: 8,
      blueOffset: 8,
      xChannel: "R",
      yChannel: "G",
      mixBlendMode: "difference",
      className: `ui-dialog-glass ui-dialog-glass--${variant}`,
      style: {
        minWidth: "260px",
        maxWidth: options.width || "min(500px, 100%)"
      }
    });
    const dialogRoot = glass.element;
    dialogRoot.classList.add("ui-dialog");
    dialogRoot.setAttribute("role", "dialog");
    dialogRoot.setAttribute("aria-modal", "true");
    const content = glass.contentElement;
    content.classList.add("ui-dialog-inner");
    const header = createElement("header", ["ui-dialog-header"]);
    const titleId = `ui-dialog-title-${Date.now().toString(36)}`;
    const titleText = options.title || (kind === "confirm" ? "Are you sure?" : kind === "prompt" ? "Enter a value" : "Notice");
    const titleEl = createElement("h2", ["ui-dialog-title"]);
    titleEl.id = titleId;
    titleEl.textContent = titleText;
    header.appendChild(titleEl);
    const body = createElement("div", ["ui-dialog-body"]);
    const messageId = `ui-dialog-message-${Date.now().toString(36)}`;
    body.id = messageId;
    if (options.contentNode) {
      body.appendChild(options.contentNode);
    } else if (options.message) {
      const messageEl = createElement("p", ["ui-dialog-message"]);
      messageEl.innerHTML = options.message;
      body.appendChild(messageEl);
    }
    const footer = createElement("footer", ["ui-dialog-footer"]);
    const primaryLabel = options.primaryLabel || (kind === "confirm" ? "Confirm" : kind === "prompt" ? "OK" : "OK");
    const secondaryLabel = options.secondaryLabel || (kind === "confirm" || kind === "prompt" ? "Cancel" : void 0);
    const primaryBtn = createElement(
      "button",
      ["ui-dialog-button", "ui-dialog-button--primary", `ui-dialog-button--${variant}`],
      { type: "button" }
    );
    primaryBtn.textContent = primaryLabel;
    let inputEl = null;
    if (kind === "prompt") {
      inputEl = createElement("input", ["ui-dialog-input"], {
        type: "text",
        autocomplete: "off",
        spellcheck: "false"
      });
      if (options.placeholder) {
        inputEl.placeholder = options.placeholder;
      }
      if (options.defaultValue) {
        inputEl.value = options.defaultValue;
      }
      body.appendChild(inputEl);
    }
    const buttons = [];
    if (secondaryLabel) {
      const secondaryBtn = createElement(
        "button",
        ["ui-dialog-button", "ui-dialog-button--secondary"],
        { type: "button" }
      );
      secondaryBtn.textContent = secondaryLabel;
      footer.appendChild(secondaryBtn);
      buttons.push(secondaryBtn);
      secondaryBtn.addEventListener("click", () => {
        this.log("Dismiss Secondary", { kind });
        this.closeInternal(false);
        onReject();
      });
    }
    footer.appendChild(primaryBtn);
    buttons.push(primaryBtn);
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    overlay.appendChild(dialogRoot);
    document.body.appendChild(overlay);
    this.activeOverlay = overlay;
    this.glassSurface = glass;
    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.bodyOverflowBefore = document.body.style.overflow || null;
    document.body.style.overflow = "hidden";
    dialogRoot.setAttribute("aria-labelledby", titleId);
    dialogRoot.setAttribute("aria-describedby", messageId);
    const firstFocusTarget = kind === "prompt" && inputEl || primaryBtn || dialogRoot;
    requestAnimationFrame(() => {
      overlay.classList.add("is-visible");
      firstFocusTarget.focus();
    });
    const handlePrimary = () => {
      if (kind === "prompt" && inputEl) {
        const value = inputEl.value;
        const required = options.required === true;
        if (required && !value.trim()) {
          inputEl.classList.add("ui-dialog-input--invalid");
          inputEl.focus();
          this.log("Prompt Validation Failed", { kind });
          return;
        }
        this.log("Resolve Primary", { kind });
        this.closeInternal(false);
        onResolve(value);
      } else {
        this.log("Resolve Primary", { kind });
        this.closeInternal(false);
        onResolve();
      }
    };
    primaryBtn.addEventListener("click", handlePrimary);
    if (kind === "prompt" && inputEl) {
      inputEl.addEventListener("input", () => {
        inputEl.classList.remove("ui-dialog-input--invalid");
      });
      inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          handlePrimary();
        } else if (event.key === "Escape" && allowEscapeClose) {
          event.preventDefault();
          this.log("Dismiss Escape", { kind });
          this.closeInternal(false);
          onReject();
        }
      });
    }
    const keydownHandler = (event) => {
      if (!this.isOpen) return;
      if (event.key === "Escape" && allowEscapeClose) {
        event.preventDefault();
        this.log("Dismiss Escape", { kind });
        this.closeInternal(false);
        onReject();
      } else if (event.key === "Tab") {
        const focusables = buttons.filter((btn) => !btn.disabled);
        if (kind === "prompt" && inputEl) {
          focusables.unshift(inputEl);
        }
        if (!focusables.length) return;
        const currentIndex = focusables.indexOf(
          document.activeElement
        );
        let nextIndex = currentIndex;
        if (event.shiftKey) {
          nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex === focusables.length - 1 ? 0 : currentIndex + 1;
        }
        event.preventDefault();
        const next = focusables[nextIndex] || focusables[0];
        next.focus();
      }
    };
    document.addEventListener("keydown", keydownHandler);
    const backdropHandler = (event) => {
      if (!allowBackdropClose) return;
      if (event.target === overlay) {
        this.log("Dismiss Backdrop", { kind });
        this.closeInternal(false);
        onReject();
      }
    };
    overlay.addEventListener("click", backdropHandler);
    overlay.__uiDialogCleanup = () => {
      document.removeEventListener("keydown", keydownHandler);
      overlay.removeEventListener("click", backdropHandler);
    };
    this.log("Opened", { kind });
  }
  //------------------------------------------------------------------------------------------
  closeInternal(fromDestroy) {
    if (!this.isOpen) return;
    this.isOpen = false;
    const rejectActive = this.activeReject;
    this.activeReject = null;
    const overlay = this.activeOverlay;
    const glass = this.glassSurface;
    this.activeOverlay = null;
    this.glassSurface = null;
    if (!overlay) {
      if (glass) {
        glass.destroy();
      }
      if (fromDestroy) {
        rejectActive?.();
      }
      return;
    }
    const cleanup = overlay.__uiDialogCleanup;
    if (cleanup) {
      cleanup();
    }
    overlay.classList.remove("is-visible");
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (glass) {
      glass.destroy();
    }
    if (!fromDestroy && this.lastFocusedElement) {
      this.lastFocusedElement.focus();
    }
    this.lastFocusedElement = null;
    if (this.bodyOverflowBefore !== null) {
      document.body.style.overflow = this.bodyOverflowBefore;
    } else {
      document.body.style.overflow = "";
    }
    this.bodyOverflowBefore = null;
    if (fromDestroy) {
      rejectActive?.();
    }
    this.log("Closed");
  }
  //------------------------------------------------------------------------------------------
  /**
   * Destroy any active dialog (used by consumers if they need a hard reset)
   */
  destroyActive() {
    this.closeInternal(true);
  }
};
var dialogManager = new DialogManager();
function showAlert(options) {
  return dialogManager.alert(options);
}
function showConfirm(options) {
  return dialogManager.confirm(options);
}
function showPrompt(options) {
  return dialogManager.prompt(options);
}
var legacyWindowDialogsEnabled = false;
function attachLegacyWindowDialogs() {
  if (typeof window === "undefined") return;
  window.dialogManager = dialogManager;
  window.showAlert = showAlert;
  window.showConfirm = showConfirm;
  window.showPrompt = showPrompt;
}
function detachLegacyWindowDialogs() {
  if (typeof window === "undefined") return;
  if (window.dialogManager === dialogManager) delete window.dialogManager;
  if (window.showAlert === showAlert) delete window.showAlert;
  if (window.showConfirm === showConfirm) delete window.showConfirm;
  if (window.showPrompt === showPrompt) delete window.showPrompt;
}
function configureLegacyWindowDialogs(enabled) {
  const next = !!enabled;
  if (next === legacyWindowDialogsEnabled) return;
  legacyWindowDialogsEnabled = next;
  if (next) attachLegacyWindowDialogs();
  else detachLegacyWindowDialogs();
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
  let destroyed = false;
  const triggerLoadMore = (reason) => {
    if (destroyed) return;
    if (!opts.hasMore()) return;
    if (opts.isLoading()) return;
    const hasMoreAtStart = opts.hasMore();
    debugLog(debug, listLabel, "load:trigger", { reason, hasMore: hasMoreAtStart });
    logEvent("Indium", "scroll:load", { list: listLabel, hasMore: hasMoreAtStart, reason });
    const loadPromise = Promise.resolve(opts.loadMore());
    render();
    queueMicrotask(() => {
      if (destroyed) return;
      render();
    });
    loadPromise.finally(() => {
      if (destroyed) return;
      requestAnimationFrame(() => {
        if (destroyed) return;
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
    if (destroyed) return;
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
      if (destroyed) return;
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
    if (destroyed) return;
    if (scrollRaf !== null) return;
    scrollRaf = requestAnimationFrame(() => {
      if (destroyed) return;
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
    if (destroyed) return;
    if (autoFillBudget > 0 && !isScrollable()) {
      autoFillBudget--;
      debugLog(debug, listLabel, "autofill:init", { remaining: autoFillBudget });
      triggerLoadMore("autofill:init");
    }
  });
  return {
    /** Disconnects observer and removes sentinel */
    destroy() {
      destroyed = true;
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

// ts/internal/perfMonitor.ts
var perf = {
  loopFrameStart(_loopName) {
  },
  loopFrameEnd(_loopName) {
  },
  segmentStart(_loopName, _segmentName) {
    return -1;
  },
  segmentEnd(_segmentId) {
  }
};
var perfMonitor_default = perf;

// ts/components/gradNoiseCanvas.ts
var DEFAULT_SETTINGS = Object.freeze({
  speed: 0.7,
  noiseFreq: 0.5,
  exposure: 0.5,
  saturation: 0,
  reducedOpacity: 0.25
});
var FULLSCREEN_VERTEX_SHADER = `
precision highp float;

varying vec2 vUv;

uniform float u_time;
uniform float u_noiseFreq;
uniform float speed;
uniform float u_direction;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
    vUv = uv;

    vec3 pos = position;
    // Slow movement by 4x relative to the original shader snippet.
    float t = u_time * speed * 0.25 * u_direction;
    vec3 noisePos = vec3(pos.x + t, pos.y, pos.z);
    pos.z += snoise(noisePos) * u_noiseFreq;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;
var FULLSCREEN_FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUv;

uniform float u_time;
uniform float u_aspect;
uniform float speed;
uniform float u_opacity;
uniform float u_warp;
uniform float u_direction;
uniform float u_exposure;
uniform float u_saturation;

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0) hue += 1.0;
    else if (hue > 1.0) hue -= 1.0;

    float res;
    if ((6.0 * hue) < 1.0) res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0) res = f2;
    else if ((3.0 * hue) < 2.0) res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else res = f1;
    return res;
}

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;
    if (hsl.y == 0.0) {
        rgb = vec3(hsl.z);
    } else {
        float f2 = (hsl.z < 0.5) ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.y * hsl.z;
        float f1 = 2.0 * hsl.z - f2;
        rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
        rgb.g = hue2rgb(f1, f2, hsl.x);
        rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
    }
    return rgb;
}

vec3 hsl2rgb(float h, float s, float l) { return hsl2rgb(vec3(h, s, l)); }

vec3 random3(vec3 c) {
    float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
    vec3 r;
    r.z = fract(512.0*j);
    j *= .125;
    r.x = fract(512.0*j);
    j *= .125;
    r.y = fract(512.0*j);
    return r-0.5;
}

const float F3 = 0.3333333;
const float G3 = 0.1666667;

float simplex3d(vec3 p) {
    vec3 s = floor(p + dot(p, vec3(F3)));
    vec3 x = p - s + dot(s, vec3(G3));

    vec3 e = step(vec3(0.0), x - x.yzx);
    vec3 i1 = e*(1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy*(1.0 - e);

    vec3 x1 = x - i1 + G3;
    vec3 x2 = x - i2 + 2.0*G3;
    vec3 x3 = x - 1.0 + 3.0*G3;

    vec4 w, d;
    w.x = dot(x, x);
    w.y = dot(x1, x1);
    w.z = dot(x2, x2);
    w.w = dot(x3, x3);
    w = max(0.6 - w, 0.0);

    d.x = dot(random3(s), x);
    d.y = dot(random3(s + i1), x1);
    d.z = dot(random3(s + i2), x2);
    d.w = dot(random3(s + 1.0), x3);

    w *= w;
    w *= w;
    d *= w;

    return dot(d, vec4(52.0));
}

float hash(vec2 p) {
    return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x))));
}

void main() {
    // Aspect-correct UVs so the pattern doesn't stretch on wide/tall viewports.
    vec2 uv = (vUv - 0.5) * vec2(u_aspect, 1.0) + 0.5;

    // Slow movement by 4x relative to the original shader snippet.
    float t = u_time * speed * 0.25 * u_direction;

    float n = simplex3d(vec3(uv.xy, t));
    vec3 color = hsl2rgb(0.6 + n * 0.2, 0.5, 0.5);

    float val = hash(uv + t);

    // Fill the viewport (no circular alpha mask). Fade is handled via u_opacity.
    vec3 finalColor = color + vec3(val / 20.0);
    // Subtle warp pulse brightening for legacy transitions.
    finalColor += vec3(0.15) * max(0.0, u_warp);

    // Saturation (luma mix)
    float luma = dot(finalColor, vec3(0.2126, 0.7152, 0.0722));
    finalColor = mix(vec3(luma), finalColor, clamp(u_saturation, 0.0, 2.0));

    // Exposure + simple tonemap (prevents clipping while allowing brightening)
    finalColor *= max(0.0, u_exposure);
    finalColor = vec3(1.0) - exp(-finalColor);

    gl_FragColor = vec4(finalColor, u_opacity);
}
`;
var GradNoiseCanvas = class {
  constructor(canvas) {
    this.animateBound = () => {
    };
    this.onResizeBound = () => this.onResize();
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    this.camera.position.z = 1;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setClearColor(1842204, 1);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.opacity = 1;
    this.targetOpacity = 1;
    this.warp = 0;
    this.warpDecayPerSecond = 3;
    this.direction = 1;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_aspect: { value: 1 },
        u_noiseFreq: { value: DEFAULT_SETTINGS.noiseFreq },
        speed: { value: DEFAULT_SETTINGS.speed },
        u_opacity: { value: this.opacity },
        u_warp: { value: this.warp },
        u_direction: { value: this.direction },
        u_exposure: { value: DEFAULT_SETTINGS.exposure },
        u_saturation: { value: DEFAULT_SETTINGS.saturation }
      },
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader: FULLSCREEN_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    const geometry = new THREE.PlaneGeometry(2, 2, 64, 64);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
    this.running = true;
    this.timeStartMs = performance.now();
    this.defaultFrameInterval = 1e3 / 120;
    this.minFrameInterval = this.defaultFrameInterval;
    this.maxFrameInterval = 100;
    this._resolveReady = null;
    this.readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
    this.onResize();
    window.addEventListener("resize", this.onResizeBound, { passive: true });
    this.setFrameCap(20);
    this.animateBound = this.animate.bind(this);
    requestAnimationFrame(this.animateBound);
    this.log("Shader GradNoiseCanvas Created", {
      speed: DEFAULT_SETTINGS.speed,
      noiseFreq: DEFAULT_SETTINGS.noiseFreq,
      exposure: DEFAULT_SETTINGS.exposure,
      saturation: DEFAULT_SETTINGS.saturation
    });
  }
  log(event, data, note, level = "info") {
    logEvent("gradNoiseCanvas", event, data, note, level);
  }
  onResize() {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    const aspect = width / height;
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.material.uniforms.u_aspect.value = aspect;
    this.log("Renderer Resized", { width, height });
  }
  stepVisualState(deltaSec) {
    const k = 10;
    const lerpFactor = 1 - Math.exp(-k * deltaSec);
    this.opacity = this.opacity + (this.targetOpacity - this.opacity) * lerpFactor;
    if (this.warp > 0) {
      this.warp = Math.max(0, this.warp - this.warpDecayPerSecond * deltaSec);
    } else if (this.warp < 0) {
      this.warp = Math.min(0, this.warp + this.warpDecayPerSecond * deltaSec);
    }
    this.material.uniforms.u_opacity.value = this.opacity;
    this.material.uniforms.u_warp.value = this.warp;
  }
  animate(now) {
    if (!this.running) return;
    requestAnimationFrame(this.animateBound);
    if (this.lastFrameMs === void 0) {
      this.lastFrameMs = now;
    }
    const elapsed = now - this.lastFrameMs;
    if (elapsed < this.minFrameInterval) {
      return;
    }
    const deltaMs = Math.min(elapsed, this.maxFrameInterval);
    const deltaSec = deltaMs / 1e3;
    this.lastFrameMs = now;
    perfMonitor_default.loopFrameStart("gradNoiseCanvas");
    const t = (now - this.timeStartMs) / 1e3;
    this.material.uniforms.u_time.value = t;
    this.material.uniforms.u_direction.value = this.direction;
    this.stepVisualState(deltaSec);
    const segRender = perfMonitor_default.segmentStart("gradNoiseCanvas", "render");
    this.renderer.render(this.scene, this.camera);
    perfMonitor_default.segmentEnd(segRender);
    if (this._resolveReady) {
      this._resolveReady();
      this._resolveReady = null;
      this.log("GradNoiseCanvas Ready");
    }
    perfMonitor_default.loopFrameEnd("gradNoiseCanvas");
  }
  //==============================================================================================
  // Legacy API (called by stateManager.ts)
  triggerWarp(reverse = false) {
    this.warp = reverse ? -1 : 1;
    this.log("Warp Triggered", { reverse: Number(reverse) });
  }
  setStarDirection(direction) {
    this.direction = direction >= 0 ? 1 : -1;
    this.log("Star Direction Set", { direction: this.direction });
  }
  reduceStars() {
    this.targetOpacity = DEFAULT_SETTINGS.reducedOpacity;
    this.log("Background Reduced", { opacity: this.targetOpacity });
  }
  restoreStars() {
    this.targetOpacity = 1;
    this.log("Background Restored", { opacity: this.targetOpacity });
  }
  setFrameCap(fps) {
    if (fps && fps > 0) {
      this.minFrameInterval = 1e3 / fps;
    } else {
      this.minFrameInterval = this.defaultFrameInterval;
    }
    this.log("Frame Cap Updated", { fps: fps ?? 0 });
  }
  destroy() {
    if (!this.running) return;
    this.running = false;
    window.removeEventListener("resize", this.onResizeBound);
    try {
      this.scene?.remove(this.mesh);
      this.mesh?.geometry?.dispose?.();
      this.material?.dispose?.();
      this.renderer?.dispose?.();
    } catch {
    }
    this.log("GradNoiseCanvas Destroyed");
  }
};
function createGradNoiseCanvas(canvas) {
  return new GradNoiseCanvas(canvas);
}
var gradNoiseCanvasInstance = null;
var pendingFrameCap = null;
window.addEventListener("load", () => {
  const canvas = document.getElementById("gnc");
  if (!canvas) {
    logEvent("gradNoiseCanvas", "Skipped", { reason: "no-canvas" });
    return;
  }
  gradNoiseCanvasInstance = createGradNoiseCanvas(canvas);
  if (pendingFrameCap !== null) {
    gradNoiseCanvasInstance.setFrameCap(pendingFrameCap);
  }
  window.gradNoiseCanvasInstance = gradNoiseCanvasInstance;
  logEvent("gradNoiseCanvas", "Instance Mounted", { type: "shader" });
});
function setGradNoiseCanvasFrameCap(fps) {
  pendingFrameCap = fps;
  if (gradNoiseCanvasInstance && typeof gradNoiseCanvasInstance.setFrameCap === "function") {
    gradNoiseCanvasInstance.setFrameCap(fps);
  }
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
  navLink: "a[data-wa-nav-id], a[data-nav-link], a.wa-navbar__link, a.url-link"
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
  className: "wa-navbar__surface url-display-glass",
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
        external: link.classList.contains("wa-navbar__link--external") || link.classList.contains("url-link-external")
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
          external: link.classList.contains("wa-navbar__link--external") || link.classList.contains("url-link-external")
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
      const shouldToggle = !!(target.closest(this.selectors.burger) || target.closest(".glass-surface") || target.closest(".wa-navbar__surface") || target.closest(".wa-navbar__main") || target.closest(".url-display-main"));
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
    const existingLinks = Array.from(container.querySelectorAll("a"));
    const existingById = /* @__PURE__ */ new Map();
    existingLinks.forEach((link) => {
      const id = this.readLinkId(link);
      if (id) existingById.set(id, link);
    });
    const nextLinks = [];
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
  buildItemElement(item, mobile) {
    const link = document.createElement("a");
    this.syncItemElement(link, item, mobile);
    return link;
  }
  getLinkClassName(item) {
    return item.className || [
      "wa-navbar__link",
      item.external ? "wa-navbar__link--external" : "",
      "url-link",
      item.external ? "url-link-external" : ""
    ].filter(Boolean).join(" ");
  }
  syncItemElement(link, item, mobile) {
    link.href = item.href;
    link.className = this.getLinkClassName(item);
    link.setAttribute("data-wa-nav-id", item.id);
    if (!item.className && item.id) {
      link.setAttribute("data-nav-link", item.id);
      link.classList.add(`wa-navbar__link--${item.id}`);
      link.classList.add(`url-link-${item.id}`);
    } else {
      link.removeAttribute("data-nav-link");
    }
    if (item.ariaLabel) link.setAttribute("aria-label", item.ariaLabel);
    else link.removeAttribute("aria-label");
    if (item.external) {
      link.target = item.target || "_blank";
      const rel = normalizeRel(item.rel, true);
      if (rel) link.rel = rel;
      else link.removeAttribute("rel");
    } else if (item.target) {
      link.target = item.target;
      link.removeAttribute("rel");
    } else {
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
    const iconSrc = mobile ? item.mobileIconSrc || item.iconSrc : item.iconSrc;
    const label = mobile ? item.mobileLabel || item.label : item.label;
    const hasExternalClass = link.classList.contains("wa-navbar__link--external") || link.classList.contains("url-link-external");
    let icon = link.querySelector(":scope > img");
    if (iconSrc) {
      if (!(icon instanceof HTMLImageElement)) {
        icon = document.createElement("img");
        link.prepend(icon);
      }
      icon.src = iconSrc;
      icon.alt = item.iconAlt || "";
      icon.width = 20;
      icon.height = 20;
    } else if (icon instanceof HTMLImageElement) {
      icon.remove();
    }
    let span = link.querySelector(":scope > span");
    if (!(span instanceof HTMLSpanElement)) {
      span = document.createElement("span");
      link.appendChild(span);
    }
    span.textContent = label;
    if (item.external || hasExternalClass) {
      const sup = document.createElement("sup");
      sup.className = "wa-navbar__link-external-sup url-link-external-sup";
      sup.setAttribute("aria-hidden", "true");
      sup.textContent = "\u2197";
      span.appendChild(document.createTextNode(" "));
      span.appendChild(sup);
    }
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

// ts/indium.ts
var observedPlayerbarRoots = /* @__PURE__ */ new WeakSet();
function applyBranding(appRoot, config) {
  const logoSrc = (config.brandLogoSrc || "").trim();
  const logoAlt = (config.brandLogoAlt || "Brand logo").trim();
  const marks = appRoot.querySelectorAll("[data-wa-brand-mark]");
  const logos = appRoot.querySelectorAll("[data-wa-brand-logo]");
  marks.forEach((mark) => {
    if (logoSrc) mark.removeAttribute("hidden");
    else mark.setAttribute("hidden", "true");
  });
  logos.forEach((logo) => {
    if (logoSrc) {
      logo.src = logoSrc;
      logo.alt = logoAlt;
      logo.removeAttribute("hidden");
    } else {
      logo.removeAttribute("src");
      logo.alt = "";
      logo.setAttribute("hidden", "true");
    }
  });
}
function computePlayerbarOffsetPx(appRoot) {
  const playerbar = appRoot.querySelector(".wa-playerbar") || document.querySelector(".wa-playerbar");
  if (!playerbar) return 0;
  const style = getComputedStyle(playerbar);
  if (style.display === "none" || style.visibility === "hidden") return 0;
  const rect = playerbar.getBoundingClientRect();
  if (rect.height <= 0) return 0;
  return Math.max(0, Math.ceil(window.innerHeight - rect.top));
}
function syncPlayerbarOffset(appRoot) {
  const offset = computePlayerbarOffsetPx(appRoot);
  appRoot.style.setProperty("--wa-playerbar-offset", `${offset}px`);
}
function ensurePlayerbarOffsetObserver(appRoot) {
  syncPlayerbarOffset(appRoot);
  if (observedPlayerbarRoots.has(appRoot)) return;
  observedPlayerbarRoots.add(appRoot);
  const onResize = () => syncPlayerbarOffset(appRoot);
  window.addEventListener("resize", onResize, { passive: true });
  const observer = new MutationObserver(() => syncPlayerbarOffset(appRoot));
  const observeRoot = document.body || appRoot;
  observer.observe(observeRoot, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden"]
  });
  requestAnimationFrame(() => syncPlayerbarOffset(appRoot));
  setTimeout(() => syncPlayerbarOffset(appRoot), 250);
}
function bootIndium(options = {}) {
  const { sidebar, ...configOptions } = options;
  const config = initIndiumConfig(configOptions);
  configureLegacyWindowDialogs(config.exposeLegacyWindowDialogs);
  if (typeof document === "undefined") {
    return {
      config,
      appRoot: null,
      sidebarController: null
    };
  }
  const appRoot = document.querySelector(config.appRootSelector);
  if (appRoot) {
    applyBranding(appRoot, config);
    ensurePlayerbarOffsetObserver(appRoot);
  }
  const sidebarController = appRoot && sidebar !== false ? createSidebarController({ appRoot, ...sidebar || {} }) : null;
  return {
    config,
    appRoot,
    sidebarController
  };
}
export {
  apiPath,
  assetPath,
  attachInfiniteScroll,
  bootIndium,
  createGlassSurface,
  createGradNoiseCanvas,
  createNavbarController,
  createSidebarController,
  getIndiumConfig,
  routePath,
  setGradNoiseCanvasFrameCap,
  setIndiumConfig,
  setIndiumLogger,
  showAlert,
  showConfirm,
  showPrompt
};
