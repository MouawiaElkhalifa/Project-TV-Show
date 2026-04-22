// ---------- Global state & cache ----------
let allShows = [];
let episodesCache = {};
let currentEpisodes = [];
let currentShowId = null;
let currentView = "shows"; // "shows" or "episodes"

// ---------- DOM elements ----------
const rootElem = document.getElementById("root");
const showSelect = document.getElementById("show-select");
const searchInput = document.getElementById("search-input");
const episodeSelect = document.getElementById("episode-select");
const episodeCountSpan = document.getElementById("episode-count");
const backBtn = document.getElementById("back-btn");

// ---------- Helpers ----------
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, m =>
    m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;"
  );
}

function formatEpisodeCode(season, number) {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

function updateCounter(displayed, total) {
  episodeCountSpan.textContent = `Displaying ${displayed}/${total}`;
}

// ---------- SHOWS VIEW ----------
function renderShowsList(shows) {
  currentView = "shows";
  rootElem.innerHTML = "";
  
  // UI visibility for Shows View
  episodeSelect.style.display = "none";
  if (backBtn) backBtn.style.display = "none";
  if (showSelect) showSelect.value = ""; 

  shows.forEach(show => {
    const card = document.createElement("section");
    card.className = "show-card";

    // Adding inline styles for cursor to show they are clickable
    card.innerHTML = `
      <h2 class="show-title" style="cursor:pointer; color: #007bff;">${escapeHtml(show.name)}</h2>
      <div class="show-content">
        <img src="${show.image?.medium || ""}" style="cursor:pointer" alt="${escapeHtml(show.name)}">
        <div class="show-details">
          <p class="show-summary">${stripHtml(show.summary)}</p>
          <div class="show-info-box">
            <p><strong>Genres:</strong> ${show.genres.join(", ")}</p>
            <p><strong>Status:</strong> ${show.status}</p>
            <p><strong>Rating:</strong> ⭐ ${show.rating?.average || "N/A"}</p>
            <p><strong>Runtime:</strong> ${show.runtime} mins</p>
          </div>
        </div>
      </div>
    `;

    // Click Title or Image → load episodes
    const clickableElements = card.querySelectorAll(".show-title, img");
    clickableElements.forEach(el => {
      el.addEventListener("click", () => switchToShow(show.id));
    });

    rootElem.appendChild(card);
  });

  updateCounter(shows.length, allShows.length);
}

// ---------- EPISODES VIEW ----------
function renderEpisodes(episodes) {
  currentView = "episodes";
  rootElem.innerHTML = "";
  
  // UI visibility for Episode View
  episodeSelect.style.display = "block";
  if (backBtn) backBtn.style.display = "block";

  if (!episodes.length) {
    rootElem.innerHTML = "<p>No episodes found for this show.</p>";
    return;
  }

  episodes.forEach(ep => {
    const card = document.createElement("section");
    card.className = "episode-card";

    const code = formatEpisodeCode(ep.season, ep.number);

    card.innerHTML = `
      <h2>${escapeHtml(ep.name)} - ${code}</h2>
      <img src="${ep.image?.medium || ""}" alt="${escapeHtml(ep.name)}">
      <div class="episode-summary">${ep.summary || "No summary available"}</div>
    `;

    rootElem.appendChild(card);
  });
}

// ---------- FILTERING ----------
function filterShows() {
  const term = searchInput.value.toLowerCase();

  const filtered = allShows.filter(show =>
    show.name.toLowerCase().includes(term) ||
    show.genres.join(" ").toLowerCase().includes(term) ||
    stripHtml(show.summary).toLowerCase().includes(term)
  );

  renderShowsList(filtered);
}

function filterEpisodes() {
  const term = searchInput.value.toLowerCase();
  const selectedId = episodeSelect.value;

  let filtered = currentEpisodes;

  if (term) {
    filtered = filtered.filter(ep =>
      ep.name.toLowerCase().includes(term) ||
      stripHtml(ep.summary).toLowerCase().includes(term)
    );
  }

  if (selectedId) {
    filtered = filtered.filter(ep => ep.id == selectedId);
  }

  renderEpisodes(filtered);
  updateCounter(filtered.length, currentEpisodes.length);
}

// ---------- DROPDOWN UPDATES ----------
function updateEpisodeDropdown(episodes) {
  episodeSelect.innerHTML = '<option value="">All Episodes</option>';

  episodes.forEach(ep => {
    const option = document.createElement("option");
    option.value = ep.id;
    option.textContent = `${formatEpisodeCode(ep.season, ep.number)} - ${ep.name}`;
    episodeSelect.appendChild(option);
  });
}

// ---------- API CALLS ----------
async function loadShows() {
  rootElem.innerHTML = "<p>Loading shows...</p>";
  try {
    const res = await fetch("https://api.tvmaze.com/shows");
    const data = await res.json();

    // Alphabetical sort
    data.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    allShows = data;
    
    // Fill the show-select dropdown
    if (showSelect) {
      showSelect.innerHTML = '<option value="">-- Select a show --</option>';
      allShows.forEach(show => {
        const option = document.createElement("option");
        option.value = show.id;
        option.textContent = show.name;
        showSelect.appendChild(option);
      });
    }
  } catch (err) {
    rootElem.innerHTML = "<p>Error loading shows. Check your internet connection.</p>";
  }
}

async function loadEpisodes(showId) {
  if (episodesCache[showId]) return episodesCache[showId];

  rootElem.innerHTML = "<p>Loading episodes...</p>";

  try {
    const res = await fetch(`https://api.tvmaze.com/shows/${showId}/episodes`);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    episodesCache[showId] = data;
    return data;
  } catch (err) {
    console.error(err);
    rootElem.innerHTML = "<p>Error loading episodes.</p>";
    return [];
  }
}

// ---------- NAVIGATION ----------
async function switchToShow(showId) {
  if (!showId) {
    renderShowsList(allShows);
    return;
  }

  currentShowId = showId;
  if (showSelect) showSelect.value = showId; 
  searchInput.value = "";
  episodeSelect.value = "";

  const episodes = await loadEpisodes(showId);
  currentEpisodes = episodes;

  updateEpisodeDropdown(episodes);
  renderEpisodes(episodes);
  updateCounter(episodes.length, episodes.length);
}

// ---------- EVENT LISTENERS ----------
function bindEvents() {
  searchInput.addEventListener("input", () => {
    if (currentView === "shows") {
      filterShows();
    } else {
      filterEpisodes();
    }
  });

  if (showSelect) {
    showSelect.addEventListener("change", (e) => {
      const selectedId = e.target.value;
      if (selectedId) {
        switchToShow(parseInt(selectedId, 10));
      } else {
        renderShowsList(allShows);
      }
    });
  }

  episodeSelect.addEventListener("change", filterEpisodes);

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      searchInput.value = "";
      renderShowsList(allShows);
    });
  }
}

// ---------- INITIALIZATION ----------
async function setup() {
  await loadShows();
  bindEvents();
  renderShowsList(allShows);
}

window.onload = setup;