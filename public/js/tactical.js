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
    pickMode: false,
    picks: [],
    pickName: "",
    pickType: "callout"
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
    if (state.pickMode) {
      refreshPickOutput();
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

  function pickLine(p) {
    if (p.type === "reinf") {
      return '{ "floor": "' + p.floor + '", "x": ' + p.x.toFixed(3) +
        ', "y": ' + p.y.toFixed(3) + ', "note": "' + p.text + '" },';
    }
    return '{ "x": ' + p.x.toFixed(3) + ', "y": ' + p.y.toFixed(3) +
      ', "text": "' + p.text + '" },';
  }

  function refreshPickOutput() {
    const ta = state.root.querySelector(".t-pick-output");
    if (!ta) {
      return;
    }
    const lines = state.picks
      .filter(function (p) { return p.floor === state.activeFloorId; })
      .map(pickLine);
    ta.value = lines.join("\n");
  }

  function renderPickPanel() {
    const panel = document.createElement("div");
    panel.className = "t-pick-panel";

    const title = document.createElement("div");
    title.className = "t-pick-title";
    title.textContent = "라벨 편집기 — 이름을 입력하고 평면도의 해당 위치를 클릭하세요 (현재 층 기준)";
    panel.appendChild(title);

    const controls = document.createElement("div");
    controls.className = "t-pick-controls";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "t-pick-name";
    nameInput.placeholder = "방 이름 (예: 차고)";
    nameInput.value = state.pickName;
    nameInput.addEventListener("input", function () {
      state.pickName = nameInput.value;
    });

    const typeSel = document.createElement("select");
    typeSel.className = "t-pick-type";
    [["callout", "콜아웃(방이름)"], ["reinf", "보강 마커"]].forEach(function (o) {
      const opt = document.createElement("option");
      opt.value = o[0];
      opt.textContent = o[1];
      typeSel.appendChild(opt);
    });
    typeSel.value = state.pickType;
    typeSel.addEventListener("change", function () {
      state.pickType = typeSel.value;
    });

    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "t-button";
    undoBtn.textContent = "마지막 취소";
    undoBtn.addEventListener("click", function () {
      for (let i = state.picks.length - 1; i >= 0; i--) {
        if (state.picks[i].floor === state.activeFloorId) {
          state.picks.splice(i, 1);
          break;
        }
      }
      renderAll();
    });

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "t-button";
    copyBtn.textContent = "현재 층 복사";
    copyBtn.addEventListener("click", function () {
      const ta = state.root.querySelector(".t-pick-output");
      if (ta && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).catch(function () {});
      }
    });

    controls.appendChild(nameInput);
    controls.appendChild(typeSel);
    controls.appendChild(undoBtn);
    controls.appendChild(copyBtn);
    panel.appendChild(controls);

    const out = document.createElement("textarea");
    out.className = "t-pick-output";
    out.readOnly = true;
    out.rows = 6;
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
    state.picks.push({
      floor: state.activeFloorId,
      x: x,
      y: y,
      text: state.pickName,
      type: state.pickType
    });
    renderAll();
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

    if (state.pickMode) {
      const pickLayer = document.createElement("div");
      pickLayer.className = "t-marker-layer";
      state.picks.forEach(function (p) {
        if (p.floor !== state.activeFloorId) {
          return;
        }
        const dot = document.createElement("div");
        dot.className = "t-pick-dot";
        dot.style.position = "absolute";
        dot.style.left = (p.x * 100) + "%";
        dot.style.top = (p.y * 100) + "%";
        pickLayer.appendChild(dot);
        if (p.text) {
          const lab = document.createElement("div");
          lab.className = "t-pick-mark-label";
          lab.style.position = "absolute";
          lab.style.left = (p.x * 100) + "%";
          lab.style.top = (p.y * 100) + "%";
          lab.textContent = p.text;
          pickLayer.appendChild(lab);
        }
      });
      wrap.appendChild(pickLayer);
    }

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
