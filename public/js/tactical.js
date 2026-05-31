(function () {
  "use strict";

  const state = {
    data: null,
    root: null,
    activeSiteId: null,
    activeFloorId: null,
    showReinforcements: true
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

  function renderAll() {
    state.root.innerHTML = "";
    state.root.appendChild(renderHeader());
    state.root.appendChild(renderSiteSection());
    state.root.appendChild(renderFloorSection());
    state.root.appendChild(renderOptionsSection());
    state.root.appendChild(renderFloorplan());
    state.root.appendChild(renderLegend());
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
    const markerFloors = getFloorsWithMarkers(site);

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

  function renderFloorplan() {
    const wrap = document.createElement("div");
    wrap.className = "t-floorplan-wrap";

    const floor = getFloorById(state.activeFloorId);
    if (!floor) {
      return wrap;
    }

    const img = document.createElement("img");
    img.className = "t-floorplan";
    img.src = floor.image;
    img.alt = floor.label;
    wrap.appendChild(img);

    const layer = document.createElement("div");
    layer.className = "t-marker-layer";

    if (!state.showReinforcements) {
      wrap.appendChild(layer);
      return wrap;
    }

    const site = getActiveSite();
    (site.reinforcements || []).forEach(function (m) {
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
