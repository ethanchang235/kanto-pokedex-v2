// === DOM Elements (add new ones) ===
const pokedexGrid = document.getElementById('pokedex-grid');
const loadingMessage = document.getElementById('loading-message');
const searchInput = document.getElementById('search-input');
const typeFilterContainer = document.getElementById('type-filter-container');
const sortSelect = document.getElementById('sort-select'); // Sort dropdown
const paginationContainer = document.getElementById('pagination-container'); // Pagination container
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const pageInfoSpan = document.getElementById('page-info');
// ... (rest of modal and other DOM elements) ...
const modal = document.getElementById('pokemon-modal');
const modalContent = document.querySelector('.modal-content');
const closeModalButton = document.querySelector('.close-button');
const modalPokemonName = document.getElementById('modal-pokemon-name');
const modalPokemonNumber = document.getElementById('modal-pokemon-number');
const modalPokemonSprite = document.getElementById('modal-pokemon-sprite');
const modalPokemonTypes = document.getElementById('modal-pokemon-types');
const modalPokemonHeight = document.getElementById('modal-pokemon-height');
const modalPokemonWeight = document.getElementById('modal-pokemon-weight');
const modalPokemonDescription = document.getElementById('modal-pokemon-description');
const modalPokemonStats = document.getElementById('modal-pokemon-stats');
const shinyToggleButton = document.getElementById('shiny-toggle');
const favoriteToggleButtonModal = document.getElementById('favorite-toggle');
const evolutionContainer = document.getElementById('modal-evolution-chain');
const evolutionLoading = document.getElementById('evolution-loading');
const typeEffectivenessContainer = document.getElementById('modal-type-effectiveness');
const effectivenessLoading = document.getElementById('effectiveness-loading');

const POKEMON_COUNT = 151;
const ITEMS_PER_PAGE = 20; // Number of Pokémon per page

const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon/';
const POKEAPI_SPECIES_URL = 'https://pokeapi.co/api/v2/pokemon-species/';
const POKEAPI_EVOLUTION_URL = 'https://pokeapi.co/api/v2/evolution-chain/';
const POKEAPI_TYPE_URL = 'https://pokeapi.co/api/v2/type/';

// === Caches ===
const pokemonCache = {};
const speciesCache = {};
const evolutionCache = {};
const typeDataCache = {};

// === State Variables ===
let allPokemonData = []; // Stores ALL fetched Pokémon data
let currentlyDisplayedData = []; // Stores filtered & sorted data for current view
let currentFilters = {
    searchTerm: '',
    selectedType: 'all'
};
let currentSort = 'id_asc'; // Default sort
let currentPage = 1;
let totalPages = 1;
let favorites = [];

// === Helper & Fetch Functions ===
const formatPokemonId = (id) => `#${String(id).padStart(3, '0')}`;

const fetchData = async (url, cache) => {
    // ... (fetchData function remains the same) ...
    if (cache[url]) {
        return cache[url];
    }
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        cache[url] = data;
        return data;
    } catch (error) {
        console.error(`Could not fetch data from ${url}:`, error);
        return null;
    }
};
const fetchPokemonData = (idOrName) => fetchData(`${POKEAPI_URL}${String(idOrName).toLowerCase()}`, pokemonCache);
const fetchSpeciesData = (idOrName) => fetchData(`${POKEAPI_SPECIES_URL}${String(idOrName).toLowerCase()}`, speciesCache);
const fetchEvolutionChain = (chainId) => chainId ? fetchData(`${POKEAPI_EVOLUTION_URL}${chainId}`, evolutionCache) : null;
const fetchTypeData = (typeName) => fetchData(`${POKEAPI_TYPE_URL}${typeName}`, typeDataCache);

// === Favorites Management ===
const loadFavorites = () => { /* ... (remains the same) ... */
    const favs = localStorage.getItem('kantoFavorites');
    favorites = favs ? JSON.parse(favs) : [];
};
const saveFavorites = () => { /* ... (remains the same) ... */
    localStorage.setItem('kantoFavorites', JSON.stringify(favorites));
};
const isFavorite = (pokemonId) => { /* ... (remains the same) ... */
    return favorites.includes(parseInt(pokemonId));
};
const addFavorite = (pokemonId) => { /* ... (remains the same) ... */
    const id = parseInt(pokemonId);
    if (!isFavorite(id)) {
        favorites.push(id);
        saveFavorites();
    }
};
const removeFavorite = (pokemonId) => { /* ... (remains the same) ... */
    const id = parseInt(pokemonId);
    favorites = favorites.filter(favId => favId !== id);
    saveFavorites();
};
const toggleFavorite = (pokemonId, buttonElement, cardElement = null) => { /* ... (remains the same) ... */
     const id = parseInt(pokemonId);
     if (isFavorite(id)) {
         removeFavorite(id);
         buttonElement.classList.remove('active');
         buttonElement.textContent = '☆';
         buttonElement.title = 'Add to Favorites';
         cardElement?.classList.remove('favorite-card');
     } else {
         addFavorite(id);
         buttonElement.classList.add('active');
         buttonElement.textContent = '★';
         buttonElement.title = 'Remove from Favorites';
         cardElement?.classList.add('favorite-card');
     }
 };

