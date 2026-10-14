document.addEventListener('DOMContentLoaded', function() {
    // Zasilenie modala edycji jednostki
    const editUnitModal = document.getElementById('editGlobalUnitModal');
    if (editUnitModal) {
        editUnitModal.addEventListener('show.bs.modal', function(event) {
            const btn = event.relatedTarget;
            document.getElementById('editGlobalUnitId').value = btn.getAttribute('data-unit-id');
            document.getElementById('editGlobalUnitSymbol').value = btn.getAttribute('data-unit-symbol');
        });
    }

    // Nadpisanie formularza pod konkretną akcję
    const uniModal = document.getElementById('universalConfirmModal');
    if (uniModal) {
        uniModal.addEventListener('show.bs.modal', function(event) {
            const btn = event.relatedTarget;
            const form = document.getElementById('confirmModalForm');
            const actionUrl = btn.getAttribute('data-action');
            if (actionUrl && form) {
                form.action = actionUrl;
            }


            const itemId = btn.getAttribute('data-item-id');
            const hiddenId = document.getElementById('confirmModalItemId');
            if(itemId && hiddenId) hiddenId.value = itemId;
        });
    }
});
