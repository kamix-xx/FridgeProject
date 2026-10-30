// =========================================
// Fridge Dashboard (home.html)
// =========================================

document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------------------
    // Shared helpers
    // -----------------------------------------

    function getCssNumber(property, fallback, scope) {
        const value = parseFloat(getComputedStyle(scope || document.documentElement)
            .getPropertyValue(property));

        return Number.isFinite(value) ? value : fallback;
    }


    // =========================================
    // Product search
    // =========================================

    const productSearchInput = document.getElementById('productSearch');

    function filterProducts() {
        if (!productSearchInput) {
            return;
        }

        const query = productSearchInput.value
            .trim()
            .toLowerCase();

        document
            .querySelectorAll('.product-row')
            .forEach((row) => {

                if (!row.dataset.productName) {
                    return;
                }

                const productName = row.dataset.productName.toLowerCase();

                const matches = productName.includes(query);

                row.classList.toggle('d-none', !matches);
            });
    }

    if (productSearchInput) {
        productSearchInput.addEventListener('input', filterProducts);
    }


    // =========================================
    // Searchbar clear + dissolve animation
    // =========================================

    const searchWrap = document.getElementById('searchWrap');

    const searchClearBtn = document.getElementById('searchClearBtn');

    if (searchWrap && searchClearBtn && productSearchInput) {
        const mirror = searchWrap.querySelector('.t-clear-mirror');

        const placeholder = searchWrap.querySelector('.t-clear-placeholder');

        const glow = searchWrap.querySelector('.t-clear-glow');

        if (mirror && placeholder && glow) {

            const root = document.documentElement;

            let clearing = false;


            // -----------------------------------------
            // Easing helper
            // -----------------------------------------

            function cubicBezier(str) {
                const match = String(str).match(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);

                if (!match) {
                    return (t) => t;
                }

                const x1 = Number(match[1]);
                const y1 = Number(match[2]);
                const x2 = Number(match[3]);
                const y2 = Number(match[4]);

                const cx = 3 * x1;
                const bx = 3 * (x2 - x1) - cx;
                const ax = 1 - cx - bx;

                const cy = 3 * y1;
                const by = 3 * (y2 - y1) - cy;
                const ay = 1 - cy - by;

                return (t) => {
                    if (t <= 0) return 0;
                    if (t >= 1) return 1;

                    let s = t;

                    for (let i = 0; i < 8; i++) {
                        const x = ((ax * s + bx) * s + cx) * s;

                        const error = x - t;

                        const derivative = (3 * ax * s + 2 * bx) * s + cx;

                        if (Math.abs(error) < 0.000001 || derivative === 0) {
                            break;
                        }

                        s -= error / derivative;
                    }

                    return ((ay * s + by) * s + cy) * s;
                };
            }


            // -----------------------------------------
            // Normal state synchronisation
            // -----------------------------------------

            function syncSearchState() {
                const hasValue = productSearchInput.value.length > 0;

                searchWrap.classList.toggle('has-value', hasValue);

                if (hasValue && !clearing) {
                    mirror.textContent = productSearchInput.value
                        .replace(/ /g, '\u00A0');
                }

                if (!hasValue && !clearing) {
                    mirror.textContent = '';

                    mirror.style.cssText = '';
                    placeholder.style.cssText = '';

                    glow.style.opacity = '0';
                    glow.style.background = '';
                }
            }


            // -----------------------------------------
            // Build dissolve streaks
            // -----------------------------------------

            function buildGlow(text) {
                const canvas = document.createElement('canvas');

                const context = canvas.getContext('2d');

                if (!context) {
                    return '';
                }

                const inputStyles = getComputedStyle(productSearchInput);

                context.font = inputStyles.font;

                const letterSpacing = parseFloat(inputStyles.letterSpacing);

                const spacing = Number.isFinite(letterSpacing) ? letterSpacing : 0;

                const inputRect = productSearchInput.getBoundingClientRect();

                const wrapRect = searchWrap.getBoundingClientRect();

                const wrapWidth = searchWrap.clientWidth || wrapRect.width || 1;

                const paddingLeft = parseFloat(inputStyles.paddingLeft) || 0;

                const inputOffsetLeft = inputRect.left - wrapRect.left;

                const isDark = root.getAttribute('data-bs-theme') === 'dark';

                const rgb = isDark ? '255,255,255' : '0,0,0';

                const spread = getCssNumber('--glow-spread', 1.5);

                const layers = [];

                let x = 0;

                text
                    .split(/(\s+)/)
                    .forEach((segment) => {

                        if (!segment) {
                            return;
                        }

                        const measured = context.measureText(segment).width;

                        const characterCount = Math.max(0, segment.length - 1);

                        const segmentWidth = measured + (spacing * characterCount);

                        if (segment.trim()) {

                            const centerX = inputOffsetLeft + paddingLeft + x + segmentWidth / 2;

                            const halfWidth = Math.max(segmentWidth * 0.5, 10) * spread;

                            const streaks = [{
                                offset: 0, width: 1.00, height: 7, alpha: 0.24
                            }, {
                                offset: halfWidth * 0.38, width: 0.72, height: 5, alpha: 0.18
                            }, {
                                offset: -halfWidth * 0.32, width: 0.62, height: 6, alpha: 0.16
                            }, {
                                offset: halfWidth * 0.12, width: 0.42, height: 4, alpha: 0.13
                            }];

                            streaks.forEach((streak) => {

                                const center = centerX + streak.offset;

                                const width = Math.max(halfWidth * streak.width, 2);

                                const percentage = (center / wrapWidth) * 100;

                                layers.push(`radial-gradient(` + `ellipse ` + `${width.toFixed(1)}px ` + `${streak.height}px ` + `at ${percentage.toFixed(2)}% 100%, ` + `rgba(${rgb}, ${streak.alpha}), ` + `transparent)`);
                            });
                        }

                        x += segmentWidth;
                    });

                return layers.join(', ');
            }


            // -----------------------------------------
            // Clear animation
            // -----------------------------------------

            function clearSearch() {
                if (clearing) {
                    return;
                }

                const text = productSearchInput.value;

                if (!text) {
                    return;
                }

                clearing = true;

                const shouldRestoreFocus = document.activeElement === productSearchInput;

                const totalDuration = getCssNumber('--clear-dur', 1000);

                const outDuration = getCssNumber('--clear-out-dur', 400);

                const inDuration = getCssNumber('--clear-in-dur', 400);

                const outFly = getCssNumber('--clear-out-fly', 12);

                const inFly = getCssNumber('--clear-in-fly', 12);

                const blur = getCssNumber('--clear-blur', 2);

                const glowDelay = getCssNumber('--glow-delay', 50);

                const glowPeak = getCssNumber('--glow-peak-at', 0.15);

                const glowOpacity = getCssNumber('--glow-opacity', 0.42);

                const styles = getComputedStyle(root);

                const easeOut = cubicBezier(styles.getPropertyValue('--clear-out-ease'));

                const easeIn = cubicBezier(styles.getPropertyValue('--clear-in-ease'));

                mirror.textContent = text.replace(/ /g, '\u00A0');

                glow.style.background = buildGlow(text);

                glow.style.opacity = '0';

                placeholder.style.transform = `translateY(-${inFly}px)`;

                placeholder.style.opacity = '0';

                placeholder.style.filter = `blur(${blur}px)`;

                productSearchInput.value = '';

                filterProducts();

                searchWrap.classList.remove('has-value');

                searchWrap.classList.add('is-clearing');

                const start = performance.now();

                function animate(now) {
                    const elapsed = now - start;

                    const outProgress = Math.min(1, elapsed / outDuration);

                    const outEased = easeOut(outProgress);

                    mirror.style.transform = `translateY(${(outEased * outFly).toFixed(2)}px)`;

                    mirror.style.opacity = (1 - outEased).toFixed(3);

                    mirror.style.filter = `blur(${(outEased * blur).toFixed(2)}px)`;

                    const inProgress = Math.min(1, elapsed / inDuration);

                    const inEased = easeIn(inProgress);

                    placeholder.style.transform = `translateY(${(-inFly + inEased * inFly).toFixed(2)}px)`;

                    placeholder.style.opacity = (0.9 + inEased * 0.1).toFixed(3);

                    placeholder.style.filter = `blur(${(blur - inEased * blur).toFixed(2)}px)`;

                    let glowProgress = 0;

                    if (elapsed > glowDelay) {
                        glowProgress = Math.min(1, (elapsed - glowDelay) / Math.max(1, totalDuration - glowDelay));
                    }

                    let glowEnvelope = 0;

                    if (glowProgress <= glowPeak) {
                        glowEnvelope = glowPeak === 0 ? 1 : glowProgress / glowPeak;
                    } else {
                        glowEnvelope = 1 - ((glowProgress - glowPeak) / (1 - glowPeak));
                    }

                    glowEnvelope = Math.max(0, Math.min(1, glowEnvelope));

                    glow.style.opacity = (glowEnvelope * glowOpacity).toFixed(3);

                    if (elapsed < totalDuration) {
                        requestAnimationFrame(animate);

                        return;
                    }

                    searchWrap.classList.remove('is-clearing');

                    mirror.textContent = '';

                    mirror.style.cssText = '';
                    placeholder.style.cssText = '';

                    glow.style.opacity = '0';
                    glow.style.background = '';

                    clearing = false;

                    syncSearchState();

                    if (shouldRestoreFocus) {
                        requestAnimationFrame(() => {
                            productSearchInput.focus({
                                preventScroll: true
                            });
                        });
                    }
                }

                requestAnimationFrame(animate);
            }

            productSearchInput.addEventListener('input', () => {
                if (!clearing) {
                    syncSearchState();
                }
            });

            searchClearBtn.addEventListener('pointerdown', (event) => {
                if (document.activeElement === productSearchInput) {
                    event.preventDefault();
                }
            });

            searchClearBtn.addEventListener('mousedown', (event) => {
                if (document.activeElement === productSearchInput) {
                    event.preventDefault();
                }
            });

            searchClearBtn.addEventListener('click', (event) => {
                event.preventDefault();
                clearSearch();
            });

            syncSearchState();
        }
    }


