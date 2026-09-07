// areaCardLink.js
//
// Makes each .area-card on the Areas page clickable, sending the user to
// the dashboard already scrolled to that area's carousel panel (see
// dashboardAreaJump.js). Clicks inside the per-card gooey menu (share /
// edit / delete) are left alone so those buttons keep working as before.

document.addEventListener('DOMContentLoaded', function () {
    function navigateToArea(url) {
        if (window.SmartFridgePageTransition) {
            window.SmartFridgePageTransition.navigate(url);
            return;
        }

        window.location.href = url;
    }

    document.querySelectorAll('.area-card[data-area-link]').forEach(function (card) {
        function isFromGooeyMenu(e) {
            return !!e.target.closest('.gooey-menu');
        }

        card.addEventListener('click', function (e) {
            if (isFromGooeyMenu(e)) return;
            navigateToArea(card.dataset.areaLink);
        });

        card.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (isFromGooeyMenu(e)) return;
            e.preventDefault();
            navigateToArea(card.dataset.areaLink);
        });
    });
});
