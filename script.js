// ---------- Global state & cache ----------
let allShows = [];               // list of {id, name}
let episodesCache = {};          // { showId: episodesArray }
let currentEpisodes = [];        // episodes of the selected show
let currentShowId = null;        // id of the currently selected show

// DOM elements
const rootElem = document.getElementById("root");
const showSelect = document.getElementById("show-select");
const searchInput = document.getElementById("search-input");
const episodeSelect = document.getElementById("episode-select");
const episodeCountSpan = document.getElementById("episode-count");

// ---------- Helper functions ----------
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function updateCounter(displayedCount, totalCount) {
  episodeCountSpan.textContent = `Displaying ${displayedCount}/${totalCount} episodes`;
}

// Format episode code S01E01
function formatEpisodeCode(season, number) {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

// Render episodes into the root (uses currentEpisodes if no parameter given)
function makePageForEpisodes(episodeList = currentEpisodes) {
  rootElem.innerHTML = "";
  if (!episodeList.length) {
    rootElem.innerHTML = "<p>No episodes found for this show.</p>";
    return;
  }

  episodeList.forEach((episode) => {
    const card = document.createElement("section");
    card.className = "episode-card";

    const episodeCode = formatEpisodeCode(episode.season, episode.number);
    const imgSrc = episode.image?.medium || "";
    const summaryHtml = episode.summary || "<p>No summary available.</p>";

    card.innerHTML = `
      <h2>${escapeHtml(episode.name)} - ${episodeCode}</h2>
      <img src="${imgSrc}" alt="${escapeHtml(episode.name)}">
      <div class="summary">${summaryHtml}</div>
    `;
    rootElem.appendChild(card);
  });
}

// Simple escape to prevent XSS from episode names
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

// Populate episode dropdown with episodes of current show
function updateEpisodeDropdown(episodes) {
  episodeSelect.innerHTML = '<option value="">All Episodes</option>';
  episodes.forEach((ep) => {
    const code = formatEpisodeCode(ep.season, ep.number);
    const option = document.createElement("option");
    option.value = ep.id;
    option.textContent = `${code} - ${ep.name}`;
    episodeSelect.appendChild(option);
  });
}

// Filter episodes based on search term and selected episode id
function filterAndRender() {
  if (!currentEpisodes.length) return;

  const searchTerm = searchInput.value.toLowerCase();
  const selectedEpisodeId = episodeSelect.value;

  let filtered = currentEpisodes;

  // filter by search (title or summary)
  if (searchTerm) {
    filtered = filtered.filter(ep =>
      ep.name.toLowerCase().includes(searchTerm) ||
      stripHtml(ep.summary).toLowerCase().includes(searchTerm)
    );
  }

  // filter by episode dropdown
  if (selectedEpisodeId !== "") {
    filtered = filtered.filter(ep => ep.id == selectedEpisodeId);
  }

  makePageForEpisodes(filtered);
  updateCounter(filtered.length, currentEpisodes.length);
}

// Load episodes for a given show (cached)
async function loadEpisodesForShow(showId) {
  if (episodesCache[showId]) {
    return episodesCache[showId];
  }

  // Show loading feedback
  rootElem.innerHTML = "<p>Loading episodes...</p>";
  try {
    const response = await fetch(`https://api.tvmaze.com/shows/${showId}/episodes`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const episodes = await response.json();
    episodesCache[showId] = episodes;
    return episodes;
  } catch (err) {
    console.error(err);
    rootElem.innerHTML = `<p class="error">Failed to load episodes. Please try again later.</p>`;
    return [];
  }
}

// Switch to a new show: fetch episodes, update UI, reset filters
async function switchToShow(showId) {
  if (!showId) {
    currentEpisodes = [];
    currentShowId = null;
    rootElem.innerHTML = "<p>Select a show from the dropdown above.</p>";
    updateCounter(0, 0);
    episodeSelect.innerHTML = '<option value="">All Episodes</option>';
    searchInput.value = "";
    return;
  }

  const episodes = await loadEpisodesForShow(showId);
  currentEpisodes = episodes;
  currentShowId = showId;

  // Reset filters
  searchInput.value = "";
  episodeSelect.value = "";

  // Update episode dropdown and render
  updateEpisodeDropdown(episodes);
  makePageForEpisodes(episodes);
  updateCounter(episodes.length, episodes.length);
}

// ---------- Build show selector (alphabetical, case‑insensitive) ----------
async function loadShows() {
  try {
    const response = await fetch("https://api.tvmaze.com/shows");
    if (!response.ok) throw new Error("Failed to fetch shows");
    let shows = await response.json();

    // Sort alphabetically by name (case‑insensitive)
    shows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    allShows = shows;
    showSelect.innerHTML = '<option value="">-- Select a show --</option>';
    shows.forEach(show => {
      const option = document.createElement("option");
      option.value = show.id;
      option.textContent = show.name;
      showSelect.appendChild(option);
    });
  } catch (err) {
    console.error(err);
    showSelect.innerHTML = '<option value="">Error loading shows</option>';
    rootElem.innerHTML = "<p class='error'>Could not load show list. Please refresh the page.</p>";
  }
}

// ---------- Event listeners ----------
function bindEvents() {
  // When a new show is selected
  showSelect.addEventListener("change", (e) => {
    const newShowId = e.target.value;
    if (newShowId) {
      switchToShow(parseInt(newShowId, 10));
    } else {
      switchToShow(null);
    }
  });

  // Search input
  searchInput.addEventListener("input", () => filterAndRender());

  // Episode dropdown filter
  episodeSelect.addEventListener("change", () => filterAndRender());
}

// ---------- Initialisation ----------
async function setup() {
  await loadShows();
  bindEvents();
  // No show is selected initially – user must pick one
  switchToShow(null);
}

window.onload = setup;