// === UI Functions ===

// Create a Pokemon card element
const createPokemonCard = (pokemonData) => {
    // ... (logic remains largely the same, ensure favorite button is added correctly) ...
    const card = document.createElement('div');
    card.classList.add('pokemon-card');
    if (isFavorite(pokemonData.id)) {
        card.classList.add('favorite-card');
    }
    card.dataset.pokemonId = pokemonData.id;
    card.dataset.pokemonName = pokemonData.name;
    card.dataset.pokemonTypes = JSON.stringify(pokemonData.types.map(t => t.type.name));

    const spriteUrl = pokemonData.sprites?.front_default || 'placeholder.png';
    const pokemonName = pokemonData.name;
    const pokemonIdFormatted = formatPokemonId(pokemonData.id);

    const favButton = document.createElement('button');
    favButton.classList.add('favorite-button');
    favButton.title = isFavorite(pokemonData.id) ? 'Remove from Favorites' : 'Add to Favorites';
    favButton.textContent = isFavorite(pokemonData.id) ? '★' : '☆';
    if (isFavorite(pokemonData.id)) favButton.classList.add('active');
    favButton.onclick = (event) => {
        event.stopPropagation();
        toggleFavorite(pokemonData.id, favButton, card);
        // Optional: Re-apply filters/sort if favorites should affect display immediately
        // processAndDisplayPokemon();
    };

    card.innerHTML = `
        <img src="${spriteUrl}" alt="${pokemonName}" loading="lazy">
        <h3>${pokemonName}</h3>
        <p>${pokemonIdFormatted}</p>
    `;
    card.appendChild(favButton);

    card.addEventListener('click', () => displayPokemonModal(pokemonData.id));
    return card;
};


// --- Sorting Logic ---
const sortPokemonData = (data, sortCriteria) => {
    const sortedData = [...data]; // Create a copy to avoid mutating original
    switch (sortCriteria) {
        case 'id_asc':
            sortedData.sort((a, b) => a.id - b.id);
            break;
        case 'id_desc':
            sortedData.sort((a, b) => b.id - a.id);
            break;
        case 'name_asc':
            sortedData.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name_desc':
            sortedData.sort((a, b) => b.name.localeCompare(a.name));
            break;
    }
    return sortedData;
};

// --- Filtering Logic ---
const filterPokemonData = (data, filters) => {
    return data.filter(pokemon => {
        const nameMatch = pokemon.name.includes(filters.searchTerm);
        const pokemonTypes = pokemon.types.map(t => t.type.name);
        const typeMatch = filters.selectedType === 'all' || pokemonTypes.includes(filters.selectedType);
        return nameMatch && typeMatch;
    });
};

// --- Display Logic (Refactored) ---
const processAndDisplayPokemon = () => {
    // 1. Filter
    let processedData = filterPokemonData(allPokemonData, currentFilters);

    // 2. Sort
    processedData = sortPokemonData(processedData, currentSort);

    // 3. Paginate
    totalPages = Math.max(1, Math.ceil(processedData.length / ITEMS_PER_PAGE));
    // Ensure currentPage is valid after filtering/sorting
    currentPage = Math.max(1, Math.min(currentPage, totalPages));

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    currentlyDisplayedData = processedData.slice(startIndex, endIndex);

    // 4. Render Grid & Pagination
    displayPokemonGrid(currentlyDisplayedData);
    renderPaginationControls();
};

const displayPokemonGrid = (pokemonList) => {
    pokedexGrid.innerHTML = ''; // Clear grid
    if (pokemonList.length === 0) {
        pokedexGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">No Pokémon match the current filters.</p>';
        paginationContainer.style.display = 'none'; // Hide pagination if no results
        return;
    }

    pokemonList.forEach(pokemonData => {
        const card = createPokemonCard(pokemonData);
        pokedexGrid.appendChild(card);
    });
    paginationContainer.style.display = 'flex'; // Show pagination if there are results
};

