/**
 * static/js/panelCarousel.js
 * Infinite/Smooth carousel controller based on dashboard.js logic.
 */
document.addEventListener('DOMContentLoaded', () => {
    const fridgePanels = document.querySelectorAll('.fridge-panel');

    fridgePanels.forEach((panelContainer) => {
        const carousel = panelContainer.querySelector('.area-carousel');
        if (!carousel) return;

        const prevBtn = panelContainer.querySelector('#areaPrev, #listPrev, .carousel-arrow-prev');
        const nextBtn = panelContainer.querySelector('#areaNext, #listNext, .carousel-arrow-next');
        const titleText = panelContainer.querySelector('#areaTitleText, .panel-title-text');

        const slides = Array.from(carousel.querySelectorAll('.area-panel'));
        const panelCount = slides.length;
        if (panelCount === 0) return;

        const infiniteEnabled = panelCount > 1;
        let currentAreaIndex = 0;
        let trackPosition = 0;

        if (infiniteEnabled) {
            const firstClone = slides[0].cloneNode(true);
            const lastClone = slides[panelCount - 1].cloneNode(true);

            [firstClone, lastClone].forEach((clone) => {
                clone.setAttribute('aria-hidden', 'true');
                clone.style.pointerEvents = 'none';
                clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
            });

            carousel.appendChild(firstClone);
            carousel.insertBefore(lastClone, slides[0]);

            trackPosition = 1;
            carousel.style.transform = `translateX(-${trackPosition * 100}%)`;

            carousel.addEventListener('transitionend', (e) => {
                if (e.target !== carousel || e.propertyName !== 'transform') return;

                if (trackPosition === 0) {
                    trackPosition = panelCount;
                } else if (trackPosition === panelCount + 1) {
                    trackPosition = 1;
                } else {
                    return;
                }

                carousel.style.transition = 'none';
                carousel.style.transform = `translateX(-${trackPosition * 100}%)`;
                void carousel.offsetWidth;
                carousel.style.transition = '';
            });
        }

        function updateTitle(index) {
            if (!titleText || !slides[index]) return;
            const newTitle = slides[index].dataset.areaName
                          || slides[index].dataset.title
                          || slides[index].dataset.listName;
            if (newTitle) {
                titleText.textContent = newTitle;
            }
        }

        function stepArea(delta) {
            if (!infiniteEnabled) {
                currentAreaIndex = Math.max(0, Math.min(panelCount - 1, currentAreaIndex + delta));
                carousel.style.transform = `translateX(-${currentAreaIndex * 100}%)`;
                updateTitle(currentAreaIndex);
                if (prevBtn) prevBtn.disabled = currentAreaIndex === 0;
                if (nextBtn) nextBtn.disabled = currentAreaIndex === panelCount - 1;
                return;
            }

            if (trackPosition <= 0 || trackPosition >= panelCount + 1) {
                trackPosition = ((trackPosition - 1) % panelCount + panelCount) % panelCount + 1;
                carousel.style.transition = 'none';
                carousel.style.transform = `translateX(-${trackPosition * 100}%)`;
                void carousel.offsetWidth;
                carousel.style.transition = '';
            }

            trackPosition += delta;
            currentAreaIndex = ((trackPosition - 1) % panelCount + panelCount) % panelCount;

            updateTitle(currentAreaIndex);
            carousel.style.transform = `translateX(-${trackPosition * 100}%)`;
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                stepArea(-1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                stepArea(1);
            });
        }

        // Touch/Swipe Support
        let startX = 0;
        let isSwiping = false;

        carousel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isSwiping = true;
        }, { passive: true });

        carousel.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            if (Math.abs(diff) > 40) {
                stepArea(diff > 0 ? 1 : -1);
            }
            isSwiping = false;
        });

        updateTitle(0);
    });
});