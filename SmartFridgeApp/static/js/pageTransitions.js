/*
   Provides a small, optional handoff before dashboard <-> areas navigation.
   It closes transient menus first; supported browsers then perform the native
   cross-document transition declared in pageTransitions.css.
*/
(function () {
    'use strict';

    let isNavigating = false;

    function isSkippedTransition(error) {
        return error && error.name === 'AbortError' && error.message === 'Transition was skipped';
    }

    function handleNativeTransition(event) {
        if (!event.viewTransition) return;

        // A skipped native transition is the documented progressive fallback
        // (for example after a bfcache restore or an ineligible navigation).
        // Consume only that expected rejection so Opera does not report it as
        // an uncaught promise; report all other transition failures normally.
        event.viewTransition.finished.catch(function (error) {
            if (!isSkippedTransition(error)) {
                console.error('Page transition failed unexpectedly.', error);
            }
        });
    }

    function closeTransientUi() {
        // This class makes any open overlay visually closed before the
        // browser snapshots the outgoing document for its view transition.
        document.documentElement.classList.add('page-transition-preparing');

        document.querySelectorAll('.gooey-chk:checked').forEach(function (checkbox) {
            checkbox.checked = false;
        });

        document.querySelectorAll('.t-morph[data-open="true"]').forEach(function (menu) {
            menu.dataset.open = 'false';
            const trigger = menu.querySelector('.t-morph-plus');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
        });

        // const sideMenu = document.querySelector('.offcanvas.show');
        // if (sideMenu && window.bootstrap && window.bootstrap.Offcanvas) {
        //     window.bootstrap.Offcanvas.getOrCreateInstance(sideMenu).hide();
        // }
    }

    function navigate(url) {
        if (!url || isNavigating) return;

        isNavigating = true;
        closeTransientUi();

        // Keep this synchronous with the user gesture. Cross-document View
        // Transitions are eligible only for browser-recognized navigation;
        // delaying location.assign() can make some Chromium browsers skip it.
        window.location.assign(url);
    }

    window.SmartFridgePageTransition = { navigate: navigate };

    window.addEventListener('pageswap', handleNativeTransition);

    // Some Opera releases surface the skipped-transition rejection without a
    // pageswap promise being exposed to page code. Keep the fallback equally
    // narrow so unrelated promise failures are never hidden.
    window.addEventListener('unhandledrejection', function (event) {
        if (isSkippedTransition(event.reason)) {
            event.preventDefault();
        }
    });

    // A Back/Forward restore may revive this script from bfcache with the
    // old module state intact. Reset it so a restored page can transition
    // again and never retains the snapshot-only menu-closing styles.
    window.addEventListener('pageshow', function () {
        isNavigating = false;
        document.documentElement.classList.remove('page-transition-preparing');
    });

    document.addEventListener('click', function (event) {
        const link = event.target.closest('a[data-page-transition]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        if (link.target && link.target !== '_self') return;

        if (isNavigating) {
            event.preventDefault();
            return;
        }

        isNavigating = true;
        closeTransientUi();

        // Do not prevent the anchor's default navigation or delay it. This
        // preserves the user-initiated navigation required by the API.
    });
}());
