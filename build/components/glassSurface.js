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
export {
  createGlassSurface
};