// =========================================
// Jump to Target Area on Submit (Bulletproof)
// =========================================
    const trackForms = [
        {id: 'addAreaForm', type: 'new'},
        {id: 'joinAreaForm', type: 'new'},
        {id: 'addProductForm', type: 'area_input'},
        {id: 'editProductForm', type: 'area_input'},
        {id: 'editAreaForm', type: 'area_input_alt'},
        {id: 'deleteProductForm', type: 'active_slide'}
    ];

    trackForms.forEach(config => {
        const form = document.getElementById(config.id);
        if (!form) return;

        const savePosition = () => {
            let targetAreaId = null;

            if (config.type === 'new') {
                sessionStorage.setItem('jumpToNewList', 'true');
                return;
            } else if (config.type === 'area_input') {
                const areaInput = form.querySelector('[name="area_id"]');
                if (areaInput && areaInput.value) targetAreaId = areaInput.value;
            } else if (config.type === 'area_input_alt') {
                const areaInput = document.getElementById('editAreaId');
                if (areaInput && areaInput.value) targetAreaId = areaInput.value;
            } else if (config.type === 'active_slide') {
                const activeSlide = document.querySelector('.area-panel.active-carousel-slide');
                if (activeSlide) targetAreaId = activeSlide.getAttribute('data-area-id') || activeSlide.getAttribute('data-list-id');
            }

            if (targetAreaId) {
                sessionStorage.setItem('lastActivePanelId', targetAreaId);
            }
        };

        // 1. Native form submit
        form.addEventListener('submit', savePosition);

        // 2. Fallback: Button click (catches JS-bypassed submits)
        const submitBtn = form.querySelector('button[type="submit"], [onclick*="submit"]');
        if (submitBtn) {
            submitBtn.addEventListener('click', savePosition);
        }
    });

