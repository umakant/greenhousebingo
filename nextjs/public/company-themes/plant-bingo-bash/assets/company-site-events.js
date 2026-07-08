(function () {
  "use strict";

  function readConfig() {
    var el = document.getElementById("pbs-company-site-events-config");
    if (!el || !el.textContent) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      return null;
    }
  }

  function sitePath(path, cfg) {
    var base = (cfg.sitePrefix || "").replace(/\/$/, "");
    if (!path || path === "/") return base || "/";
    return base + (path.charAt(0) === "/" ? path : "/" + path);
  }

  function eventUrl(slug, cfg) {
    return sitePath("/events/" + encodeURIComponent(slug), cfg);
  }

  function groupByState(events) {
    var groups = {};
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      var code = e.stateCode || e.state.slice(0, 2).toUpperCase();
      if (!groups[code]) groups[code] = { state: e.state, code: code, events: [] };
      groups[code].events.push(e);
    }
    return Object.keys(groups)
      .map(function (k) {
        return groups[k];
      })
      .sort(function (a, b) {
        return a.state.localeCompare(b.state);
      });
  }

  function haversineMiles(a, b) {
    var R = 3958.8;
    var toRad = function (d) {
      return (d * Math.PI) / 180;
    };
    var dLat = toRad(b.lat - a.lat);
    var dLng = toRad(b.lng - a.lng);
    var s =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function renderEventCard(e, cfg, miles) {
    var sold = e.soldOut || e.left <= 0;
    var ticketLine = sold
      ? '<div class="flex items-center gap-2 font-bold text-forest-deep"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9Z"/><path d="M13 13v4"/><path d="M11 13v4"/></svg> Sold out</div>'
      : '<div class="flex items-center gap-2"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9Z"/><path d="M13 13v4"/><path d="M11 13v4"/></svg> $' +
        e.price +
        " · " +
        e.left +
        " seats left</div>";
    var milesHtml =
      miles != null
        ? '<span class="text-xs font-bold uppercase tracking-widest text-forest">' +
          miles.toFixed(1) +
          " mi</span>"
        : "";

    return (
      '<a href="' +
      eventUrl(e.slug, cfg) +
      '" class="group rounded-3xl bg-white border border-border shadow-sm hover:shadow-lifted transition p-6 flex flex-col">' +
      '<div class="flex items-start justify-between gap-2">' +
      '<div class="inline-flex items-center gap-2 self-start rounded-full ' +
      e.tint +
      ' px-3 py-1 text-xs font-bold uppercase tracking-widest text-forest-deep">' +
      '<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> ' +
      e.month +
      " " +
      e.day +
      "</div>" +
      milesHtml +
      "</div>" +
      '<h3 class="mt-4 font-display text-2xl font-bold text-forest-deep group-hover:text-forest transition">' +
      escapeHtml(e.venue) +
      "</h3>" +
      '<div class="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">' +
      '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg> ' +
      escapeHtml(e.city) +
      ", " +
      escapeHtml(e.state) +
      "</div>" +
      '<div class="mt-4 space-y-2 text-sm text-muted-foreground">' +
      '<div class="flex items-center gap-2"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ' +
      escapeHtml(e.dayName) +
      " · " +
      escapeHtml(e.time) +
      "</div>" +
      ticketLine +
      "</div>" +
      '<div class="mt-6 inline-flex items-center gap-1 font-bold text-forest group-hover:gap-2 transition-all">' +
      (sold ? "View event (sold out)" : "View event") +
      ' <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></div>' +
      "</a>"
    );
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderEventsList(events, cfg) {
    var groups = groupByState(events);
    var html = "";
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      html +=
        '<div id="' +
        group.code +
        '" class="scroll-mt-56">' +
        '<div class="flex items-baseline justify-between border-b-2 border-forest/20 pb-4">' +
        '<h2 class="font-display text-3xl font-bold text-forest-deep sm:text-4xl">' +
        escapeHtml(group.state) +
        "</h2>" +
        '<span class="text-sm font-bold uppercase tracking-widest text-forest">' +
        group.events.length +
        " venue" +
        (group.events.length === 1 ? "" : "s") +
        "</span></div>" +
        '<div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">';
      for (var i = 0; i < group.events.length; i++) {
        html += renderEventCard(group.events[i], cfg, null);
      }
      html += "</div></div>";
    }
    return html;
  }

  function updateListPage(events, cfg) {
    var groups = groupByState(events);
    var subtitle = document.querySelector("h1.font-display");
    if (subtitle && subtitle.textContent && subtitle.textContent.indexOf("Find a venue") >= 0) {
      var countP = subtitle.parentElement && subtitle.parentElement.querySelector("p");
      if (countP) {
        countP.textContent =
          events.length + " events across " + groups.length + " states — and growing.";
      }
    }

    var sticky = document.querySelector(".sticky.top-\\[5\\.5rem\\]");
    if (sticky) {
      var chips = sticky.querySelector(".flex.flex-wrap.justify-center.gap-2");
      if (chips) {
        chips.innerHTML = groups
          .map(function (g) {
            return (
              '<a href="#' +
              g.code +
              '" class="rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-forest-deep hover:bg-forest hover:text-cream transition">' +
              escapeHtml(g.state) +
              " (" +
              g.events.length +
              ")</a>"
            );
          })
          .join("");
      }
    }

    var mount =
      document.querySelector(".mt-16.space-y-16") ||
      document.querySelector('[class*="mt-16"][class*="space-y-16"]');
    if (mount) {
      mount.innerHTML = renderEventsList(events, cfg);
      mount.setAttribute("data-pbs-dynamic", "1");
    }
  }

  function updateHomeEvents(events, cfg) {
    var section = document.getElementById("events");
    if (!section) return;
    var grid = section.querySelector(".grid");
    if (!grid) return;
    var upcoming = events.slice(0, 6);
    grid.innerHTML = upcoming
      .map(function (e) {
        return renderEventCard(e, cfg, null);
      })
      .join("");
  }

  function setTextIfFound(selector, text) {
    var el = document.querySelector(selector);
    if (el && text) el.textContent = text;
  }

  function patchDetailPage(event) {
    document.title = "Plant Bingo — " + event.city + ", " + event.state + " · " + event.month + " " + event.day;

    var headings = document.querySelectorAll("h1, h2, h3");
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      if (h.className && h.className.indexOf("font-display") >= 0 && h.textContent && h.textContent.length < 120) {
        if (h.tagName === "H1" || (event.venue && h.textContent.indexOf("Plant Bingo") >= 0)) {
          h.textContent = event.title || "Plant Bingo at " + event.venue;
        }
      }
    }

    var allText = document.body ? document.body.innerText : "";
    if (event.soldOut || event.left <= 0) {
      document.querySelectorAll("*").forEach(function (el) {
        if (el.children.length === 0 && /seats left/i.test(el.textContent || "")) {
          el.textContent = "Sold out";
        }
      });
    } else {
      document.querySelectorAll("*").forEach(function (el) {
        if (el.children.length === 0 && /\d+\s*seats left/i.test(el.textContent || "")) {
          el.textContent = event.left + " seats left";
        }
        if (el.children.length === 0 && /^\$\d+/.test((el.textContent || "").trim())) {
          var t = (el.textContent || "").trim();
          if (t.indexOf("per") >= 0 || t === "$30" || t.indexOf("$30") === 0) {
            el.textContent = "$" + event.price;
          }
        }
      });
    }

    if (event.heroTagline) {
      document.querySelectorAll("p, span, div").forEach(function (el) {
        if (
          el.children.length === 0 &&
          el.textContent &&
          el.textContent.indexOf("Everyone Leaves With a Plant") >= 0
        ) {
          el.textContent = event.heroTagline;
        }
      });
    }

    if (event.descriptionTitle) {
      document.querySelectorAll("h2, h3").forEach(function (el) {
        if (el.textContent && el.textContent.indexOf("You're Invited") >= 0) {
          el.textContent = event.descriptionTitle;
        }
      });
    }

    if (event.host && event.host.name) {
      document.querySelectorAll("h3, h4, strong, p").forEach(function (el) {
        if (el.textContent && el.textContent.trim() === event.host.name) return;
      });
      var hostImgs = document.querySelectorAll('img[alt*="host"], img[src*="host-"]');
      if (hostImgs.length && event.host.imageUrl) {
        hostImgs[0].setAttribute("src", event.host.imageUrl);
      }
    }
  }

  function fetchEvents(cfg) {
    return fetch(cfg.apiBase, { credentials: "same-origin", cache: "no-store" }).then(function (res) {
      return res.json();
    });
  }

  function fetchEvent(cfg, slug) {
    return fetch(cfg.apiBase + "/" + encodeURIComponent(slug), {
      credentials: "same-origin",
      cache: "no-store",
    }).then(function (res) {
      return res.json();
    });
  }

  function pageKind(cfg) {
    var path = cfg.pathname || "/";
    if (path === "/events" || path === "/events/") return "list";
    if (path.indexOf("/events/") === 0) return "detail";
    if (path === "/" || path === "") return "home";
    return "other";
  }

  function detailSlug(cfg) {
    var path = cfg.pathname || "";
    if (path.indexOf("/events/") !== 0) return "";
    return path.replace(/^\/events\//, "").replace(/\/$/, "");
  }

  function run(cfg) {
    var kind = pageKind(cfg);

    if (kind === "list") {
      var listEvents = cfg.bootstrap && cfg.bootstrap.list ? cfg.bootstrap.list.events : null;
      function applyList(events) {
        if (!events || !events.length) return;
        updateListPage(events, cfg);
      }
      if (listEvents) applyList(listEvents);
      fetchEvents(cfg).then(function (data) {
        if (data && data.ok && data.events) applyList(data.events);
      });
      return;
    }

    if (kind === "home") {
      var homeEvents = cfg.bootstrap && cfg.bootstrap.list ? cfg.bootstrap.list.events : null;
      function applyHome(events) {
        if (!events || !events.length) return;
        updateHomeEvents(events, cfg);
      }
      if (homeEvents) applyHome(homeEvents);
      fetchEvents(cfg).then(function (data) {
        if (data && data.ok && data.events) applyHome(data.events);
      });
      return;
    }

    if (kind === "detail") {
      var slug = detailSlug(cfg);
      if (!slug) return;
      var detail = cfg.bootstrap && cfg.bootstrap.detail ? cfg.bootstrap.detail : null;
      function applyDetail(ev) {
        if (!ev) return;
        patchDetailPage(ev);
      }
      if (detail) applyDetail(detail);
      fetchEvent(cfg, slug).then(function (data) {
        if (data && data.ok && data.event) applyDetail(data.event);
      });
    }
  }

  function init() {
    var cfg = readConfig();
    if (!cfg || !cfg.companySlug) return;
    run(cfg);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
