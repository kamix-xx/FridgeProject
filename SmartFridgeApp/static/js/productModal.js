document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------------------
    // Shared helper
    // -----------------------------------------
    //
    // Reads whatever area name is currently showing in the dashboard
    // carousel title, so the Add Product modal can default its area
    // picker to match — regardless of which area the person has
    // navigated to since page load.

    function getCurrentCarouselAreaName() {
        const words = Array.from(
            document.querySelectorAll('#areaTitleText .area-title-word:not(.area-shared-icon)')
        ).map((el) => el.textContent);

        return words.join(' ').trim();
    }

    // Native <select>/<input> .value assignments don't fire a change
    // event on their own — dispatch one so the custom picker UI
    // (productPickers.js) notices and updates its own displayed label.
    function setFieldValue(field, value) {
        if (!field) {
            return;
        }

        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }


    // =========================================
    // Add Product (scan / manual morph)
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
        const areaSelect = document.getElementById('addProductArea');
        const fieldsEl = document.getElementById('addProductExtraFields');
        const fieldsInnerEl = document.getElementById('addProductExtraFieldsInner');

        let cameraStream = null;

        // Once the fields have fully finished expanding, let dropdown/
        // calendar panels inside them (area, unit, expiration date)
        // overflow past fieldsInnerEl instead of being clipped by the
        // overflow:hidden it needs for its own collapse animation.
        if (fieldsEl && fieldsInnerEl) {
            fieldsEl.addEventListener('transitionend', (event) => {
                if (event.target !== fieldsEl || event.propertyName !== 'grid-template-rows') {
                    return;
                }

                if (contentEl.classList.contains('is-manual')) {
                    fieldsInnerEl.classList.add('is-settled');
                }
            });
        }

        function setManualMode(isManual) {
            contentEl.classList.toggle('is-manual', isManual);

            if (isManual) {
                // Collapsing the preview shouldn't leave a live camera
                // running behind it.
                stopCamera();
            } else if (fieldsInnerEl) {
                // Re-clip immediately, before the collapse transition
                // starts, so a still-open dropdown panel doesn't get to
                // render outside the (about to shrink) fields area.
                fieldsInnerEl.classList.remove('is-settled');
            }
        }

        async function startCamera() {
            if (cameraStream) {
                return;
            }

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
                // No camera, permission denied, not a secure context, etc.
                // — fall back to a static placeholder instead of a dead
                // video box. See the chat for how to test this without
                // physical webcam hardware.
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
            if (!areaSelect) {
                return;
            }

            const currentAreaName = getCurrentCarouselAreaName();
            const hasMatch = Array.from(areaSelect.options)
                .some((option) => option.value === currentAreaName);

            if (currentAreaName && hasMatch) {
                setFieldValue(areaSelect, currentAreaName);
            }
        }

        function confirmCode() {
            // TODO: once a barcode-lookup endpoint exists, call it here
            // with codeInput.value and fill in the product name (and
            // anything else it returns) before revealing the fields.
            // For now this just morphs into the manual view.
            setManualMode(true);
        }

        if (enterBtn) {
            enterBtn.addEventListener('click', confirmCode);
        }

        if (codeInput) {
            codeInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmCode();
                }
            });
        }

        if (manualLinkBtn) {
            manualLinkBtn.addEventListener('click', () => setManualMode(true));
        }

        if (scanBadge) {
            scanBadge.addEventListener('click', () => {
                setManualMode(false);
                startCamera();
            });
        }

        // Which face the modal opens on depends on which menu item was
        // clicked — "Scan product" vs "Add product by hand" — via
        // data-initial-mode on the trigger element.
        addModalEl.addEventListener('show.bs.modal', (event) => {
            const trigger = event.relatedTarget;
            const initialMode = trigger ? trigger.dataset.initialMode : null;
            const startManual = initialMode === 'manual';

            setManualMode(startManual);
            syncAreaToCarousel();

            if (startManual && fieldsInnerEl) {
                // Opening straight into manual mode ("Add product by
                // hand") never actually transitions the fields open —
                // they're already in their expanded end-state before the
                // modal is even shown, so grid-template-rows never
                // changes value and transitionend never fires. Without
                // this, the dropdown/calendar panels inside would stay
                // clipped forever for this specific entry point.
                fieldsInnerEl.classList.add('is-settled');
            }

            if (!startManual) {
                startCamera();
            }
        });

        addModalEl.addEventListener('hidden.bs.modal', () => {
            stopCamera();

            // Reset so the next open doesn't pick up mid-way through a
            // previous, abandoned attempt.
            if (codeInput) {
                codeInput.value = '';
            }

            setManualMode(false);
        });
    }


    // =========================================
    // Edit Product
    // =========================================
    //
    // No scan/camera face here — editing an existing product doesn't need
    // a barcode capture step. This just exposes a small function other
    // scripts can call to populate and open the modal.
    //
    // Wired up by productRowActions.js: clicking a product row (or its
    // edit pencil) calls window.openEditProductModal({...}) with that
    // row's data.

    const editModalEl = document.getElementById('editProductModal');

    if (editModalEl) {
        const editFields = {
            code: document.getElementById('editProductCode'),
            name: document.getElementById('editProductName'),
            price: document.getElementById('editProductPrice'),
            quantity: document.getElementById('editProductQuantity'),
            unit: document.getElementById('editProductUnit'),
            expiration: document.getElementById('editProductExpiration'),
            area: document.getElementById('editProductArea'),
        };

        window.openEditProductModal = function openEditProductModal(product) {
            product = product || {};

            if (editFields.code) {
                editFields.code.value = product.code || '';
            }

            if (editFields.name) {
                editFields.name.value = product.name || '';
            }

            if (editFields.price) {
                editFields.price.value = product.price || '';
            }

            if (editFields.quantity) {
                editFields.quantity.value = product.quantity || '';
            }

            if (editFields.unit && product.unit) {
                setFieldValue(editFields.unit, product.unit);
            }

            setFieldValue(editFields.expiration, product.expirationDate || '');
            setFieldValue(editFields.area, product.area || getCurrentCarouselAreaName());

            if (window.bootstrap && window.bootstrap.Modal) {
                window.bootstrap.Modal.getOrCreateInstance(editModalEl).show();
            }
        };
    }
});