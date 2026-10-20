/**
 * static/js/shopping_list.js
 */
document.addEventListener('DOMContentLoaded', () => {

    /* =========================================================================
       1. Pure Canvas Confetti Engine
       ========================================================================= */
    const Confetti = (function () {
        let canvas = null;
        let ctx = null;
        let animationId = null;
        let particles = [];

        const COLORS = ['#ff9166', '#e0541d', '#ffd275', '#6fcf3d', '#38bdf8', '#f43f5e', '#a855f7', '#ffffff'];

        function createParticle(originX, originY, angleRad, spreadRad) {
            const angle = angleRad + (Math.random() - 0.5) * spreadRad;
            const velocity = 14 + Math.random() * 16;
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const size = 6 + Math.random() * 6;
            return {
                x: originX, y: originY, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
                size: size, color: color, isCircle: Math.random() > 0.7,
                rotation: Math.random() * 360, rotationSpeed: (Math.random() - 0.5) * 12,
                wobble: Math.random() * 10, wobbleSpeed: 0.1 + Math.random() * 0.1,
                alpha: 1, decay: 0.008 + Math.random() * 0.008,
            };
        }

        function ensureCanvas() {
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'shopping-confetti-canvas';
                canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
                document.body.appendChild(canvas);
                ctx = canvas.getContext('2d');
            }
            if (canvas.width !== window.innerWidth) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        }

        function updateAndDraw() {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.vx *= 0.985;
                p.vy *= 0.985;
                p.vy += 0.38;
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
                ctx.scale(Math.cos(p.wobble), 1);
                ctx.fillStyle = p.color;
                p.isCircle ? (ctx.beginPath(), ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2), ctx.fill()) : ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.3);
                ctx.restore();
            }
            particles.length > 0 ? animationId = requestAnimationFrame(updateAndDraw) : (cancelAnimationFrame(animationId), animationId = null, ctx.clearRect(0, 0, window.innerWidth, window.innerHeight));
        }

        function launch(count = 140) {
            ensureCanvas();
            const lX = window.innerWidth * 0.15, rX = window.innerWidth * 0.85, oY = window.innerHeight * 0.75;
            for (let i = 0; i < count / 2; i++) particles.push(createParticle(lX, oY, -Math.PI / 3, Math.PI / 4));
            for (let i = 0; i < count / 2; i++) particles.push(createParticle(rX, oY, (-2 * Math.PI) / 3, Math.PI / 4));
            for (let i = 0; i < count / 4; i++) particles.push(createParticle(window.innerWidth * 0.5, oY + 40, -Math.PI / 2, Math.PI / 3));
            if (!animationId) animationId = requestAnimationFrame(updateAndDraw);
        }

        return {launch};
    })();

    /* =========================================================================
       2. AJAX Checkbox & Toast Logic
       ========================================================================= */
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    const csrftoken = getCookie('csrftoken');

    document.addEventListener('change', (e) => {
        const checkbox = e.target.closest('.shopping-checkbox');
        if (!checkbox) return;

        const row = checkbox.closest('.product-row');
        const nameEl = row ? row.querySelector('.product-name') : null;
        const isChecked = checkbox.checked;

        // Visual UI Update
        if (row) row.classList.toggle('is-completed', isChecked);
        if (nameEl) {
            nameEl.classList.toggle('text-decoration-line-through', isChecked);
            nameEl.classList.toggle('opacity-50', isChecked);
        }

        // Scoped Completion Check (Only evaluates the list this item belongs to)
        if (isChecked) {
            if (row) {
                row.classList.add('row-just-checked');
                setTimeout(() => row.classList.remove('row-just-checked'), 650);
            }

            const activePanel = checkbox.closest('.area-panel');
            if (activePanel) {
                const allBoxes = activePanel.querySelectorAll('.shopping-checkbox');
                const checkedBoxes = activePanel.querySelectorAll('.shopping-checkbox:checked');

                if (allBoxes.length > 0 && allBoxes.length === checkedBoxes.length) {
                    Confetti.launch(150);
                    const toastEl = document.getElementById('completionToast');
                    if (toastEl && window.bootstrap) {
                        const toast = new bootstrap.Toast(toastEl, {delay: 4000});
                        toast.show();
                    }
                }
            }
        }

        // AJAX Update
        const itemId = checkbox.dataset.itemId;
        if (!itemId) return;

        fetch(`/shopping-list/item/toggle/${itemId}/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
            body: JSON.stringify({is_done: isChecked})
        }).catch(err => console.log('Sync err:', err));
    });
});

/* =========================================================================
   3. Modal Pre-filling
   ========================================================================= */
const fillModal = (modalId, inputs) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.addEventListener('show.bs.modal', (e) => {
        const btn = e.relatedTarget;
        if (!btn) return;
        inputs.forEach(i => {
            const el = modal.querySelector(i.selector);
            if (el) i.isText ? el.textContent = btn.dataset[i.data] || '' : el.value = btn.dataset[i.data] || '';
        });
    });
};

fillModal('deleteShoppingItemModal', [
    {selector: '#deleteShoppingItemId', data: 'itemId'},
    {selector: '#deleteShoppingItemName', data: 'itemName', isText: true},
    {selector: '#deleteItemIdHidden', data: 'itemId'}
]);

fillModal('editShoppingItemModal', [
    {selector: '#editItemIdHidden', data: 'itemId'},
    {selector: '#editProductName', data: 'itemName'},
    {selector: '#editProductQty', data: 'itemQty'},
    {selector: '#editHiddenUnitSymbol', data: 'itemUnit'},
    {selector: '#editSelectedUnitText', data: 'itemUnit', isText: true}
]);
