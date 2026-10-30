// editAreaModal.js
// Handles the Edit Area modal state, morphing panels, avatar list rendering, and user removal workflows.

document.addEventListener('DOMContentLoaded', function () {
    var editAreaModalEl = document.getElementById('editAreaModal');
    if (!editAreaModalEl) return;

    // ---- Config -------------------------------------------------------
    var AVATAR_VISIBLE_MAX = 5;
    var LIFT_MAX = 10;
    var LIFT_FALLOFF = 4;
    var SCALE_HOVER = 1.12;
    var EASE_LIFT = 'cubic-bezier(0.34, 0, 0.2, 1)';
    var EASE_RETURN = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    var prefersReducedMotion = !!(window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // ---- Panel Morphing -----------------------------------------------
    var editAreaPanels = {};
    editAreaModalEl.querySelectorAll('.edit-area-panel').forEach(function (panel) {
        editAreaPanels[panel.dataset.panel] = panel;
    });

    var editAreaState = {current: 'main', previous: 'main', pendingUser: null};

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
            morphWrap.style.height = morphWrap.offsetHeight + 'px';
            morphWrap.style.overflow = 'hidden';
        }

        outgoing.classList.add('is-leaving');
        incoming.classList.remove('d-none');

        void incoming.offsetWidth; // Force reflow

        if (morphWrap) {
            morphWrap.style.height = incoming.offsetHeight + 'px';
        }

        incoming.classList.add('is-entering');

        requestAnimationFrame(function () {
            incoming.classList.remove('is-entering');
        });

        function handleLeaveEnd(ev) {
            if (ev.target !== outgoing) return;
            outgoing.removeEventListener('transitionend', handleLeaveEnd);
            outgoing.classList.add('d-none');
            outgoing.classList.remove('is-leaving');

            if (morphWrap) {
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
            switchEditAreaPanel(editAreaState.previous || 'list');
        });
    }

    // Helper to get CSRF token
    function getCsrfToken() {
        var tokenInput = document.querySelector('#editAreaModal [name=csrfmiddlewaretoken]') ||
            document.querySelector('input[name=csrfmiddlewaretoken]');
        return tokenInput ? tokenInput.value : '';
    }

    // Helper to show/hide loading spinner
    function setGlobalLoading(isLoading) {
        let overlay = document.getElementById('appGlobalLoader');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'appGlobalLoader';
            overlay.className = 'app-loading-overlay';
            overlay.innerHTML = '<div class="app-spinner"></div>';
            document.body.appendChild(overlay);
        }
        overlay.classList.toggle('is-active', isLoading);
    }

    // ---- API Actions (Remove Member & Stop Sharing) -------------------
    var confirmRemoveBtn = document.getElementById('editAreaConfirmRemove');
    if (confirmRemoveBtn) {
        confirmRemoveBtn.addEventListener('click', function () {
            var areaId = editAreaModalEl.dataset.areaId;
            var user = editAreaState.pendingUser;
            if (!areaId || !user) return;

            setGlobalLoading(true); // Show loader immediately

            fetch('/areas/' + areaId + '/remove-member/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({username: user.username})
            })
                .then(function (res) {
                    if (res.ok) {
                        window.location.reload();
                    } else {
                        setGlobalLoading(false);
                        alert('Failed to remove member.');
                    }
                })
                .catch(function () {
                    setGlobalLoading(false);
                    alert('Connection error occurred.');
                });
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
            var areaId = editAreaModalEl.dataset.areaId;
            if (!areaId) return;

            setGlobalLoading(true); // Show loader immediately

            fetch('/areas/' + areaId + '/stop-sharing/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                }
            })
                .then(function (res) {
                    if (res.ok) {
                        window.location.reload();
                    } else {
                        setGlobalLoading(false);
                        alert('Failed to stop sharing area.');
                    }
                })
                .catch(function () {
                    setGlobalLoading(false);
                    alert('Connection error occurred.');
                });
        });
    }

    function openConfirmPanel(user) {
        editAreaState.pendingUser = user;
        var nameEl = document.getElementById('editAreaConfirmName');
        if (nameEl) nameEl.textContent = user.username;
        switchEditAreaPanel('confirm');
    }

    // ---- Avatar Elements ----------------------------------------------
    function buildAvatarEl(tag, user, className) {
        var el = document.createElement(tag);
        el.className = className;

        var avatarSrc = user.avatar || user.avatar_url;

        if (avatarSrc) {
            var img = document.createElement('img');
            img.src = avatarSrc;
            img.alt = '';
            el.appendChild(img);
        } else {
            var initial = (user.username || '?').trim().charAt(0).toUpperCase();
            el.textContent = initial || '?';
        }
        return el;
    }

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

        // Clicking anywhere on the container background/wrapper (not strictly an avatar button) opens full list
        avatarGroupEl.addEventListener('click', function (e) {
            if (e.target === avatarGroupEl) {
                switchEditAreaPanel('list');
            }
        });
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
            btn.setAttribute('aria-label', 'View details or remove ' + user.username);

            btn.addEventListener('mouseenter', function () {
                applyAvatarHover(i);
            });

            // Clicking an individual avatar now opens the full list panel instead of instant prompt removal
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                switchEditAreaPanel('list');
            });

            avatarGroupEl.appendChild(btn);
        });

        if (overflowCount > 0 || users.length > 0) {
            var moreBtn = document.createElement('button');
            moreBtn.type = 'button';
            moreBtn.className = 'avatar-group-item avatar-group-more';
            moreBtn.textContent = overflowCount > 0 ? ('+' + overflowCount) : '...';
            moreBtn.setAttribute('aria-label', 'Show all ' + users.length + ' people this area is shared with');

            moreBtn.addEventListener('mouseenter', function () {
                applyAvatarHover(visible.length);
            });

            moreBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                switchEditAreaPanel('list');
            });

            avatarGroupEl.appendChild(moreBtn);
        }
    }

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
                openConfirmPanel(user);
            });

            peopleListEl.appendChild(row);
        });
    }

    // ---- Modal Initialization -----------------------------------------
    var peopleSectionEl = document.getElementById('editAreaPeopleSection');

    editAreaModalEl.addEventListener('show.bs.modal', function (e) {
        var trigger = e.relatedTarget;
        if (!trigger) return;

        switchEditAreaPanel('main', true);

        editAreaModalEl.dataset.areaId = trigger.dataset.areaId || '';

        // Read ownership and sharing status
        var isShared = String(trigger.dataset.areaShared).toLowerCase() === 'true';
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

        var nameInput = editAreaModalEl.querySelector('#editAreaName');
        var saveAreaBtn = editAreaModalEl.querySelector('#saveAreaBtn');

// Lock editing for shared areas when the current user is not the owner

        var isLocked = !isOwner;

        if (nameInput) {
            nameInput.value = trigger.dataset.areaName || '';
            nameInput.disabled = isLocked;
        }

        if (saveAreaBtn) {
            saveAreaBtn.disabled = isLocked;
            saveAreaBtn.style.opacity = isLocked ? '0.5' : '';
            saveAreaBtn.style.pointerEvents = isLocked ? 'none' : '';
        }

        if (peopleSectionEl) {
            peopleSectionEl.classList.toggle('d-none', users.length === 0);
        }

        renderAvatarGroup(users);
        renderPeopleList(users);
    });
});