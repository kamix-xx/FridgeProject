document.addEventListener('DOMContentLoaded', function() {
    const addBtn = document.getElementById('addIngBtn');
    const nameInput = document.getElementById('addIngName');
    const qtyInput = document.getElementById('addIngQty');
    const unitInput = document.getElementById('addIngUnit');
    const listContainer = document.getElementById('recipeIngredientsList');

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

        const deleteBtn = newRow.querySelector('.delete-ing-btn');
        deleteBtn.addEventListener('click', function() {
            newRow.remove();
        });

        listContainer.appendChild(newRow);

        listContainer.scrollTop = listContainer.scrollHeight;

        nameInput.value = '';
        qtyInput.value = '';
        unitInput.value = '';
        nameInput.focus();
    }

    addBtn.addEventListener('click', addIngredient);

    [nameInput, qtyInput, unitInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addIngredient();
            }
        });
    });

    const existingDeleteBtns = listContainer.querySelectorAll('.delete-ing-btn');
    existingDeleteBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            btn.closest('.existing-row').remove();
        });
    });
});