// =========================================
// Unified Modal population (ADD PRODUCT ONLY)
// =========================================
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('[data-bs-target="#addProductModal"]');
        if (addBtn) {
            e.preventDefault();
            const modalEl = document.getElementById('addProductModal');
            if (modalEl && typeof bootstrap !== 'undefined') {
                bootstrap.Modal.getOrCreateInstance(modalEl).show();

                const morphWrap = addBtn.closest('.t-morph');
                if (morphWrap) morphWrap.dataset.open = 'false';

                const activeSlide = document.querySelector('.area-panel.active-carousel-slide');
                const addAreaInput = document.querySelector('#addProductModal [name="area_id"]');
                if (activeSlide && addAreaInput) {
                    const areaId = activeSlide.getAttribute('data-area-id') || activeSlide.getAttribute('data-list-id');
                    if (areaId) {
                        addAreaInput.value = areaId;
                        addAreaInput.dispatchEvent(new Event('change', {bubbles: true}));
                    }
                }
            }
        }
    }, true);

    // =========================================
    // Edit Area Modal population
    // =========================================
    const editAreaModal = document.getElementById('editAreaModal');
    if (editAreaModal) {
        editAreaModal.addEventListener('show.bs.modal', (event) => {
            // The trigger is either the clicked button or the static dashboard button
            const triggerBtn = event.relatedTarget || document.getElementById('areaEditBtn');

            const areaIdInput = document.getElementById('editAreaId');
            const areaNameInput = document.getElementById('editAreaName');

            if (triggerBtn) {
                if (areaIdInput) areaIdInput.value = triggerBtn.getAttribute('data-area-id') || '';
                if (areaNameInput) areaNameInput.value = triggerBtn.getAttribute('data-area-name') || '';
            }
        });
    }

    // =========================================
