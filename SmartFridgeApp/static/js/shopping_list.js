/**
 * shopping_list.js
 *
 * Handles:
 * - Dynamic checkbox toggling with strikethrough & styling
 * - Per-item success pop/glow effect
 * - Full confetti celebration + banner when all items are checked
 * - Header gooey menu outside-click & edit/delete list modal wiring
 * - Row edit & delete modal pre-filling
 */

(function () {
    'use strict';

    /* =========================================================================
       1. Pure Canvas Confetti Engine
       ========================================================================= */
    const Confetti = (function () {
        let canvas = null;
        let ctx = null;
        let animationId = null;
        let particles = [];

        const COLORS = [
            '#ff9166', '#e0541d', '#ffd275', '#6fcf3d',
            '#38bdf8', '#f43f5e', '#a855f7', '#ffffff'
        ];

        function createParticle(originX, originY, angleRad, spreadRad) {
            const angle = angleRad + (Math.random() - 0.5) * spreadRad;
            const velocity = 14 + Math.random() * 16;
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const size = 6 + Math.random() * 6;
            const isCircle = Math.random() > 0.7;

            return {
                x: originX,
                y: originY,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: size,
                color: color,
                isCircle: isCircle,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 12,
                wobble: Math.random() * 10,
                wobbleSpeed: 0.1 + Math.random() * 0.1,
                alpha: 1,
                decay: 0.008 + Math.random() * 0.008,
            };
        }

        function ensureCanvas() {
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'shopping-confetti-canvas';
                canvas.style.position = 'fixed';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.width = '100vw';
                canvas.style.height = '100vh';
                canvas.style.pointerEvents = 'none';
                canvas.style.zIndex = '99999';
                document.body.appendChild(canvas);
                ctx = canvas.getContext('2d');
            }
            resizeCanvas();
        }

        function resizeCanvas() {
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
        }

        function updateAndDraw() {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];

                // Physics
                p.vx *= 0.985;
                p.vy *= 0.985;
                p.vy += 0.38; // Gravity
                p.x += p.vx;
                p.y += p.vy;

                p.rotation += p.rotationSpeed;
                p.wobble += p.wobbleSpeed;
                p.alpha -= p.decay;

                if (p.alpha <= 0 || p.y > window.innerHeight + 40) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);

                const scaleX = Math.cos(p.wobble);
                ctx.scale(scaleX, 1);

                ctx.fillStyle = p.color;

                if (p.isCircle) {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.3);
                }

                ctx.restore();
            }

            if (particles.length > 0) {
                animationId = requestAnimationFrame(updateAndDraw);
            } else {
                cancelAnimationFrame(animationId);
                animationId = null;
                ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            }
        }

        function launch(count = 140) {
            ensureCanvas();

            const leftX = window.innerWidth * 0.15;
            const rightX = window.innerWidth * 0.85;
            const originY = window.innerHeight * 0.75;

            // Cannon from bottom left (shooting up-right)
            for (let i = 0; i < count / 2; i++) {
                particles.push(createParticle(leftX, originY, -Math.PI / 3, Math.PI / 4));
            }

            // Cannon from bottom right (shooting up-left)
            for (let i = 0; i < count / 2; i++) {
                particles.push(createParticle(rightX, originY, (-2 * Math.PI) / 3, Math.PI / 4));
            }

            // Center fountain
            for (let i = 0; i < count / 4; i++) {
                particles.push(createParticle(window.innerWidth * 0.5, originY + 40, -Math.PI / 2, Math.PI / 3));
            }

            if (!animationId) {
                animationId = requestAnimationFrame(updateAndDraw);
            }
        }

        window.addEventListener('resize', resizeCanvas);

        return { launch };
    })();


    /* =========================================================================
       2. Shopping List Logic
       ========================================================================= */
    document.addEventListener('DOMContentLoaded', function () {
        const checkboxes = document.querySelectorAll('.shopping-checkbox');
        const completeBanner = document.getElementById('shoppingCompleteBanner');

        function checkAllComplete() {
            const allBoxes = document.querySelectorAll('.shopping-checkbox');
            if (allBoxes.length === 0) return false;
            const checkedBoxes = document.querySelectorAll('.shopping-checkbox:checked');
            return allBoxes.length === checkedBoxes.length;
        }

        function updateCompletionBanner(isComplete, isUserAction = false) {
            if (!completeBanner) return;

            if (isComplete) {
                completeBanner.classList.remove('d-none');
                completeBanner.classList.add('banner-visible');
                if (isUserAction) {
                    Confetti.launch(150);
                }
            } else {
                completeBanner.classList.add('d-none');
                completeBanner.classList.remove('banner-visible');
            }
        }

        // Initialize rows based on current checkbox state
        checkboxes.forEach(function (chk) {
            const row = chk.closest('.product-row');
            if (!row) return;

            if (chk.checked) {
                row.classList.add('is-completed');
            } else {
                row.classList.remove('is-completed');
            }

            chk.addEventListener('change', function () {
                const wasChecked = chk.checked;
                if (wasChecked) {
                    row.classList.add('is-completed');
                    row.classList.add('row-just-checked');

                    // Remove transient animation class once finished
                    setTimeout(function () {
                        row.classList.remove('row-just-checked');
                    }, 650);

                    // Check if this was the last product crossed out!
                    if (checkAllComplete()) {
                        updateCompletionBanner(true, true);
                    }
                } else {
                    row.classList.remove('is-completed');
                    row.classList.remove('row-just-checked');
                    updateCompletionBanner(false, true);
                }
            });
        });

        // Initial completion banner check
        if (checkAllComplete()) {
            updateCompletionBanner(true, false);
        }

        /* =========================================================================
           3. Row Modals (Edit & Delete Wiring)
           ========================================================================= */
        const editProductModal = document.getElementById('editProductModal');
        if (editProductModal) {
            editProductModal.addEventListener('show.bs.modal', function (event) {
                const trigger = event.relatedTarget;
                if (!trigger) return;

                const name = trigger.getAttribute('data-item-name') || '';
                const qty = trigger.getAttribute('data-item-quantity') || '';
                const unit = trigger.getAttribute('data-item-unit') || '';

                const nameInput = document.getElementById('editProductName');
                const qtyInput = document.getElementById('editProductQty');
                const unitText = document.getElementById('editSelectedUnitText');

                if (nameInput && name) nameInput.value = name;
                if (qtyInput && qty) qtyInput.value = qty;
                if (unitText && unit) unitText.innerText = unit;
            });
        }

        const deleteProductModal = document.getElementById('deleteProductModal');
        if (deleteProductModal) {
            deleteProductModal.addEventListener('show.bs.modal', function (event) {
                const trigger = event.relatedTarget;
                if (!trigger) return;

                const name = trigger.getAttribute('data-item-name');
                const titleEl = deleteProductModal.querySelector('.popup-title');
                if (titleEl && name) {
                    titleEl.textContent = `Are you sure to delete ${name}?`;
                }
            });
        }

        /* =========================================================================
           4. Header Gooey Menu & Edit List Modal Wiring
           ========================================================================= */
        const saveListBtn = document.getElementById('saveShoppingListNameBtn');
        const listNameInput = document.getElementById('editShoppingListName');
        const listTitle = document.getElementById('shoppingListTitle');

        if (saveListBtn && listNameInput && listTitle) {
            saveListBtn.addEventListener('click', function () {
                const newName = listNameInput.value.trim();
                if (newName) {
                    listTitle.textContent = newName;
                }
            });
        }
    });
})();
