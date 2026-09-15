// Universal Fast & Clean Modal Swapping (Race-Condition Safe + Backdrop Click-Away Cancel)
let isModalSwapping = false;
let swapResetTimeout;
let isNativeBootstrapSwap = false;

// 1. Handle Modal Open & Direct Swap
document.addEventListener('show.bs.modal', function (e) {
    const targetModal = e.target;
    const triggerBtn = e.relatedTarget;

    if (!targetModal || !targetModal.classList.contains('modal')) return;

    const currentActiveModal = document.querySelector('.modal.show');

    clearTimeout(swapResetTimeout);

    // EDGE CASE: If triggered by "HERE" links, let Bootstrap handle it natively,
    // with a fallback backdrop check.
    if (triggerBtn && (triggerBtn.classList.contains('custom-link-button') || triggerBtn.hasAttribute('data-bs-dismiss'))) {
        isNativeBootstrapSwap = true;
        isModalSwapping = false;

        requestAnimationFrame(() => {
            if (!document.querySelector('.modal-backdrop')) {
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                document.body.appendChild(backdrop);
            } else {
                const bd = document.querySelector('.modal-backdrop');
                bd.classList.add('show');
            }
        });
        return;
    }

    isNativeBootstrapSwap = false;

    if (currentActiveModal && currentActiveModal !== targetModal) {
        isModalSwapping = true;

        currentActiveModal.classList.remove('show');
        currentActiveModal.style.display = 'none';

        if (window.bootstrap && bootstrap.Modal) {
            const bsInstance = bootstrap.Modal.getInstance(currentActiveModal);
            if (bsInstance) {
                bsInstance.hide();
            }
        }
    }

    // CANCEL APPEAR ANIMATION TRICK:
    // Temporarily strip inline transitions to instantly cut off any lingering
    // animation queues or stale frame states before re-animating.
    targetModal.style.transition = 'none';
    const dialog = targetModal.querySelector('.modal-dialog');
    if (dialog) dialog.style.transition = 'none';

    targetModal.style.display = 'block';

    // Force layout reflow to register the cleared transition state instantly
    targetModal.offsetHeight;

    requestAnimationFrame(() => {
        // Restore CSS transitions for the smooth appearance sequence
        targetModal.style.transition = '';
        if (dialog) dialog.style.transition = '';
        targetModal.classList.add('show');
    });
});

// 2. Handle Backdrop Click-Away Cancellation (Clicking off to instantly close/cancel)
document.addEventListener('click', function (e) {
    const openModal = document.querySelector('.modal.show');
    if (!openModal) return;

    // Check if the click was directly on the modal container backdrop (outside the dialog)
    if (e.target === openModal) {
        // Instantly cancel transitions to avoid lingering animation lockup
        openModal.style.transition = 'none';
        const dialog = openModal.querySelector('.modal-dialog');
        if (dialog) dialog.style.transition = 'none';

        if (window.bootstrap && bootstrap.Modal) {
            const bsInstance = bootstrap.Modal.getInstance(openModal);
            if (bsInstance) {
                bsInstance.hide();
            } else {
                // Fallback manual hide if instance is missing
                openModal.classList.remove('show');
                openModal.style.display = 'none';
                document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('overflow');
                document.body.style.removeProperty('padding-right');
            }
        }
    }
});

// 3. Handle Modal Close
document.addEventListener('hide.bs.modal', function (e) {
    if (!e.target || !e.target.classList.contains('modal')) return;
    if (isNativeBootstrapSwap || isModalSwapping) return;

    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.classList.remove('show');
    }
});

// 4. Cleanup & Reset Swap Lock
document.addEventListener('hidden.bs.modal', function (e) {
    if (!e.target || !e.target.classList.contains('modal')) return;

    const activeModal = document.querySelector('.modal.show');

    clearTimeout(swapResetTimeout);

    if (!activeModal) {
        isModalSwapping = false;
        isNativeBootstrapSwap = false;
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    } else {
        swapResetTimeout = setTimeout(() => {
            isModalSwapping = false;
            isNativeBootstrapSwap = false;
        }, 150);
    }

    const backdrops = document.querySelectorAll('.modal-backdrop');
    if (backdrops.length > 0) {
        if (activeModal) {
            backdrops[0].classList.add('show');
        }
        for (let i = 1; i < backdrops.length; i++) {
            backdrops[i].remove();
        }
    }
});