(function () {
  "use strict";

  // Bump this when floorplan images change so browsers fetch fresh copies.
  const ASSET_VERSION = "20260531a";

  const state = {
    data: null,
    root: null,
    activeSiteId: null,
    activeFloorId: null,
    showReinforcements: true,
    pickMode: false
  };

  function init() {
    const root = document.getElementById("tactical-root");
    if (!root) {
      console.error("[tactical] #tactical-root element not found");
      return;
    }
    const mapId = root.getAttribute("data-map");
    if (!mapId) {
      console.error("[tactical] data-map attribute missing on #tactical-root");
      return;
    }
    state.root = root;
    state.pickMode = new URLSearchParams(window.location.search).has("pick");
    fetch("../data/" + mapId + ".json")
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        state.data = data;
        if (data.sites && data.sites.length > 0) {
          state.activeSiteId = data.sites[0].id;
          state.activeFloorId = data.sites[0].defaultFloor;
        } else if (data.floors && data.floors.length > 0) {
          state.activeFloorId = data.floors[0].id;
        }
        renderAll();
      })
      .catch(function (err) {
        console.error("[tactical] failed to load data:", err);
        root.textContent = "데이터를 불러오지 못했습니다: " + err.message;
      });
  }

  function getActiveSite() {
    return state.data.sites.find(function (s) {
      return s.id === state.activeSiteId;
    });
  }

  function getFloorById(floorId) {
    return state.data.floors.find(function (f) {
      return f.id === floorId;
    });
  }

  function getFloorsWithMarkers(site) {
    const ids = {};
    (site.reinforcements || []).forEach(function (m) {
      ids[m.floor] = true;
    });
    return ids;
  }

  function hasSites() {
    return !!(state.data.sites && state.data.sites.length > 0);
  }

  function renderAll() {
    state.root.innerHTML = "";
    state.root.appendChild(renderHeader());
    if (state.pickMode) {
      state.root.appendChild(renderPickPanel());
    }
    if (hasSites()) {
      state.root.appendChild(renderSiteSection());
    }
    state.root.appendChild(renderFloorSection());
    if (hasSites()) {
      state.root.appendChild(renderOptionsSection());
    }
    state.root.appendChild(renderFloorplan());
    if (hasSites()) {
      state.root.appendChild(renderLegend());
    }
  }

  function renderHeader() {
    const header = document.createElement("div");
    header.className = "t-header";

    const home = document.createElement("a");
    home.href = "../index.html";
    home.className = "home-link";
    home.textContent = "← R6S MAPS";

    const title = document.createElement("h1");
    title.textContent = state.data.mapName.toUpperCase();

    header.appendChild(home);
    header.appendChild(title);
    return header;
  }

  function renderSiteSection() {
    const section = document.createElement("div");
    section.className = "t-section";

    const label = document.createElement("div");
    label.className = "t-section-label";
    label.textContent = "사이트 선택";
    section.appendChild(label);

    const row = document.createElement("div");
    row.className = "t-button-row";

    state.data.sites.forEach(function (site) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "t-button" + (site.id === state.activeSiteId ? " active" : "");
      btn.textContent = site.label;
      btn.addEventListener("click", function () {
        state.activeSiteId = site.id;
        state.activeFloorId = site.defaultFloor;
        renderAll();
      });
      row.appendChild(btn);
    });

    section.appendChild(row);
    return section;
  }

  function renderFloorSection() {
    const section = document.createElement("div");
    section.className = "t-section";

    const label = document.createElement("div");
    label.className = "t-section-label";
    label.textContent = "층";
    section.appendChild(label);

    const row = document.createElement("div");
    row.className = "t-button-row";

    const site = getActiveSite();
    const markerFloors = site ? getFloorsWithMarkers(site) : {};

    state.data.floors.forEach(function (floor) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "t-button" + (floor.id === state.activeFloorId ? " active" : "");
      const hasMarkers = !!markerFloors[floor.id];
      btn.textContent = floor.label + (hasMarkers ? " *" : "");
      btn.addEventListener("click", function () {
        state.activeFloorId = floor.id;
        renderAll();
      });
      row.appendChild(btn);
    });

    section.appendChild(row);
    return section;
  }

  function renderOptionsSection() {
    const options = document.createElement("div");
    options.className = "t-options";

    const checkboxLabel = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.showReinforcements;
    checkbox.addEventListener("change", function () {
      state.showReinforcements = checkbox.checked;
      renderAll();
    });
    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(document.createTextNode(" 보강 표시"));

    options.appendChild(checkboxLabel);
    return options;
  }

  function renderLegend() {
    const legend = document.createElement("div");
    legend.className = "t-legend";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    legend.appendChild(swatch);
    legend.appendChild(document.createTextNode("추천 보강 위치"));
    return legend;
  }

  function renderPickPanel() {
    const panel = document.createElement("div");
    panel.className = "t-pick-panel";

    const title = document.createElement("div");
    title.className = "t-pick-title";
    title.textContent = "좌표 찍기 모드 — 평면도를 클릭하면 좌표가 자동 복사됩니다";

    const out = document.createElement("div");
    out.className = "t-pick-output";
    out.textContent = "(평면도를 클릭하세요)";

    panel.appendChild(title);
    panel.appendChild(out);
    return panel;
  }

  function handlePickClick(img, e) {
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return;
    }
    const line = '{ "floor": "' + state.activeFloorId + '", "x": ' +
      x.toFixed(3) + ', "y": ' + y.toFixed(3) + ', "note": "" },';
    const out = state.root.querySelector(".t-pick-output");
    if (out) {
      out.textContent = line;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(line).catch(function () {});
    }
  }

  function renderFloorplan() {
    const wrap = document.createElement("div");
    wrap.className = "t-floorplan-wrap";

    const floor = getFloorById(state.activeFloorId);
    if (!floor) {
      return wrap;
    }

    const img = document.createElement("img");
    img.className = "t-floorplan";
    img.src = floor.image + "?v=" + ASSET_VERSION;
    img.alt = floor.label;
    wrap.appendChild(img);

    if (state.pickMode) {
      wrap.classList.add("t-pick-active");
      wrap.addEventListener("click", function (e) {
        handlePickClick(img, e);
      });
    }

    const calloutLayer = document.createElement("div");
    calloutLayer.className = "t-marker-layer";
    (floor.callouts || []).forEach(function (c) {
      const label = document.createElement("div");
      label.className = "t-callout";
      label.style.position = "absolute";
      label.style.left = (c.x * 100) + "%";
      label.style.top = (c.y * 100) + "%";
      label.textContent = c.text;
      calloutLayer.appendChild(label);
    });
    wrap.appendChild(calloutLayer);

    const layer = document.createElement("div");
    layer.className = "t-marker-layer";

    if (!state.showReinforcements) {
      wrap.appendChild(layer);
      return wrap;
    }

    const site = getActiveSite();
    ((site && site.reinforcements) || []).forEach(function (m) {
      if (m.floor !== state.activeFloorId) {
        return;
      }
      const marker = document.createElement("div");
      marker.className = "t-marker";
      marker.style.left = (m.x * 100) + "%";
      marker.style.top = (m.y * 100) + "%";
      if (m.note) {
        marker.setAttribute("title", m.note);
      }
      layer.appendChild(marker);
    });

    wrap.appendChild(layer);
    return wrap;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
