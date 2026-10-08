document.addEventListener('DOMContentLoaded', function () {
    const stepModal = document.getElementById('stepModal');
    if (!stepModal) return;

    const form = document.getElementById('stepForm');
    const modalTitle = document.getElementById('stepModalTitle');
    const nameInput = document.getElementById('stepNameInput');
    const descInput = document.getElementById('stepDescInput');
    const picInput = document.getElementById('stepPictureInput');
    const picPreview = document.getElementById('stepPicturePreview');
    const iconsPlaceholder = document.getElementById('stepIconsPlaceholder');
    const submitIcon = document.getElementById('stepSubmitIcon');

    const deleteModal = document.getElementById('universalDeleteModal');
    if (!deleteModal) return;

    const deleteForm = document.getElementById('deleteModalForm');
    const deleteTitle = document.getElementById('deleteModalTitle');

    // Obsługa wywołania modala
    stepModal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;

        const mode = button.getAttribute('data-mode');
        const actionUrl = button.getAttribute('data-action-url');

        form.setAttribute('action', actionUrl);
        picInput.value = '';

        if (mode === 'edit') {
            modalTitle.textContent = 'Edit step';
            submitIcon.className = 'bi bi-floppy';

            nameInput.value = button.getAttribute('data-title');
            descInput.value = button.getAttribute('data-desc');

            const imgUrl = button.getAttribute('data-img');
            if (imgUrl) {
                picPreview.src = imgUrl;
                picPreview.classList.remove('d-none');
                iconsPlaceholder.classList.add('d-none');
            } else {
                picPreview.src = '';
                picPreview.classList.add('d-none');
                iconsPlaceholder.classList.remove('d-none');
            }
        } else {
            // Tryb ADD - czyszczenie pól
            modalTitle.textContent = 'Add step';
            submitIcon.className = 'bi bi-plus';
            form.reset();
            picPreview.src = '';
            picPreview.classList.add('d-none');
            iconsPlaceholder.classList.remove('d-none');
        }
    });

    // Podgląd zdjęcia kroku w locie (Add / Edit step)
    if (picInput && picPreview) {
        picInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (file) {
                picPreview.src = URL.createObjectURL(file);
                picPreview.classList.remove('d-none');
                if (iconsPlaceholder) {
                    iconsPlaceholder.classList.add('d-none');
                }
            }
        });
    }

    // 1. Podgląd zdjęcia w locie
    const editRecipePicInput = document.getElementById('editRecipePicInput');
    const editRecipePicPreview = document.getElementById('editRecipePicPreview');

    if (editRecipePicInput && editRecipePicPreview) {
        editRecipePicInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (file) {
                editRecipePicPreview.src = URL.createObjectURL(file);
            }
        });
    }

    // 2. Dynamiczna lista składników (Dodawanie / Usuwanie) w trybie Edycji
    const editAddIngBtn = document.getElementById('editAddIngBtn');
    const editIngList = document.getElementById('editRecipeIngredientsList');

    if (editAddIngBtn && editIngList) {
        editAddIngBtn.addEventListener('click', function () {
            const nameInput = document.getElementById('editAddIngName');
            const qtyInput = document.getElementById('editAddIngQty');
            const unitInput = document.getElementById('editAddIngUnit');

            const name = nameInput.value.trim();
            const qty = qtyInput.value;
            const unit = unitInput.value;

            if (name && qty && unit) {
                const row = document.createElement('div');
                row.className = 'recipe-ingredient-grid existing-row align-items-center mb-2';
                row.innerHTML = `
                    <div class="ingredient-text text-truncate px-1" title="${name}">${name}</div>
                    <div class="ingredient-text text-center">${qty}</div>
                    <div class="ingredient-text text-center">${unit}</div>
                    <button type="button" class="btn btn-recipe-row-action btn-danger shadow-none delete-ing-btn">
                        <i class="bi bi-trash"></i>
                    </button>
                `;

                // Przypinamy usuwanie do nowego wiersza
                row.querySelector('.delete-ing-btn').addEventListener('click', function () {
                    row.remove();
                });

                editIngList.appendChild(row);

                // Czyszczenie pól wejściowych po dodaniu
                nameInput.value = '';
                qtyInput.value = '';
                unitInput.value = '';
            }
        });

        // Obsługa usuwania dla składników, które załadowały się już z bazy w HTML
        editIngList.querySelectorAll('.delete-ing-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                this.closest('.existing-row').remove();
            });
        });
    }

    // 3. Budowanie JSONa ze zaktualizowanymi składnikami przy zapisie
    const editForm = document.getElementById('editRecipeForm');

    if (editForm) {
        // Upewnijmy się, że w HTML modala edycji istnieje ten input.
        // Jeśli nie, dodaj go przed </form>: <input type="hidden" name="ingredients_data" id="editIngredientsData">
        const editIngredientsDataInput = document.getElementById('editIngredientsData');

        editForm.addEventListener('submit', function (e) {
            let updatedIngredients = [];

            // Pobieramy to co zostało po usunięciu/dodaniu w liście
            if (editIngList) {
                const rows = editIngList.querySelectorAll('.existing-row');
                rows.forEach(row => {
                    const texts = row.querySelectorAll('.ingredient-text');
                    if (texts.length >= 3) {
                        updatedIngredients.push({
                            name: texts[0].innerText.trim(),
                            quantity: parseFloat(texts[1].innerText.trim()),
                            unit: texts[2].innerText.trim()
                        });
                    }
                });
            }

            // Dodajemy to, co uzytkownik wpisał na dole, ale zapomniał wcisnąć "+"
            const pendingName = document.getElementById('editAddIngName');
            const pendingQty = document.getElementById('editAddIngQty');
            const pendingUnit = document.getElementById('editAddIngUnit');

            if (pendingName && pendingQty && pendingUnit) {
                if (pendingName.value.trim() && pendingQty.value && pendingUnit.value) {
                    updatedIngredients.push({
                        name: pendingName.value.trim(),
                        quantity: parseFloat(pendingQty.value),
                        unit: pendingUnit.value
                    });
                }
            }

            // Pakujemy i wysyłamy do backendu
            if (editIngredientsDataInput) {
                editIngredientsDataInput.value = JSON.stringify(updatedIngredients);
            }
        });
    }

});

// Obsługa uniwersalnego modala usuwania (scoped lokalnie do step.js)
document.addEventListener('show.bs.modal', function (e) {
    const targetModal = e.target;
    if (!targetModal || targetModal.id !== 'universalDeleteModal') return;

    const triggerBtn = e.relatedTarget;
    if (!triggerBtn) return;

    const actionUrl = triggerBtn.getAttribute('data-action-url');
    const titleText = triggerBtn.getAttribute('data-title');

    const deleteForm = document.getElementById('deleteModalForm');
    const deleteTitle = document.getElementById('deleteModalTitle');

    if (deleteForm && actionUrl) {
        deleteForm.setAttribute('action', actionUrl);
    }
    if (deleteTitle && titleText) {
        deleteTitle.textContent = titleText;
    }
});