// View Switcharoo (List <-> Cards Toggle)
// =========================================
    (function () {
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        if (!viewToggleBtn) return;

        const viewToggleIcon = document.getElementById('viewToggleIcon');
        let currentViewMode = localStorage.getItem('dashboardProductView') || 'list';

        function applyProductViewMode(mode) {
            currentViewMode = mode;
            const productLists = document.querySelectorAll('.product-list');

            productLists.forEach((list) => {
                if (mode === 'cards') {
                    list.classList.add('view-cards');
                } else {
                    list.classList.remove('view-cards');
                }
            });

            if (viewToggleIcon) {
                // Show the OPPOSITE icon of what is currently active
                if (mode === 'cards') {
                    viewToggleIcon.className = 'bi bi-list-task';
                } else {
                    viewToggleIcon.className = 'bi bi-grid-3x3-gap';
                }
            }
        }

        // Apply preference immediately on load
        applyProductViewMode(currentViewMode);

        viewToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const newMode = currentViewMode === 'cards' ? 'list' : 'cards';
            applyProductViewMode(newMode);
            localStorage.setItem('dashboardProductView', newMode);
        });
    })();

}); // End of DOMContentLoaded

// =========================================
// Unified Modal population (Add/Edit/Delete)
// Runs in capturing phase to bypass morph menu hijacking
// =========================================
document.addEventListener('click', (e) => {

    // Helper to deeply search for data attributes to prevent "undefined" errors
    const findData = (btn, row, keys, fallback = '') => {
        for (let k of keys) {
            if (btn && btn.hasAttribute(k) && btn.getAttribute(k) !== 'undefined' && btn.getAttribute(k) !== 'null') return btn.getAttribute(k);
            if (row && row.hasAttribute(k) && row.getAttribute(k) !== 'undefined' && row.getAttribute(k) !== 'null') return row.getAttribute(k);
        }
        return fallback;
    };

    // 1. ADD PRODUCT: Open modal and auto-select active area
    const addBtn = e.target.closest('[data-bs-target="#addProductModal"]');
    if (addBtn) {
        e.preventDefault();
        const modalEl = document.getElementById('addProductModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();

            const morphWrap = addBtn.closest('.t-morph');
            if (morphWrap) morphWrap.dataset.open = 'false';

            const activeSlide = document.querySelector('.area-panel.active-carousel-slide');
            const addAreaInput = document.querySelector('#addProductModal [name="area_id"]');
            if (activeSlide && addAreaInput) {
                const areaId = activeSlide.getAttribute('data-area-id') || activeSlide.getAttribute('data-list-id');
                if (areaId) {
                    addAreaInput.value = areaId;
                    addAreaInput.dispatchEvent(new Event('change', {bubbles: true}));
                }
            }
        }
        return;
    }

    //     // 2. DELETE PRODUCT
    //     const deleteTrigger = e.target.closest('[data-bs-target="#deleteProductModal"]');
    //     if (deleteTrigger) {
    //         const row = deleteTrigger.closest('.product-row');
    //
    //         const pId = findData(deleteTrigger, row, ['data-id', 'data-product-id', 'data-user-product-id']);
    //         const pName = findData(deleteTrigger, row, ['data-product-name', 'data-name'], 'this product');
    //
    //         const idInput = document.getElementById('deleteProductId');
    //         const nameSpan = document.getElementById('deleteProductName');
    //
    //         if (idInput) idInput.value = pId;
    //         if (nameSpan) nameSpan.textContent = pName;
    //         return;
    //     }
    //
    //     // 3. EDIT PRODUCT
    //     const editTrigger = e.target.closest('[data-bs-target="#editProductModal"]');
    //     if (editTrigger) {
    //         const row = editTrigger.closest('.product-row');
    //         const panel = editTrigger.closest('.area-panel');
    //
    //         // ID
    //         const pId = findData(editTrigger, row, ['data-id', 'data-user-product-id', 'data-product-id']);
    //         const idInput = document.getElementById('editUserProductId');
    //         if (idInput) idInput.value = pId;
    //
    //         // Name
    //         const pName = findData(editTrigger, row, ['data-product-name', 'data-name']);
    //         const nameInput = document.querySelector('#editProductModal input[name="product_name"]');
    //         if (nameInput) nameInput.value = pName;
    //
    //         // Quantity
    //         const pQty = findData(editTrigger, row, ['data-quantity', 'data-qty']);
    //         const qtyInput = document.querySelector('#editProductModal input[name="quantity"]');
    //         if (qtyInput) qtyInput.value = pQty;
    //
    //         // Unit
    //         const pUnit = findData(editTrigger, row, ['data-unit-symbol', 'data-unit']);
    //         const unitInput = document.querySelector('#editProductModal [name="unit_symbol"]');
    //         if (unitInput) {
    //             unitInput.value = pUnit;
    //             unitInput.dispatchEvent(new Event('change', {bubbles: true}));
    //         }
    //
    //         // Area
    //         const pArea = findData(editTrigger, row, ['data-area-id']) || (panel ? panel.getAttribute('data-area-id') : '');
    //         const areaInput = document.querySelector('#editProductModal [name="area_id"]');
    //         if (areaInput) {
    //             areaInput.value = pArea;
    //             areaInput.dispatchEvent(new Event('change', {bubbles: true}));
    //         }
    //
    //         // Barcode
    //         const pCode = findData(editTrigger, row, ['data-barcode']);
    //         const codeInput = document.getElementById('editProductCode');
    //         if (codeInput) codeInput.value = pCode;
    //
    //         // Price & Exp
    //         const pPrice = findData(editTrigger, row, ['data-price']);
    //         const priceInput = document.querySelector('#editProductModal input[name="price"]');
    //         if (priceInput) priceInput.value = pPrice;
    //
    //         const pExp = findData(editTrigger, row, ['data-expiration-date', 'data-exp']);
    //         const expInput = document.querySelector('#editProductModal input[name="expiration_date"]');
    //         if (expInput) expInput.value = pExp;
    //     }
}, true);

