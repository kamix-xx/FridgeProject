/**
 * notificationStack.js
 * Interactive iOS/Sonner-like stacked notifications that unstack on hover or tap.
 */
(function () {
    'use strict';

    let stackEl = null;
    let badgeEl = null;
    let autoDismissTimer = null;

    function initStack() {
        stackEl = document.getElementById('notificationStack');
        if (!stackEl) return;

        badgeEl = document.getElementById('notificationBadge');

        // Hover handling for desktop
        stackEl.addEventListener('mouseenter', () => {
            expandStack();
            stopAutoDismiss();
        });

        stackEl.addEventListener('mouseleave', () => {
            collapseStack();
            startAutoDismiss();
        });

        // Click / tap handling for mobile
        stackEl.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.notification-close');
            if (closeBtn) {
                e.stopPropagation();
                const card = closeBtn.closest('.notification-card');
                if (card) dismissCard(card);
                return;
            }

            // If not expanded, expand it
            if (!stackEl.classList.contains('is-expanded')) {
                expandStack();
            }
        });

        // Tap outside to collapse on mobile
        document.addEventListener('click', (e) => {
            if (stackEl && !stackEl.contains(e.target)) {
                collapseStack();
            }
        });

        updateStackPositions();
        startAutoDismiss();
    }

    function expandStack() {
        if (!stackEl) return;
        const cards = stackEl.querySelectorAll('.notification-card');
        if (cards.length > 1) {
            stackEl.classList.add('is-expanded');
        }
    }

    function collapseStack() {
        if (!stackEl) return;
        stackEl.classList.remove('is-expanded');
    }

    function updateStackPositions() {
        if (!stackEl) return;
        const cards = Array.from(stackEl.querySelectorAll('.notification-card'));

        cards.forEach((card, index) => {
            card.setAttribute('data-stack-pos', String(index));
        });

        // Update badge if there are more than 1
        if (badgeEl) {
            if (cards.length > 1) {
                badgeEl.textContent = `+${cards.length - 1}`;
                badgeEl.classList.remove('d-none');
            } else {
                badgeEl.classList.add('d-none');
            }
        }
    }

    function dismissCard(card) {
        card.style.transition = 'transform 0.25s ease, opacity 0.2s ease';
        card.style.transform = 'translateY(-16px) scale(0.9)';
        card.style.opacity = '0';

        setTimeout(() => {
            card.remove();
            updateStackPositions();
            const remaining = stackEl ? stackEl.querySelectorAll('.notification-card') : [];
            if (remaining.length <= 1) {
                collapseStack();
            }
        }, 220);
    }

    function startAutoDismiss() {
        stopAutoDismiss();
        autoDismissTimer = setTimeout(() => {
            if (!stackEl || stackEl.classList.contains('is-expanded')) return;
            const topCard = stackEl.querySelector('.notification-card[data-stack-pos="0"]');
            if (topCard) {
                dismissCard(topCard);
                // Keep dismissing slowly if there are more
                startAutoDismiss();
            }
        }, 6000);
    }

    function stopAutoDismiss() {
        if (autoDismissTimer) {
            clearTimeout(autoDismissTimer);
            autoDismissTimer = null;
        }
    }

    window.showNotification = function (message, type = 'info', title = null) {
        let container = document.getElementById('notificationStackContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationStackContainer';
            container.className = 'notification-stack-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }

        if (!stackEl) {
            stackEl = document.createElement('div');
            stackEl.id = 'notificationStack';
            stackEl.className = 'notification-stack';
            container.appendChild(stackEl);

            badgeEl = document.createElement('div');
            badgeEl.id = 'notificationBadge';
            badgeEl.className = 'notification-badge-count d-none';
            stackEl.appendChild(badgeEl);

            initStack();
        }

        const iconMap = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            danger: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };

        const titleMap = {
            success: 'Success',
            error: 'Error',
            danger: 'Error',
            warning: 'Warning',
            info: 'Notice'
        };

        const card = document.createElement('div');
        card.className = `notification-card notification-${type}`;

        const iconClass = iconMap[type] || 'bi-info-circle-fill';
        const displayTitle = title || titleMap[type] || 'Notice';

        card.innerHTML = `
            <div class="notification-icon">
                <i class="bi ${iconClass}"></i>
            </div>
            <div class="notification-body">
                <div class="notification-title">${displayTitle}</div>
                <div class="notification-text">${message}</div>
            </div>
            <button type="button" class="notification-close" aria-label="Close notification">
                <i class="bi bi-x"></i>
            </button>
        `;

        // Add to front of stack
        stackEl.insertBefore(card, stackEl.firstChild);
        updateStackPositions();
        startAutoDismiss();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStack);
    } else {
        initStack();
    }
})();
