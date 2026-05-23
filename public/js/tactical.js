(function () {
  "use strict";

  const state = {
    data: null,
    root: null,
    activeSiteId: null
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
        }
        renderAll();
      })
      .catch(function (err) {
        console.error("[tactical] failed to load data:", err);
        root.textContent = "데이터를 불러오지 못했습니다: " + err.message;
      });
  }

  function renderAll() {
    state.root.innerHTML = "";
    state.root.appendChild(renderHeader());
    state.root.appendChild(renderSiteSection());
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
        renderAll();
      });
      row.appendChild(btn);
    });

    section.appendChild(row);
    return section;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
