document.addEventListener('DOMContentLoaded', function () {
    const editUserModal = document.getElementById('editUserModal');
    if (!editUserModal) return;

    const customTrigger = document.getElementById('customStatusTrigger');
    const customOptions = document.getElementById('customStatusOptions');
    const hiddenStatusInput = document.getElementById('modalUserStatus');
    const customStatusText = document.getElementById('customStatusText');
    const optionItems = document.querySelectorAll('.admin-custom-option');

    customTrigger.addEventListener('click', function() {
        customOptions.classList.toggle('show');
    });

    document.addEventListener('click', function(e) {
        if (!customTrigger.contains(e.target) && !customOptions.contains(e.target)) {
            customOptions.classList.remove('show');
        }
    });

    optionItems.forEach(option => {
        option.addEventListener('click', function() {
            const selectedValue = this.getAttribute('data-value');
            customStatusText.textContent = this.textContent;
            hiddenStatusInput.value = selectedValue;

            if (selectedValue === 'DELETED') {
                customTrigger.classList.remove('status-active');
                customTrigger.classList.add('status-deleted');
            } else {
                customTrigger.classList.remove('status-deleted');
                customTrigger.classList.add('status-active');
            }

            customOptions.classList.remove('show');
        });
    });

    editUserModal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;
        if (!button) return;

        document.getElementById('modalUserId').value = button.getAttribute('data-id');
        document.getElementById('modalUserLogin').value = button.getAttribute('data-username');
        document.getElementById('modalUserName').value = button.getAttribute('data-name');
        document.getElementById('modalUserEmail').value = button.getAttribute('data-email');
        document.getElementById('modalUserRole').textContent = button.getAttribute('data-role');
        document.getElementById('modalUserDate').textContent = button.getAttribute('data-date');

        const status = button.getAttribute('data-status');
        hiddenStatusInput.value = status;
        customStatusText.textContent = `Status — ${status}`;

        if (status === 'DELETED') {
            customTrigger.classList.remove('status-active');
            customTrigger.classList.add('status-deleted');
        } else {
            customTrigger.classList.remove('status-deleted');
            customTrigger.classList.add('status-active');
        }

        const avatarUrl = button.getAttribute('data-avatar');
        const avatarImg = document.getElementById('modalUserAvatarImg');
        const avatarPlaceholder = document.getElementById('modalUserAvatarPlaceholder');
        if (avatarUrl) {
            avatarImg.src = avatarUrl;
            avatarImg.classList.remove('d-none');
            avatarPlaceholder.classList.add('d-none');
        } else {
            avatarImg.src = '';
            avatarImg.classList.add('d-none');
            avatarPlaceholder.classList.remove('d-none');
        }
    });
});