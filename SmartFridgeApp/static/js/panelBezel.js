// =========================================
// Dashboard panel bezel
// -----------------------------------------
// - Opens on hover (mouse) or on tap / Enter (touch, keyboard)
// - Closes on leave (after a short grace period), outside tap, Escape,
//   or after one of its navigation / modal buttons is used
// - Measures the open width AND height so the tab fits its buttons exactly
// - Owns the search-bar toggle
// =========================================
(function () {
    'use strict';

    const LEAVE_DELAY_MS = 260;   // grace period before a hover-opened bezel folds shut
    const SEARCH_FOCUS_DELAY_MS = 180;

    function init() {
        const panel = document.querySelector('.fridge-panel.has-bezel');
        const bezel = document.getElementById('panelBezel');
        if (!panel || !bezel) return;

        const body = panel.querySelector('.fridge-panel-body');
        const handle = document.getElementById('bezelHandle');
        const actions = document.getElementById('bezelActions');
        const searchBtn = document.getElementById('searchToggleBtn');
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        const searchWrapper = document.getElementById('searchWrapper');
        const searchInput = document.getElementById('productSearch');
        if (!body || !handle || !actions) return;

        let pinned = false;     // opened by tap / keyboard: stays open until dismissed
        let leaveTimer = null;

        const isOpen = () => panel.classList.contains('is-bezel-open');

        function setOpen(open) {
            panel.classList.toggle('is-bezel-open', open);
            handle.setAttribute('aria-expanded', String(open));
            handle.setAttribute('aria-label', open ? 'Close dashboard menu' : 'Open dashboard menu');
            actions.toggleAttribute('inert', !open);
            if (!open) pinned = false;
        }

        // -----------------------------------------
        // Measure both Width & Height dynamically
        // -----------------------------------------
        function measure() {
            const styles = getComputedStyle(panel);
            const r = parseFloat(styles.getPropertyValue('--bz-r')) || 10;
            const closedW = parseFloat(styles.getPropertyValue('--bz-closed-w')) || 76;

            bezel.classList.add('is-measuring');
            const naturalW = Math.ceil(actions.getBoundingClientRect().width);
            const naturalH = Math.ceil(actions.getBoundingClientRect().height);
            bezel.classList.remove('is-measuring');

            // keep clear of the panel's own rounded corners (12px) on both sides
            const available = Math.floor(body.clientWidth - 2 * r - 2 * 12 - 8);
            const width = Math.max(closedW, Math.min(naturalW, available));

            panel.style.setProperty('--bz-open-w', width + 'px');
            panel.style.setProperty('--bz-open-h', naturalH + 'px');
        }

        measure();
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(measure);
        }

        if (typeof ResizeObserver !== 'undefined') {
            let lastWidth = 0;
            new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.contentRect.width !== lastWidth) {
                        lastWidth = entry.contentRect.width;
                        measure();
                    }
                }
            }).observe(body);
        } else {
            window.addEventListener('resize', measure);
        }

        // -----------------------------------------
        // Mouse: hover
        // -----------------------------------------
        bezel.addEventListener('pointerenter', (e) => {
            if (e.pointerType !== 'mouse') return;
            clearTimeout(leaveTimer);
            setOpen(true);
        });

        bezel.addEventListener('pointerleave', (e) => {
            if (e.pointerType !== 'mouse' || pinned) return;
            clearTimeout(leaveTimer);
            leaveTimer = setTimeout(() => setOpen(false), LEAVE_DELAY_MS);
        });

        // -----------------------------------------
        // Touch / keyboard: the handle toggles it
        // -----------------------------------------
        handle.addEventListener('click', (e) => {
            clearTimeout(leaveTimer);
            if (isOpen()) {
                setOpen(false);
                return;
            }
            setOpen(true);
            pinned = true;

            if (e.detail === 0) {
                const first = actions.querySelector('a, button');
                if (first) first.focus();
            }
        });

        document.addEventListener('pointerdown', (e) => {
            const clickedSearch = searchWrapper && searchWrapper.contains(e.target);

            if (isOpen() && !bezel.contains(e.target) && !clickedSearch) {
                clearTimeout(leaveTimer);
                setOpen(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || !isOpen()) return;
            const hadFocus = bezel.contains(document.activeElement);
            clearTimeout(leaveTimer);
            setOpen(false);
            if (hadFocus) handle.focus();
        });

        // Navigation / modal buttons: close once used.
        actions.addEventListener('click', (e) => {
            const btn = e.target.closest('.bezel-btn');
            // Do not auto-close for search or view toggle
            if (!btn || btn === searchBtn || btn === viewToggleBtn) {
                if (btn === searchBtn || btn === viewToggleBtn) pinned = true;
                return;
            }
            clearTimeout(leaveTimer);
            setOpen(false);
        });

        // -----------------------------------------
        // Search bar toggle
        // -----------------------------------------
        function setSearch(open) {
            if (!searchWrapper) return;

            searchWrapper.classList.toggle('is-collapsed', !open);
            searchWrapper.toggleAttribute('inert', !open);
            if (searchBtn) searchBtn.setAttribute('aria-pressed', String(open));

            if (!open && searchInput && searchInput.value) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input', {bubbles: true}));
            }

            if (open && searchInput) {
                setTimeout(() => searchInput.focus({preventScroll: true}), SEARCH_FOCUS_DELAY_MS);
            }
        }

        if (searchBtn && searchWrapper) {
            searchBtn.addEventListener('click', () => {
                pinned = true;
                setSearch(searchWrapper.classList.contains('is-collapsed'));
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();