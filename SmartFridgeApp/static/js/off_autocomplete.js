document.addEventListener('DOMContentLoaded', () => {

    const nameInput = document.getElementById('addProductName');
    if (!nameInput) return;


    const suggestionsWrapper = document.createElement('div');
    suggestionsWrapper.className = 'dropdown-menu w-100 shadow-sm border-0';
    suggestionsWrapper.style.position = 'absolute';
    suggestionsWrapper.style.zIndex = '1050';


    nameInput.parentNode.style.position = 'relative';
    nameInput.parentNode.appendChild(suggestionsWrapper);

    let debounceTimer;

    nameInput.addEventListener('input', function() {
        const query = this.value.trim();

        if (query.length < 3) {
            suggestionsWrapper.classList.remove('show');
            return;
        }


        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {


            fetch(`/api/off-search/?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
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
                                nameInput.value = product.name;
                                suggestionsWrapper.classList.remove('show');

                                const barcodeInput = document.getElementById('addHiddenBarcode');
                                if (barcodeInput && product.barcode) {
                                    barcodeInput.value = product.barcode;
                                }
                            });

                            suggestionsWrapper.appendChild(item);
                        });
                        suggestionsWrapper.classList.add('show');
                    } else {
                        suggestionsWrapper.classList.remove('show');
                    }
                })
                .catch(err => console.error("Error fetching OFF data:", err));
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!nameInput.contains(e.target) && !suggestionsWrapper.contains(e.target)) {
            suggestionsWrapper.classList.remove('show');
        }
    });
});

    // Czyszczenie modali po zamknięciu
    const addProductModal = document.getElementById('addProductModal');
    if (addProductModal) {
        addProductModal.addEventListener('hidden.bs.modal', function () {


            const addForm = document.getElementById('addProductForm');
            if (addForm) addForm.reset();


            const addCodeInput = document.getElementById('addProductCode');
            if (addCodeInput) addCodeInput.value = '';


            const nameInput = document.getElementById('addProductName');
            if (nameInput && nameInput.parentNode) {
                const suggestions = nameInput.parentNode.querySelector('.dropdown-menu');
                if (suggestions) suggestions.classList.remove('show');
            }
        });
    }

    const editProductModal = document.getElementById('editProductModal');
    if (editProductModal) {
        editProductModal.addEventListener('hidden.bs.modal', function () {
            const editForm = document.getElementById('editProductForm');
            if (editForm) editForm.reset();

            const editCodeInput = document.getElementById('editProductCode');
            if (editCodeInput) editCodeInput.value = '';
        });
    }