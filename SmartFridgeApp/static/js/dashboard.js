// =========================================
// Fridge Dashboard (home.html)
// =========================================

document.addEventListener('DOMContentLoaded', () => {

    // =========================================
    // Area carousel
    // =========================================

    const areaCarousel = document.getElementById('areaCarousel');

    // The real, server-rendered panels — captured before any clones are
    // added below, so this array always maps 1:1 to `areas` from the view.
    const areaPanels = areaCarousel ? Array.from(areaCarousel.querySelectorAll('.area-panel')) : [];

    const areaPrevBtn = document.getElementById('areaPrev');

    const areaNextBtn = document.getElementById('areaNext');

    const areaTitleEl = document.getElementById('areaTitle');

    const panelCount = areaPanels.length;

    // True infinite wrap needs at least 2 real panels to clone from.
    const infiniteEnabled = Boolean(areaCarousel) && panelCount > 1;

    let currentAreaIndex = 0;

    // trackPosition is the carousel's raw slide index along the (possibly
    // clone-padded) track. currentAreaIndex is always the real, 0-based
    // area index — the only one anything outside this block should care
    // about.
    let trackPosition = 0;

    let isAnimating = false;

    if (infiniteEnabled) {
        /*
         * Clone the last panel to the front and the first panel to the
         * back. Wrapping from one end to the other then becomes a single
         * real slide onto a look-alike clone — not a slide through every
         * panel in between — and we silently snap back to the real panel
         * the instant that slide finishes (see the transitionend handler
         * below), with no visible jump.
         */
        const firstClone = areaPanels[0].cloneNode(true);
        const lastClone = areaPanels[panelCount - 1].cloneNode(true);

        [firstClone, lastClone].forEach((clone) => {
            clone.setAttribute('aria-hidden', 'true');
            clone.style.pointerEvents = 'none';
            clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
            clone.querySelectorAll('[tabindex]').forEach((el) => el.setAttribute('tabindex', '-1'));
        });

        areaCarousel.appendChild(firstClone);
        areaCarousel.insertBefore(lastClone, areaPanels[0]);

        trackPosition = 1; // real panel 0 now sits at track position 1
        areaCarousel.style.transform = `translateX(-${trackPosition * 100}%)`;

        areaCarousel.addEventListener('transitionend', (event) => {
            if (event.target !== areaCarousel || event.propertyName !== 'transform') {
                return;
            }

            isAnimating = false;

            if (trackPosition === 0) {
                // Slid onto the cloned last panel -> silently snap to the real one.
                trackPosition = panelCount;
            } else if (trackPosition === panelCount + 1) {
                // Slid onto the cloned first panel -> silently snap to the real one.
                trackPosition = 1;
            } else {
                return;
            }

            areaCarousel.style.transition = 'none';
            areaCarousel.style.transform = `translateX(-${trackPosition * 100}%)`;
            void areaCarousel.offsetWidth; // flush, so the transition:none actually applies
            areaCarousel.style.transition = '';
        });
    }

    function setAreaTitle(index) {
        if (areaTitleEl && areaPanels[index]) {
            areaTitleEl.textContent = areaPanels[index].dataset.areaName || '';
        }
    }

    /*
     * Jump straight to a given real area index.
     * options.instant skips the slide animation entirely (used when
     * landing on the dashboard already pointed at a specific area).
     */
    function goToArea(index, options) {
        if (!panelCount) {
            return;
        }

        const instant = Boolean(options && options.instant);

        currentAreaIndex = (index + panelCount) % panelCount;

        setAreaTitle(currentAreaIndex);

        if (!infiniteEnabled) {
            areaCarousel.style.transform = `translateX(-${currentAreaIndex * 100}%)`;

            return;
        }

        trackPosition = currentAreaIndex + 1;

        if (instant) {
            areaCarousel.style.transition = 'none';
        }

        areaCarousel.style.transform = `translateX(-${trackPosition * 100}%)`;

        if (instant) {
            void areaCarousel.offsetWidth; // flush before restoring the transition
            areaCarousel.style.transition = '';
        }
    }

    function stepArea(delta) {
        if (!panelCount || isAnimating) {
            return;
        }

        if (!infiniteEnabled) {
            goToArea(currentAreaIndex + delta);

            return;
        }

        isAnimating = true;

        trackPosition += delta;

        currentAreaIndex = ((trackPosition - 1) % panelCount + panelCount) % panelCount;

        setAreaTitle(currentAreaIndex);

        areaCarousel.style.transform = `translateX(-${trackPosition * 100}%)`;
    }

    if (areaPrevBtn) {
        areaPrevBtn.addEventListener('click', () => {
            stepArea(-1);
        });
    }

    if (areaNextBtn) {
        areaNextBtn.addEventListener('click', () => {
            stepArea(1);
        });
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

        /*
         * Make sure the required animation elements exist.
         */
        if (mirror && placeholder && glow) {

            const root = document.documentElement;

            let clearing = false;


            // -----------------------------------------
            // Helpers
            // -----------------------------------------

            function getCssNumber(property, fallback) {
                const value = parseFloat(getComputedStyle(root)
                    .getPropertyValue(property));

                return Number.isFinite(value) ? value : fallback;
            }


            /*
             * Convert cubic-bezier(x1,y1,x2,y2) to
             * a JavaScript easing function.
             */
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

                /*
                 * Match the real input's typography.
                 */
                context.font = inputStyles.font;

                const letterSpacing = parseFloat(inputStyles.letterSpacing);

                const spacing = Number.isFinite(letterSpacing) ? letterSpacing : 0;

                const inputRect = productSearchInput.getBoundingClientRect();

                const wrapRect = searchWrap.getBoundingClientRect();

                const wrapWidth = searchWrap.clientWidth || wrapRect.width || 1;

                const paddingLeft = parseFloat(inputStyles.paddingLeft) || 0;

                /*
                 * Position relative to the search wrapper.
                 */
                const inputOffsetLeft = inputRect.left - wrapRect.left;

                const isDark = root.getAttribute('data-bs-theme') === 'dark';

                const rgb = isDark ? '255,255,255' : '0,0,0';

                const spread = getCssNumber('--glow-spread', 1.5);

                const layers = [];

                let x = 0;


                /*
                 * Preserve whitespace so the next word
                 * has the same position as the original input.
                 */
                text
                    .split(/(\s+)/)
                    .forEach((segment) => {

                        if (!segment) {
                            return;
                        }

                        const measured = context.measureText(segment).width;

                        const characterCount = Math.max(0, segment.length - 1);

                        const segmentWidth = measured + (spacing * characterCount);

                        /*
                         * Ignore spaces when creating streaks.
                         */
                        if (segment.trim()) {

                            const centerX = inputOffsetLeft + paddingLeft + x + segmentWidth / 2;

                            const halfWidth = Math.max(segmentWidth * 0.5, 10) * spread;

                            /*
                             * Multiple streaks per word.
                             * This gives the dissolve its
                             * soft, uneven appearance.
                             */
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


                /*
                 * Read the animation values dynamically.
                 */
                const totalDuration = getCssNumber('--clear-dur', 1000);

                const outDuration = getCssNumber('--clear-out-dur', 400);

                const inDuration = getCssNumber('--clear-in-dur', 400);

                const outFly = getCssNumber('--clear-out-fly', 12);

                const inFly = getCssNumber('--clear-in-fly', 12);

                const blur = getCssNumber('--clear-blur', 2);

                const glowDelay = getCssNumber('--glow-delay', 50);

                const glowPeak = getCssNumber('--glow-peak-at', 0.15);

                const glowOpacity = getCssNumber('--glow-opacity', 0.42);


                /*
                 * Read the same easing functions from CSS.
                 */
                const styles = getComputedStyle(root);

                const easeOut = cubicBezier(styles.getPropertyValue('--clear-out-ease'));

                const easeIn = cubicBezier(styles.getPropertyValue('--clear-in-ease'));


                /*
                 * Freeze the text into the mirror.
                 */
                mirror.textContent = text.replace(/ /g, '\u00A0');


                /*
                 * Build the streaks while the input
                 * geometry is still available.
                 */
                glow.style.background = buildGlow(text);

                glow.style.opacity = '0';


                /*
                 * Placeholder starts above the field,
                 * blurred and slightly transparent.
                 */
                placeholder.style.transform = `translateY(-${inFly}px)`;

                placeholder.style.opacity = '0';

                placeholder.style.filter = `blur(${blur}px)`;


                /*
                 * Clear the actual input.
                 */
                productSearchInput.value = '';

                /*
                 * Keep the existing product filtering logic.
                 */
                filterProducts();

                /*
                 * The actual input now has no text,
                 * but the mirror owns the disappearing text.
                 */
                searchWrap.classList.remove('has-value');

                searchWrap.classList.add('is-clearing');


                /*
                 * Start animation.
                 */
                const start = performance.now();


                function animate(now) {
                    const elapsed = now - start;


                    // -----------------------------------------
                    // Typed text: DOWN + BLUR + FADE
                    // -----------------------------------------

                    const outProgress = Math.min(1, elapsed / outDuration);

                    const outEased = easeOut(outProgress);

                    mirror.style.transform = `translateY(${(outEased * outFly).toFixed(2)}px)`;

                    mirror.style.opacity = (1 - outEased).toFixed(3);

                    mirror.style.filter = `blur(${(outEased * blur).toFixed(2)}px)`;


                    // -----------------------------------------
                    // Placeholder: DOWN FROM ABOVE
                    // -----------------------------------------

                    const inProgress = Math.min(1, elapsed / inDuration);

                    const inEased = easeIn(inProgress);

                    placeholder.style.transform = `translateY(${(-inFly + inEased * inFly).toFixed(2)}px)`;

                    placeholder.style.opacity = (0.9 + inEased * 0.1)
                        .toFixed(3);

                    placeholder.style.filter = `blur(${(blur - inEased * blur).toFixed(2)}px)`;


                    // -----------------------------------------
                    // Dissolve streak envelope
                    // -----------------------------------------

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


                    // -----------------------------------------
                    // Reset
                    // -----------------------------------------

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


            // -----------------------------------------
            // Live input synchronisation
            // -----------------------------------------

            productSearchInput.addEventListener('input', () => {
                if (!clearing) {
                    syncSearchState();
                }
            });


            // -----------------------------------------
            // Prevent the clear button from stealing
            // focus before animation starts.
            // -----------------------------------------

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


            /*
             * Initial state.
             */
            syncSearchState();
        }
    }


    // =========================================
    // Jump to a specific area on load
    // =========================================
    // If the dashboard was opened with a ?area=<name> query param (set by
    // areaCardLink.js on the Areas page), land straight on that area's
    // panel -- instantly, no slide-through -- instead of stepping the
    // carousel forward one click at a time.

    const targetArea = new URLSearchParams(window.location.search).get('area');

    if (targetArea) {
        const targetIndex = areaPanels.findIndex((panel) => panel.dataset.areaName === targetArea);

        if (targetIndex > 0) {
            goToArea(targetIndex, { instant: true });
        }
    }


});