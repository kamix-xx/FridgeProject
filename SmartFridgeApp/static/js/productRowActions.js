// productRowActions.js
//
// Each .product-row acts as its own "edit" trigger (click, or Enter/Space
// when focused) — clicks inside .product-row-actions (the gooey menu) are
// left alone there, since they've got their own listener below. Edit opens
// the shared #editProductModal (see window.openEditProductModal() in
// productModal.js), pre-filled from the row's data-edit-* attributes.
// Also fills in the shared #deleteProductModal with whichever product's
// delete button was clicked, using Bootstrap's show.bs.modal event.

document.addEventListener('DOMContentLoaded', function () {
    function isFromActions(e) {
        return !!e.target.closest('.product-row-actions');
    }

    function readEditPayload(row) {
        return {
            code: row.dataset.editCode || '',
            name: row.dataset.editName || '',
            price: row.dataset.editPrice || '',
            quantity: row.dataset.editQuantity || '',
            unit: row.dataset.editUnit || '',
            expirationDate: row.dataset.editExpiration || '',
            area: row.dataset.editArea || '',
        };
    }

    function openEditForRow(row) {
        if (typeof window.openEditProductModal !== 'function') {
            return;
        }

        // Close the gooey menu first, if it was open, so it's not still
        // sitting there (checked) the next time this row is expanded.
        var gooeyChk = row.querySelector('.gooey-chk');
        if (gooeyChk) {
            gooeyChk.checked = false;
        }

        window.openEditProductModal(readEditPayload(row));
    }

    document.querySelectorAll('.product-row').forEach(function (row) {
        row.addEventListener('click', function (e) {
            if (isFromActions(e)) return;
            openEditForRow(row);
        });

        row.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (isFromActions(e)) return;
            e.preventDefault();
            openEditForRow(row);
        });
    });

    document.querySelectorAll('.product-row-actions .item-edit').forEach(function (editBtn) {
        editBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var row = editBtn.closest('.product-row');
            if (row) {
                openEditForRow(row);
            }
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
