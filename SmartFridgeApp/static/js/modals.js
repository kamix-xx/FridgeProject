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
// 2. Handle Backdrop Click-Away Cancellation (Clicking off to instantly close/cancel)
document.addEventListener('click', function (e) {
    const openModal = document.querySelector('.modal.show');
    if (!openModal) return;

    // Check if the click was directly on the modal container backdrop (outside the dialog)
    if (e.target === openModal) {


        const isStatic = openModal.getAttribute('data-bs-backdrop') === 'static';
        if (isStatic) {

            openModal.classList.add('modal-static');
            setTimeout(() => {
                openModal.classList.remove('modal-static');
            }, 300);
            return; // Przerwij działanie skryptu - NIE zamykaj modala!
        }
        // ------------------------------------------------

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

// =========================================
// 5. Add Area Modal (Single Modal Dual-Face Switch)
// =========================================
function initAddAreaModal() {
    const modal = document.getElementById('addAreaModal');
    if (!modal) return;

    const track = modal.querySelector('.add-area-slider-track');
    if (!track) return;

    const panelCreate = modal.querySelector('.add-area-panel-create');
    const panelCode = modal.querySelector('.add-area-panel-code');

    function setMode(mode, animate) {
        const isCode = mode === 'code';

        if (!animate) {
            track.classList.add('no-transition');
        } else {
            track.classList.remove('no-transition');
        }

        track.classList.toggle('is-code', isCode);

        if (panelCreate && panelCode) {
            panelCreate.setAttribute('aria-hidden', isCode ? 'true' : 'false');
            panelCreate.querySelectorAll('input, button').forEach(el => {
                if (isCode) el.setAttribute('tabindex', '-1');
                else el.removeAttribute('tabindex');
            });

            panelCode.setAttribute('aria-hidden', isCode ? 'false' : 'true');
            panelCode.querySelectorAll('input, button').forEach(el => {
                if (isCode) el.removeAttribute('tabindex');
                else el.setAttribute('tabindex', '-1');
            });
        }

        if (!animate) {
            void track.offsetWidth; // Force reflow
            track.classList.remove('no-transition');
        }

        const targetInput = isCode
            ? modal.querySelector('.add-area-panel-code input')
            : modal.querySelector('.add-area-panel-create input');

        if (targetInput) {
            setTimeout(() => {
                if (modal.classList.contains('show')) {
                    targetInput.focus();
                }
            }, animate ? 220 : 60);
        }
    }

    // Switch buttons ("HERE")
    modal.querySelectorAll('.add-area-switch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const targetMode = btn.dataset.switchTo;
            setMode(targetMode, true);
        });
    });

    // When modal is shown
    modal.addEventListener('show.bs.modal', (e) => {
        const trigger = e.relatedTarget;
        const mode = trigger && (trigger.dataset.areaMode === 'code' || trigger.dataset.initialMode === 'code')
            ? 'code'
            : 'create';
        setMode(mode, false);
    });

    // When modal is hidden, reset to create mode
    modal.addEventListener('hidden.bs.modal', () => {
        setMode('create', false);
    });
}

// Fallback click delegation if any link/button still targets #addSharedAreaModal
document.addEventListener('click', function (e) {
    const trigger = e.target.closest('[data-bs-target="#addSharedAreaModal"]');
    if (trigger) {
        e.preventDefault();
        const addAreaModalEl = document.getElementById('addAreaModal');
        if (addAreaModalEl && window.bootstrap && bootstrap.Modal) {
            const instance = bootstrap.Modal.getOrCreateInstance(addAreaModalEl);
            trigger.dataset.areaMode = 'code';
            instance.show(trigger);
        }
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAddAreaModal);
} else {
    initAddAreaModal();
}


document.addEventListener('DOMContentLoaded', () => {
    const sharedList = document.getElementById('editAreaPeopleList');
    if (!sharedList) return;

    sharedList.classList.add('has-sliding-hover');

    let pill = null;
    let activeRow = null;
    let pointerX = 0;
    let pointerY = 0;

    let lastMove = 0;
    let fastTimer = null;
    let stretchTimer = null;
    let lastX = 0;
    let lastY = 0;

    const getPill = () => {
        // FIX: Ensure the pill is actually in the DOM (catches theme-change DOM wipes)
        if (!pill || !sharedList.contains(pill)) {
            pill = document.createElement('div');
            pill.className = 'sliding-hover-pill';
            sharedList.appendChild(pill);
        }
        return pill;
    };

    const movePill = (row) => {
        const p = getPill();

        const newX = row.offsetLeft - sharedList.scrollLeft;
        const newY = row.offsetTop - sharedList.scrollTop;

        const dx = newX - lastX;
        const dy = newY - lastY;

        let scaleX = 1;
        let scaleY = 1;
        let originX = 'center';
        let originY = 'center';

        if (dx !== 0 || dy !== 0) {
            // Tuned sensitivity for list item distances
            if (Math.abs(dx) > Math.abs(dy)) {
                scaleX = 1 + Math.min(Math.abs(dx) / 55, 0.28);
                scaleY = 1 - Math.min(Math.abs(dx) / 110, 0.12);
                originX = dx > 0 ? 'left' : 'right';
            } else {
                scaleY = 1 + Math.min(Math.abs(dy) / 55, 0.28);
                scaleX = 1 - Math.min(Math.abs(dy) / 110, 0.12);
                originY = dy > 0 ? 'top' : 'bottom';
            }

            clearTimeout(stretchTimer);
            stretchTimer = setTimeout(() => {
                if (activeRow === row) {
                    p.style.transform = `translate3d(${newX}px, ${newY}px, 0) scale(1, 1)`;
                }
            }, 150);
        }

        p.style.transformOrigin = `${originX} ${originY}`;
        p.style.width = `${row.offsetWidth}px`;
        p.style.height = `${row.offsetHeight}px`;
        p.style.transform = `translate3d(${newX}px, ${newY}px, 0) scale(${scaleX}, ${scaleY})`;
        p.style.opacity = '1';

        lastX = newX;
        lastY = newY;
        activeRow = row;
    };

    const findRowUnderPointer = () => {
        const el = document.elementFromPoint(pointerX, pointerY);
        const row = el?.closest('#editAreaPeopleList > .edit-area-person-row');

        return row && row.parentElement === sharedList ? row : null;
    };

    sharedList.addEventListener('mousemove', (e) => {
        pointerX = e.clientX;
        pointerY = e.clientY;

        const row = e.target.closest('#editAreaPeopleList > .edit-area-person-row');
        if (!row) return;

        const p = getPill();

        const now = performance.now();
        if (now - lastMove < 80) {
            p.classList.add('is-fast');

            clearTimeout(fastTimer);
            fastTimer = setTimeout(() => {
                p.classList.remove('is-fast');
            }, 120);
        }
        lastMove = now;

        movePill(row);
    });

    sharedList.addEventListener('scroll', () => {
        const row = findRowUnderPointer();

        if (row) {
            movePill(row);
        } else if (pill) {
            pill.style.opacity = '0';
            activeRow = null;
        }
    }, {passive: true});

    sharedList.addEventListener('mouseleave', () => {
        if (pill) pill.style.opacity = '0';
        activeRow = null;
    });
});