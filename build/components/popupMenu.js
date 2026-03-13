// ts/components/popupMenu.ts
var MOBILE_BREAKPOINT = "(max-width: 820px)";
function createElement(tag, classNames, attrs) {
  const el = document.createElement(tag);
  if (classNames?.length) el.classList.add(...classNames);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}
function resolveAnchor(anchor) {
  if (typeof anchor === "string") {
    return document.querySelector(anchor);
  }
  return anchor instanceof HTMLElement ? anchor : null;
}
function getPlacementOrder(preferred) {
  const order = [preferred, "top", "bottom", "left", "right"];
  return order.filter((placement, index) => order.indexOf(placement) === index);
}
var PopupMenuManager = class {
  constructor() {
    this.activeClose = null;
  }
  open(options) {
    this.activeClose?.();
    const anchor = resolveAnchor(options.anchor);
    if (!anchor) {
      return { close: () => {
      } };
    }
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    const overlay = createElement("div", [
      "ui-popupmenu-overlay",
      isMobile ? "ui-popupmenu-overlay--mobile" : "ui-popupmenu-overlay--desktop"
    ]);
    const menu = createElement("section", [
      "ui-popupmenu",
      isMobile ? "ui-popupmenu--dialog" : "ui-popupmenu--floating"
    ], {
      role: "menu",
      "aria-label": options.title || "Menu"
    });
    const list = createElement("div", ["ui-popupmenu-list"]);
    if (isMobile && options.title) {
      const title = createElement("h2", ["ui-popupmenu-title"]);
      title.textContent = options.title;
      menu.appendChild(title);
    }
    const close = () => {
      cleanup();
      overlay.remove();
      this.activeClose = null;
    };
    for (const item of options.items) {
      const button = createElement("button", ["ui-popupmenu-item"], {
        type: "button",
        role: "menuitem"
      });
      if (item.disabled) button.disabled = true;
      if (item.iconSrc) {
        const icon = createElement("img", ["ui-popupmenu-item__icon"], {
          src: item.iconSrc,
          alt: "",
          "aria-hidden": "true"
        });
        button.appendChild(icon);
      }
      const label = createElement("span", ["ui-popupmenu-item__label"]);
      label.textContent = item.title;
      button.appendChild(label);
      button.addEventListener("click", async () => {
        if (item.disabled) return;
        if (options.closeOnSelect !== false) close();
        await item.onSelect?.();
      });
      list.appendChild(button);
    }
    menu.appendChild(list);
    overlay.appendChild(menu);
    document.body.appendChild(overlay);
    if (isMobile) {
      document.documentElement.classList.add("ui-popupmenu-open");
      document.body.classList.add("ui-popupmenu-open");
    } else {
      positionMenu(menu, anchor, options.preferredPlacement || "right", options.offset ?? 10);
    }
    const onOverlayClick = (event) => {
      if (event.target === overlay) close();
    };
    const onKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    const onWindowChange = () => {
      if (window.matchMedia(MOBILE_BREAKPOINT).matches) return;
      positionMenu(menu, anchor, options.preferredPlacement || "right", options.offset ?? 10);
    };
    const cleanup = () => {
      overlay.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
      document.documentElement.classList.remove("ui-popupmenu-open");
      document.body.classList.remove("ui-popupmenu-open");
    };
    overlay.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);
    requestAnimationFrame(() => {
      overlay.classList.add("is-visible");
      const firstButton = menu.querySelector(".ui-popupmenu-item:not(:disabled)");
      firstButton?.focus();
    });
    this.activeClose = close;
    return { close };
  }
};
function positionMenu(menu, anchor, preferredPlacement, offset) {
  const rect = anchor.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const gap = 12;
  const maxX = window.innerWidth - menuRect.width - gap;
  const maxY = window.innerHeight - menuRect.height - gap;
  const candidates = getPlacementOrder(preferredPlacement).map((placement) => {
    switch (placement) {
      case "left":
        return {
          placement,
          left: rect.left - menuRect.width - offset,
          top: rect.bottom - menuRect.height
        };
      case "top":
        return {
          placement,
          left: rect.right - menuRect.width,
          top: rect.top - menuRect.height - offset
        };
      case "bottom":
        return {
          placement,
          left: rect.right - menuRect.width,
          top: rect.bottom + offset
        };
      case "right":
      default:
        return {
          placement: "right",
          left: rect.right + offset,
          top: rect.bottom - menuRect.height
        };
    }
  });
  const fitting = candidates.find((candidate) => candidate.left >= gap && candidate.top >= gap && candidate.left + menuRect.width <= window.innerWidth - gap && candidate.top + menuRect.height <= window.innerHeight - gap);
  const fallback = fitting || candidates[0];
  menu.style.left = `${Math.max(gap, Math.min(maxX, fallback.left))}px`;
  menu.style.top = `${Math.max(gap, Math.min(maxY, fallback.top))}px`;
}
var popupMenuManager = new PopupMenuManager();
function openPopupMenu(options) {
  return popupMenuManager.open(options);
}
export {
  openPopupMenu
};
