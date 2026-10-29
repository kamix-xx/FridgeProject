// areas.js
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

    const shareModal = document.getElementById('shareAreaModal');
    const shareCodeInput = document.getElementById('shareCodeInput');
    const btnCopy = document.querySelector('.btn-copy');

    if (shareModal) {
        shareModal.addEventListener('show.bs.modal', function (event) {
            const openMenus = document.querySelectorAll('.gooey-chk:checked');
            openMenus.forEach(function (menu) {
                menu.checked = false;
            });

            const triggerEl = event.relatedTarget;
            const areaCardBtn = triggerEl ? triggerEl.closest('[data-area-key]') : null;
            const areaKey = areaCardBtn ? areaCardBtn.getAttribute('data-area-key') : '';

            if (shareCodeInput) {
                shareCodeInput.value = areaKey;
            }

            if (btnCopy) {
                btnCopy.innerHTML = '<i class="bi bi-copy"></i>';
            }
        });

        if (btnCopy && shareCodeInput) {
            btnCopy.addEventListener('click', function () {
                if (!shareCodeInput.value) return;

                navigator.clipboard.writeText(shareCodeInput.value).then(function () {
                    btnCopy.innerHTML = '<i class="bi bi-check-lg text-success"></i>';
                    if (typeof window.showNotification === 'function') {
                        window.showNotification('Area code copied to clipboard!', 'info');
                    }

                    setTimeout(function () {
                        btnCopy.innerHTML = '<i class="bi bi-copy"></i>';
                    }, 2000);
                }).catch(function (err) {
                    console.error('Failed to copy text: ', err);
                    if (typeof window.showNotification === 'function') {
                        window.showNotification('Could not copy area code to clipboard.', 'error');
                    }
                });
            });
        }
    }
});

document.addEventListener('DOMContentLoaded', function () {

    const deleteModal = document.getElementById('deleteAreaModal');
    if (deleteModal) {
        deleteModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const areaId = button.getAttribute('data-area-id');
            const hiddenInput = document.getElementById('deleteAreaId');
            if (hiddenInput && areaId) {
                hiddenInput.value = areaId;
            }
        });
    }

    // przypisanie ID + dotychczasowej nazwy
    const editModal = document.getElementById('editAreaModal');
    if (editModal) {
        editModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const areaId = button.getAttribute('data-area-id');
            const areaName = button.getAttribute('data-area-name');

            const hiddenInput = document.getElementById('editAreaIdHidden');
            const nameInput = document.getElementById('editAreaName');

            if (hiddenInput && areaId) hiddenInput.value = areaId;
            if (nameInput && areaName) nameInput.value = areaName;
        });
    }
});
