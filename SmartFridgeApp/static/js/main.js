// =========================================
// Theme change
// =========================================
// The initial theme attribute is set synchronously by an inline script in
// base.html's <head>, before first paint, to avoid a flash of the wrong theme.
// This just keeps the toggle button + icon in sync from here on.

document.addEventListener('DOMContentLoaded', () => {
    const htmlTag = document.documentElement;

    // Original navbar theme toggle
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    // Duplicate theme controls beside the side menu
    const sideMenuLightBtn = document.getElementById('sideMenuLightBtn');
    const sideMenuDarkBtn = document.getElementById('sideMenuDarkBtn');

    function updateTheme(theme) {
        htmlTag.setAttribute('data-bs-theme', theme);

        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            // Ignore storage errors
        }

        updateMainThemeIcon(theme);
        updateSideMenuThemeButtons(theme);
    }

    function updateMainThemeIcon(theme) {
        if (!themeIcon) return;

        themeIcon.className = theme === 'dark' ? 'bi bi-moon fs-5' : 'bi bi-sun fs-5';
    }

    function updateSideMenuThemeButtons(theme) {
        if (sideMenuLightBtn) {
            sideMenuLightBtn.classList.toggle('active', theme === 'light');
        }

        if (sideMenuDarkBtn) {
            sideMenuDarkBtn.classList.toggle('active', theme === 'dark');
        }
    }

    // Set the initial state
    const initialTheme = htmlTag.getAttribute('data-bs-theme') || 'light';

    updateMainThemeIcon(initialTheme);
    updateSideMenuThemeButtons(initialTheme);

    // Original navbar toggle
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlTag.getAttribute('data-bs-theme');

            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            updateTheme(newTheme);
        });
    }

    // Duplicate light button
    if (sideMenuLightBtn) {
        sideMenuLightBtn.addEventListener('click', () => {
            updateTheme('light');
        });
    }

    // Duplicate dark button
    if (sideMenuDarkBtn) {
        sideMenuDarkBtn.addEventListener('click', () => {
            updateTheme('dark');
        });
    }


    // =========================================
    // Side Menu
    // =========================================

    const sideMenuEl = document.getElementById('sideMenu');

    if (sideMenuEl) {
        sideMenuEl.addEventListener('show.bs.offcanvas', () => {
            document.body.classList.add('side-menu-open');
        });

        sideMenuEl.addEventListener('hide.bs.offcanvas', () => {
            document.body.classList.remove('side-menu-open');
        });

        // Open the menu by dragging/swiping inward from the actual viewport's
        // right edge. Use documentElement.clientWidth rather than innerWidth:
        // mobile browsers can include browser/UI areas in innerWidth differently.
        // This works on touch devices and with a mouse drag on desktop.
        const edgeWidth = 100;
        const minimumSwipeDistance = 45;
        let pointerStart = null;
        let touchStart = null;

        function viewportWidth() {
            return document.documentElement.clientWidth || window.innerWidth;
        }

        function canStartEdgeSwipe(x) {
            return !sideMenuEl.classList.contains('show')
                && x >= viewportWidth() - edgeWidth
                && x <= viewportWidth();
        }

        function openMenuIfSwipe(start, endX, endY) {
            if (!start || sideMenuEl.classList.contains('show')) return;

            const deltaX = endX - start.x;
            const deltaY = endY - start.y;
            const swipedLeft = deltaX <= -minimumSwipeDistance;
            const mostlyHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.15;

            if (!swipedLeft || !mostlyHorizontal) return;

            if (window.bootstrap && window.bootstrap.Offcanvas) {
                window.bootstrap.Offcanvas.getOrCreateInstance(sideMenuEl).show();
            } else {
                document.getElementById('menu')?.click();
            }
        }

        // Pointer Events cover desktop mouse dragging and most modern touch browsers.
        document.addEventListener('pointerdown', (event) => {
            pointerStart = null;
            if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
            if (canStartEdgeSwipe(event.clientX)) {
                pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
            }
        }, { passive: true });

        document.addEventListener('pointerup', (event) => {
            if (!pointerStart || event.pointerId !== pointerStart.id) return;
            const start = pointerStart;
            pointerStart = null;
            openMenuIfSwipe(start, event.clientX, event.clientY);
        }, { passive: true });

        document.addEventListener('pointercancel', () => { pointerStart = null; }, { passive: true });

        // Touch fallback for browsers where touch input isn't reported consistently
        // through Pointer Events. No edge inset is used, so the gesture can start
        // right at the screen/viewport edge.
        document.addEventListener('touchstart', (event) => {
            touchStart = null;
            if (event.touches.length !== 1 || !event.changedTouches.length) return;
            const touch = event.changedTouches[0];
            if (canStartEdgeSwipe(touch.clientX)) {
                touchStart = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
            }
        }, { passive: true });

        document.addEventListener('touchend', (event) => {
            if (!touchStart || !event.changedTouches.length) return;
            const touch = Array.from(event.changedTouches).find(item => item.identifier === touchStart.id);
            if (!touch) return;
            const start = touchStart;
            touchStart = null;
            openMenuIfSwipe(start, touch.clientX, touch.clientY);
        }, { passive: true });

        document.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
    }
});



// =========================================
// Password visibility
// =========================================

function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);

    if (!input) {
        return;
    }

    if (input.type === 'password') {
        input.type = 'text';

        iconElement.classList.remove('bi-eye-slash');

        iconElement.classList.add('bi-eye');
    } else {
        input.type = 'password';

        iconElement.classList.remove('bi-eye');

        iconElement.classList.add('bi-eye-slash');
    }
}