// --- Pagination Controls ---
const renderPaginationControls = () => {
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages;
};

const goToPrevPage = () => {
    if (currentPage > 1) {
        currentPage--;
        processAndDisplayPokemon();
    }
};

const goToNextPage = () => {
    if (currentPage < totalPages) {
        currentPage++;
        processAndDisplayPokemon();
    }
};

// --- Event Handlers ---
const handleSearchInput = (event) => {
    currentFilters.searchTerm = event.target.value.toLowerCase();
    currentPage = 1; // Reset to first page on new search
    processAndDisplayPokemon();
};

const handleTypeFilterClick = (event) => {
    const targetButton = event.target.closest('.type-filter-button');
    if (!targetButton) return;

    const selectedType = targetButton.dataset.type;
    currentFilters.selectedType = selectedType;
    currentPage = 1; // Reset to first page on type change

    document.querySelectorAll('.type-filter-button').forEach(button => {
        button.classList.toggle('active', button.dataset.type === selectedType);
    });

    processAndDisplayPokemon();
};

const handleSortChange = (event) => {
    currentSort = event.target.value;
    currentPage = 1; // Reset to first page on sort change
    processAndDisplayPokemon();
};

// --- Modal Logic ---
const resetModal = () => { /* ... (remains the same as previous version) ... */
    modalPokemonName.textContent = 'Loading...';
    modalPokemonNumber.textContent = '#???';
    modalPokemonSprite.src = '';
    modalPokemonSprite.alt = 'Loading sprite';
    modalPokemonTypes.innerHTML = '';
    modalPokemonHeight.textContent = 'N/A';
    modalPokemonWeight.textContent = 'N/A';
    modalPokemonDescription.textContent = 'Loading description...';
    modalPokemonStats.innerHTML = '';
    evolutionContainer.innerHTML = '<p id="evolution-loading" style="text-align:center; color:#888;">Loading evolution...</p>'; // Centered
    typeEffectivenessContainer.innerHTML = '<p id="effectiveness-loading" style="text-align:center; color:#888;">Calculating effectiveness...</p>'; // Centered
    shinyToggleButton.classList.remove('active');
    shinyToggleButton.style.display = 'none';
    shinyToggleButton.onclick = null;
    favoriteToggleButtonModal.classList.remove('active');
    favoriteToggleButtonModal.textContent = '☆';
    favoriteToggleButtonModal.onclick = null;
};
const calculateTypeEffectiveness = async (pokemonTypes) => { /* ... (remains the same) ... */
    const typeNames = pokemonTypes.map(t => t.type.name);
    const effectiveness = { weak: new Set(), resistant: new Set(), immune: new Set() };
    const allDamageRelations = await Promise.all(typeNames.map(name => fetchTypeData(name)));
    const allTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];

    allTypes.forEach(attackingType => {
        let multiplier = 1;
        allDamageRelations.forEach(typeData => {
            if (!typeData) return;
            const relations = typeData.damage_relations;
            if (relations.double_damage_from.some(t => t.name === attackingType)) multiplier *= 2;
            if (relations.half_damage_from.some(t => t.name === attackingType)) multiplier *= 0.5;
            if (relations.no_damage_from.some(t => t.name === attackingType)) multiplier *= 0;
        });
        if (multiplier >= 2) effectiveness.weak.add(attackingType);
        else if (multiplier > 0 && multiplier < 1) effectiveness.resistant.add(attackingType);
        else if (multiplier === 0) effectiveness.immune.add(attackingType);
    });
    return effectiveness;
};
const displayTypeEffectiveness = (effectivenessData) => { /* ... (remains the same) ... */
    typeEffectivenessContainer.innerHTML = '';
    const createList = (types, title) => {
        if (types.size === 0) return;
        const section = document.createElement('div');
        section.classList.add('effectiveness-section');
        const heading = document.createElement('h4');
        heading.textContent = title;
        const list = document.createElement('ul');
        list.classList.add('type-effectiveness-list');
        types.forEach(typeName => {
            const li = document.createElement('li');
            const badge = document.createElement('span');
            badge.classList.add('type-badge', `type-${typeName}`);
            badge.textContent = typeName;
            li.appendChild(badge);
            list.appendChild(li);
        });
        section.appendChild(heading);
        section.appendChild(list);
        typeEffectivenessContainer.appendChild(section);
    };
    createList(effectivenessData.weak, 'Weak Against (x2/x4)');
    createList(effectivenessData.resistant, 'Resistant To (x0.5/x0.25)');
    createList(effectivenessData.immune, 'Immune To (x0)');
    if (typeEffectivenessContainer.innerHTML === '') {
        typeEffectivenessContainer.innerHTML = '<p style="text-align:center; color:#666;">Normal effectiveness against all types.</p>'; // Centered message
    }
};
const displayEvolutionChain = async (chainData) => { /* ... (remains the same, ensure it's async) ... */
    evolutionContainer.innerHTML = ''; // Clear loading/previous chain
    let currentStage = chainData;
    let stageCount = 0;
    while (currentStage) {
        stageCount++;
        const speciesName = currentStage.species.name;
        if (stageCount > 1) {
            const arrow = document.createElement('div');
            arrow.classList.add('evolution-arrow'); arrow.innerHTML = '→';
            evolutionContainer.appendChild(arrow);
        }
        const stagePokemonData = await fetchPokemonData(speciesName); // Await fetch
        const spriteUrl = stagePokemonData?.sprites?.front_default || 'placeholder.png';
        const stageDiv = document.createElement('div');
        stageDiv.classList.add('evolution-stage');
        stageDiv.onclick = () => {
             const currentModalPokemonId = parseInt(modalPokemonNumber.textContent.substring(1));
             if (stagePokemonData && stagePokemonData.id !== currentModalPokemonId) {
                  hideModal(); displayPokemonModal(stagePokemonData.id);
             }
        };
        stageDiv.innerHTML = `<img src="${spriteUrl}" alt="${speciesName}" loading="lazy"><span>${speciesName}</span>`;
        evolutionContainer.appendChild(stageDiv);
        if (currentStage.evolves_to.length > 0) { currentStage = currentStage.evolves_to[0]; }
        else { currentStage = null; }
    }
     if (stageCount === 0) evolutionContainer.innerHTML = '<p style="text-align:center; color:#888;">No evolution data found.</p>'; // Centered message
};
const displayPokemonModal = async (id) => { /* ... (logic to populate fields remains largely the same, ensure effectiveness/evolution are called) ... */
    resetModal();
    modal.style.display = 'flex';
    const pokemonData = await fetchPokemonData(id);
    if (!pokemonData) { /* ... error handling ... */ return; }
    const speciesDataPromise = fetchSpeciesData(id);
    // --- Update basic info & Setup Buttons ---
    modalPokemonName.textContent = pokemonData.name;
    modalPokemonNumber.textContent = formatPokemonId(pokemonData.id);
    // ... (sprite, height, weight)
    // Shiny Toggle Setup
    const defaultSprite = pokemonData.sprites?.front_default || 'placeholder.png';
    const shinySprite = pokemonData.sprites?.front_shiny;
    modalPokemonSprite.src = defaultSprite;
    let isShiny = false;
    if (shinySprite) { /* ... (shiny toggle logic) ... */
        shinyToggleButton.style.display = 'inline-block';
        shinyToggleButton.onclick = () => {
            isShiny = !isShiny;
            modalPokemonSprite.src = isShiny ? shinySprite : defaultSprite;
            shinyToggleButton.classList.toggle('active', isShiny);
        };
    }
    // Favorite Toggle Setup
    const pokemonId = pokemonData.id;
    const isCurrentlyFavorite = isFavorite(pokemonId);
    // ... (favorite toggle logic for modal button) ...
    favoriteToggleButtonModal.classList.toggle('active', isCurrentlyFavorite);
    favoriteToggleButtonModal.textContent = isCurrentlyFavorite ? '★' : '☆';
    favoriteToggleButtonModal.title = isCurrentlyFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    favoriteToggleButtonModal.onclick = () => {
        const cardElement = pokedexGrid.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
        const cardFavButton = cardElement?.querySelector('.favorite-button');
        // Correct: toggle modal first, *then* use the *result* to update the card state
        const wasFavorite = isFavorite(pokemonId);
        toggleFavorite(pokemonId, favoriteToggleButtonModal); // Update modal state & button
        if(cardFavButton) { // Now update card based on the *new* state
            cardFavButton.classList.toggle('active', !wasFavorite);
            cardFavButton.textContent = !wasFavorite ? '★' : '☆';
            cardFavButton.title = !wasFavorite ? 'Remove from Favorites' : 'Add to Favorites';
            cardElement?.classList.toggle('favorite-card', !wasFavorite);
        }
    };
    // --- Update types ---
    modalPokemonTypes.innerHTML = '';
    pokemonData.types.forEach(typeInfo => { /* ... (type badge creation) ... */
        const typeSpan = document.createElement('span');
        typeSpan.classList.add('type-badge', `type-${typeInfo.type.name}`);
        typeSpan.textContent = typeInfo.type.name;
        modalPokemonTypes.appendChild(typeSpan);
     });
    // --- Update stats ---
    modalPokemonStats.innerHTML = '';
    const maxStatValue = 200;
    pokemonData.stats.forEach(statInfo => { /* ... (stat bar creation) ... */
        const statRow = document.createElement('div');
        statRow.classList.add('stat-row', `stat-${statInfo.stat.name.replace('special-', 'sp-')}`);
        const statValue = statInfo.base_stat;
        const statPercentage = Math.min(100, (statValue / maxStatValue) * 100);
        statRow.innerHTML = /* ... stat bar innerHTML ... */ `
            <div class="stat-label">${statInfo.stat.name.replace('special-', 'Sp. ').replace('-', ' ')}</div>
            <div class="stat-bar-container">
                <div class="stat-bar" style="width: ${statPercentage}%;"></div>
                 <span class="stat-value-tooltip">${statValue}</span>
            </div>
        `;
        modalPokemonStats.appendChild(statRow);
     });
    // --- Wait for Species Data then Process Dependent Info ---
    const speciesData = await speciesDataPromise;
    // Update description
    let description = "No description available."; /* ... (description logic) ... */
    if (speciesData?.flavor_text_entries) {
        const englishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
        if (englishEntry) description = englishEntry.flavor_text.replace(/[\n\f\r]/g, ' ');
    }
    modalPokemonDescription.textContent = description;
    // Fetch and Display Evolution Chain
    if (speciesData?.evolution_chain?.url) { /* ... (evolution chain logic) ... */
        try {
            const chainId = speciesData.evolution_chain.url.split('/').filter(Boolean).pop();
            const evolutionData = await fetchEvolutionChain(chainId);
            if(evolutionData) await displayEvolutionChain(evolutionData.chain);
            else evolutionContainer.innerHTML = '<p style="text-align:center; color:#888;">Could not load evolution data.</p>';
        } catch (error) { console.error(error); evolutionContainer.innerHTML = '<p>Error.</p>'; }
    } else { evolutionContainer.innerHTML = '<p>No evolution data.</p>'; }
     // Calculate and Display Type Effectiveness
     try { /* ... (type effectiveness logic) ... */
         const effectivenessData = await calculateTypeEffectiveness(pokemonData.types);
         displayTypeEffectiveness(effectivenessData);
     } catch (error) { console.error(error); typeEffectivenessContainer.innerHTML = '<p>Error.</p>';}
};
const hideModal = () => { /* ... (remains the same) ... */
    modal.style.display = 'none';
};

