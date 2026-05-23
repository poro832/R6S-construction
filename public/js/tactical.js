(function () {
  "use strict";

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
    fetch("../data/" + mapId + ".json")
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        render(root, data);
      })
      .catch(function (err) {
        console.error("[tactical] failed to load data:", err);
        root.textContent = "데이터를 불러오지 못했습니다: " + err.message;
      });
  }

  function render(root, data) {
    root.innerHTML = "";

    const header = document.createElement("div");
    header.className = "t-header";

    const home = document.createElement("a");
    home.href = "../index.html";
    home.className = "home-link";
    home.textContent = "← R6S MAPS";

    const title = document.createElement("h1");
    title.textContent = data.mapName.toUpperCase();

    header.appendChild(home);
    header.appendChild(title);
    root.appendChild(header);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
