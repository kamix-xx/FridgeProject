/**
 * static/js/panelCarousel.js
 */
document.addEventListener('DOMContentLoaded', () => {
    const fridgePanels = document.querySelectorAll('.fridge-panel');

    fridgePanels.forEach((panelContainer) => {
        const carousel = panelContainer.querySelector('.area-carousel');
        if (!carousel) return;

        const prevBtn = panelContainer.querySelector('#areaPrev, #listPrev, .carousel-arrow-prev');
        const nextBtn = panelContainer.querySelector('#areaNext, #listNext, .carousel-arrow-next');
        const titleText = panelContainer.querySelector('#areaTitleText, .panel-title-text');
        const editBtn = panelContainer.querySelector('#areaEditBtn');

        const slides = Array.from(carousel.querySelectorAll('.area-panel'));
        const panelCount = slides.length;
        if (panelCount === 0) return;

        const infiniteEnabled = panelCount > 1;
        let currentAreaIndex = 0;
        let trackPosition = 0;

        const urlParams = new URLSearchParams(window.location.search);
        const targetListId = urlParams.get('list_id');
        const targetAreaId = urlParams.get('area_id');
        const targetAreaName = urlParams.get('area');

        if (targetListId || targetAreaId || targetAreaName) {
            let foundIndex = -1;
            if (targetListId) {
                foundIndex = slides.findIndex(slide => slide.getAttribute('data-list-id') === targetListId);
            } else if (targetAreaId) {
                foundIndex = slides.findIndex(slide => slide.getAttribute('data-area-id') === targetAreaId);
            } else if (targetAreaName) {
                foundIndex = slides.findIndex(slide => slide.getAttribute('data-area-name') === targetAreaName);
            }
            if (foundIndex !== -1) currentAreaIndex = foundIndex;
        } else if (sessionStorage.getItem('jumpToNewList') === 'true') {
            currentAreaIndex = panelCount - 1;
            sessionStorage.removeItem('jumpToNewList');
        } else if (sessionStorage.getItem('lastActivePanelId')) {
            const lastId = sessionStorage.getItem('lastActivePanelId');
            const foundIndex = slides.findIndex(slide => slide.getAttribute('data-list-id') === lastId || slide.getAttribute('data-area-id') === lastId);
            if (foundIndex !== -1) currentAreaIndex = foundIndex;
        }

        if (infiniteEnabled) {
            const firstClone = slides[0].cloneNode(true);
            const lastClone = slides[panelCount - 1].cloneNode(true);

            [firstClone, lastClone].forEach((clone) => {
                clone.setAttribute('aria-hidden', 'true');
                clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
            });

            carousel.appendChild(firstClone);
            carousel.insertBefore(lastClone, slides[0]);

            trackPosition = currentAreaIndex + 1;
            carousel.style.transform = `translateX(-${trackPosition * 100}%)`;

            carousel.addEventListener('transitionend', (e) => {
                if (e.target !== carousel || e.propertyName !== 'transform') return;

                if (trackPosition === 0) trackPosition = panelCount;
                else if (trackPosition === panelCount + 1) trackPosition = 1;
                else return;

                carousel.style.transition = 'none';
                carousel.style.transform = `translateX(-${trackPosition * 100}%)`;
                void carousel.offsetWidth;
                carousel.style.transition = '';
            });
        } else {
            carousel.style.transform = `translateX(-${currentAreaIndex * 100}%)`;
        }

        function updateTitle(index) {
            if (!slides[index]) return;

            const slide = slides[index];
            const areaName = slide.dataset.areaName || slide.dataset.title || slide.dataset.listName;
            const isShared = slide.dataset.isShared === 'true';
            const isOwner = slide.dataset.areaOwner === 'true';
            const areaId = slide.dataset.areaId || slide.dataset.listId;

            if (titleText && areaName) {
                let iconHtml = isShared ? ` <span class="area-shared-icon area-title-word" title="Shared area" aria-label="Shared area"><i class="bi bi-people-fill" aria-hidden="true"></i></span>` : '';
                titleText.innerHTML = `${areaName}${iconHtml}`;
            }

            if (editBtn) {
                if (areaId) {
                    editBtn.dataset.areaId = areaId;
                    editBtn.dataset.areaName = areaName || '';
                    editBtn.dataset.areaShared = isShared;
                    editBtn.dataset.areaOwner = isOwner;
                    editBtn.disabled = false;
                } else {
                    editBtn.disabled = true;
                }
            }

            slides.forEach(s => s.classList.remove('active-carousel-slide'));
            slide.classList.add('active-carousel-slide');

            if (areaId) {
                sessionStorage.setItem('lastActivePanelId', areaId);
            }
        }

        function stepArea(delta) {
            if (!infiniteEnabled) return;

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
            carousel.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
            carousel.style.transform = `translateX(-${trackPosition * 100}%)`;
        }

        if (prevBtn) {
            prevBtn.removeAttribute('disabled');
            prevBtn.addEventListener('click', (e) => { e.preventDefault(); stepArea(-1); });
        }
        if (nextBtn) {
            nextBtn.removeAttribute('disabled');
            nextBtn.addEventListener('click', (e) => { e.preventDefault(); stepArea(1); });
        }

        let startX = 0;
        let isSwiping = false;

        carousel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isSwiping = true;
        }, { passive: true });

        carousel.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) stepArea(diff > 0 ? 1 : -1);
            isSwiping = false;
        });

        updateTitle(currentAreaIndex);
    });
});