// ts/components/sidebar/sidebar.ts
var SidebarController = class {
  constructor(opts) {
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
    this.appRoot.dataset.waSidebarOpen = "true";
  }
  /**
   * Closes the sidebar
   */
  close() {
    delete this.appRoot.dataset.waSidebarOpen;
  }
  /**
   * Toggles open/closed
   */
  toggle() {
    const isOpen = this.appRoot.dataset.waSidebarOpen === "true";
    if (isOpen) this.close();
    else this.open();
  }
  /**
   * Binds click/escape handlers and auto-close on nav click
   */
  bind() {
    this.openBtn?.addEventListener("click", () => this.open());
    this.closeBtn?.addEventListener("click", () => this.close());
    this.overlay.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
    this.sidebar.addEventListener("click", (e) => {
      const t = e.target;
      if (t?.closest("[data-wa-nav]")) {
        this.close();
      }
    });
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
export {
  SidebarController,
  createSidebarController
};
