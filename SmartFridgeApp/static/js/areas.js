document.querySelectorAll('.area-card[data-area-link]').forEach(function (card) {
    function isFromGooeyMenu(e) {
        return !!e.target.closest('.gooey-menu');
    }

    card.addEventListener('click', function (e) {
        if (isFromGooeyMenu(e)) return;
        window.location.href = card.dataset.areaLink;
    });

    card.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (isFromGooeyMenu(e)) return;
        e.preventDefault();
        window.location.href = card.dataset.areaLink;
    });
});