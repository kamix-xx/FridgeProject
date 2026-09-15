document.addEventListener('DOMContentLoaded', function () {

    // --- ZMIENNE DLA AWATARA ---
    const editModal = document.getElementById('editAccountModal');
    const avatarUploadInput = document.getElementById('avatarUpload');
    const avatarFrame = document.querySelector('.edit-avatar-frame');

    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
    const removeAvatarFlag = document.getElementById('removeAvatarFlag');

    // Zapamiętywanie początkowego stanu awatara
    let originalAvatarImg = document.querySelector('.edit-avatar-frame .profile-avatar-img');
    let originalAvatarSrc = originalAvatarImg ? originalAvatarImg.src : null;

    // 1. PODGLĄD WGRANEGO ZDJĘCIA W LOCIE
    if (avatarUploadInput && avatarFrame) {
        avatarUploadInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (file) {
                const objectUrl = URL.createObjectURL(file);

                let img = avatarFrame.querySelector('.profile-avatar-img');
                const svg = avatarFrame.querySelector('.edit-avatar-svg');

                if (img) {
                    img.src = objectUrl;
                    img.classList.remove('d-none');
                } else {
                    img = document.createElement('img');
                    img.src = objectUrl;
                    img.className = 'profile-avatar-img';
                    avatarFrame.appendChild(img);
                }

                // Ukryj SVG, pokaż przycisk kosza, zresetuj flagę usunięcia
                if (svg) svg.classList.add('d-none');
                if (removeAvatarBtn) {
                    removeAvatarBtn.classList.remove('d-none');
                    removeAvatarBtn.classList.add('d-flex');
                }
                if (removeAvatarFlag) removeAvatarFlag.value = 'false';
            }
        });
    }

    // 2. KLIKNIĘCIE "REMOVE AVATAR" (Zmiany tylko w UI, bez zapisu)
    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', function() {
            if (removeAvatarFlag) removeAvatarFlag.value = 'true'; // flaga dla backendu
            if (avatarUploadInput) avatarUploadInput.value = '';   // czyścimy upload

            let img = avatarFrame.querySelector('.profile-avatar-img');
            const svg = avatarFrame.querySelector('.edit-avatar-svg');

            if (img) img.classList.add('d-none');
            if (svg) svg.classList.remove('d-none');

            removeAvatarBtn.classList.add('d-none');
            removeAvatarBtn.classList.remove('d-flex');
        });
    }

    // 3. RESETOWANIE MODALA EDYCJI KONTA PO ZAMKNIĘCIU "X"
    if (editModal) {
        editModal.addEventListener('hidden.bs.modal', function () {
            const form = editModal.querySelector('form');
            if (form) form.reset();

            let img = avatarFrame.querySelector('.profile-avatar-img');
            const svg = avatarFrame.querySelector('.edit-avatar-svg');

            if (originalAvatarSrc) {
                if (img) {
                    img.src = originalAvatarSrc;
                    img.classList.remove('d-none');
                }
                if (svg) svg.classList.add('d-none');

                if (removeAvatarBtn) {
                    removeAvatarBtn.classList.remove('d-none');
                    removeAvatarBtn.classList.add('d-flex');
                }
                if (removeAvatarFlag) removeAvatarFlag.value = 'false';
            } else {
                if (img) img.classList.add('d-none');
                if (svg) svg.classList.remove('d-none');

                if (removeAvatarBtn) {
                    removeAvatarBtn.classList.add('d-none');
                    removeAvatarBtn.classList.remove('d-flex');
                }
                if (removeAvatarFlag) removeAvatarFlag.value = 'false';
            }
        });
    }

    // 4. RESETOWANIE MODALA ZMIANY HASŁA
    const passwordModal = document.getElementById('changePasswordModal');
    if (passwordModal) {
        passwordModal.addEventListener('hidden.bs.modal', function () {
            const form = passwordModal.querySelector('form');
            if (form) {
                form.reset();
                const passwordToggles = form.querySelectorAll('.toggle-password');
                passwordToggles.forEach(icon => {
                    icon.classList.remove('bi-eye');
                    icon.classList.add('bi-eye-slash');
                    const input = icon.previousElementSibling;
                    if (input) input.type = 'password';
                });
            }
        });
    }
});