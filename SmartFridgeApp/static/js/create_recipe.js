document.addEventListener('DOMContentLoaded', function () {
    const addBtn = document.getElementById('addIngBtn');
    const nameInput = document.getElementById('addIngName');
    const qtyInput = document.getElementById('addIngQty');
    const unitInput = document.getElementById('addIngUnit');
    const listContainer = document.getElementById('recipeIngredientsList');

    const form = document.getElementById('createRecipeForm');
    const ingredientsDataInput = document.getElementById('ingredientsData');

    // Tablica przechowująca dodane składniki w pamięci
    let ingredientsArray = [];

    if (!addBtn) return;

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function addIngredient() {
        const name = nameInput.value.trim();
        const qty = qtyInput.value.trim();
        const unit = unitInput.value;

        if (!name || !qty || !unit) {
            nameInput.focus();
            return;
        }

        // 1. Zapis do tablicy obiektów
        const ingredientObj = { name: name, quantity: parseFloat(qty), unit: unit };
        ingredientsArray.push(ingredientObj);

        // 2. Dodanie wiersza do UI
        const newRow = document.createElement('div');
        newRow.className = 'recipe-ingredient-grid existing-row align-items-center mb-2';

        newRow.innerHTML = `
            <div class="ingredient-text">${escapeHTML(name)}</div>
            <div class="ingredient-text text-center">${escapeHTML(qty)}</div>
            <div class="ingredient-text text-center">${escapeHTML(unit)}</div>
            <button type="button" class="btn btn-recipe-row-action btn-danger shadow-none delete-ing-btn">
                <i class="bi bi-trash"></i>
            </button>
        `;

        // 3. Usuwanie wiersza (z UI i z tablicy w pamięci)
        const deleteBtn = newRow.querySelector('.delete-ing-btn');
        deleteBtn.addEventListener('click', function () {
            const index = ingredientsArray.indexOf(ingredientObj);
            if (index > -1) {
                ingredientsArray.splice(index, 1);
            }
            newRow.remove();
        });

        listContainer.appendChild(newRow);
        listContainer.scrollTop = listContainer.scrollHeight;

        // 4. Czyszczenie inputów
        nameInput.value = '';
        qtyInput.value = '';
        unitInput.value = '';
        nameInput.focus();
    }

    addBtn.addEventListener('click', addIngredient);

    [nameInput, qtyInput, unitInput].forEach(input => {
        if (input) {
            input.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addIngredient();
                }
            });
        }
    });

    const existingDeleteBtns = listContainer.querySelectorAll('.delete-ing-btn');
    existingDeleteBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            btn.closest('.existing-row').remove();
        });
    });

    // ---------------------------------------------------------
    // PODGLĄD ZDJĘCIA W LOCIE
    // ---------------------------------------------------------
    const thumbnailInput = document.getElementById('recipeThumbnail');
    const thumbnailPreview = document.getElementById('recipeThumbnailPreview');
    const iconsPlaceholder = document.getElementById('thumbnailIconsPlaceholder');

    if (thumbnailInput && thumbnailPreview) {
        thumbnailInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (file) {
                const objectUrl = URL.createObjectURL(file);
                thumbnailPreview.src = objectUrl;
                thumbnailPreview.classList.remove('d-none');
                if (iconsPlaceholder) iconsPlaceholder.classList.add('d-none');
            }
        });
    }

    // ---------------------------------------------------------
    // KONWERSJA DO JSON PRZY WYSYŁANIU FORMULARZA
    // ---------------------------------------------------------
    if (form) {
        form.addEventListener('submit', function (e) {
            // Zabezpieczenie: jeśli wpisano dane w inputy, ale zapomniano wcisnąć "+", dopiszmy je przed wysłaniem
            const pendingName = nameInput.value.trim();
            const pendingQty = qtyInput.value.trim();
            const pendingUnit = unitInput.value;

            if (pendingName && pendingQty && pendingUnit) {
                ingredientsArray.push({
                    name: pendingName,
                    quantity: parseFloat(pendingQty),
                    unit: pendingUnit
                });
            }

            if (ingredientsDataInput) {
                ingredientsDataInput.value = JSON.stringify(ingredientsArray);
            }
        });
    }
});