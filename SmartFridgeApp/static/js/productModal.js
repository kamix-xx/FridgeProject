document.addEventListener('DOMContentLoaded', () => {

    function getCurrentCarouselAreaId() {
        const activeSlide = document.querySelector('.area-panel.active-carousel-slide');
        if (activeSlide && activeSlide.dataset.areaId) {
            return activeSlide.dataset.areaId;
        }
        const editBtn = document.getElementById('areaEditBtn');
        if (editBtn && editBtn.dataset.areaId) {
            return editBtn.dataset.areaId;
        }
        return '';
    }

    function setFieldValue(field, value) {
        if (!field) return;
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // =========================================
    // Add Product
    // =========================================

    const addModalEl = document.getElementById('addProductModal');

    if (addModalEl) {
        const contentEl = document.getElementById('addProductModalContent');
        const codeInput = document.getElementById('addProductCode');
        const enterBtn = document.getElementById('addProductCodeEnter');
        const scanBadge = document.getElementById('addProductScanBadge');
        const scanVideo = document.getElementById('addProductScanVideo');
        const scanFallback = document.getElementById('addProductScanFallback');
        const manualLinkBtn = document.querySelector('#addProductManualLink .custom-link-button');
        const fieldsEl = document.getElementById('addProductExtraFields');
        const fieldsInnerEl = document.getElementById('addProductExtraFieldsInner');

        let cameraStream = null;

        if (fieldsEl && fieldsInnerEl) {
            fieldsEl.addEventListener('transitionend', (event) => {
                if (event.target !== fieldsEl || event.propertyName !== 'grid-template-rows') return;
                if (contentEl.classList.contains('is-manual')) {
                    fieldsInnerEl.classList.add('is-settled');
                }
            });
        }

        function setManualMode(isManual) {
            contentEl.classList.toggle('is-manual', isManual);
            if (isManual) {
                stopCamera();
            } else if (fieldsInnerEl) {
                fieldsInnerEl.classList.remove('is-settled');
            }
        }

        async function startCamera() {
            if (cameraStream) return;
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                contentEl.classList.remove('has-feed');
                scanFallback.classList.add('is-visible');
                return;
            }

            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                    audio: false,
                });
                scanVideo.srcObject = cameraStream;
                scanFallback.classList.remove('is-visible');
                contentEl.classList.add('has-feed');
            } catch (error) {
                contentEl.classList.remove('has-feed');
                scanFallback.classList.add('is-visible');
            }
        }

        function stopCamera() {
            if (cameraStream) {
                cameraStream.getTracks().forEach((track) => track.stop());
                cameraStream = null;
            }
            scanVideo.srcObject = null;
            contentEl.classList.remove('has-feed');
        }

        function syncAreaToCarousel() {
            const areaSelect = document.querySelector('#addProductModal [name="area_id"]');
            if (!areaSelect) return;

            const activeAreaId = getCurrentCarouselAreaId();
            if (activeAreaId) {
                setFieldValue(areaSelect, activeAreaId);
            }
        }

        function confirmCode() {
            setManualMode(true);
        }

        if (enterBtn) enterBtn.addEventListener('click', confirmCode);

        if (codeInput) {
            codeInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmCode();
                }
            });
        }

        if (manualLinkBtn) manualLinkBtn.addEventListener('click', () => setManualMode(true));

        if (scanBadge) {
            scanBadge.addEventListener('click', () => {
                setManualMode(false);
                startCamera();
            });
        }

        addModalEl.addEventListener('show.bs.modal', (event) => {
            const trigger = event.relatedTarget;
            const initialMode = trigger ? trigger.dataset.initialMode : null;
            const startManual = initialMode === 'manual';

            setManualMode(startManual);
            syncAreaToCarousel();

            if (startManual && fieldsInnerEl) {
                fieldsInnerEl.classList.add('is-settled');
            }

            if (!startManual) {
                startCamera();
            }
        });

        addModalEl.addEventListener('hidden.bs.modal', () => {
            stopCamera();
            if (codeInput) codeInput.value = '';
            setManualMode(false);
        });
    }

    // =========================================
    // Edit Product
    // =========================================

    const editModalEl = document.getElementById('editProductModal');

    if (editModalEl) {
        window.openEditProductModal = function openEditProductModal(product) {
            product = product || {};

            // 1. Set Hidden Product ID for Django API
            const idInput = document.getElementById('editUserProductId');
            if (idInput) {
                idInput.value = product.id || '';
            }

            // 2. Helper to target form inputs inside editModalEl
            const setVal = (selector, val) => {
                const el = editModalEl.querySelector(selector) || document.getElementById(selector);
                if (el) {
                    setFieldValue(el, val !== undefined && val !== null ? val : '');
                }
            };

            setVal('#editProductCode', product.code);
            setVal('[name="product_name"]', product.name);
            setVal('[name="price"]', product.price);
            setVal('[name="quantity"]', product.quantity);
            setVal('[name="unit_symbol"]', product.unit);
            setVal('[name="expiration_date"]', product.expirationDate);
            setVal('[name="area_id"]', product.areaId);

            if (window.bootstrap && window.bootstrap.Modal) {
                window.bootstrap.Modal.getOrCreateInstance(editModalEl).show();
            }
        };
    }
});