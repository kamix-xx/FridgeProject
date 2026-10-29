// =========================================
// Dashboard panel bezel
// -----------------------------------------
// - Opens on hover (mouse) or on tap / Enter (touch, keyboard)
// - Closes on leave (after a short grace period), outside tap, Escape,
//   or after one of its navigation / modal buttons is used
// - Measures the open width so the tab fits its buttons exactly
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
        // Width: fit the buttons, but never wider than the panel allows
        // -----------------------------------------
        function measure() {
            const styles = getComputedStyle(panel);
            const r = parseFloat(styles.getPropertyValue('--bz-r')) || 10;
            const closedW = parseFloat(styles.getPropertyValue('--bz-closed-w')) || 76;

            bezel.classList.add('is-measuring');
            const natural = Math.ceil(actions.getBoundingClientRect().width);
            bezel.classList.remove('is-measuring');

            // keep clear of the panel's own rounded corners (12px) on both sides
            const available = Math.floor(body.clientWidth - 2 * r - 2 * 12 - 8);
            const width = Math.max(closedW, Math.min(natural, available));

            panel.style.setProperty('--bz-open-w', width + 'px');
        }

        measure();
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(measure);
        }

        // --- REPLACE THE RESIZE OBSERVER WITH THIS ---
        if (typeof ResizeObserver !== 'undefined') {
            let lastWidth = 0;
            new ResizeObserver((entries) => {
                for (const entry of entries) {
                    // Only remeasure if the width actually changed
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

            // e.detail === 0 means keyboard-activated: move focus into the menu
            if (e.detail === 0) {
                const first = actions.querySelector('a, button');
                if (first) first.focus();
            }
        });

        // Tap / click anywhere else closes it
        document.addEventListener('pointerdown', (e) => {
            const clickedSearch = searchWrapper && searchWrapper.contains(e.target);

            // Do not close the menu if the user is clicking inside the search bar
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

        // Navigation / modal buttons: close once used. (The search toggle
        // stays open so its state change is visible.)
        actions.addEventListener('click', (e) => {
            const btn = e.target.closest('.bezel-btn');
            if (!btn || btn === searchBtn) return;
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
                // Hiding the bar also drops the filter, so products can't stay
                // hidden behind a search the user can no longer see.
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input', {bubbles: true}));
            }

            if (open && searchInput) {
                setTimeout(() => searchInput.focus({preventScroll: true}), SEARCH_FOCUS_DELAY_MS);
            }
        }

        if (searchBtn && searchWrapper) {
            searchBtn.addEventListener('click', () => {
                pinned = true; // Pin the menu open so mouse-leave doesn't close it
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