// areaCardLink.js
//
// Makes each .area-card on the Areas page clickable, sending the user to
// the dashboard already scrolled to that area's carousel panel (see
// dashboardAreaJump.js). Clicks inside the per-card gooey menu (share /
// edit / delete) are left alone so those buttons keep working as before.
// Also drives the Edit Area modal: pre-filling the name field, and (owner
// + shared areas only) the avatar-group "who it's shared with" UI —
// hover-lift on the avatars, and the main/list/confirm panel morph for
// removing someone.

document.addEventListener('DOMContentLoaded', function () {
    function navigateToArea(url) {
        if (window.SmartFridgePageTransition) {
            window.SmartFridgePageTransition.navigate(url);
            return;
        }

        window.location.href = url;
    }

    document.querySelectorAll('.area-card[data-area-link]').forEach(function (card) {
        function isFromGooeyMenu(e) {
            return !!e.target.closest('.gooey-menu');
        }

        card.addEventListener('click', function (e) {
            if (isFromGooeyMenu(e)) return;
            navigateToArea(card.dataset.areaLink);
        });

        card.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (isFromGooeyMenu(e)) return;
            e.preventDefault();
            navigateToArea(card.dataset.areaLink);
        });
    });

    var editAreaModalEl = document.getElementById('editAreaModal');
    if (!editAreaModalEl) return;

    // ---- config -------------------------------------------------------
    var AVATAR_VISIBLE_MAX = 5;     // avatars shown before the "+N" bubble
    var LIFT_MAX = 10;              // px the hovered avatar rises
    var LIFT_FALLOFF = 4;           // px less lift per avatar of distance
    var SCALE_HOVER = 1.12;         // scale applied to the hovered avatar only
    var EASE_LIFT = 'cubic-bezier(0.34, 0, 0.2, 1)';   // clean ease-in on hover
    var EASE_RETURN = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // bouncy spring back
    var prefersReducedMotion = !!(window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // ---- panel morph (main / list / confirm) ---------------------------
    var editAreaPanels = {};
    editAreaModalEl.querySelectorAll('.edit-area-panel').forEach(function (panel) {
        editAreaPanels[panel.dataset.panel] = panel;
    });

    var editAreaState = { current: 'main', previous: 'main' };

    function switchEditAreaPanel(name, instant) {
        if (name === editAreaState.current) return;
        var outgoing = editAreaPanels[editAreaState.current];
        var incoming = editAreaPanels[name];
        if (!outgoing || !incoming) return;

        editAreaState.previous = editAreaState.current;
        editAreaState.current = name;

        var morphWrap = document.getElementById('editAreaMorphWrap');

        if (instant || prefersReducedMotion) {
            outgoing.classList.add('d-none');
            incoming.classList.remove('d-none');
            if (morphWrap) {
                morphWrap.style.height = 'auto';
                morphWrap.style.overflow = '';
            }
            return;
        }

        if (morphWrap) {
            // Lock current height and hide overflow to prevent scrollbars during the morph
            morphWrap.style.height = morphWrap.offsetHeight + 'px';
            morphWrap.style.overflow = 'hidden';
        }

        outgoing.classList.add('is-leaving');
        incoming.classList.remove('d-none');

        // Force a DOM reflow so transitions execute
        void incoming.offsetWidth;

        if (morphWrap) {
            // Morph into the height of the incoming panel
            morphWrap.style.height = incoming.offsetHeight + 'px';
        }

        incoming.classList.add('is-entering');

        // Drop the entering class so it glides into its normal resting state
        requestAnimationFrame(function () {
            incoming.classList.remove('is-entering');
        });

        function handleLeaveEnd(ev) {
            if (ev.target !== outgoing) return;
            outgoing.removeEventListener('transitionend', handleLeaveEnd);
            outgoing.classList.add('d-none');
            outgoing.classList.remove('is-leaving');

            if (morphWrap) {
                // Restore wrapper back to its natural flow state after animating
                morphWrap.style.height = 'auto';
                morphWrap.style.overflow = '';
            }
        }

        outgoing.addEventListener('transitionend', handleLeaveEnd);
    }

    var listBackBtn = document.getElementById('editAreaListBack');
    if (listBackBtn) {
        listBackBtn.addEventListener('click', function () {
            switchEditAreaPanel('main');
        });
    }

    var confirmCancelBtn = document.getElementById('editAreaConfirmCancel');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', function () {
            switchEditAreaPanel(editAreaState.previous || 'main');
        });
    }

    var confirmRemoveBtn = document.getElementById('editAreaConfirmRemove');
    if (confirmRemoveBtn) {
        confirmRemoveBtn.addEventListener('click', function () {
            // TODO: no real endpoint yet — see the TODO comment near the
            // bottom of areas.html. Should remove editAreaState.pendingUser
            // from Area.users and, once that succeeds, probably re-render
            // the avatar group/list and switch back to editAreaState.previous.
        });
    }

    var stopSharingBtn = document.getElementById('stopSharingAreaBtn');
    if (stopSharingBtn) {
        stopSharingBtn.addEventListener('click', function () {
            switchEditAreaPanel('confirm-stop');
        });
    }

    var stopCancelBtn = document.getElementById('editAreaStopCancel');
    if (stopCancelBtn) {
        stopCancelBtn.addEventListener('click', function () {
            switchEditAreaPanel('main');
        });
    }

    var stopConfirmBtn = document.getElementById('editAreaStopConfirm');
    if (stopConfirmBtn) {
        stopConfirmBtn.addEventListener('click', function () {
            // TODO: call endpoint to clear Area.users down to owner + rotate Area.key
        });
    }

    function openConfirmPanel(user, fromList) {
        editAreaState.pendingUser = user;
        var nameEl = document.getElementById('editAreaConfirmName');
        if (nameEl) nameEl.textContent = user.username;
        switchEditAreaPanel('confirm');
    }

    // ---- avatar building ------------------------------------------------
    function buildAvatarEl(tag, user, className) {
        var el = document.createElement(tag);
        el.className = className;
        if (user.avatar_url) {
            var img = document.createElement('img');
            img.src = user.avatar_url;
            img.alt = '';
            el.appendChild(img);
        } else {
            var initial = (user.username || '?').trim().charAt(0).toUpperCase();
            el.textContent = initial || '?';
        }
        return el;
    }

    // ---- avatar group hover: distance-falloff lift, bouncy return -------
    var avatarGroupEl = document.getElementById('editAreaAvatarGroup');

    function applyAvatarHover(hoveredIndex) {
        var items = avatarGroupEl.querySelectorAll('.avatar-group-item');
        items.forEach(function (item, i) {
            var distance = Math.abs(i - hoveredIndex);
            var lift = Math.max(0, LIFT_MAX - distance * LIFT_FALLOFF);
            item.style.transitionTimingFunction = EASE_LIFT;
            item.style.setProperty('--shift', lift ? ('-' + lift + 'px') : '0px');
            item.style.setProperty('--scale', i === hoveredIndex ? String(SCALE_HOVER) : '1');
            item.classList.toggle('is-hovered', i === hoveredIndex);
        });
    }

    function clearAvatarHover() {
        var items = avatarGroupEl.querySelectorAll('.avatar-group-item');
        items.forEach(function (item) {
            item.style.transitionTimingFunction = EASE_RETURN;
            item.style.setProperty('--shift', '0px');
            item.style.setProperty('--scale', '1');
            item.classList.remove('is-hovered');
        });
    }

    if (avatarGroupEl) {
        avatarGroupEl.addEventListener('mouseleave', clearAvatarHover);
    }

    function renderAvatarGroup(users) {
        if (!avatarGroupEl) return;
        avatarGroupEl.innerHTML = '';

        var visible = users.slice(0, AVATAR_VISIBLE_MAX);
        var overflowCount = users.length - visible.length;

        visible.forEach(function (user, i) {
            var btn = buildAvatarEl('button', user, 'avatar-group-item');
            btn.type = 'button';
            btn.title = user.username;
            btn.setAttribute('aria-label', 'Remove ' + user.username + ' from this area');
            btn.addEventListener('mouseenter', function () {
                applyAvatarHover(i);
            });
            btn.addEventListener('click', function () {
                openConfirmPanel(user);
            });
            avatarGroupEl.appendChild(btn);
        });

        if (overflowCount > 0) {
            var moreBtn = document.createElement('button');
            moreBtn.type = 'button';
            moreBtn.className = 'avatar-group-item avatar-group-more';
            moreBtn.textContent = '+' + overflowCount;
            moreBtn.setAttribute('aria-label', 'Show all ' + users.length + ' people this area is shared with');
            moreBtn.addEventListener('mouseenter', function () {
                applyAvatarHover(visible.length);
            });
            moreBtn.addEventListener('click', function () {
                switchEditAreaPanel('list');
            });
            avatarGroupEl.appendChild(moreBtn);
        }
    }

    // ---- full scrollable list --------------------------------------------
    var peopleListEl = document.getElementById('editAreaPeopleList');

    function renderPeopleList(users) {
        if (!peopleListEl) return;
        peopleListEl.innerHTML = '';

        users.forEach(function (user) {
            var row = document.createElement('button');
            row.type = 'button';
            row.className = 'edit-area-person-row';

            row.appendChild(buildAvatarEl('span', user, 'edit-area-person-avatar'));

            var name = document.createElement('span');
            name.className = 'edit-area-person-name';
            name.textContent = user.username;
            row.appendChild(name);

            var icon = document.createElement('i');
            icon.className = 'bi bi-x-lg edit-area-person-remove-icon';
            icon.setAttribute('aria-hidden', 'true');
            row.appendChild(icon);

            row.addEventListener('click', function () {
                openConfirmPanel(user, true);
            });

            peopleListEl.appendChild(row);
        });
    }

    // ---- wiring it all up when the modal opens ---------------------------
    var peopleSectionEl = document.getElementById('editAreaPeopleSection');

    editAreaModalEl.addEventListener('show.bs.modal', function (e) {
        var trigger = e.relatedTarget;
        if (!trigger) return;

        switchEditAreaPanel('main', true);

        editAreaModalEl.dataset.areaId = trigger.dataset.areaId || '';

        var nameInput = document.getElementById('editAreaName');
        if (nameInput) nameInput.value = trigger.dataset.areaName || '';

        var isShared = trigger.dataset.areaShared === 'true';
        var isOwner = trigger.dataset.areaOwner === 'true';
        var users = [];

        if (isShared && isOwner) {
            var dataEl = document.getElementById('area-users-' + trigger.dataset.areaId);
            if (dataEl) {
                try {
                    users = JSON.parse(dataEl.textContent) || [];
                } catch (err) {
                    users = [];
                }
            }
        }

        if (peopleSectionEl) {
            peopleSectionEl.classList.toggle('d-none', users.length === 0);
        }

        renderAvatarGroup(users);
        renderPeopleList(users);
    });
});