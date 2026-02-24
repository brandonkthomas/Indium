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
export {
  configureLegacyWindowDialogs,
  dialogManager,
  showAlert,
  showConfirm,
  showPrompt
};
