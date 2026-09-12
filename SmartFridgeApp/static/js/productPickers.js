// productPickers.js
//
// Progressively enhances the plain <select> (area, unit) and
// <input type="date"> (expiration) controls inside the product modals
// into custom, animated pickers matching the dashboard's quick-add "+"
// morph menu (see morphMenu.css) — a trigger button + a floating panel
// that fades/slides/blurs in, using the same --morph-* variables.
//
// The original <select>/<input> stays in the DOM as the source of
// truth (just visually hidden) — everything else (productModal.js,
// Django's eventual real form) keeps reading/writing .value exactly as
// before. If this script fails to load, the plain native controls are
// simply left alone and still work.

document.addEventListener('DOMContentLoaded', () => {

    function closeAllPickers(except) {
        document
            .querySelectorAll('.picker-select-wrap.is-open, .picker-date-wrap.is-open')
            .forEach((el) => {
                if (el !== except) {
                    el.classList.remove('is-open');
                }
            });
    }

    document.addEventListener('click', () => closeAllPickers());

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllPickers();
        }
    });


    // -----------------------------------------
    // Custom select (area / unit)
    // -----------------------------------------

    function enhanceSelect(selectEl) {
        if (!selectEl || selectEl.dataset.enhanced === 'true') {
            return;
        }

        selectEl.dataset.enhanced = 'true';

        const isAreaPicker = selectEl.classList.contains('product-area-select');
        const isUnitPicker = selectEl.classList.contains('product-unit-select');

        const wrapper = document.createElement('div');
        wrapper.className = 'picker-select-wrap';

        if (isUnitPicker) {
            wrapper.classList.add('product-unit-select-wrap');
        }

        selectEl.parentNode.insertBefore(wrapper, selectEl);
        wrapper.appendChild(selectEl);
        selectEl.classList.add('picker-native-hidden');

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'picker-trigger';

        if (isAreaPicker) {
            trigger.classList.add('picker-trigger-pill');
        } else if (isUnitPicker) {
            trigger.classList.add('picker-trigger-joined');
        }

        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const triggerLabel = document.createElement('span');
        triggerLabel.className = 'picker-trigger-label';
        trigger.appendChild(triggerLabel);

        const chevron = document.createElement('i');
        chevron.className = 'bi bi-chevron-down picker-trigger-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        trigger.appendChild(chevron);

        const panel = document.createElement('div');
        panel.className = 'picker-panel';
        panel.setAttribute('role', 'listbox');
        panel.addEventListener('click', (event) => event.stopPropagation());

        function syncLabel() {
            const selected = selectEl.options[selectEl.selectedIndex];
            triggerLabel.textContent = selected ? selected.textContent : '';
        }

        function syncOptions() {
            panel.innerHTML = '';

            Array.from(selectEl.options).forEach((option) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'picker-option';
                item.textContent = option.textContent;
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', option.selected ? 'true' : 'false');

                if (option.selected) {
                    item.classList.add('is-selected');
                }

                item.addEventListener('click', () => {
                    selectEl.value = option.value;
                    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                    closePanel();
                });

                panel.appendChild(item);
            });
        }

        function openPanel() {
            closeAllPickers(wrapper);
            syncOptions();
            wrapper.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
        }

        function closePanel() {
            wrapper.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', (event) => {
            event.stopPropagation();

            if (wrapper.classList.contains('is-open')) {
                closePanel();
            } else {
                openPanel();
            }
        });

        selectEl.addEventListener('change', syncLabel);

        wrapper.appendChild(trigger);
        wrapper.appendChild(panel);

        syncLabel();
    }


    // -----------------------------------------
    // Custom calendar (expiration date)
    // -----------------------------------------

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    function pad2(value) {
        return String(value).padStart(2, '0');
    }

    function parseIsoDate(value) {
        if (!value) {
            return null;
        }

        const parts = value.split('-').map(Number);

        if (parts.length !== 3 || parts.some(Number.isNaN)) {
            return null;
        }

        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function isSameDay(a, b) {
        return !!a && !!b
            && a.getFullYear() === b.getFullYear()
            && a.getMonth() === b.getMonth()
            && a.getDate() === b.getDate();
    }

    function enhanceDateInput(inputEl) {
        if (!inputEl || inputEl.dataset.enhanced === 'true') {
            return;
        }

        inputEl.dataset.enhanced = 'true';

        const wrapper = document.createElement('div');
        wrapper.className = 'picker-date-wrap';

        inputEl.parentNode.insertBefore(wrapper, inputEl);
        wrapper.appendChild(inputEl);
        inputEl.classList.add('picker-native-hidden');

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'picker-trigger';
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-expanded', 'false');

        const triggerLabel = document.createElement('span');
        triggerLabel.className = 'picker-trigger-label';
        trigger.appendChild(triggerLabel);

        const calIcon = document.createElement('i');
        calIcon.className = 'bi bi-calendar3 picker-trigger-chevron';
        calIcon.setAttribute('aria-hidden', 'true');
        trigger.appendChild(calIcon);

        const panel = document.createElement('div');
        panel.className = 'picker-panel picker-calendar-panel';
        panel.addEventListener('click', (event) => event.stopPropagation());

        let viewDate = new Date();
        let selectedDate = null;

        function syncLabel() {
            selectedDate = parseIsoDate(inputEl.value);

            if (selectedDate) {
                triggerLabel.textContent =
                    `${pad2(selectedDate.getDate())}.${pad2(selectedDate.getMonth() + 1)}.${selectedDate.getFullYear()}`;
                triggerLabel.classList.remove('is-placeholder');
                viewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            } else {
                triggerLabel.textContent = 'Select date';
                triggerLabel.classList.add('is-placeholder');
            }
        }

        function setDate(date) {
            inputEl.value = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function renderCalendar() {
            panel.innerHTML = '';

            const header = document.createElement('div');
            header.className = 'picker-cal-header';

            const prevBtn = document.createElement('button');
            prevBtn.type = 'button';
            prevBtn.className = 'picker-cal-nav';
            prevBtn.setAttribute('aria-label', 'Previous month');
            prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
            prevBtn.addEventListener('click', () => {
                viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
                renderCalendar();
            });

            const monthLabel = document.createElement('span');
            monthLabel.className = 'picker-cal-month';
            monthLabel.textContent = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

            const nextBtn = document.createElement('button');
            nextBtn.type = 'button';
            nextBtn.className = 'picker-cal-nav';
            nextBtn.setAttribute('aria-label', 'Next month');
            nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
            nextBtn.addEventListener('click', () => {
                viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
                renderCalendar();
            });

            header.appendChild(prevBtn);
            header.appendChild(monthLabel);
            header.appendChild(nextBtn);
            panel.appendChild(header);

            const weekdayRow = document.createElement('div');
            weekdayRow.className = 'picker-cal-weekdays';

            WEEKDAY_LABELS.forEach((label) => {
                const cell = document.createElement('span');
                cell.textContent = label;
                weekdayRow.appendChild(cell);
            });

            panel.appendChild(weekdayRow);

            const grid = document.createElement('div');
            grid.className = 'picker-cal-grid';

            const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
            // Monday-first week: getDay() is 0 (Sun) .. 6 (Sat) — shift so
            // Monday is 0.
            const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
            const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
            const today = new Date();

            for (let i = 0; i < leadingBlanks; i++) {
                const filler = document.createElement('span');
                filler.className = 'picker-cal-day is-empty';
                grid.appendChild(filler);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                const dayBtn = document.createElement('button');
                dayBtn.type = 'button';
                dayBtn.className = 'picker-cal-day';
                dayBtn.textContent = String(day);

                if (isSameDay(cellDate, today)) {
                    dayBtn.classList.add('is-today');
                }

                if (isSameDay(cellDate, selectedDate)) {
                    dayBtn.classList.add('is-selected');
                }

                dayBtn.addEventListener('click', () => {
                    setDate(cellDate);
                    syncLabel();
                    closePanel();
                });

                grid.appendChild(dayBtn);
            }

            panel.appendChild(grid);

            const footer = document.createElement('div');
            footer.className = 'picker-cal-footer';

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'custom-link custom-link-button';
            clearBtn.textContent = 'Clear';
            clearBtn.addEventListener('click', () => {
                inputEl.value = '';
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                syncLabel();
                closePanel();
            });

            footer.appendChild(clearBtn);
            panel.appendChild(footer);
        }

        function openPanel() {
            closeAllPickers(wrapper);
            syncLabel();
            renderCalendar();
            wrapper.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
        }

        function closePanel() {
            wrapper.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', (event) => {
            event.stopPropagation();

            if (wrapper.classList.contains('is-open')) {
                closePanel();
            } else {
                openPanel();
            }
        });

        inputEl.addEventListener('change', syncLabel);

        wrapper.appendChild(trigger);
        wrapper.appendChild(panel);

        syncLabel();
    }


    document.querySelectorAll('.product-area-select, .product-unit-select').forEach(enhanceSelect);
    document.querySelectorAll('input[type="date"].popup-input').forEach(enhanceDateInput);
});
