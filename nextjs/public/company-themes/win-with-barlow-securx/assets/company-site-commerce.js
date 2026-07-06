(function () {
  "use strict";

  var CART_KEY_PREFIX = "company_site_cart_v1_";
  var CART_EVENT = "company-site-cart-changed";
  var drawerMounted = false;
  var drawerOpen = false;

  function cfg() {
    return window.__COMPANY_SITE__ || null;
  }

  function cartKey(slug) {
    return CART_KEY_PREFIX + slug;
  }

  function readCart(slug) {
    try {
      var raw = localStorage.getItem(cartKey(slug));
      if (!raw) return { lines: [] };
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.lines)) return { lines: [] };
      return parsed;
    } catch (e) {
      return { lines: [] };
    }
  }

  function writeCart(slug, cart) {
    localStorage.setItem(cartKey(slug), JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { companySlug: slug } }));
  }

  function cartCount(cart) {
    return cart.lines.reduce(function (sum, line) {
      return sum + (line.quantity || 0);
    }, 0);
  }

  function cartSubtotal(cart) {
    return cart.lines.reduce(function (sum, line) {
      return sum + (line.price || 0) * (line.quantity || 0);
    }, 0);
  }

  function parsePrice(text) {
    if (!text) return 0;
    var m = String(text).replace(/,/g, "").match(/([0-9]+(?:\.[0-9]{2})?)/);
    return m ? parseFloat(m[1]) : 0;
  }

  function sitePath() {
    var c = cfg();
    return (c && c.sitePrefix) || "";
  }

  function relativePath() {
    var prefix = sitePath();
    var path = window.location.pathname;
    if (prefix && path.indexOf(prefix) === 0) {
      return path.slice(prefix.length) || "/";
    }
    return path;
  }

  function normalizeItemPath(path) {
    var prefix = sitePath();
    var value = (path || "").split("?")[0].split("#")[0];
    if (prefix && value.indexOf(prefix) === 0) {
      return value.slice(prefix.length) || "/";
    }
    return value;
  }

  function catalogByPath(path) {
    var c = cfg();
    var catalog = (c && c.catalog) || [];
    var normalized = normalizeItemPath(path).replace(/\/$/, "");
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].path === normalized) return catalog[i];
    }
    return null;
  }

  function parseCatalogItem() {
    var rel = relativePath().replace(/\/$/, "");
    var fromCatalog = catalogByPath(rel);
    if (fromCatalog) return fromCatalog;

    var course = rel.match(/^\/course\/([^/]+)$/);
    if (course) {
      var title =
        (document.querySelector("h1") && document.querySelector("h1").textContent.trim()) ||
        document.title.replace(/ — .*/, "");
      var priceEl =
        document.querySelector("aside .text-4xl.font-bold") ||
        document.querySelector("aside .text-3xl.font-bold");
      return {
        id: "course:" + course[1],
        type: "course",
        slug: course[1],
        title: title,
        price: parsePrice(priceEl && priceEl.textContent),
        currency: "USD",
        path: "/course/" + course[1],
      };
    }
    var workshop = rel.match(/^\/workshops\/([^/]+)$/);
    if (workshop) {
      var wTitle =
        (document.querySelector("h1") && document.querySelector("h1").textContent.trim()) ||
        document.title.replace(/ — .*/, "");
      var wPriceEl =
        document.querySelector("aside .text-4xl.font-bold") ||
        document.querySelector(".text-4xl.font-bold") ||
        document.querySelector(".text-3xl.font-bold");
      return {
        id: "workshop:" + workshop[1],
        type: "workshop",
        slug: workshop[1],
        title: wTitle,
        price: parsePrice(wPriceEl && wPriceEl.textContent),
        currency: "USD",
        path: "/workshops/" + workshop[1],
      };
    }
    return null;
  }

  function parseListingCardItem(btn) {
    var article = btn.closest("article");
    if (!article) return null;

    var detailLink = article.querySelector('a[href*="/course/"], a[href*="/workshops/"]');
    var href = detailLink ? detailLink.getAttribute("href") || "" : "";
    var normalized = normalizeItemPath(href);
    var pathMatch = normalized.match(/(\/course\/[^/?#]+|\/workshops\/[^/?#]+)/);
    var path = pathMatch ? pathMatch[1] : "";
    if (!path) return null;

    var fromCatalog = catalogByPath(path);
    if (fromCatalog) {
      var img = article.querySelector("img");
      return Object.assign({}, fromCatalog, {
        image: img ? img.getAttribute("src") || "" : "",
      });
    }

    var titleEl = article.querySelector("h3.line-clamp-2") || article.querySelector("h3");
    var imgEl = article.querySelector("img");
    var priceEl = article.querySelector(".text-primary");
    var slug = path.split("/").pop() || "";
    var type = path.indexOf("/workshops/") === 0 ? "workshop" : "course";

    return {
      id: type + ":" + slug,
      type: type,
      slug: slug,
      title: (titleEl && titleEl.textContent.trim()) || (imgEl && imgEl.getAttribute("alt")) || "Item",
      price: parsePrice(priceEl && priceEl.textContent),
      currency: "USD",
      path: path,
      image: imgEl ? imgEl.getAttribute("src") || "" : "",
    };
  }

  function addToCart(item, qty) {
    var c = cfg();
    if (!c || !c.companySlug || !item) return null;
    var cart = readCart(c.companySlug);
    var existing = cart.lines.find(function (line) {
      return line.id === item.id;
    });
    if (existing) {
      existing.quantity += qty || 1;
      if (item.image && !existing.image) existing.image = item.image;
    } else {
      cart.lines.push({
        id: item.id,
        type: item.type,
        slug: item.slug,
        title: item.title,
        price: item.price,
        currency: item.currency || "USD",
        path: item.path,
        image: item.image || "",
        quantity: qty || 1,
      });
    }
    writeCart(c.companySlug, cart);
    updateBadge();
    renderDrawer();
    return cart;
  }

  function setLineQty(id, quantity) {
    var c = cfg();
    if (!c || !c.companySlug) return;
    var cart = readCart(c.companySlug);
    cart.lines = cart.lines
      .map(function (line) {
        return line.id === id ? Object.assign({}, line, { quantity: quantity }) : line;
      })
      .filter(function (line) {
        return line.quantity > 0;
      });
    writeCart(c.companySlug, cart);
    updateBadge();
    renderDrawer();
  }

  function removeLine(id) {
    setLineQty(id, 0);
  }

  function updateBadge() {
    var c = cfg();
    if (!c || !c.companySlug) return;
    var count = cartCount(readCart(c.companySlug));
    document.querySelectorAll('button[aria-label="Cart"] span').forEach(function (el) {
      el.textContent = String(count);
    });
  }

  function flyToCart(fromEl) {
    var cartBtn = document.querySelector('button[aria-label="Cart"]');
    if (!fromEl || !cartBtn) return;

    var from = fromEl.getBoundingClientRect();
    var to = cartBtn.getBoundingClientRect();
    var fly = document.createElement("div");
    fly.className = "company-site-cart-fly";
    fly.style.left = from.left + from.width / 2 + "px";
    fly.style.top = from.top + from.height / 2 + "px";
    document.body.appendChild(fly);

    requestAnimationFrame(function () {
      fly.style.left = to.left + to.width / 2 + "px";
      fly.style.top = to.top + to.height / 2 + "px";
      fly.style.opacity = "0";
      fly.style.transform = "scale(0.25)";
    });

    window.setTimeout(function () {
      fly.remove();
      cartBtn.classList.add("company-site-cart-bounce");
      window.setTimeout(function () {
        cartBtn.classList.remove("company-site-cart-bounce");
      }, 500);
    }, 620);
  }

  function ensureDrawer() {
    if (drawerMounted) return;
    drawerMounted = true;

    var overlay = document.createElement("div");
    overlay.className = "company-site-cart-overlay";
    overlay.setAttribute("data-company-site-cart-overlay", "1");
    overlay.addEventListener("click", closeDrawer);

    var drawer = document.createElement("aside");
    drawer.className = "company-site-cart-drawer";
    drawer.setAttribute("data-company-site-cart-drawer", "1");
    drawer.setAttribute("aria-label", "Shopping cart");
    drawer.setAttribute("role", "dialog");
    drawer.innerHTML =
      '<div class="company-site-cart-drawer__header">' +
      '<h2 class="company-site-cart-drawer__title">Your cart</h2>' +
      '<button type="button" class="company-site-cart-drawer__close" aria-label="Close cart">×</button>' +
      "</div>" +
      '<div class="company-site-cart-drawer__body" data-company-site-cart-body></div>' +
      '<div class="company-site-cart-drawer__footer" data-company-site-cart-footer></div>';

    drawer.querySelector(".company-site-cart-drawer__close").addEventListener("click", closeDrawer);
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawerOpen) closeDrawer();
    });
  }

  function renderDrawer() {
    ensureDrawer();
    var c = cfg();
    if (!c || !c.companySlug) return;

    var cart = readCart(c.companySlug);
    var body = document.querySelector("[data-company-site-cart-body]");
    var footer = document.querySelector("[data-company-site-cart-footer]");
    if (!body || !footer) return;

    if (!cart.lines.length) {
      body.innerHTML = '<div class="company-site-cart-drawer__empty">Your cart is empty. Browse courses to add something.</div>';
      footer.innerHTML = "";
      return;
    }

    body.innerHTML = cart.lines
      .map(function (line) {
        var thumb = line.image
          ? '<img class="company-site-cart-line__thumb" src="' + line.image + '" alt="" />'
          : '<div class="company-site-cart-line__thumb"></div>';
        return (
          '<div class="company-site-cart-line" data-line-id="' +
          line.id +
          '">' +
          thumb +
          '<div>' +
          '<p class="company-site-cart-line__title">' +
          line.title +
          "</p>" +
          '<p class="company-site-cart-line__meta">' +
          (line.type === "workshop" ? "Workshop" : "Course") +
          "</p>" +
          '<div class="company-site-cart-line__row">' +
          '<div class="company-site-cart-qty">' +
          '<button type="button" data-qty-dec="' +
          line.id +
          '" aria-label="Decrease quantity">−</button>' +
          "<span>" +
          line.quantity +
          "</span>" +
          '<button type="button" data-qty-inc="' +
          line.id +
          '" aria-label="Increase quantity">+</button>' +
          "</div>" +
          '<span class="company-site-cart-line__price">$' +
          (line.price * line.quantity).toFixed(2) +
          "</span>" +
          "</div>" +
          '<button type="button" class="company-site-cart-line__remove" data-remove="' +
          line.id +
          '">Remove</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    footer.innerHTML =
      '<div class="company-site-cart-drawer__total"><span>Total</span><strong>$' +
      cartSubtotal(cart).toFixed(2) +
      "</strong></div>" +
      '<div class="company-site-cart-drawer__actions">' +
      '<a class="company-site-cart-drawer__btn company-site-cart-drawer__btn--primary" href="' +
      sitePath() +
      '/checkout">Checkout</a>' +
      '<a class="company-site-cart-drawer__btn company-site-cart-drawer__btn--secondary" href="' +
      sitePath() +
      '/cart">View full cart</a>' +
      "</div>";

    body.querySelectorAll("[data-qty-dec]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-qty-dec");
        var line = cart.lines.find(function (l) {
          return l.id === id;
        });
        if (line) setLineQty(id, Math.max(1, line.quantity - 1));
      });
    });
    body.querySelectorAll("[data-qty-inc]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-qty-inc");
        var line = cart.lines.find(function (l) {
          return l.id === id;
        });
        if (line) setLineQty(id, line.quantity + 1);
      });
    });
    body.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removeLine(btn.getAttribute("data-remove"));
      });
    });
  }

  function openDrawer() {
    ensureDrawer();
    renderDrawer();
    drawerOpen = true;
    document.querySelector("[data-company-site-cart-overlay]").classList.add("is-open");
    document.querySelector("[data-company-site-cart-drawer]").classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawerOpen = false;
    var overlay = document.querySelector("[data-company-site-cart-overlay]");
    var drawer = document.querySelector("[data-company-site-cart-drawer]");
    if (overlay) overlay.classList.remove("is-open");
    if (drawer) drawer.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function goTo(path) {
    window.location.href = sitePath() + path;
  }

  function handleAddToCart(btn, item) {
    if (!item) return;
    addToCart(item, 1);
    btn.classList.add("company-site-added-pulse");
    window.setTimeout(function () {
      btn.classList.remove("company-site-added-pulse");
    }, 450);
    flyToCart(btn);
    openDrawer();
  }

  function wireButtons() {
    var detailItem = parseCatalogItem();

    document.querySelectorAll("button").forEach(function (btn) {
      if (btn.dataset.companySiteWired === "1") return;
      var label = (btn.textContent || "").replace(/\s+/g, " ").trim();
      if (!/add to cart/i.test(label)) return;
      btn.dataset.companySiteWired = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var item = parseListingCardItem(btn) || detailItem;
        handleAddToCart(btn, item);
      });
    });

    document.querySelectorAll("button").forEach(function (btn) {
      if (btn.dataset.companySiteReserveWired === "1") return;
      var label = (btn.textContent || "").replace(/\s+/g, " ").trim();
      if (!/reserve your seat/i.test(label)) return;
      btn.dataset.companySiteReserveWired = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var item = parseListingCardItem(btn) || detailItem;
        if (item) addToCart(item, 1);
        goTo("/checkout?reserve=1");
      });
    });
  }

  function wireCartIcon() {
    document.querySelectorAll('button[aria-label="Cart"]').forEach(function (btn) {
      if (btn.dataset.companySiteCartWired === "1") return;
      btn.dataset.companySiteCartWired = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openDrawer();
      });
    });
  }

  function init() {
    updateBadge();
    ensureDrawer();
    renderDrawer();
    wireCartIcon();
    wireButtons();
    window.addEventListener(CART_EVENT, function () {
      updateBadge();
      if (drawerOpen) renderDrawer();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
