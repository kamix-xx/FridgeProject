document.addEventListener('DOMContentLoaded', function () {
    function isFromActions(e) {
        return !!e.target.closest('.product-row-actions');
    }

    function readEditPayload(row) {
        return {
            id: row.dataset.userProductId || row.dataset.productId || row.dataset.editId || '',
            code: row.dataset.editCode || '',
            name: row.dataset.editName || '',
            price: row.dataset.editPrice || '',
            quantity: row.dataset.editQuantity || '',
            unit: row.dataset.editUnit || '',
            expirationDate: row.dataset.editExpiration || '',
            area: row.dataset.editArea || '',
            areaId: row.dataset.editAreaId || '',
        };
    }

    function openEditForRow(row) {
        if (typeof window.openEditProductModal !== 'function') {
            return;
        }

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
            var row = trigger ? trigger.closest('.product-row') : null;
            
            var pId = (trigger && trigger.dataset.productId) || 
                      (row && row.dataset.userProductId) || 
                      (row && row.dataset.productId) || '';

            var name = (trigger && trigger.dataset.productDisplayName) || 
                       (row && row.dataset.editName) || 'this product';
                       
            var idInput = document.getElementById('deleteProductId');
            var nameEl = document.getElementById('deleteProductName');
            
            if (idInput) idInput.value = pId;
            if (nameEl) nameEl.textContent = name;
        });
    }
});