// // =========================================
// // Area Carousel
// // =========================================
// const carousel = document.getElementById('areaCarousel');
// const prevBtn = document.getElementById('areaPrev');
// const nextBtn = document.getElementById('areaNext');
// const panels = document.querySelectorAll('.area-panel');
// const titleText = document.getElementById('areaTitleText');
// const editBtn = document.getElementById('areaEditBtn');
//
// let currentAreaIndex = 0;
//
// function updateCarousel() {
//     if (!panels || panels.length === 0) return;
//
//     if (carousel) {
//         const offset = -(currentAreaIndex * 100);
//         carousel.style.transform = `translateX(${offset}%)`;
//         carousel.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
//         carousel.style.display = 'flex';
//     }
//
//     if (prevBtn) prevBtn.disabled = (currentAreaIndex === 0);
//     if (nextBtn) nextBtn.disabled = (currentAreaIndex === panels.length - 1);
//
//     const currentPanel = panels[currentAreaIndex];
//     const areaId = currentPanel.dataset.areaId;
//     const areaName = currentPanel.dataset.areaName;
//     const isShared = currentPanel.dataset.isShared === 'true';
//     const isOwner = currentPanel.dataset.areaOwner === 'true';
//
//     if (titleText) {
//         let iconHtml = isShared ? `<span class="area-shared-icon area-title-word" title="Shared area" aria-label="Shared area"><i class="bi bi-people-fill" aria-hidden="true"></i></span>` : '';
//         titleText.innerHTML = `${areaName || 'No areas'} ${iconHtml}`;
//     }
//
//     if (editBtn) {
//         if (areaId) {
//             editBtn.dataset.areaId = areaId;
//             editBtn.dataset.areaName = areaName;
//             editBtn.dataset.areaShared = isShared;
//             editBtn.dataset.areaOwner = isOwner;
//             editBtn.disabled = false;
//         } else {
//             editBtn.disabled = true;
//         }
//     }
// }
//
// if (prevBtn && nextBtn && carousel) {
//     prevBtn.addEventListener('click', () => {
//         if (currentAreaIndex > 0) {
//             currentAreaIndex--;
//             updateCarousel();
//         }
//     });
//
//     nextBtn.addEventListener('click', () => {
//         if (currentAreaIndex < panels.length - 1) {
//             currentAreaIndex++;
//             updateCarousel();
//         }
//     });
//
//
//     panels.forEach(panel => {
//         panel.style.minWidth = '100%';
//         panel.style.flexShrink = '0';
//     });
//
//     updateCarousel();
// }

// =========================================
// Prevent Sticky Referer Redirects
// =========================================
window.addEventListener('load', () => {
    if (window.location.search) {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: cleanUrl}, '', cleanUrl);
    }
});