
// ===============================
// GLOBAL STATE
// ===============================
// We store all episodes here once fetched
// IMPORTANT: we only fetch ONCE (Level 300 requirement)
let allEpisodesData = [];


// ===============================
// FETCH DATA FROM API
// ===============================
// IMPORTANT: This replaces episodes.js completely
// We now get REAL data from the internet
async function fetchEpisodes() {
  const root = document.getElementById("root");

  try {
    // Show loading state (user feedback is required in Level 300)
    root.textContent = "Loading episodes... ⏳";

    const response = await fetch(
      "https://api.tvmaze.com/shows/82/episodes"
    );

    // IMPORTANT: always check if request succeeded
    if (!response.ok) {
      throw new Error("Network response failed");
    }

    const data = await response.json();
    return data;

  } catch (error) {
    // IMPORTANT: real users don't see console, so show message
    console.error(error);

    root.textContent =
      "Error loading episodes. Please refresh the page.";

    return [];
  }
}


// ===============================
// REMOVE HTML TAGS (SAFE DISPLAY)
// ===============================
// API summaries contain HTML tags, so we clean them for search
function stripHtml(html) {
  if (!html) return "";

  const div = document.createElement("div");
  div.innerHTML = html;

  return div.textContent || div.innerText || "";
}


// ===============================
// FILTER EPISODES (SEARCH)
// ===============================
// IMPORTANT: used for live search input
function filterEpisodes(searchTerm, episodes) {
  if (!searchTerm.trim()) return episodes;

  const term = searchTerm.toLowerCase().trim();

  return episodes.filter(ep => {
    const nameMatch = ep.name.toLowerCase().includes(term);

    const summaryMatch = stripHtml(ep.summary)
      .toLowerCase()
      .includes(term);

    return nameMatch || summaryMatch;
  });
}


// ===============================
// RENDER EPISODES ON SCREEN
// ===============================
// IMPORTANT: this rebuilds the UI every time search/dropdown changes
function makePageForEpisodes(episodeList) {
  const root = document.getElementById("root");
  root.textContent = "";

  const count = document.getElementById("episode-count");

  // Update result counter (UX improvement)
  if (count) {
    count.textContent = `Showing ${episodeList.length} episode(s)`;
  }

  // If nothing matches search
  if (episodeList.length === 0) {
    const msg = document.createElement("p");
    msg.textContent = "No episodes found.";
    root.appendChild(msg);
    return;
  }

  // Create each episode card
  episodeList.forEach(ep => {
    const card = document.createElement("section");
    card.className = "episode-card";

    const season = String(ep.season).padStart(2, "0");
    const number = String(ep.number).padStart(2, "0");

    const title = document.createElement("h2");
    title.textContent = `${ep.name} (S${season}E${number})`;

    const img = document.createElement("img");
    img.src = ep.image?.medium || "";
    img.alt = ep.name; // IMPORTANT: accessibility

    const summary = document.createElement("div");

    // NOTE: TVMaze returns HTML summaries, so innerHTML is expected
    summary.innerHTML = ep.summary || "";

    card.appendChild(title);
    card.appendChild(img);
    card.appendChild(summary);

    root.appendChild(card);
  });
}


// ===============================
// CREATE UI (SEARCH + DROPDOWN)
// ===============================
// IMPORTANT: all user controls are created here
function createUI() {
  const root = document.getElementById("root");

  const container = document.createElement("div");
  container.className = "ui-container";

  // ---------------- SEARCH ----------------
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search episodes...";
  searchInput.id = "search-input";

  // IMPORTANT: Accessibility improvement for Lighthouse score
  searchInput.setAttribute("aria-label", "Search episodes");


  // ---------------- DROPDOWN ----------------
  const dropdown = document.createElement("select");

  dropdown.setAttribute("aria-label", "Select episode");

  const defaultOption = document.createElement("option");
  defaultOption.value = "all";
  defaultOption.textContent = "All Episodes";
  dropdown.appendChild(defaultOption);

  // IMPORTANT: dropdown is built from API data
  allEpisodesData.forEach(ep => {
    const option = document.createElement("option");
    option.value = ep.id;

    const season = String(ep.season).padStart(2, "0");
    const number = String(ep.number).padStart(2, "0");

    option.textContent = `S${season}E${number} - ${ep.name}`;

    dropdown.appendChild(option);
  });


  // ---------------- SEARCH EVENT ----------------
  searchInput.addEventListener("input", (e) => {
    const filtered = filterEpisodes(
      e.target.value,
      allEpisodesData
    );

    makePageForEpisodes(filtered);
  });


  // ---------------- DROPDOWN EVENT ----------------
  dropdown.addEventListener("change", (e) => {
    if (e.target.value === "all") {
      makePageForEpisodes(allEpisodesData);
      return;
    }

    const selected = allEpisodesData.filter(
      ep => ep.id == e.target.value
    );

    makePageForEpisodes(selected);
  });


  // Add controls to page
  container.appendChild(searchInput);
  container.appendChild(dropdown);

  root.parentNode.insertBefore(container, root);


  // ---------------- COUNT DISPLAY ----------------
  const count = document.createElement("div");
  count.id = "episode-count";
  container.appendChild(count);


  // ---------------- FOOTER ----------------
  // IMPORTANT: created ONCE only (avoid duplicates)
  const footer = document.createElement("footer");
  footer.innerHTML =
    `Data originally from <a href="https://tvmaze.com/" target="_blank">TVMaze.com</a>`;
  document.body.appendChild(footer);
}


// ===============================
// START APPLICATION
// ===============================
async function setup() {
  // IMPORTANT: fetch happens ONCE only (Level 300 requirement)
  allEpisodesData = await fetchEpisodes();

  // If API failed, stop execution
  if (!allEpisodesData.length) return;

  createUI();
  makePageForEpisodes(allEpisodesData);
}


// Start app when page loads
window.onload = setup;