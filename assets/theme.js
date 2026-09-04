/* =========================================================================
   SAUDADE — theme JS
   No dependencies. Progressive enhancement over working Liquid/HTML.
   ========================================================================= */
(function () {
  'use strict';

  var S = window.Saudade || {};
  var routes = S.routes || {};

  /* ---------------- utils ---------------- */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts); }

  function formatMoney(cents) {
    var fmt = S.moneyFormat || '${{amount}}';
    function withComma(n) { return n.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,'); }
    function withDot(n) { return n.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.'); }
    var value = '';
    var amount = (cents / 100);
    var placeholder = fmt.match(/\{\{\s*(\w+)\s*\}\}/);
    var key = placeholder ? placeholder[1] : 'amount';
    switch (key) {
      case 'amount_no_decimals': value = withComma(Math.round(amount).toString()); break;
      case 'amount_with_comma_separator': value = withDot(amount.toFixed(2)).replace(/\.(\d\d)$/, ',$1'); break;
      case 'amount_no_decimals_with_comma_separator': value = withDot(Math.round(amount).toString()); break;
      case 'amount_with_space_separator': value = amount.toFixed(2).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1 ').replace(/\.(\d\d)$/, ',$1'); break;
      default: value = withComma(amount.toFixed(2));
    }
    return fmt.replace(/\{\{\s*\w+\s*\}\}/, value);
  }

  var scrollLocks = 0;
  function lockScroll() { scrollLocks++; document.body.classList.add('is-locked'); }
  function unlockScroll() { scrollLocks = Math.max(0, scrollLocks - 1); if (!scrollLocks) document.body.classList.remove('is-locked'); }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('Toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2600);
  }
  window.saudadeToast = toast;

  function trapFocus(container) {
    var sel = 'a[href], button:not([disabled]), input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])';
    function handler(e) {
      if (e.key !== 'Tab') return;
      var items = $$(sel, container).filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', handler);
    return function () { container.removeEventListener('keydown', handler); };
  }

  /* ---------------- overlay ---------------- */

  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.setAttribute('hidden', '');
  document.addEventListener('DOMContentLoaded', function () {
    overlay.removeAttribute('hidden');
    document.body.appendChild(overlay);
  });
  on(overlay, 'click', function () { closeAll(); });

  var openPanels = [];
  function openPanel(el, opts) {
    if (!el) return;
    opts = opts || {};
    el.classList.add('is-open');
    el.removeAttribute('aria-hidden');
    overlay.classList.add('is-open');
    lockScroll();
    var release = trapFocus(el);
    openPanels.push({ el: el, release: release });
    var focusTarget = el.querySelector('[data-autofocus]') || el.querySelector('button, a, input');
    if (focusTarget && !opts.noFocus) setTimeout(function () { focusTarget.focus(); }, 60);
  }
  function closePanel(el) {
    var idx = -1;
    openPanels.forEach(function (p, i) { if (p.el === el) idx = i; });
    if (idx === -1) return;
    openPanels[idx].release();
    openPanels.splice(idx, 1);
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    unlockScroll();
    if (!openPanels.length) overlay.classList.remove('is-open');
  }
  function closeAll() { openPanels.slice().reverse().forEach(function (p) { closePanel(p.el); }); }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openPanels.length) closePanel(openPanels[openPanels.length - 1].el);
  });

  window.saudadeOpen = openPanel;
  window.saudadeClose = closePanel;

  /* ---------------- cart ---------------- */

  var Cart = {
    sectionsToRender: function () {
      var ids = [];
      if ($('#CartDrawer')) ids.push('cart-drawer');
      if ($('[data-cart-icon-bubble]')) ids.push('header');
      var mainCart = $('#MainCart');
      if (mainCart) ids.push(mainCart.getAttribute('data-section-id') || 'main-cart');
      return ids;
    },

    render: function (data) {
      var sections = data && data.sections;
      if (!sections) { return Cart.refresh(); }
      Object.keys(sections).forEach(function (id) {
        var html = sections[id];
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        if (id === 'cart-drawer') {
          var src = doc.querySelector('#CartDrawerContents');
          var dst = $('#CartDrawerContents');
          if (src && dst) dst.innerHTML = src.innerHTML;
        } else if (id === 'header') {
          var b = doc.querySelector('[data-cart-icon-bubble]');
          var cur = $('[data-cart-icon-bubble]');
          if (b && cur) cur.innerHTML = b.innerHTML;
        } else {
          var mc = doc.querySelector('#MainCart');
          var mcur = $('#MainCart');
          if (mc && mcur) mcur.innerHTML = mc.innerHTML;
        }
      });
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: data }));
    },

    refresh: function () {
      return fetch(routes.cart + '.js', { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (cart) {
          var bubbles = $$('[data-cart-count]');
          bubbles.forEach(function (b) { b.textContent = cart.item_count; });
          return cart;
        });
    },

    add: function (formDataOrItems, button) {
      var body;
      var headers = { 'Accept': 'application/javascript' };
      if (formDataOrItems instanceof FormData) {
        formDataOrItems.append('sections', Cart.sectionsToRender().join(','));
        formDataOrItems.append('sections_url', window.location.pathname);
        body = formDataOrItems;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          items: formDataOrItems,
          sections: Cart.sectionsToRender(),
          sections_url: window.location.pathname
        });
      }
      if (button) button.classList.add('btn--loading');
      return fetch(routes.cart_add, { method: 'POST', headers: headers, body: body })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.status) {
            toast(data.description || data.message || 'Could not add to cart');
            return Promise.reject(data);
          }
          Cart.render(data);
          Cart.refresh();
          if (S.cartType === 'drawer') { openPanel($('#CartDrawer')); }
          else { toast('Added to cart'); }
          return data;
        })
        .catch(function (err) { if (!err || !err.status) toast('Something went wrong'); })
        .finally(function () { if (button) button.classList.remove('btn--loading'); });
    },

    change: function (line, quantity, itemEl) {
      if (itemEl) itemEl.classList.add('is-updating');
      return fetch(routes.cart_change, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          line: line, quantity: quantity,
          sections: Cart.sectionsToRender(),
          sections_url: window.location.pathname
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) { Cart.render(data); Cart.refresh(); return data; })
        .catch(function () { toast('Something went wrong'); if (itemEl) itemEl.classList.remove('is-updating'); });
    }
  };
  window.saudadeCart = Cart;

  /* ---------------- delegated events ---------------- */

  document.addEventListener('click', function (e) {
    var t = e.target;

    var openBtn = t.closest('[data-open]');
    if (openBtn) {
      var target = document.getElementById(openBtn.getAttribute('data-open'));
      if (target) { e.preventDefault(); openPanel(target); }
      return;
    }
    var closeBtn = t.closest('[data-close]');
    if (closeBtn) {
      var panel = closeBtn.closest('.cart-drawer, .mobile-nav, .search-modal, .modal');
      if (panel) { e.preventDefault(); closePanel(panel); }
      return;
    }

    var remove = t.closest('[data-cart-remove]');
    if (remove) {
      e.preventDefault();
      Cart.change(remove.getAttribute('data-line'), 0, remove.closest('.cart-item'));
      return;
    }
    var qtyBtn = t.closest('[data-qty-change]');
    if (qtyBtn) {
      e.preventDefault();
      var dir = parseInt(qtyBtn.getAttribute('data-qty-change'), 10);
      var wrap = qtyBtn.closest('[data-qty]');
      var input = wrap ? wrap.querySelector('input') : null;
      if (!input) return;
      var next = Math.max(parseInt(input.getAttribute('min') || '0', 10), (parseInt(input.value, 10) || 0) + dir);
      input.value = next;
      var line = input.getAttribute('data-line');
      if (line) Cart.change(line, next, qtyBtn.closest('.cart-item'));
      else input.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    var quick = t.closest('[data-quick-add]');
    if (quick) {
      e.preventDefault();
      e.stopPropagation();
      var id = quick.getAttribute('data-quick-add');
      if (!id) return;
      Cart.add([{ id: parseInt(id, 10), quantity: 1 }], quick);
      return;
    }

    var acc = t.closest('.accordion__head');
    if (acc) {
      var expanded = acc.getAttribute('aria-expanded') === 'true';
      acc.setAttribute('aria-expanded', String(!expanded));
      var body = document.getElementById(acc.getAttribute('aria-controls'));
      if (body) body.classList.toggle('is-open', !expanded);
      return;
    }

    var facetToggle = t.closest('[data-facets-toggle]');
    if (facetToggle) {
      var fp = $('#FacetsPanel');
      if (fp) {
        var isOpen = fp.classList.toggle('is-open');
        facetToggle.setAttribute('aria-expanded', String(isOpen));
      }
      return;
    }

    var subToggle = t.closest('.mobile-nav__toggle');
    if (subToggle) {
      var sub = document.getElementById(subToggle.getAttribute('aria-controls'));
      var open = subToggle.getAttribute('aria-expanded') === 'true';
      subToggle.setAttribute('aria-expanded', String(!open));
      if (sub) sub.classList.toggle('is-open', !open);
      return;
    }
  });

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (input.matches('[data-cart-qty-input]')) {
      var line = input.getAttribute('data-line');
      var qty = Math.max(0, parseInt(input.value, 10) || 0);
      Cart.change(line, qty, input.closest('.cart-item'));
    }
  });

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.matches('[data-product-form]')) {
      e.preventDefault();
      var btn = form.querySelector('[data-add-button]');
      var errorEl = form.querySelector('[data-form-error]');
      var variantInput = form.querySelector('input[name="id"]');
      if (!variantInput || !variantInput.value) {
        if (errorEl) { errorEl.textContent = S.strings.selectSize; errorEl.hidden = false; }
        return;
      }
      if (errorEl) errorEl.hidden = true;
      Cart.add(new FormData(form), btn);
    }
  });

  /* ---------------- header behaviour ---------------- */

  function initHeader() {
    var wrap = $('[data-header-wrap]');
    if (!wrap) return;
    var last = 0;
    function onScroll() {
      var y = window.scrollY;
      wrap.classList.toggle('is-scrolled', y > 40);
      var header = $('.header', wrap);
      if (header && !wrap.classList.contains('header--transparent')) {
        header.classList.toggle('is-bordered', y > 8);
      }
      last = y;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------- announcement rotator ---------------- */

  function initAnnouncement() {
    $$('[data-announcement]').forEach(function (el) {
      var slides = $$('.announcement__slide', el);
      if (slides.length < 2) return;
      var speed = parseInt(el.getAttribute('data-speed') || '5', 10) * 1000;
      var i = 0;
      setInterval(function () {
        slides[i].classList.remove('is-active');
        i = (i + 1) % slides.length;
        slides[i].classList.add('is-active');
      }, speed);
    });
  }

  /* ---------------- reveal on scroll ---------------- */

  function initReveal() {
    if (!document.body.classList.contains('anim-on')) return;
    if (!('IntersectionObserver' in window)) {
      $$('[data-reveal]').forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    $$('[data-reveal]').forEach(function (el) { io.observe(el); });
  }

  /* ---------------- product page ---------------- */

  function ProductPage(root) {
    var form = $('[data-product-form]', root);
    var variantInput = form ? form.querySelector('input[name="id"]') : null;
    var priceEl = $('[data-product-price]', root);
    var addBtn = $('[data-add-button]', root);
    var addText = addBtn ? addBtn.querySelector('.btn__text') : null;
    var variants = [];
    var dataEl = $('[data-variants-json]', root);
    if (dataEl) { try { variants = JSON.parse(dataEl.textContent); } catch (err) { variants = []; } }

    function selectedOptions() {
      return $$('[data-option-input]:checked', root).map(function (i) { return i.value; });
    }

    function findVariant() {
      var opts = selectedOptions();
      if (!variants.length) return null;
      return variants.find(function (v) {
        return v.options.every(function (o, i) { return o === opts[i]; });
      }) || null;
    }

    function updateOptionLabels() {
      $$('[data-option-selected]', root).forEach(function (el) {
        var pos = el.getAttribute('data-option-selected');
        var checked = $('[data-option-input][data-option-position="' + pos + '"]:checked', root);
        el.textContent = checked ? checked.value : '';
      });
    }

    function updateAvailability() {
      // A value is available if some in-stock variant matches it, given every
      // earlier option already chosen. Mirrors Shopify's own picker behaviour.
      var opts = selectedOptions();
      $$('[data-option-input]', root).forEach(function (input) {
        var pos = parseInt(input.getAttribute('data-option-position'), 10) - 1;
        var available = variants.some(function (v) {
          if (v.options[pos] !== input.value) return false;
          for (var i = 0; i < pos; i++) { if (v.options[i] !== opts[i]) return false; }
          return v.available;
        });
        var label = input.nextElementSibling;
        if (label) label.classList.toggle('option__pill--soldout', !available);
      });
    }

    function update() {
      var variant = findVariant();
      updateOptionLabels();
      updateAvailability();

      if (variantInput) variantInput.value = variant ? variant.id : '';
      if (variant) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
      if (priceEl && variant) {
        var html = '<span class="price__current">' + formatMoney(variant.price) + '</span>';
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          html += '<s class="price__compare">' + formatMoney(variant.compare_at_price) + '</s>';
          priceEl.classList.add('price--on-sale');
        } else { priceEl.classList.remove('price--on-sale'); }
        priceEl.innerHTML = html;
      }
      if (addBtn) {
        if (!variant) { addBtn.setAttribute('aria-disabled', 'true'); if (addText) addText.textContent = S.strings.unavailable; }
        else if (!variant.available) { addBtn.setAttribute('aria-disabled', 'true'); if (addText) addText.textContent = S.strings.soldOut; }
        else { addBtn.removeAttribute('aria-disabled'); if (addText) addText.textContent = S.strings.addToCart; }
      }
      // Sticky bar mirror
      var stickyPrice = $('[data-sticky-price]');
      if (stickyPrice && variant) stickyPrice.textContent = formatMoney(variant.price);

      // Scroll gallery to the variant image
      if (variant && variant.featured_media_id) {
        var media = $('[data-media-id="' + variant.featured_media_id + '"]', root);
        var gallery = $('[data-product-media]', root);
        if (media && gallery && window.innerWidth < 990) {
          gallery.scrollTo({ left: media.offsetLeft - gallery.offsetLeft, behavior: 'smooth' });
        } else if (media && window.innerWidth >= 990) {
          media.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    $$('[data-option-input]', root).forEach(function (i) { on(i, 'change', update); });
    update();

    // Mobile gallery dots
    var gallery = $('[data-product-media]', root);
    var dots = $$('[data-media-dot]', root);
    if (gallery && dots.length) {
      var raf;
      on(gallery, 'scroll', function () {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var idx = Math.round(gallery.scrollLeft / gallery.clientWidth);
          dots.forEach(function (d, i) { d.classList.toggle('is-active', i === idx); });
        });
      }, { passive: true });
    }

    // Sticky add to cart
    var sticky = $('[data-sticky-atc]');
    var anchor = $('[data-atc-anchor]', root);
    if (sticky && anchor && 'IntersectionObserver' in window) {
      var so = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { sticky.classList.toggle('is-visible', !en.isIntersecting && en.boundingClientRect.top < 0); });
      }, { threshold: 0 });
      so.observe(anchor);
      on(sticky.querySelector('[data-sticky-add]'), 'click', function () {
        if (window.innerWidth < 990) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (form) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      });
    }
  }

  /* ---------------- collection facets ---------------- */

  var facetsBound = false;
  function initFacets() {
    var form = $('[data-facet-form]');
    if (!form) return;
    var grid = $('#ProductGridContainer');

    function fetchAndRender(url, push) {
      if (grid) grid.style.opacity = '.45';
      fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var newGrid = doc.querySelector('#ProductGridContainer');
          var newFacets = doc.querySelector('#FacetsInner');
          if (newGrid && grid) grid.innerHTML = newGrid.innerHTML;
          var curFacets = $('#FacetsInner');
          if (newFacets && curFacets) curFacets.innerHTML = newFacets.innerHTML;
          if (push) window.history.pushState({ url: url }, '', url);
          if (grid) grid.style.opacity = '';
          initReveal();
          window.scrollTo({ top: Math.max(0, ($('#CollectionTop') ? $('#CollectionTop').offsetTop - 80 : 0)), behavior: 'smooth' });
        })
        .catch(function () { window.location.href = url; });
    }

    if (facetsBound) return;
    facetsBound = true;

    document.addEventListener('change', function (e) {
      if (!e.target.closest('[data-facet-form]')) return;
      var f = $('[data-facet-form]');
      var params = new URLSearchParams(new FormData(f)).toString();
      var url = window.location.pathname + (params ? '?' + params : '');
      fetchAndRender(url, true);
    });

    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-facet-remove]');
      if (link) { e.preventDefault(); fetchAndRender(link.getAttribute('href'), true); }
    });

    window.addEventListener('popstate', function () { fetchAndRender(window.location.href, false); });
  }

  /* ---------------- predictive search ---------------- */

  function initSearch() {
    var modal = $('#SearchModal');
    if (!modal || modal.dataset.bound === 'true') return;
    modal.dataset.bound = 'true';
    var input = $('[data-search-input]', modal);
    var results = $('[data-search-results]', modal);
    var defaults = $('[data-search-default]', modal);
    var timer;
    on(input, 'input', function () {
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 2) {
        if (results) results.innerHTML = '';
        if (defaults) defaults.hidden = false;
        return;
      }
      timer = setTimeout(function () {
        if (defaults) defaults.hidden = true;
        fetch(routes.predictive_search + '?q=' + encodeURIComponent(q) + '&resources[type]=product,collection,page&resources[limit]=8&section_id=predictive-search')
          .then(function (r) { return r.text(); })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var inner = doc.querySelector('[data-predictive-results]');
            if (inner && results) results.innerHTML = inner.innerHTML;
          })
          .catch(function () {});
      }, 220);
    });
  }

  /* ---------------- cart recommendations ---------------- */

  function initCartRecs() {
    function load() {
      $$('[data-cart-recs]').forEach(function (el) {
        var id = el.getAttribute('data-product-id');
        if (!id || el.getAttribute('data-loaded') === 'true') return;
        el.setAttribute('data-loaded', 'true');
        fetch(routes.recommendations + '?product_id=' + id + '&limit=6&section_id=cart-recommendations&intent=complementary')
          .then(function (r) { return r.text(); })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var inner = doc.querySelector('[data-recs-inner]');
            if (inner && inner.children.length) el.innerHTML = inner.innerHTML;
          })
          .catch(function () {});
      });
    }
    load();
    document.addEventListener('cart:updated', load);
  }

  /* ---------------- card swatch hover ---------------- */

  var swatchesBound = false;
  function initSwatches() {
    if (swatchesBound) return;
    swatchesBound = true;
    document.addEventListener('mouseover', handler);
    document.addEventListener('click', handler);
    function handler(e) {
      var sw = e.target.closest('[data-card-swatch]');
      if (!sw) return;
      if (e.type === 'click') e.preventDefault();
      var card = sw.closest('.card');
      if (!card) return;
      var img = card.querySelector('.card__img--main');
      var src = sw.getAttribute('data-image');
      var url = sw.getAttribute('data-url');
      if (img && src) { img.src = src; img.srcset = ''; }
      if (url) { $$('[data-card-link]', card).forEach(function (a) { a.href = url; }); }
      $$('[data-card-swatch]', card).forEach(function (s) { s.classList.toggle('is-active', s === sw); });
    }
  }

  /* ---------------- init ---------------- */

  function initAll() {
    initHeader();
    initAnnouncement();
    initReveal();
    initFacets();
    initSearch();
    initCartRecs();
    initSwatches();
    $$('[data-product-root]').forEach(ProductPage);
  }

  document.addEventListener('recs:loaded', function () {
    initReveal();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  // Theme editor support
  document.addEventListener('shopify:section:load', function (e) {
    initHeader(); initAnnouncement(); initReveal(); initSearch(); initCartRecs();
    $$('[data-product-root]', e.target).forEach(ProductPage);
  });
  document.addEventListener('shopify:section:select', function (e) {
    var drawer = e.target.querySelector('.cart-drawer');
    if (drawer) openPanel(drawer);
  });
})();
