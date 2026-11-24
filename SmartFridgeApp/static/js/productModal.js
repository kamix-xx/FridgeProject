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
    // Add Product & Barcode Scanner
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
        let isBarcodeScanning = false;
        let barcodeDetector = null;
        let zxingReader = null;
        let scanTimer = null;
        let scanTickCount = 0;
        let lastScannedCode = null;

        // Reusable offscreen canvases sized for fast, lag-free frame decoding
        const fullCanvas = document.createElement('canvas');
        const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
        const rotCanvas = document.createElement('canvas');
        const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });

        if (fieldsEl && fieldsInnerEl) {
            fieldsEl.addEventListener('transitionend', (event) => {
                if (event.target !== fieldsEl || event.propertyName !== 'grid-template-rows') return;
                if (contentEl.classList.contains('is-manual')) {
                    fieldsInnerEl.classList.add('is-settled');
                }
            });
        }

        async function initBarcodeDetector() {
            const NativeBarcodeDetector = window['BarcodeDetector'];
            if (typeof NativeBarcodeDetector !== 'function') return null;

            try {
                // Retail product codes only. Code 39/93, ITF, Code 128 and QR have weak or no
                // checksums and are the main source of phantom reads on textured backgrounds.
                const formats = ['ean_13', 'ean_8', 'upc_a'];
                if (typeof NativeBarcodeDetector['getSupportedFormats'] === 'function') {
                    const supported = await NativeBarcodeDetector['getSupportedFormats']();
                    const filtered = formats.filter((f) => supported.includes(f));
                    if (filtered.length > 0) {
                        return new NativeBarcodeDetector({ formats: filtered });
                    }
                    return null;
                }
                return new NativeBarcodeDetector({ formats });
            } catch (e) {
                console.warn('BarcodeDetector initialization error:', e);
                return null;
            }
        }

        function initZXingReader() {
            const zxingLib = window['ZXing'];
            if (!zxingLib || typeof zxingLib.BrowserMultiFormatReader !== 'function') {
                return null;
            }

            try {
                let hints = null;
                if (zxingLib.DecodeHintType && typeof Map === 'function') {
                    hints = new Map();
                    hints.set(zxingLib.DecodeHintType.TRY_HARDER, true);
                    if (zxingLib.BarcodeFormat) {
                        hints.set(zxingLib.DecodeHintType.POSSIBLE_FORMATS, [
                            zxingLib.BarcodeFormat.EAN_13,
                            zxingLib.BarcodeFormat.EAN_8,
                            zxingLib.BarcodeFormat.UPC_A,
                        ]);
                    }
                }
                return new zxingLib.BrowserMultiFormatReader(hints);
            } catch (e) {
                console.warn('ZXing initialization error:', e);
                return null;
            }
        }

        // GTIN-8/12/13/14 check digit: weights 3,1,3,1... starting from the digit left of the check digit
        function isValidRetailCode(code) {
            if (!/^\d+$/.test(code)) return false;
            if (![8, 12, 13, 14].includes(code.length)) return false;
            const digits = code.split('').map(Number);
            const check = digits.pop();
            let sum = 0;
            for (let i = digits.length - 1, w = 3; i >= 0; i--, w = 4 - w) {
                sum += digits[i] * w;
            }
            return (10 - (sum % 10)) % 10 === check;
        }

        // A code is only accepted after the same valid value is read several times in a short window,
        // so a single misread frame can never fill the field.
        const CONFIRM_HITS = 2;
        const CONFIRM_WINDOW_MS = 2000;
        let candidate = { code: null, hits: 0, last: 0 };

        function resetCandidate() {
            candidate = { code: null, hits: 0, last: 0 };
        }

        function handleCandidate(raw) {
            if (!raw || !isBarcodeScanning) return;
            const code = String(raw).trim();
            if (!isValidRetailCode(code)) return;

            const now = performance.now();
            if (candidate.code === code && now - candidate.last <= CONFIRM_WINDOW_MS) {
                candidate.hits += 1;
            } else {
                candidate = { code, hits: 1, last: now };
            }
            candidate.last = now;

            if (candidate.hits >= CONFIRM_HITS) {
                resetCandidate();
                onBarcodeDetected(code);
            }
        }

        function onBarcodeDetected(code) {
            if (!code) return;
            const trimmed = String(code).trim();
            if (!trimmed || trimmed === lastScannedCode) return;
            lastScannedCode = trimmed;

            // Stop scanning so it doesn't repeatedly fire for the same product
            stopBarcodeScanning();

            // Populate the Product code input field so the code appears
            if (codeInput) {
                codeInput.value = trimmed;
                codeInput.dispatchEvent(new Event('input', { bubbles: true }));
                codeInput.dispatchEvent(new Event('change', { bubbles: true }));
                codeInput.classList.add('is-detected');
                setTimeout(() => codeInput.classList.remove('is-detected'), 1500);
            }

            // Also populate hidden barcode field in the form if present
            const hiddenBarcode = document.getElementById('addHiddenBarcode');
            if (hiddenBarcode) {
                hiddenBarcode.value = trimmed;
            }

            // Visual feedback on viewfinder frame
            const scanFrame = addModalEl.querySelector('.product-scan-frame');
            if (scanFrame) {
                scanFrame.classList.add('is-detected');
                setTimeout(() => scanFrame.classList.remove('is-detected'), 1500);
            }

            // Haptic vibration feedback if supported
            if (navigator.vibrate) {
                try { navigator.vibrate(100); } catch (e) {}
            }
        }

        function decodeCanvas(canvas, useGlobalBinarizer, useInverted) {
            const zxingLib = window['ZXing'];
            if (!zxingReader || !zxingLib) return null;

            // Pass isVideo=false to avoid ZXing's alternating FRAME_INDEX auto-inversion
            const lumSource = new zxingLib['HTMLCanvasElementLuminanceSource'](canvas, false);
            // Disable ZXing's internal rotateCounterClockwise (we handle 90deg rotation separately;
            // ZXing's built-in implementation mutates the buffer without swapping width/height and doubles CPU cost)
            lumSource.isRotateSupported = () => false;

            const source = useInverted && zxingLib['InvertedLuminanceSource']
                ? new zxingLib['InvertedLuminanceSource'](lumSource)
                : lumSource;

            const binarizer = useGlobalBinarizer
                ? new zxingLib['GlobalHistogramBinarizer'](source)
                : new zxingLib['HybridBinarizer'](source);

            try {
                const bitmap = new zxingLib['BinaryBitmap'](binarizer);
                const res = zxingReader['decodeBitmap'](bitmap);
                if (res) {
                    return typeof res.getText === 'function' ? res.getText() : res.text;
                }
            } catch (e) {
                // Not found on this pass
            }
            return null;
        }

        function drawCenterCrop(vw, vh) {
            if (!cropCtx || !vw || !vh) return false;
            const srcW = Math.round(vw * 0.65);
            const srcH = Math.round(vh * 0.65);
            const sx = Math.round((vw - srcW) / 2);
            const sy = Math.round((vh - srcH) / 2);

            // Cap crop output at max 960px wide to keep decoding <10ms
            const scale = Math.min(1, 960 / srcW);
            const dstW = Math.max(1, Math.round(srcW * scale));
            const dstH = Math.max(1, Math.round(srcH * scale));

            if (cropCanvas.width !== dstW || cropCanvas.height !== dstH) {
                cropCanvas.width = dstW;
                cropCanvas.height = dstH;
            }
            cropCtx.drawImage(scanVideo, sx, sy, srcW, srcH, 0, 0, dstW, dstH);
            return true;
        }

        function drawScaledFullFrame(vw, vh) {
            if (!fullCtx || !vw || !vh) return false;
            // Cap full-frame decode at 1280px wide (~2.25x fewer pixels than 1080p)
            const scale = Math.min(1, 1280 / vw);
            const dstW = Math.max(1, Math.round(vw * scale));
            const dstH = Math.max(1, Math.round(vh * scale));

            if (fullCanvas.width !== dstW || fullCanvas.height !== dstH) {
                fullCanvas.width = dstW;
                fullCanvas.height = dstH;
            }
            fullCtx.drawImage(scanVideo, 0, 0, vw, vh, 0, 0, dstW, dstH);
            return true;
        }

        function decodeFrameWithZXing() {
            const zxingLib = window['ZXing'];
            if (!zxingReader || !zxingLib || !scanVideo) return null;

            const vw = scanVideo.videoWidth;
            const vh = scanVideo.videoHeight;
            if (!vw || !vh) return null;

            // Run ONE lightweight pass per tick in round-robin so the main UI thread never lags
            const pass = scanTickCount % 5;
            scanTickCount += 1;

            switch (pass) {
                case 0: // Center crop (Hybrid) - crisp 1:1 crop of viewfinder area
                    if (drawCenterCrop(vw, vh)) {
                        return decodeCanvas(cropCanvas, false, false);
                    }
                    break;
                case 1: // Full frame downscaled (Hybrid) - catches barcodes anywhere on screen
                    if (drawScaledFullFrame(vw, vh)) {
                        return decodeCanvas(fullCanvas, false, false);
                    }
                    break;
                case 2: // Center crop (GlobalHistogram) - great for sharp digital/screen barcodes
                    if (drawCenterCrop(vw, vh)) {
                        return decodeCanvas(cropCanvas, true, false);
                    }
                    break;
                case 3: // Rotated 90deg center crop (Hybrid) - vertical barcodes
                    if (rotCtx && drawCenterCrop(vw, vh)) {
                        const cw = cropCanvas.width;
                        const ch = cropCanvas.height;
                        if (rotCanvas.width !== ch || rotCanvas.height !== cw) {
                            rotCanvas.width = ch;
                            rotCanvas.height = cw;
                        }
                        rotCtx.save();
                        rotCtx.translate(ch / 2, cw / 2);
                        rotCtx.rotate(Math.PI / 2);
                        rotCtx.drawImage(cropCanvas, -cw / 2, -ch / 2);
                        rotCtx.restore();
                        return decodeCanvas(rotCanvas, false, false);
                    }
                    break;
                case 4: // Full frame downscaled (GlobalHistogram)
                    if (drawScaledFullFrame(vw, vh)) {
                        return decodeCanvas(fullCanvas, true, false);
                    }
                    break;
                // The inverted pass was removed: retail barcodes are dark-on-light, and decoding an
                // inverted image mostly produces phantom matches from texture and noise.
            }

            return null;
        }

        async function waitForVideoReady() {
            if (scanVideo.readyState >= 2 && scanVideo.videoWidth > 0 && scanVideo.videoHeight > 0) {
                return;
            }
            await new Promise((resolve) => {
                let resolved = false;
                let checkTimer = null;
                const done = () => {
                    if (resolved) return;
                    resolved = true;
                    if (checkTimer) clearInterval(checkTimer);
                    scanVideo.removeEventListener('loadeddata', checkAndResolve);
                    scanVideo.removeEventListener('playing', checkAndResolve);
                    scanVideo.removeEventListener('canplay', checkAndResolve);
                    resolve();
                };
                const checkAndResolve = () => {
                    if (scanVideo.readyState >= 2 && scanVideo.videoWidth > 0 && scanVideo.videoHeight > 0) {
                        done();
                    }
                };
                scanVideo.addEventListener('loadeddata', checkAndResolve);
                scanVideo.addEventListener('playing', checkAndResolve);
                scanVideo.addEventListener('canplay', checkAndResolve);
                checkTimer = setInterval(checkAndResolve, 100);
                setTimeout(done, 2500);
            });
        }

        function scheduleNextScan() {
            if (!isBarcodeScanning) return;
            scanTimer = setTimeout(runScanTick, 120);
        }

        async function runScanTick() {
            if (!isBarcodeScanning) return;

            if (scanVideo && scanVideo.readyState >= 2 && scanVideo.videoWidth > 0 && scanVideo.videoHeight > 0) {
                // 1. Try native BarcodeDetector first if supported
                if (barcodeDetector) {
                    try {
                        const barcodes = await barcodeDetector.detect(scanVideo);
                        if (barcodes && barcodes.length > 0) {
                            for (const b of barcodes) handleCandidate(b.rawValue);
                            if (!isBarcodeScanning) return; // confirmed and stopped
                        }
                    } catch (err) {
                        // Fall through to ZXing
                    }
                }

                // 2. Single lightweight ZXing pass per tick (keeps UI hovers & animations smooth)
                if (zxingReader && isBarcodeScanning) {
                    handleCandidate(decodeFrameWithZXing());
                    if (!isBarcodeScanning) return; // confirmed and stopped
                }
            }

            scheduleNextScan();
        }

        async function startBarcodeScanning() {
            if (isBarcodeScanning || !scanVideo) return;
            isBarcodeScanning = true;
            scanTickCount = 0;
            resetCandidate();

            await waitForVideoReady();
            if (!isBarcodeScanning) return;

            if (!barcodeDetector) {
                barcodeDetector = await initBarcodeDetector();
            }
            if (!zxingReader) {
                zxingReader = initZXingReader();
            }

            if (!barcodeDetector && !zxingReader) {
                isBarcodeScanning = false;
                return;
            }

            scheduleNextScan();
        }

        function stopBarcodeScanning() {
            isBarcodeScanning = false;
            resetCandidate();
            if (scanTimer) {
                clearTimeout(scanTimer);
                scanTimer = null;
            }
            if (zxingReader) {
                try {
                    zxingReader.reset();
                } catch (e) {}
            }
        }

        function setManualMode(isManual) {
            contentEl.classList.toggle('is-manual', isManual);
            if (isManual) {
                stopCamera();
            } else if (fieldsInnerEl) {
                fieldsInnerEl.classList.remove('is-settled');
            }
        }

        async function requestCameraStream() {
            const constraintOptions = [
                {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                },
                {
                    video: { facingMode: 'environment' },
                    audio: false,
                },
                {
                    video: true,
                    audio: false,
                },
            ];

            let lastError = null;
            for (const constraints of constraintOptions) {
                try {
                    return await navigator.mediaDevices.getUserMedia(constraints);
                } catch (err) {
                    lastError = err;
                }
            }
            throw lastError;
        }

        async function startCamera() {
            if (cameraStream) {
                startBarcodeScanning();
                return;
            }
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                contentEl.classList.remove('has-feed');
                scanFallback.classList.add('is-visible');
                return;
            }

            try {
                cameraStream = await requestCameraStream();
                scanVideo.srcObject = cameraStream;
                scanFallback.classList.remove('is-visible');
                contentEl.classList.add('has-feed');
                try {
                    await scanVideo.play();
                } catch (e) {}
                startBarcodeScanning();
            } catch (error) {
                contentEl.classList.remove('has-feed');
                scanFallback.classList.add('is-visible');
            }
        }

        function stopCamera() {
            stopBarcodeScanning();
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

            // If the user clears the code, allow re-scanning if camera is active
            codeInput.addEventListener('input', () => {
                if (!codeInput.value.trim()) {
                    lastScannedCode = null;
                    if (cameraStream && !isBarcodeScanning && !contentEl.classList.contains('is-manual')) {
                        startBarcodeScanning();
                    }
                }
            });
        }

        if (manualLinkBtn) manualLinkBtn.addEventListener('click', () => setManualMode(true));

        if (scanBadge) {
            scanBadge.addEventListener('click', () => {
                lastScannedCode = null;
                setManualMode(false);
                startCamera();
            });
        }

        addModalEl.addEventListener('show.bs.modal', (event) => {
            const trigger = event.relatedTarget;
            const initialMode = trigger ? trigger.dataset.initialMode : null;
            const startManual = initialMode === 'manual';

            lastScannedCode = null;
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
            lastScannedCode = null;
            if (codeInput) codeInput.value = '';
            setManualMode(false);
        });

        // Expose scanner functions globally for programmatic access and testing
        window.scanProductBarcode = onBarcodeDetected;
        window.startProductBarcodeScanner = startBarcodeScanning;
        window.stopProductBarcodeScanner = stopBarcodeScanning;
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

            // 3. Setup Category Field & Icon
            const cat = product.category || 'other';
            setVal('#editProductCategory', cat);

            const editMenu = document.getElementById('editCategoryMenu');
            const editBtnText = document.getElementById('editSelectedCategoryText');
            if (editMenu && editBtnText) {
                const option = editMenu.querySelector(`.category-option[data-category="${cat}"]`);
                if (option) {
                    editBtnText.innerHTML = option.innerHTML;
                } else {
                    editBtnText.innerHTML = '<i class="bi bi-basket2-fill fs-5"></i> Other';
                }
            }

            if (window.bootstrap && window.bootstrap.Modal) {
                window.bootstrap.Modal.getOrCreateInstance(editModalEl).show();
            }
        };
    }
});