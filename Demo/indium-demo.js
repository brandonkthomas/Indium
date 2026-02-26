(async function () {
    const {
        attachInfiniteScroll,
        bootIndium,
        createGlassSurface,
        createNavbarController,
        showAlert,
        showConfirm,
        showPrompt
    } = await import('/apps/indium/dist/indium.js');

    const ALLOWED_VIEWS = ['home', 'search', 'library', 'components'];
    const VIEW_LABELS = {
        home: 'Home',
        search: 'Search',
        library: 'Library',
        components: 'Components'
    };

    const BREADCRUMB_PATHS = {
        home: ['home'],
        search: ['home', 'search'],
        library: ['home', 'library'],
        components: ['home', 'components']
    };

    const boot = bootIndium({
        routeRoot: '/indium',
        assetBasePath: '/apps/indium',
        brandLogoSrc: '/apps/indium/assets/branding/indium-branding-512.png',
        brandLogoAlt: 'Indium logo'
    });

    const appRoot = boot.appRoot;
    if (!appRoot) return;

    const versionEl = appRoot.querySelector('[data-wa-version]');
    if (versionEl) {
        versionEl.textContent = `v${boot.config.version}`;
    }

    const viewHost = appRoot.querySelector('[data-wa-view-host]');
    if (!(viewHost instanceof HTMLElement)) return;

    const recentItems = Array.from({ length: 120 }, (_, i) => ({
        title: `Recent Track ${String(i + 1).padStart(3, '0')}`,
        meta: `Artist ${((i % 12) + 1)} · ${2020 + (i % 6)}`
    }));

    const libraryItems = Array.from({ length: 180 }, (_, i) => ({
        title: `Library Item ${String(i + 1).padStart(3, '0')}`,
        meta: `Playlist ${((i % 15) + 1)} · ${20 + (i % 40)} tracks`
    }));

    const searchable = [...recentItems, ...libraryItems];
    const state = {
        currentView: 'home',
        recentCursor: 0,
        recentLoading: false,
        libraryCursor: 0,
        libraryLoading: false,
        libraryThrottleEnabled: false,
        recentController: null,
        libraryController: null,
        history: ['home'],
        historyIndex: 0,
        currentCleanup: null
    };

    function wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function chunk(source, start, size) {
        return source.slice(start, Math.min(start + size, source.length));
    }

    function createListItem(item) {
        const row = document.createElement('div');
        row.className = 'wa-listitem';

        const title = document.createElement('div');
        title.className = 'wa-listitem__title';
        title.textContent = item.title;

        const meta = document.createElement('div');
        meta.className = 'wa-listitem__meta';
        meta.textContent = item.meta;

        row.append(title, meta);
        return row;
    }

    function cleanupCurrentView() {
        if (typeof state.currentCleanup === 'function') {
            state.currentCleanup();
        }
        state.currentCleanup = null;

        state.recentController?.destroy?.();
        state.libraryController?.destroy?.();
        state.recentController = null;
        state.libraryController = null;
    }

    function setHistoryButtonState() {
        const canGoBack = state.historyIndex > 0;
        const canGoForward = state.historyIndex < state.history.length - 1;

        appRoot.querySelectorAll('[data-wa-nav-back]').forEach((el) => {
            if (el instanceof HTMLButtonElement) {
                el.disabled = !canGoBack;
            }
        });

        appRoot.querySelectorAll('[data-wa-nav-forward]').forEach((el) => {
            if (el instanceof HTMLButtonElement) {
                el.disabled = !canGoForward;
            }
        });
    }

    function renderBreadcrumbs(view) {
        const crumbs = appRoot.querySelector('[data-wa-breadcrumbs]');
        if (!(crumbs instanceof HTMLElement)) return;

        crumbs.replaceChildren();
        const path = BREADCRUMB_PATHS[view] || [view];

        path.forEach((segment, index) => {
            const isCurrent = index === path.length - 1;
            const label = VIEW_LABELS[segment] || segment;

            const item = document.createElement('button');
            item.type = 'button';
            item.className = `wa-breadcrumbs__item ${isCurrent ? 'wa-breadcrumbs__item--current' : 'wa-breadcrumbs__item--link'}`;
            item.textContent = label;

            if (!isCurrent) {
                item.setAttribute('data-wa-breadcrumb-target', segment);
            } else {
                item.disabled = true;
            }

            crumbs.appendChild(item);

            if (!isCurrent) {
                const sep = document.createElement('span');
                sep.className = 'wa-breadcrumbs__sep';
                sep.textContent = '/';
                crumbs.appendChild(sep);
            }
        });
    }

    function setActiveNav(view) {
        appRoot.querySelectorAll('[data-wa-nav]').forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            const active = el.getAttribute('data-wa-nav') === view;
            if (el.classList.contains('wa-sidenav__link')) {
                if (active) el.setAttribute('data-wa-active', 'true');
                else el.removeAttribute('data-wa-active');
            }
        });

        const titleEl = appRoot.querySelector('[data-wa-topbar-title]');
        if (titleEl) {
            titleEl.textContent = VIEW_LABELS[view] || view;
        }

        renderBreadcrumbs(view);
    }

    function mountView(view, animate = true) {
        const target = ALLOWED_VIEWS.includes(view) ? view : 'home';
        const tpl = document.getElementById(`wa-tpl-${target}`);
        if (!(tpl instanceof HTMLTemplateElement)) return;

        cleanupCurrentView();

        const fragment = tpl.content.cloneNode(true);
        const mount = document.createElement('div');
        mount.className = 'wa-view-mount';
        if (animate) {
            mount.classList.add('wa-view-mount--initial');
        }
        mount.appendChild(fragment);
        viewHost.replaceChildren(mount);

        if (animate) {
            requestAnimationFrame(() => {
                mount.classList.add('wa-view-mount--enter');
                mount.classList.remove('wa-view-mount--initial');
            });
        }

        appRoot.setAttribute('data-wa-view', target);
        state.currentView = target;
        setActiveNav(target);

        if (target === 'home') initHome();
        if (target === 'search') initSearch();
        if (target === 'library') initLibrary();
        if (target === 'components') {
            state.currentCleanup = initComponents();
        }
    }

    function navigateTo(view, options = {}) {
        const target = ALLOWED_VIEWS.includes(view) ? view : 'home';
        const pushHistory = options.pushHistory !== false;
        const animate = options.animate !== false;

        if (pushHistory) {
            const current = state.history[state.historyIndex];
            if (current !== target) {
                state.history = state.history.slice(0, state.historyIndex + 1);
                state.history.push(target);
                state.historyIndex = state.history.length - 1;
            }
        }

        mountView(target, animate);
        setHistoryButtonState();
    }

    function navigateBack() {
        if (state.historyIndex <= 0) return;
        state.historyIndex -= 1;
        navigateTo(state.history[state.historyIndex], { pushHistory: false });
    }

    function navigateForward() {
        if (state.historyIndex >= state.history.length - 1) return;
        state.historyIndex += 1;
        navigateTo(state.history[state.historyIndex], { pushHistory: false });
    }

    function initDialogCard(root) {
        if (!(root instanceof HTMLElement)) return;

        const dialogAlertBtn = root.querySelector('[data-wa-dialog-alert]');
        const dialogAlertDangerBtn = root.querySelector('[data-wa-dialog-alert-danger]');
        const dialogConfirmBtn = root.querySelector('[data-wa-dialog-confirm]');
        const dialogPromptBtn = root.querySelector('[data-wa-dialog-prompt]');
        const dialogBackdropBtn = root.querySelector('[data-wa-dialog-setting-backdrop]');
        const dialogResult = root.querySelector('[data-wa-dialog-result]');
        let dialogBackdropClose = true;

        const setDialogResult = (text) => {
            if (dialogResult instanceof HTMLElement) {
                dialogResult.textContent = text;
            }
        };

        if (dialogBackdropBtn instanceof HTMLElement) {
            dialogBackdropBtn.addEventListener('click', () => {
                dialogBackdropClose = !dialogBackdropClose;
                dialogBackdropBtn.textContent = `Backdrop Close: ${dialogBackdropClose ? 'On' : 'Off'}`;
            });
        }

        if (dialogAlertBtn instanceof HTMLElement) {
            dialogAlertBtn.addEventListener('click', async () => {
                await showAlert({
                    title: 'Dialog Alert',
                    message: 'showAlert(info) resolved successfully.',
                    variant: 'info',
                    allowBackdropClose: dialogBackdropClose
                });
                setDialogResult('showAlert(info) resolved: void');
            });
        }

        if (dialogAlertDangerBtn instanceof HTMLElement) {
            dialogAlertDangerBtn.addEventListener('click', async () => {
                await showAlert({
                    title: 'Dialog Alert (Danger)',
                    message: 'showAlert(danger) resolved successfully.',
                    variant: 'danger',
                    allowBackdropClose: dialogBackdropClose
                });
                setDialogResult('showAlert(danger) resolved: void');
            });
        }

        if (dialogConfirmBtn instanceof HTMLElement) {
            dialogConfirmBtn.addEventListener('click', async () => {
                const result = await showConfirm({
                    title: 'Dialog Confirm',
                    message: 'showConfirm returns true/false.',
                    allowBackdropClose: dialogBackdropClose
                });
                setDialogResult(`showConfirm resolved: ${String(result)}`);
            });
        }

        if (dialogPromptBtn instanceof HTMLElement) {
            dialogPromptBtn.addEventListener('click', async () => {
                const value = await showPrompt({
                    title: 'Dialog Prompt',
                    message: 'showPrompt returns string|null.',
                    defaultValue: 'indium',
                    placeholder: 'Enter value',
                    allowBackdropClose: dialogBackdropClose
                });
                setDialogResult(`showPrompt resolved: ${value === null ? 'null' : value}`);
            });
        }
    }

    function initHome() {
        const root = viewHost.querySelector('[data-wa-view="home"]');
        const listEl = root?.querySelector('[data-wa-list="recent"]');
        if (!(listEl instanceof HTMLElement)) return;

        state.recentCursor = 0;
        state.recentLoading = false;
        listEl.replaceChildren();

        initDialogCard(root);

        const pageSize = 20;
        const loadMore = async () => {
            if (state.recentLoading) return;
            state.recentLoading = true;
            await wait(120);
            const next = chunk(recentItems, state.recentCursor, pageSize);
            state.recentCursor += next.length;
            for (const item of next) {
                listEl.appendChild(createListItem(item));
            }
            state.recentLoading = false;
        };

        state.recentController = attachInfiniteScroll({
            listEl,
            loadMore,
            hasMore: () => state.recentCursor < recentItems.length,
            isLoading: () => state.recentLoading
        });

        void loadMore();
    }

    function initSearch() {
        const root = viewHost.querySelector('[data-wa-view="search"]');
        const input = root?.querySelector('[data-wa-search-input]');
        const status = root?.querySelector('[data-wa-search-status]');
        const resultCard = root?.querySelector('[data-wa-search-results-card]');
        const resultList = root?.querySelector('[data-wa-search-results]');

        if (!(input instanceof HTMLInputElement)
            || !(status instanceof HTMLElement)
            || !(resultCard instanceof HTMLElement)
            || !(resultList instanceof HTMLElement)) {
            return;
        }

        const render = () => {
            const query = input.value.trim().toLowerCase();
            resultList.replaceChildren();

            if (!query) {
                resultCard.style.display = 'none';
                status.textContent = '';
                return;
            }

            const matches = searchable
                .filter((item) =>
                    item.title.toLowerCase().includes(query)
                    || item.meta.toLowerCase().includes(query))
                .slice(0, 40);

            status.textContent = `${matches.length} result(s) for "${query}"`;
            resultCard.style.display = 'block';
            for (const item of matches) {
                resultList.appendChild(createListItem(item));
            }
        };

        input.addEventListener('input', render);
        input.focus();
    }

    function initLibrary() {
        const root = viewHost.querySelector('[data-wa-view="library"]');
        const listEl = root?.querySelector('[data-wa-list="library"]');
        const throttleToggle = root?.querySelector('[data-wa-library-throttle-toggle]');
        const throttleStatus = root?.querySelector('[data-wa-library-throttle-status]');
        if (!(listEl instanceof HTMLElement)) return;

        state.libraryCursor = 0;
        state.libraryLoading = false;
        listEl.replaceChildren();

        function syncLibraryThrottleUi() {
            if (throttleToggle instanceof HTMLInputElement) {
                throttleToggle.checked = state.libraryThrottleEnabled;
            }
            if (throttleStatus instanceof HTMLElement) {
                throttleStatus.textContent = state.libraryThrottleEnabled
                    ? 'Throttle on (900ms/page).'
                    : 'Throttle off (120ms/page).';
            }
        }

        if (throttleToggle instanceof HTMLInputElement) {
            throttleToggle.addEventListener('change', () => {
                state.libraryThrottleEnabled = throttleToggle.checked;
                syncLibraryThrottleUi();
            });
        }

        const pageSize = 24;
        const loadMore = async () => {
            if (state.libraryLoading) return;
            state.libraryLoading = true;
            await wait(state.libraryThrottleEnabled ? 900 : 120);
            const next = chunk(libraryItems, state.libraryCursor, pageSize);
            state.libraryCursor += next.length;
            for (const item of next) {
                listEl.appendChild(createListItem(item));
            }
            state.libraryLoading = false;
        };

        state.libraryController = attachInfiniteScroll({
            listEl,
            loadMore,
            hasMore: () => state.libraryCursor < libraryItems.length,
            isLoading: () => state.libraryLoading
        });

        syncLibraryThrottleUi();
        void loadMore();
    }

    function initComponents() {
        const root = viewHost.querySelector('[data-wa-view="components"]');
        if (!(root instanceof HTMLElement)) return null;

        const navbarRoot = root.querySelector('[data-wa-components-navbar-root]');
        const navbarStatus = root.querySelector('[data-wa-nav-status]');
        const navbarRel = root.querySelector('[data-wa-nav-rel]');
        const navbarRecreateBtn = root.querySelector('[data-wa-nav-setting-recreate]');
        const navbarMenuBtn = root.querySelector('[data-wa-nav-setting-menu]');
        const navbarActiveBtn = root.querySelector('[data-wa-nav-setting-active]');
        const navbarExternalBtn = root.querySelector('[data-wa-nav-setting-external]');

        const glassHost = root.querySelector('[data-wa-components-glass-host]');
        const glassStatus = root.querySelector('[data-wa-glass-status]');
        const glassCreateBtn = root.querySelector('[data-wa-glass-setting-create]');
        const glassDestroyBtn = root.querySelector('[data-wa-glass-setting-destroy]');

        const inputToggle = root.querySelector('[data-wa-input-toggle]');
        const inputToggleLarge = root.querySelector('[data-wa-input-toggle-large]');
        const inputStatus = root.querySelector('[data-wa-input-status]');
        const inputDisableBtn = root.querySelector('[data-wa-input-setting-disable]');
        const inputSampleButtons = Array.from(root.querySelectorAll('[data-wa-input-sample-btn]'));

        let navbarController = null;
        let navbarMenuOpen = false;
        let navbarActiveState = 'photos';
        let navbarIncludeExternal = true;

        let glassInstance = null;
        let inputsDisabled = false;

        function isMobileViewport() {
            return typeof window !== 'undefined'
                && typeof window.matchMedia === 'function'
                && window.matchMedia('(max-width: 768px)').matches;
        }

        function syncNavbarUi() {
            if (!(navbarStatus instanceof HTMLElement)) return;

            const mobile = isMobileViewport();
            const isOpen = navbarRoot instanceof HTMLElement && navbarRoot.classList.contains('wa-navbar--open');
            navbarStatus.textContent = mobile
                ? `active=${navbarActiveState} | externalLink=${navbarIncludeExternal} | menuOpen=${isOpen}`
                : `active=${navbarActiveState} | externalLink=${navbarIncludeExternal}`;

            if (navbarRel instanceof HTMLElement && navbarRoot instanceof HTMLElement) {
                const ext = navbarRoot.querySelector('a[data-wa-nav-id="docs"]');
                navbarRel.textContent = ext instanceof HTMLAnchorElement
                    ? `external rel="${ext.rel}"`
                    : 'external rel=(not rendered)';
            }

            if (navbarMenuBtn instanceof HTMLElement) {
                navbarMenuBtn.style.display = mobile ? '' : 'none';
            }
        }

        function syncNavbarViewportState() {
            if (isMobileViewport()) {
                syncNavbarUi();
                return;
            }

            navbarMenuOpen = false;
            navbarController?.close?.();
            syncNavbarUi();
        }

        function buildNavbarItems() {
            const items = [
                {
                    id: 'photos',
                    label: 'Photos',
                    href: '/photos',
                    iconSrc: '/apps/indium/assets/svg/search-filled.svg'
                },
                {
                    id: 'projects',
                    label: 'Projects',
                    href: '/projects',
                    iconSrc: '/apps/indium/assets/svg/playlist-filled.svg'
                }
            ];

            if (navbarIncludeExternal) {
                items.push({
                    id: 'docs',
                    label: 'Docs',
                    href: 'https://example.com/docs',
                    iconSrc: '/apps/indium/assets/svg/song-filled.svg',
                    external: true,
                    rel: 'ugc'
                });
            }

            return items;
        }

        function mountNavbarController() {
            if (!(navbarRoot instanceof HTMLElement)) return;
            navbarController?.destroy?.();
            navbarController = createNavbarController({
                root: navbarRoot,
                enableGlass: false,
                onNavigate: () => 'prevent'
            });
            navbarController.setItems(buildNavbarItems());
            if (navbarActiveState === 'none') {
                navbarController.setActive(null);
            } else {
                navbarController.setActive(navbarActiveState);
            }
            if (navbarMenuOpen && isMobileViewport()) navbarController.open();
            else {
                navbarMenuOpen = false;
                navbarController.close();
            }
            syncNavbarUi();
        }

        function cycleNavbarActive() {
            if (navbarActiveState === 'photos') navbarActiveState = 'projects';
            else if (navbarActiveState === 'projects') navbarActiveState = 'none';
            else navbarActiveState = 'photos';

            if (!navbarController) return;
            if (navbarActiveState === 'none') {
                navbarController.setActive(null);
            } else {
                navbarController.setActive(navbarActiveState);
            }
            syncNavbarUi();
        }

        if (navbarRecreateBtn instanceof HTMLElement) {
            navbarRecreateBtn.addEventListener('click', mountNavbarController);
        }
        if (navbarMenuBtn instanceof HTMLElement) {
            navbarMenuBtn.addEventListener('click', () => {
                if (!navbarController) return;
                if (!isMobileViewport()) return;
                navbarMenuOpen = !navbarMenuOpen;
                if (navbarMenuOpen) navbarController.open();
                else navbarController.close();
                syncNavbarUi();
            });
        }
        if (navbarActiveBtn instanceof HTMLElement) {
            navbarActiveBtn.addEventListener('click', cycleNavbarActive);
        }
        if (navbarExternalBtn instanceof HTMLElement) {
            navbarExternalBtn.addEventListener('click', () => {
                navbarIncludeExternal = !navbarIncludeExternal;
                mountNavbarController();
            });
        }

        function syncGlassUi() {
            if (!(glassStatus instanceof HTMLElement)) return;
            glassStatus.textContent = glassInstance ? 'active' : 'inactive';
        }

        function destroyGlass() {
            glassInstance?.destroy?.();
            if (glassInstance?.element?.parentNode) {
                glassInstance.element.parentNode.removeChild(glassInstance.element);
            }
            glassInstance = null;
            syncGlassUi();
        }

        function createOrRefreshGlass() {
            if (!(glassHost instanceof HTMLElement)) return;
            destroyGlass();
            glassInstance = createGlassSurface({
                width: '100%',
                height: 120,
                borderRadius: 14,
                className: 'wa-components-glass-instance'
            });
            glassInstance.contentElement.innerHTML = '<p class="wa-copy" style="margin:0">Glass surface active.</p>';
            glassHost.appendChild(glassInstance.element);
            syncGlassUi();
        }

        if (glassCreateBtn instanceof HTMLElement) {
            glassCreateBtn.addEventListener('click', createOrRefreshGlass);
        }
        if (glassDestroyBtn instanceof HTMLElement) {
            glassDestroyBtn.addEventListener('click', destroyGlass);
        }

        initDialogCard(root);

        function syncInputsUi() {
            if (inputDisableBtn instanceof HTMLElement) {
                inputDisableBtn.textContent = `Toggle Disabled State (${inputsDisabled ? 'On' : 'Off'})`;
            }

            if (inputToggle instanceof HTMLInputElement) {
                inputToggle.disabled = inputsDisabled;
            }
            if (inputToggleLarge instanceof HTMLInputElement) {
                inputToggleLarge.disabled = inputsDisabled;
            }

            inputSampleButtons.forEach((btn) => {
                if (!(btn instanceof HTMLButtonElement)) return;
                btn.disabled = inputsDisabled;
            });

            if (inputStatus instanceof HTMLElement) {
                const small = inputToggle instanceof HTMLInputElement ? inputToggle.checked : false;
                const large = inputToggleLarge instanceof HTMLInputElement ? inputToggleLarge.checked : false;
                inputStatus.textContent = `disabled=${inputsDisabled} | defaultToggle=${small} | largeToggle=${large}`;
            }
        }

        if (inputToggle instanceof HTMLInputElement) {
            inputToggle.addEventListener('change', syncInputsUi);
        }
        if (inputToggleLarge instanceof HTMLInputElement) {
            inputToggleLarge.addEventListener('change', syncInputsUi);
        }
        if (inputDisableBtn instanceof HTMLElement) {
            inputDisableBtn.addEventListener('click', () => {
                inputsDisabled = !inputsDisabled;
                syncInputsUi();
            });
        }

        mountNavbarController();
        syncNavbarUi();
        syncGlassUi();
        syncInputsUi();

        window.addEventListener('resize', syncNavbarViewportState, { passive: true });

        return () => {
            window.removeEventListener('resize', syncNavbarViewportState);
            navbarController?.destroy?.();
            navbarController = null;
            destroyGlass();
        };
    }

    appRoot.addEventListener('click', (event) => {
        const backBtn = event.target instanceof Element
            ? event.target.closest('[data-wa-nav-back]')
            : null;
        if (backBtn) {
            event.preventDefault();
            navigateBack();
            return;
        }

        const forwardBtn = event.target instanceof Element
            ? event.target.closest('[data-wa-nav-forward]')
            : null;
        if (forwardBtn) {
            event.preventDefault();
            navigateForward();
            return;
        }

        const breadcrumb = event.target instanceof Element
            ? event.target.closest('[data-wa-breadcrumb-target]')
            : null;
        if (breadcrumb) {
            event.preventDefault();
            const nextView = breadcrumb.getAttribute('data-wa-breadcrumb-target') || 'home';
            navigateTo(nextView);
            return;
        }

        const target = event.target instanceof Element
            ? event.target.closest('[data-wa-nav]')
            : null;
        if (!target) return;

        event.preventDefault();
        const nextView = target.getAttribute('data-wa-nav') || 'home';
        navigateTo(nextView);
    });

    navigateTo('home', { pushHistory: false, animate: false });
})();
