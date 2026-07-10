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
      escapeHtml(e.title || e.venue) +
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

    var mount =
      document.querySelector(".mt-16.space-y-16") ||
      document.querySelector('[class*="mt-16"][class*="space-y-16"]');
    if (mount) {
      var section = mount.closest("section") || mount.parentElement;
      var chips = section && section.querySelector(".flex.flex-wrap.justify-center.gap-2");
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
      mount.innerHTML = events.length ? renderEventsList(events, cfg) : "";
      mount.setAttribute("data-pbs-dynamic", "1");
    }
  }

  var MONTH_CODE_BY_LABEL = {
    January: "JAN",
    February: "FEB",
    March: "MAR",
    April: "APR",
    May: "MAY",
    June: "JUN",
    July: "JUL",
    August: "AUG",
    September: "SEP",
    October: "OCT",
    November: "NOV",
    December: "DEC",
  };

  function filterHomeEvents(events, q, stateFilter, monthFilter) {
    var query = (q || "").toLowerCase();
    return events.filter(function (e) {
      var haystack = ((e.title || "") + e.city + e.state + e.venue).toLowerCase();
      var matchesQ = !query || haystack.indexOf(query) >= 0;
      var matchesState = !stateFilter || stateFilter === "All" || e.state === stateFilter;
      var monthCode = MONTH_CODE_BY_LABEL[monthFilter];
      var matchesMonth = !monthFilter || monthFilter === "All" || e.month === monthCode;
      return matchesQ && matchesState && matchesMonth;
    });
  }

  function populateHomeFilters(section, events) {
    var states = [];
    var seenState = {};
    for (var i = 0; i < events.length; i++) {
      if (!seenState[events[i].state]) {
        seenState[events[i].state] = true;
        states.push(events[i].state);
      }
    }
    states.sort();

    var monthCodes = {};
    for (var j = 0; j < events.length; j++) monthCodes[events[j].month] = true;
    var monthLabels = Object.keys(MONTH_CODE_BY_LABEL).filter(function (label) {
      return monthCodes[MONTH_CODE_BY_LABEL[label]];
    });

    var selects = section.querySelectorAll("select");
    if (selects.length >= 1) {
      selects[0].innerHTML =
        '<option value="All">All States</option>' +
        states
          .map(function (s) {
            return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + "</option>";
          })
          .join("");
    }
    if (selects.length >= 2) {
      selects[1].innerHTML =
        '<option value="All">All Months</option>' +
        monthLabels
          .map(function (m) {
            return '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + "</option>";
          })
          .join("");
    }
  }

  function renderHomeGrid(section, events, cfg) {
    var grid = section.querySelector(".grid");
    if (!grid) return;
    if (!events.length) {
      grid.innerHTML =
        '<div class="col-span-full text-center py-16 text-muted-foreground">No events match your filters. Try a different state or month.</div>';
      return;
    }
    grid.innerHTML = events
      .slice(0, 6)
      .map(function (e) {
        return renderEventCard(e, cfg, null);
      })
      .join("");
  }

  function wireHomeFilters(section, allEvents, cfg) {
    if (section.getAttribute("data-pbs-filters-wired") === "1") {
      section.__pbsEvents = allEvents;
      var searchInput = section.querySelector('input[placeholder*="Search city"]');
      var selects = section.querySelectorAll("select");
      var stateSelect = selects.length >= 1 ? selects[0] : null;
      var monthSelect = selects.length >= 2 ? selects[1] : null;
      var q = searchInput ? searchInput.value : "";
      var stateFilter = stateSelect ? stateSelect.value : "All";
      var monthFilter = monthSelect ? monthSelect.value : "All";
      renderHomeGrid(section, filterHomeEvents(allEvents, q, stateFilter, monthFilter), cfg);
      return;
    }
    section.setAttribute("data-pbs-filters-wired", "1");
    section.__pbsEvents = allEvents;

    var searchInput = section.querySelector('input[placeholder*="Search city"]');
    var selects = section.querySelectorAll("select");
    var stateSelect = selects.length >= 1 ? selects[0] : null;
    var monthSelect = selects.length >= 2 ? selects[1] : null;

    function refresh() {
      var events = section.__pbsEvents || allEvents;
      var q = searchInput ? searchInput.value : "";
      var stateFilter = stateSelect ? stateSelect.value : "All";
      var monthFilter = monthSelect ? monthSelect.value : "All";
      renderHomeGrid(section, filterHomeEvents(events, q, stateFilter, monthFilter), cfg);
    }

    if (searchInput) searchInput.addEventListener("input", refresh);
    if (stateSelect) stateSelect.addEventListener("change", refresh);
    if (monthSelect) monthSelect.addEventListener("change", refresh);
    refresh();
  }

  function applyHomeEvents(events, cfg) {
    var list = events || [];
    updateHomeMap(list, cfg);
    var section = document.getElementById("events");
    if (!section) return;
    populateHomeFilters(section, list);
    wireHomeFilters(section, list, cfg);
  }

  var STATE_NAME_BY_CODE = {
    WA: "Washington",
    OR: "Oregon",
    CA: "California",
    AZ: "Arizona",
    CO: "Colorado",
    TX: "Texas",
    IL: "Illinois",
    TN: "Tennessee",
    NC: "North Carolina",
    GA: "Georgia",
    FL: "Florida",
    NY: "New York",
  };

  var MONTH_IDX = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };

  var MAP_DOTS_BY_LABEL = {
    WA: { id: "WA", code: "WA" },
    OR: { id: "OR", code: "OR" },
    CA: { id: "CA", code: "CA" },
    AZ: { id: "AZ", code: "AZ" },
    CO: { id: "CO", code: "CO" },
    AUS: { id: "TX-AUS", code: "TX", city: "Austin" },
    DFW: { id: "TX-DFW", code: "TX", city: "Dallas / Fort Worth" },
    IL: { id: "IL", code: "IL" },
    TN: { id: "TN", code: "TN" },
    NC: { id: "NC", code: "NC" },
    GA: { id: "GA", code: "GA" },
    FL: { id: "FL", code: "FL" },
    NY: { id: "NY", code: "NY" },
  };

  function eventSortTime(e) {
    return new Date(e.year, MONTH_IDX[e.month] || 0, parseInt(e.day, 10) || 1).getTime();
  }

  function summarizeMapDot(dot, events) {
    var stateName = STATE_NAME_BY_CODE[dot.code] || dot.code;
    var stateEvents = events
      .filter(function (e) {
        return e.state === stateName && (!dot.city || e.city === dot.city);
      })
      .sort(function (a, b) {
        return eventSortTime(a) - eventSortTime(b);
      });
    var cities = [];
    var venues = [];
    var seenCity = {};
    var seenVenue = {};
    for (var i = 0; i < stateEvents.length; i++) {
      var ev = stateEvents[i];
      if (ev.city && !seenCity[ev.city]) {
        seenCity[ev.city] = true;
        cities.push(ev.city);
      }
      if (ev.venue && !seenVenue[ev.venue]) {
        seenVenue[ev.venue] = true;
        venues.push(ev.venue);
      }
    }
    return {
      code: dot.code,
      stateName: stateName,
      cities: cities,
      venues: venues,
      eventsCount: stateEvents.length,
      next: stateEvents[0] || null,
    };
  }

  function renderMapStatBox(n, label) {
    return (
      '<div class="rounded-2xl bg-white/10 p-4">' +
      '<div class="font-display text-3xl font-bold text-lime">' +
      escapeHtml(n) +
      "</div>" +
      '<div class="mt-1 text-xs text-cream/70 uppercase tracking-wider">' +
      escapeHtml(label) +
      "</div></div>"
    );
  }

  function renderMapPanelDefault() {
    return (
      '<div class="my-auto text-center">' +
      '<svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-14 w-14 text-lime" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"></path>' +
      '<path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"></path><path d="M5 21h14"></path></svg>' +
      '<p class="mt-4 font-display text-2xl">Hover a state</p>' +
      '<p class="mt-2 text-cream/70 text-sm">See events, cities, and venues in that region.</p></div>'
    );
  }

  function renderMapPanelActive(active, cfg) {
    var title = active.cities.length > 0 ? active.cities.join(" · ") : active.stateName;
    var nextLine = active.next ? active.next.month + " " + active.next.day + " · " + active.next.time : "TBA";
    return (
      '<div class="animate-bloom">' +
      '<div class="inline-flex items-center gap-2 rounded-full bg-lime/20 px-3 py-1 text-xs font-bold text-lime uppercase tracking-widest">' +
      '<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg> ' +
      escapeHtml(active.code) +
      "</div>" +
      '<h3 class="mt-4 font-display text-4xl font-bold">' +
      escapeHtml(title) +
      "</h3>" +
      '<div class="mt-6 grid grid-cols-2 gap-4">' +
      renderMapStatBox(String(active.eventsCount), "Upcoming events") +
      renderMapStatBox(String(active.venues.length), "Venues") +
      "</div>" +
      '<ul class="mt-6 space-y-3 text-sm">' +
      '<li class="flex justify-between border-b border-white/10 pb-2"><span>Next event</span><span class="text-lime font-bold">' +
      escapeHtml(nextLine) +
      "</span></li>" +
      '<li class="flex justify-between border-b border-white/10 pb-2"><span>Next venue</span><span class="text-right">' +
      escapeHtml(active.next && active.next.venue ? active.next.venue : "—") +
      "</span></li>" +
      '<li class="flex justify-between"><span>Cities</span><span>' +
      active.cities.length +
      "</span></li></ul>" +
      '<a href="' +
      sitePath("/events", cfg) +
      "#" +
      encodeURIComponent(active.code) +
      '" class="mt-auto pt-6 inline-flex items-center gap-2 text-lime font-bold hover:text-cream transition">Explore ' +
      escapeHtml(active.code) +
      ' <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></a></div>'
    );
  }

  function findHomeMapSection() {
    var headings = document.querySelectorAll("h2.font-display");
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      if (h.textContent && h.textContent.indexOf("Growing across") >= 0) {
        return h.closest("section");
      }
    }
    return null;
  }

  function updateHomeMap(events, cfg) {
    var section = findHomeMapSection();
    if (!section || section.getAttribute("data-pbs-map-init") === "1") {
      if (section && section._pbsMapState) {
        section._pbsMapState.events = events;
        if (section._pbsMapState.activeDotId) {
          var dot = section._pbsMapState.dotsById[section._pbsMapState.activeDotId];
          if (dot && section._pbsMapState.panel) {
            section._pbsMapState.panel.innerHTML = renderMapPanelActive(
              summarizeMapDot(dot, events),
              cfg,
            );
          }
        }
      }
      return;
    }

    var svg = section.querySelector("svg");
    var panel = section.querySelector(".rounded-4xl.bg-forest-deep");
    if (!svg || !panel) return;

    var groups = svg.querySelectorAll("g.cursor-pointer");
    if (!groups.length) return;

    var dotsById = {};
    var activeDotId = null;

    function setActiveDot(dotId) {
      activeDotId = dotId;
      if (section._pbsMapState) section._pbsMapState.activeDotId = dotId;
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        var labelEl = g.querySelector("text");
        var label = labelEl ? labelEl.textContent.trim() : "";
        var dot = MAP_DOTS_BY_LABEL[label];
        if (!dot) continue;
        var isActive = dot.id === dotId;
        var circles = g.querySelectorAll("circle");
        if (circles.length >= 2) {
          circles[0].setAttribute("r", isActive ? "22" : "15");
          circles[1].setAttribute("r", isActive ? "10" : "7");
        }
      }
      if (!dotId) {
        panel.innerHTML = renderMapPanelDefault();
        return;
      }
      var activeDot = dotsById[dotId];
      if (!activeDot) return;
      panel.innerHTML = renderMapPanelActive(summarizeMapDot(activeDot, events), cfg);
    }

    for (var gIdx = 0; gIdx < groups.length; gIdx++) {
      (function (group) {
        var labelEl = group.querySelector("text");
        var label = labelEl ? labelEl.textContent.trim() : "";
        var dot = MAP_DOTS_BY_LABEL[label];
        if (!dot) return;
        dotsById[dot.id] = dot;
        group.addEventListener("mouseenter", function () {
          setActiveDot(dot.id);
        });
        group.addEventListener("click", function () {
          setActiveDot(dot.id);
        });
      })(groups[gIdx]);
    }

    var statsEl = section.querySelector(".absolute.bottom-6.left-6");
    if (statsEl) {
      var activeStateCount = Object.keys(MAP_DOTS_BY_LABEL)
        .map(function (k) {
          return MAP_DOTS_BY_LABEL[k].code;
        })
        .filter(function (code, idx, arr) {
          return arr.indexOf(code) === idx;
        }).length;
      statsEl.textContent = activeStateCount + " active states · " + events.length + "+ events booked";
    }

    section._pbsMapState = { events: events, dotsById: dotsById, panel: panel, activeDotId: null };
    section.setAttribute("data-pbs-map-init", "1");
    panel.innerHTML = renderMapPanelDefault();
  }

  function setTextIfFound(selector, text) {
    var el = document.querySelector(selector);
    if (el && text) el.textContent = text;
  }

  function patchDetailPage(event) {
    document.title =
      "Plant Bingo — " + event.city + ", " + event.state + " · " + event.month + " " + event.day;

    var heroH1 = document.querySelector('h1[class*="font-display"][class*="text-cream"]');
    if (heroH1 && event.title) heroH1.textContent = event.title;

    var heroVenue = heroH1 && heroH1.nextElementSibling && heroH1.nextElementSibling.tagName === "P"
      ? heroH1.nextElementSibling
      : null;
    if (heroVenue && event.venue) heroVenue.textContent = event.venue;

    var headings = document.querySelectorAll("h1, h2, h3");
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      if (h === heroH1) continue;
      if (h.className && h.className.indexOf("font-display") >= 0 && h.textContent && h.textContent.length < 160) {
        if (h.tagName === "H2" && h.textContent.indexOf("You") >= 0 && h.textContent.indexOf("Invited") >= 0) {
          h.textContent = event.descriptionTitle || "You're Invited to " + event.title + "!";
        } else if (h.tagName === "H1" || h.textContent.indexOf("Plant Bingo") >= 0) {
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
        updateListPage(events || [], cfg);
      }
      if (listEvents) applyList(listEvents);
      else applyList([]);
      fetchEvents(cfg).then(function (data) {
        if (data && data.ok && data.events) applyList(data.events);
      });
      return;
    }

    if (kind === "home") {
      var homeEvents = cfg.bootstrap && cfg.bootstrap.list ? cfg.bootstrap.list.events : null;
      if (homeEvents) applyHomeEvents(homeEvents, cfg);
      else applyHomeEvents([], cfg);
      fetchEvents(cfg).then(function (data) {
        if (data && data.ok && data.events) applyHomeEvents(data.events, cfg);
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
