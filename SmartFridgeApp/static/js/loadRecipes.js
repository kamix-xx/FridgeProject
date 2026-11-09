document.addEventListener('DOMContentLoaded', function () {
    const toggleBtn = document.getElementById('toggleMyRecipesBtn');
    const toggleIcon = document.getElementById('toggleMyRecipesIcon');
    const hiddenRecipes = document.querySelectorAll('.my-recipe-item.d-none'); // łapiemy tylko te ukryte domyślnie

    if (toggleBtn && hiddenRecipes.length > 0) {
        let isExpanded = false;

        toggleBtn.addEventListener('click', function () {
            isExpanded = !isExpanded;

            if (isExpanded) {
                hiddenRecipes.forEach(el => {
                    el.classList.remove('d-none');
                    el.classList.add('d-block');
                });
                toggleIcon.classList.remove('bi-chevron-down');
                toggleIcon.classList.add('bi-chevron-up');
            } else {
                hiddenRecipes.forEach(el => {
                    el.classList.remove('d-block');
                    el.classList.add('d-none');
                });
                toggleIcon.classList.remove('bi-chevron-up');
                toggleIcon.classList.add('bi-chevron-down');
            }
        });
    } else if (toggleBtn && hiddenRecipes.length === 0) {
        toggleBtn.style.display = 'none';
    }
});