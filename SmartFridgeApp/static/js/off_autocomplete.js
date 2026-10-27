document.addEventListener('DOMContentLoaded', () => {
    // Helper to get fresh elements right when we need them
    const getEl = (id) => document.getElementById(id);

    // OpenFoodFacts Fetcher
    const fetchBarcodeData = (barcodeToFetch, prefix) => {
        const codeInput = getEl(`${prefix}ProductCode`);
        const nameInput = getEl(`${prefix}ProductName`);
        const enterBtn = getEl(`${prefix}ProductCodeEnter`);
        const categoryInput = getEl(`${prefix}ProductCategory`);

        const kcalInput = getEl(`${prefix}ProductKcal`);
        const proteinsInput = getEl(`${prefix}ProductProteins`);
        const fatsInput = getEl(`${prefix}ProductFats`);
        const nutriscoreInput = getEl(`${prefix}ProductNutriscore`);
        const hiddenBarcode = prefix === 'add' ? getEl('addHiddenBarcode') : null;

        const barcode = barcodeToFetch || (codeInput ? codeInput.value.trim() : '');
        if (!barcode) return;

        let originalIcon = '';
        if (enterBtn && !barcodeToFetch) {
            originalIcon = enterBtn.innerHTML;
            enterBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            enterBtn.disabled = true;
        }

       fetch(`/api/off-barcode/${barcode}/`)
            .then(res => {
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Product not found");
                    throw new Error("Server error");
                }
                return res.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);

                if (hiddenBarcode) hiddenBarcode.value = data.barcode;
                if (codeInput && !barcodeToFetch) codeInput.value = data.barcode;
                if (nameInput && !nameInput.value) nameInput.value = data.name;

                if (kcalInput) kcalInput.value = data.kcal;
                if (proteinsInput) proteinsInput.value = data.proteins;
                if (fatsInput) fatsInput.value = data.fats;
                if (nutriscoreInput) nutriscoreInput.value = data.nutriscore;

                // Save category and visually update custom dropdown
                if (categoryInput && data.category) {
                    categoryInput.value = data.category;
                    const catMenu = getEl(`${prefix}CategoryMenu`);
                    if (catMenu) {
                        const option = catMenu.querySelector(`.category-option[data-category="${data.category}"]`);
                        if (option) {
                            const btnText = getEl(`${prefix}SelectedCategoryText`);
                            if (btnText) btnText.innerHTML = option.innerHTML;
                        }
                    }
                }
            })
            .catch(err => {
                console.warn("Barcode fetch error:", err);
                alert("Product not found in the database. You can still fill in the details manually!");
            })
            .finally(() => {
                if (enterBtn && !barcodeToFetch) {
                    enterBtn.innerHTML = originalIcon;
                    enterBtn.disabled = false;
                }
            });
    };

    // Attach listeners for Add Modal
    const addEnterBtn = getEl('addProductCodeEnter');
    const addCodeInput = getEl('addProductCode');
    if (addEnterBtn && addCodeInput) {
        addEnterBtn.addEventListener('click', () => fetchBarcodeData(null, 'add'));
        addCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                fetchBarcodeData(null, 'add');
            }
        });
    }

    // Attach listeners for Edit Modal
    const editEnterBtn = getEl('editProductCodeEnter');
    const editCodeInput = getEl('editProductCode');
    if (editEnterBtn && editCodeInput) {
        editEnterBtn.addEventListener('click', () => fetchBarcodeData(null, 'edit'));
        editCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                fetchBarcodeData(null, 'edit');
            }
        });
    }

    // Live Search Autocomplete (Attached to Add Modal)
    const addNameInput = getEl('addProductName');
    if (addNameInput) {
        const suggestionsWrapper = document.createElement('div');
        suggestionsWrapper.className = 'dropdown-menu w-100 shadow-sm border-0';
        suggestionsWrapper.style.position = 'absolute';
        suggestionsWrapper.style.zIndex = '1050';

        addNameInput.parentNode.style.position = 'relative';
        addNameInput.parentNode.appendChild(suggestionsWrapper);

        let debounceTimer;

        addNameInput.addEventListener('input', function () {
            const query = this.value.trim();

            if (query.length < 3) {
                suggestionsWrapper.classList.remove('show');
                return;
            }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetch(`/api/off-search/?q=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(data => {
                        suggestionsWrapper.innerHTML = '';

                        if (data.results && data.results.length > 0) {
                            data.results.forEach(product => {
                                const item = document.createElement('a');
                                item.className = 'dropdown-item d-flex align-items-center gap-2 py-2 cursor-pointer';
                                item.href = '#';

                                const imgHtml = product.image_url
                                    ? `<img src="${product.image_url}" alt="" style="width: 30px; height: 30px; object-fit: contain; border-radius: 4px;">`
                                    : `<div style="width: 30px; height: 30px; background: #f0f0f0; border-radius: 4px; display:flex; align-items:center; justify-content:center;"><i class="bi bi-box text-muted"></i></div>`;

                                const brandHtml = product.brand ? `<small class="text-muted d-block" style="font-size: 0.75rem;">${product.brand}</small>` : '';

                                item.innerHTML = `
                                    ${imgHtml}
                                    <div class="text-truncate">
                                        <span class="d-block fw-medium">${product.name}</span>
                                        ${brandHtml}
                                    </div>
                                `;

                                item.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    addNameInput.value = product.name;
                                    suggestionsWrapper.classList.remove('show');

                                    if (product.barcode) {
                                        const hiddenBc = getEl('addHiddenBarcode');
                                        const codeInp = getEl('addProductCode');
                                        if (hiddenBc) hiddenBc.value = product.barcode;
                                        if (codeInp) codeInp.value = product.barcode;
                                        // Trigger fetch and explicitly flag this as an "add" modal action
                                        fetchBarcodeData(product.barcode, 'add');
                                    }
                                });

                                suggestionsWrapper.appendChild(item);
                            });
                            suggestionsWrapper.classList.add('show');
                        } else {
                            suggestionsWrapper.classList.remove('show');
                        }
                    })
                    .catch(err => console.error(err));
            }, 800);
        });

        document.addEventListener('click', (e) => {
            if (!addNameInput.contains(e.target) && !suggestionsWrapper.contains(e.target)) {
                suggestionsWrapper.classList.remove('show');
            }
        });
    }
});

// Modal Cleanup & Icon Reset
const resetModal = (prefix) => {
    const form = document.getElementById(`${prefix}ProductForm`);
    if (form) form.reset();

    const codeInput = document.getElementById(`${prefix}ProductCode`);
    if (codeInput) codeInput.value = '';

    const catInput = document.getElementById(`${prefix}ProductCategory`);
    const catText = document.getElementById(`${prefix}SelectedCategoryText`);
    if (catInput) catInput.value = 'other';
    if (catText) catText.innerHTML = '<i class="bi bi-basket2-fill fs-5"></i> Other';

    if (prefix === 'add') {
        const nameInput = document.getElementById('addProductName');
        if (nameInput && nameInput.parentNode) {
            const suggestions = nameInput.parentNode.querySelector('.dropdown-menu');
            if (suggestions) suggestions.classList.remove('show');
        }
    }
};

const addProductModal = document.getElementById('addProductModal');
if (addProductModal) {
    addProductModal.addEventListener('hidden.bs.modal', () => resetModal('add'));
}

const editProductModal = document.getElementById('editProductModal');
if (editProductModal) {
    editProductModal.addEventListener('hidden.bs.modal', () => resetModal('edit'));
}

// // Force the edit modal's visual category dropdown to sync when opening an item
// document.addEventListener('click', function(e) {
//     const editBtn = e.target.closest('.item-edit');
//     if (editBtn) {
//         const row = editBtn.closest('.product-row');
//         if (row) {
//             const category = row.getAttribute('data-edit-category') || 'other';
//             const editCategoryInput = document.getElementById('editProductCategory');
//             const editMenu = document.getElementById('editCategoryMenu');
//             const editBtnText = document.getElementById('editSelectedCategoryText');
//
//             if (editCategoryInput) editCategoryInput.value = category;
//             if (editMenu && editBtnText) {
//                 const option = editMenu.querySelector(`.category-option[data-category="${category}"]`);
//                 if (option) editBtnText.innerHTML = option.innerHTML;
//             }
//         }
//     }
// });