// === Event Listeners ===
searchInput.addEventListener('input', handleSearchInput);
typeFilterContainer.addEventListener('click', handleTypeFilterClick);
sortSelect.addEventListener('change', handleSortChange); // Add listener for sort change
prevPageButton.addEventListener('click', goToPrevPage); // Add listener for pagination
nextPageButton.addEventListener('click', goToNextPage); // Add listener for pagination
closeModalButton.addEventListener('click', hideModal);
window.addEventListener('click', (event) => { if (event.target === modal) hideModal(); });
window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.style.display === 'flex') hideModal(); });

// === Initialization ===
const initializePokedex = async () => {
    loadFavorites();
    loadingMessage.style.display = 'block';
    pokedexGrid.innerHTML = '';

    try {
        const pokemonPromises = [];
        for (let i = 1; i <= POKEMON_COUNT; i++) {
            pokemonPromises.push(fetchPokemonData(i));
        }
        allPokemonData = (await Promise.all(pokemonPromises)).filter(Boolean);

        if (allPokemonData.length === 0 && POKEMON_COUNT > 0) {
             throw new Error("Failed to fetch any Pokémon data.");
        }

        // Populate Type Filters (add type classes directly)
        const kantoTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon"];
        kantoTypes.forEach(type => {
             const button = document.createElement('button');
             // Add base class AND type-specific class
             button.classList.add('type-filter-button', `type-${type}`);
             button.dataset.type = type;
             button.textContent = type;
             typeFilterContainer.appendChild(button);
        });
         // Ensure 'All' button also has its data-type class if needed, though styling is specific
         const allButton = typeFilterContainer.querySelector('[data-type="all"]');
         if (allButton) allButton.classList.add('type-all'); // Or style via attribute selector


        loadingMessage.style.display = 'none';
        // Initial display
        processAndDisplayPokemon();

    } catch (error) {
        loadingMessage.textContent = `Error initializing Pokédex: ${error.message}`;
        console.error("Initialization Error:", error);
    }
};

// Initialize
initializePokedex();