document.addEventListener('DOMContentLoaded', function () {

    // --- ZMIENNE DLA AWATARA ---
    const editModal = document.getElementById('editAccountModal');
    const avatarUploadInput = document.getElementById('avatarUpload');
    const avatarFrame = document.querySelector('.edit-avatar-frame');

    // Zapamiętywanie początkowego stanu awatara
    let originalAvatarImg = document.querySelector('.edit-avatar-frame .profile-avatar-img');
    let originalAvatarSrc = originalAvatarImg ? originalAvatarImg.src : null;

    // 1. PODGLĄD WGRANEGO ZDJĘCIA W LOCIE
    if (avatarUploadInput && avatarFrame) {
        avatarUploadInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (file) {
                // Generowanie tymczasowego URL dla wybranego pliku
                const objectUrl = URL.createObjectURL(file);

                let img = avatarFrame.querySelector('.profile-avatar-img');
                const svg = avatarFrame.querySelector('.edit-avatar-svg');

                if (img) {
                    // Podmiana obrazka, jeśli już jakiś jest
                    img.src = objectUrl;
                } else {
                    // Jeśli było SVG, ukrywamy je i tworzymy nowy tag <img>
                    if (svg) svg.style.display = 'none';
                    img = document.createElement('img');
                    img.src = objectUrl;
                    img.className = 'profile-avatar-img';
                    avatarFrame.appendChild(img);
                }
            }
        });
    }

    // 2. RESETOWANIE MODALA EDYCJI KONTA
    if (editModal) {
        editModal.addEventListener('hidden.bs.modal', function () {
            const form = editModal.querySelector('form');
            if (form) form.reset();

            // Przywracanie awatara do stanu sprzed otwarcia modala
            let currentImg = avatarFrame.querySelector('.profile-avatar-img');
            const svg = avatarFrame.querySelector('.edit-avatar-svg');

            if (originalAvatarSrc) {
                // Użytkownik miał zdjęcie -> przywracamy jego stary link
                if (currentImg) currentImg.src = originalAvatarSrc;
            } else {
                // Użytkownik miał SVG -> usuwamy wgrany tag <img> i pokazujemy SVG z powrotem
                if (currentImg) currentImg.remove();
                if (svg) svg.style.display = 'block';
            }
        });
    }

    // 3. RESETOWANIE MODALA ZMIANY HASŁA
    const passwordModal = document.getElementById('changePasswordModal');
    if (passwordModal) {
        passwordModal.addEventListener('hidden.bs.modal', function () {
            const form = passwordModal.querySelector('form');
            if (form) {
                // Wyczyść wpisane hasła
                form.reset();

                // Zresetuj ikonki "oka" (przywróć ukrywanie haseł)
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