document.addEventListener('click', function (event) {
    // Find all checkboxes that are currently checked (menus that are open)
    const openMenus = document.querySelectorAll('.gooey-chk:checked');

    openMenus.forEach(function (menu) {
        // Find the parent .gooey-menu container for the checked input
        const gooeyContainer = menu.closest('.gooey-menu');

        // If the click target is NOT inside this specific menu, close it
        if (gooeyContainer && !gooeyContainer.contains(event.target)) {
            menu.checked = false;
        }
    });
});