// Theme change:
// (The initial theme attribute is now set synchronously by an inline script in
// base.html's <head>, before first paint, to avoid a flash of the wrong theme.
// This just keeps the toggle button + icon in sync from here on.)

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

        themeIcon.className =
            theme === 'dark'
                ? 'bi bi-moon fs-5'
                : 'bi bi-sun fs-5';
    }

    function updateSideMenuThemeButtons(theme) {
        if (sideMenuLightBtn) {
            sideMenuLightBtn.classList.toggle(
                'active',
                theme === 'light'
            );
        }

        if (sideMenuDarkBtn) {
            sideMenuDarkBtn.classList.toggle(
                'active',
                theme === 'dark'
            );
        }
    }

    // Set the initial state
    const initialTheme = htmlTag.getAttribute('data-bs-theme') || 'light';

    updateMainThemeIcon(initialTheme);
    updateSideMenuThemeButtons(initialTheme);

    // Original navbar toggle
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme =
                htmlTag.getAttribute('data-bs-theme');

            const newTheme =
                currentTheme === 'dark'
                    ? 'light'
                    : 'dark';

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
    }
});


// Password visbility change:
function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input) return;

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