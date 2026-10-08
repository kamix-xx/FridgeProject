document.addEventListener('DOMContentLoaded', function () {
    const stepModal = document.getElementById('stepModal');
    if (!stepModal) return;

    const form = document.getElementById('stepForm');
    const modalTitle = document.getElementById('stepModalTitle');
    const nameInput = document.getElementById('stepNameInput');
    const descInput = document.getElementById('stepDescInput');
    const picInput = document.getElementById('stepPictureInput');
    const picPreview = document.getElementById('stepPicturePreview');
    const iconsPlaceholder = document.getElementById('stepIconsPlaceholder');
    const submitIcon = document.getElementById('stepSubmitIcon');

    const deleteModal = document.getElementById('universalDeleteModal');
    if (!deleteModal) return;

    const deleteForm = document.getElementById('deleteModalForm');
    const deleteTitle = document.getElementById('deleteModalTitle');

    // Obsługa wywołania modala
    stepModal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;

        const mode = button.getAttribute('data-mode');
        const actionUrl = button.getAttribute('data-action-url');

        form.setAttribute('action', actionUrl);
        picInput.value = '';

        if (mode === 'edit') {
            modalTitle.textContent = 'Edit step';
            submitIcon.className = 'bi bi-floppy';

            nameInput.value = button.getAttribute('data-title');
            descInput.value = button.getAttribute('data-desc');

            const imgUrl = button.getAttribute('data-img');
            if (imgUrl) {
                picPreview.src = imgUrl;
                picPreview.classList.remove('d-none');
                iconsPlaceholder.classList.add('d-none');
            } else {
                picPreview.src = '';
                picPreview.classList.add('d-none');
                iconsPlaceholder.classList.remove('d-none');
            }
        } else {
            // Tryb ADD - czyszczenie pól
            modalTitle.textContent = 'Add step';
            submitIcon.className = 'bi bi-plus';
            form.reset();
            picPreview.src = '';
            picPreview.classList.add('d-none');
            iconsPlaceholder.classList.remove('d-none');
        }
    });

    // Podgląd wybranego zdjęcia w locie
    picInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            picPreview.src = URL.createObjectURL(file);
            picPreview.classList.remove('d-none');
            iconsPlaceholder.classList.add('d-none');
        }
    });

    deleteModal.addEventListener('show.bs.modal', function (event) {
        // Przycisk, który wywołał usunięcie
        const button = event.relatedTarget;

        // Pobranie danych
        const actionUrl = button.getAttribute('data-action-url');
        const title = button.getAttribute('data-title');

        // Aktualizacja modala
        if (actionUrl) deleteForm.setAttribute('action', actionUrl);
        if (title) deleteTitle.textContent = title;
    });
});