/**
 * notificationStack.js
 * Interactive iOS/Sonner-like pill notification stack.
 *
 * Features:
 * - Up top on the screen, pill-shaped.
 * - Layered pill stack with cascading rounded bottom edges (no +n badge).
 * - Multi-notification stack: hovering over the stack unrolls them into separate cards.
 * - Single notification: clicking toggles enlarged view with smooth border-radius interpolation.
 * - Dismiss button: visible on hover on desktop, always visible on mobile.
 * - Uniform drop-in support for Django messages & dynamic window.showNotification().
 */
(function () {
    'use strict';

    if (window.__notificationStackLoaded) {
        if (typeof window.__initNotificationStack === 'function') {
            window.__initNotificationStack();
        }
        return;
    }
    window.__notificationStackLoaded = true;

    let containerEl = null;
    let stackEl = null;
    let autoDismissTimer = null;
    let isHoveringStack = false;

    // Grace period before an unrolled stack folds back up after the pointer
    // leaves it, so the mouse can briefly slip out (and back in) without the
    // cards snapping shut under it.
    const COLLAPSE_DELAY_MS = 300;
    let collapseTimer = null;

    function cancelScheduledCollapse() {
        if (collapseTimer) {
            clearTimeout(collapseTimer);
            collapseTimer = null;
        }
    }

    function scheduleCollapse() {
        cancelScheduledCollapse();
        collapseTimer = setTimeout(() => {
            collapseTimer = null;
            if (!isHoveringStack) collapseStack();
        }, COLLAPSE_DELAY_MS);
    }

    function getCardCount() {
        if (!stackEl) return 0;
        return stackEl.querySelectorAll('.notification-card:not(.is-dismissing)').length;
    }

    function initStack() {
        containerEl = document.getElementById('notificationStackContainer');
        stackEl = document.getElementById('notificationStack');
        if (!stackEl) return;

        if (!stackEl.dataset.stackInitialized) {
            stackEl.dataset.stackInitialized = 'true';

            // Hover handling for desktop: unstack when hovering multi-notification stack
            stackEl.addEventListener('mouseenter', () => {
                isHoveringStack = true;
                cancelScheduledCollapse();
                stopAutoDismiss();
                if (getCardCount() > 1) {
                    expandStack();
                }
            });

            stackEl.addEventListener('mouseleave', () => {
                isHoveringStack = false;
                scheduleCollapse();
                startAutoDismiss();
            });

            // Click / tap handling
            stackEl.addEventListener('click', (e) => {
                const closeBtn = e.target.closest('.notification-close');
                if (closeBtn) {
                    e.stopPropagation();
                    const card = closeBtn.closest('.notification-card');
                    if (card) dismissCard(card);
                    return;
                }

                const card = e.target.closest('.notification-card');
                if (!card) return;

                const total = getCardCount();

                if (total === 1) {
                    // Single notification: clicking toggles enlargement
                    card.classList.toggle('is-enlarged');
                } else {
                    // Multiple notifications
                    if (!stackEl.classList.contains('is-unstacked')) {
                        // Mobile tap or click to unstack
                        expandStack();
                    } else {
                        // Already unstacked: click to make this specific notification larger
                        const wasEnlarged = card.classList.contains('is-enlarged');
                        // Collapse any other enlarged cards
                        stackEl.querySelectorAll('.notification-card.is-enlarged').forEach(c => {
                            if (c !== card) c.classList.remove('is-enlarged');
                        });
                        if (wasEnlarged) {
                            card.classList.remove('is-enlarged');
                        } else {
                            card.classList.add('is-enlarged');
                        }
                    }
                }
            });

            // Tap/click outside to collapse on mobile or when focused away
            document.addEventListener('click', (e) => {
                if (stackEl && !stackEl.contains(e.target)) {
                    collapseStack();
                }
            });
        }

        updateStackPositions();
        startAutoDismiss();
    }

    window.__initNotificationStack = initStack;

    function expandStack() {
        if (!stackEl) return;
        const total = getCardCount();
        if (total > 1) {
            stackEl.classList.add('is-unstacked');
        }
    }

    function collapseStack() {
        if (!stackEl) return;
        cancelScheduledCollapse();
        stackEl.classList.remove('is-unstacked');
        // Clear enlarged state from cards when collapsing the stack
        stackEl.querySelectorAll('.notification-card.is-enlarged').forEach(card => {
            card.classList.remove('is-enlarged');
        });
    }

    function updateStackPositions() {
        if (!stackEl) return;
        const cards = Array.from(stackEl.querySelectorAll('.notification-card:not(.is-dismissing)'));
        const total = cards.length;

        stackEl.setAttribute('data-count', String(total));

        cards.forEach((card, index) => {
            card.setAttribute('data-stack-pos', String(index));
        });

        // If only 1 card remains and user is not hovering, ensure unstacked is cleared
        if (total <= 1 && !isHoveringStack) {
            stackEl.classList.remove('is-unstacked');
        }
    }

    function dismissCard(card) {
        if (!card || card.classList.contains('is-dismissing')) return;
        card.classList.add('is-dismissing');
        card.classList.remove('is-enlarged');

        setTimeout(() => {
            card.remove();
            updateStackPositions();
            const remaining = getCardCount();
            if (remaining <= 1) {
                // If user is no longer hovering over the stack, collapse safely
                if (!isHoveringStack || remaining === 0) {
                    collapseStack();
                }
            }
            if (remaining > 0 && !isHoveringStack) {
                startAutoDismiss();
            }
        }, 220);
    }

    function startAutoDismiss() {
        stopAutoDismiss();
        autoDismissTimer = setTimeout(() => {
            if (!stackEl) return;
            // Do not dismiss while hovering or unstacked or if any card is enlarged
            if (isHoveringStack || stackEl.classList.contains('is-unstacked')) return;
            if (stackEl.querySelector('.notification-card.is-enlarged')) return;

            const topCard = stackEl.querySelector('.notification-card[data-stack-pos="0"]:not(.is-dismissing)');
            if (topCard) {
                dismissCard(topCard);
            }
        }, 6000);
    }

    function stopAutoDismiss() {
        if (autoDismissTimer) {
            clearTimeout(autoDismissTimer);
            autoDismissTimer = null;
        }
    }

    function ensureContainer() {
        if (!containerEl || !document.body.contains(containerEl)) {
            containerEl = document.getElementById('notificationStackContainer');
            if (!containerEl) {
                containerEl = document.createElement('div');
                containerEl.id = 'notificationStackContainer';
                containerEl.className = 'notification-stack-container';
                containerEl.setAttribute('aria-live', 'polite');
                document.body.appendChild(containerEl);
            }
        }

        if (!stackEl || !document.body.contains(stackEl)) {
            stackEl = document.getElementById('notificationStack');
            if (!stackEl) {
                stackEl = document.createElement('div');
                stackEl.id = 'notificationStack';
                stackEl.className = 'notification-stack';
                containerEl.appendChild(stackEl);
            }
        }

        initStack();
    }

    /**
     * Programmatic API to show notifications anywhere in the app.
     * @param {string} message - Main notification text.
     * @param {string} type - 'success' | 'error' | 'danger' | 'warning' | 'info'
     * @param {string|null} title - Optional custom title.
     */
    window.showNotification = function (message, type = 'info', title = null) {
        ensureContainer();

        const normType = type === 'danger' ? 'error' : type;

        const iconMap = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };

        const titleMap = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Notice'
        };

        const card = document.createElement('div');
        card.className = `notification-card notification-${normType}`;
        card.setAttribute('role', 'alert');

        const iconClass = iconMap[normType] || 'bi-info-circle-fill';
        const displayTitle = title || titleMap[normType] || 'Notice';

        card.innerHTML = `
            <div class="notification-icon">
                <i class="bi ${iconClass}"></i>
            </div>
            <div class="notification-body">
                <span class="notification-title">${displayTitle}</span>
                <span class="notification-text">${message}</span>
            </div>
            <button type="button" class="notification-close" aria-label="Close notification">
                <i class="bi bi-x"></i>
            </button>
        `;

        // Prepend to front of the stack
        stackEl.insertBefore(card, stackEl.firstChild);
        updateStackPositions();

        if (!isHoveringStack) {
            startAutoDismiss();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStack);
    } else {
        initStack();
    }

    window.addEventListener('pageshow', () => {
        initStack();
    });
})();