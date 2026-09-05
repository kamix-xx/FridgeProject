// productRowActions.js
//
// Each .product-row now acts as its own "edit" trigger (click, or
// Enter/Space when focused) — clicks inside .product-row-actions (the
// delete button) are left alone. Also fills in the shared
// #deleteProductModal with whichever product's delete button was
// clicked, using Bootstrap's show.bs.modal event.

document.addEventListener('DOMContentLoaded', function () {
    function isFromActions(e) {
        return !!e.target.closest('.product-row-actions');
    }

    document.querySelectorAll('.product-row[data-edit-href]').forEach(function (row) {
        row.addEventListener('click', function (e) {
            if (isFromActions(e)) return;
            window.location.href = row.dataset.editHref;
        });

        row.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (isFromActions(e)) return;
            e.preventDefault();
            window.location.href = row.dataset.editHref;
        });
    });

    var deleteModal = document.getElementById('deleteProductModal');
    if (deleteModal) {
        deleteModal.addEventListener('show.bs.modal', function (event) {
            var trigger = event.relatedTarget;
            var name = trigger && trigger.dataset.productDisplayName;
            var nameEl = document.getElementById('deleteProductName');
            if (nameEl) {
                nameEl.textContent = name || 'this product';
            }
        });
    }
});
