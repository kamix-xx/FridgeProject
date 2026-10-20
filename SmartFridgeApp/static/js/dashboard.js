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

});