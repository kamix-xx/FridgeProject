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

    // Edit Area modal is one shared modal reused by every card's gooey
    // "edit" button, so on open we pull the clicked button's data-area-*
    // attributes to pre-fill the name field.
    var editAreaModalEl = document.getElementById('editAreaModal');
    if (editAreaModalEl) {
        editAreaModalEl.addEventListener('show.bs.modal', function (e) {
            var trigger = e.relatedTarget;
            if (!trigger) return;

            editAreaModalEl.dataset.areaId = trigger.dataset.areaId || '';

            var nameInput = document.getElementById('editAreaName');
            if (nameInput) nameInput.value = trigger.dataset.areaName || '';

            // "Stop sharing" toggle — commented out along with the button
            // itself in areas.html until Area has a real owner field.
            // var stopSharingWrap = document.getElementById('stopSharingAreaWrap');
            // if (stopSharingWrap) {
            //     var canStopSharing = trigger.dataset.areaShared === 'true'
            //         && trigger.dataset.areaOwner === 'true';
            //     stopSharingWrap.classList.toggle('d-none', !canStopSharing);
            // }
        });
    }
});