document.addEventListener('DOMContentLoaded', () => {
    // Pola formularza
    const nameInput = document.getElementById('addProductName');
    const codeInput = document.getElementById('addProductCode');
    const enterBtn = document.getElementById('addProductCodeEnter');
    const hiddenBarcode = document.getElementById('addHiddenBarcode');


    const kcalInput = document.getElementById('addProductKcal') || document.querySelector('[name="kcal"]');
    const proteinsInput = document.getElementById('addProductProteins') || document.querySelector('[name="proteins"]');
    const fatsInput = document.getElementById('addProductFats') || document.querySelector('[name="fats"]');


    const fetchBarcodeData = (barcodeToFetch) => {
        const barcode = barcodeToFetch || (codeInput ? codeInput.value.trim() : '');
        if (!barcode) return;


        let originalIcon = '';
        if (enterBtn && !barcodeToFetch) {
            originalIcon = enterBtn.innerHTML;
            enterBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            enterBtn.disabled = true;
        }

        fetch(`/api/off-barcode/${barcode}/`)
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(data => {
                if (data.error) return;


                if (hiddenBarcode) hiddenBarcode.value = data.barcode;
                if (codeInput && !barcodeToFetch) codeInput.value = data.barcode;
                if (nameInput && !nameInput.value) nameInput.value = data.name;
                if (kcalInput) kcalInput.value = data.kcal;
                if (proteinsInput) proteinsInput.value = data.proteins;
                if (fatsInput) fatsInput.value = data.fats;
            })
            .catch(err => console.warn("Barcode fetch error:", err))
            .finally(() => {
                if (enterBtn && !barcodeToFetch) {
                    enterBtn.innerHTML = originalIcon;
                    enterBtn.disabled = false;
                }
            });
    };


    if (enterBtn && codeInput) {
        enterBtn.addEventListener('click', () => fetchBarcodeData());
        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                fetchBarcodeData();
            }
        });
    }


    if (nameInput) {
        const suggestionsWrapper = document.createElement('div');
        suggestionsWrapper.className = 'dropdown-menu w-100 shadow-sm border-0';
        suggestionsWrapper.style.position = 'absolute';
        suggestionsWrapper.style.zIndex = '1050';

        nameInput.parentNode.style.position = 'relative';
        nameInput.parentNode.appendChild(suggestionsWrapper);

        let debounceTimer;

        nameInput.addEventListener('input', function () {
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
                                    nameInput.value = product.name;
                                    suggestionsWrapper.classList.remove('show');


                                    if (product.barcode) {
                                        if (hiddenBarcode) hiddenBarcode.value = product.barcode;
                                        if (codeInput) codeInput.value = product.barcode;
                                        fetchBarcodeData(product.barcode); // Wywołanie naszej funkcji po kodzie
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
            if (!nameInput.contains(e.target) && !suggestionsWrapper.contains(e.target)) {
                suggestionsWrapper.classList.remove('show');
            }
        });
    }
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