document.addEventListener('DOMContentLoaded', () => {
    function closeAllMorphs() {
        document
            .querySelectorAll('.t-morph[data-open="true"]')
            .forEach((morph) => {
                morph.setAttribute('data-open', 'false');

                const trigger = morph.querySelector('.t-morph-plus');

                if (trigger) {
                    trigger.setAttribute('aria-expanded', 'false');
                }
            });
    }

    document
        .querySelectorAll('.t-morph')
        .forEach((morph) => {
            const trigger = morph.querySelector('.t-morph-plus');

            if (!trigger) {
                return;
            }

            trigger.addEventListener('click', (event) => {
                event.stopPropagation();

                const isOpen =
                    morph.getAttribute('data-open') === 'true';

                closeAllMorphs();

                if (!isOpen) {
                    morph.setAttribute('data-open', 'true');
                    trigger.setAttribute('aria-expanded', 'true');
                }
            });

            /*
             * Clicking inside the morph itself should not
             * trigger the document-level close handler.
             */
            morph.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            /*
             * When an actual menu action is selected, close
             * the morph immediately. This is particularly
             * important when Bootstrap opens a modal.
             */
            morph.querySelectorAll('.t-morph-menu-item').forEach((item) => {
                item.addEventListener('click', () => {
                    closeAllMorphs();
                });
            });
        });

    document.addEventListener('click', closeAllMorphs);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllMorphs();
        }
    });
});

