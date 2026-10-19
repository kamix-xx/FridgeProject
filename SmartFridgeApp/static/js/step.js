document.addEventListener('DOMContentLoaded', function () {
    const stepModal = document.getElementById('stepModal');
    if (!stepModal) return;

    const form = document.getElementById('stepForm');
    const modalTitle = document.getElementById('stepModalTitle');
    const nameInput = document.getElementById('stepNameInput');
    const descInput = document.getElementById('stepDescInput');
    const picInput = document.getElementById('stepPictureInput');
    const submitIcon = document.getElementById('stepSubmitIcon');

    // Obsługa wywołania modala (Dynamiczne ładowanie danych kroku)
    stepModal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;
        const mode = button.getAttribute('data-mode');
        const actionUrl = button.getAttribute('data-action-url');

        form.setAttribute('action', actionUrl);
        if (picInput) picInput.value = '';

        // Pobieramy elementy uniwersalnego wgrywania dla tego modala
        const uploadContainer = stepModal.querySelector('.universal-image-upload');
        const previewImg = uploadContainer ? uploadContainer.querySelector('.img-preview') : null;
        const placeholder = uploadContainer ? uploadContainer.querySelector('.img-placeholder') : null;
        const removeBtn = uploadContainer ? uploadContainer.querySelector('.img-remove-btn') : null;
        const removeFlag = uploadContainer ? uploadContainer.querySelector('.img-remove-flag') : null;

        if (mode === 'edit') {
            modalTitle.textContent = 'Edit step';
            submitIcon.className = 'bi bi-floppy';

            nameInput.value = button.getAttribute('data-title');
            descInput.value = button.getAttribute('data-desc');

            const imgUrl = button.getAttribute('data-img');

            if (imgUrl) {
                if (previewImg) {
                    previewImg.src = imgUrl;
                    previewImg.classList.remove('d-none');
                }
                if (placeholder) placeholder.classList.add('d-none');
                if (removeBtn) {
                    removeBtn.classList.remove('d-none');
                    removeBtn.classList.add('d-flex');
                }
            } else {
                if (previewImg) {
                    previewImg.src = '';
                    previewImg.classList.add('d-none');
                }
                if (placeholder) placeholder.classList.remove('d-none');
                if (removeBtn) {
                    removeBtn.classList.add('d-none');
                    removeBtn.classList.remove('d-flex');
                }
            }
            if (removeFlag) removeFlag.value = 'false';

        } else {
            // Tryb ADD - czyszczenie pól
            modalTitle.textContent = 'Add step';
            submitIcon.className = 'bi bi-plus';
            form.reset();

            if (previewImg) {
                previewImg.src = '';
                previewImg.classList.add('d-none');
            }
            if (placeholder) placeholder.classList.remove('d-none');
            if (removeBtn) {
                removeBtn.classList.add('d-none');
                removeBtn.classList.remove('d-flex');
            }
            if (removeFlag) removeFlag.value = 'false';
        }
    });

    // 2. Dynamiczna lista składników (Dodawanie / Usuwanie) w trybie Edycji Przepisu
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

    // 3. Budowanie JSONa ze zaktualizowanymi składnikami przy zapisie przepisu
    const editForm = document.getElementById('editRecipeForm');

    if (editForm) {
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