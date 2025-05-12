// === DOM Elements ===
const pokedexGrid = document.getElementById('pokedex-grid');
const loadingMessage = document.getElementById('loading-message');
const searchInput = document.getElementById('search-input');
const typeFilterContainer = document.getElementById('type-filter-container');
const generationFilterContainer = document.getElementById('generation-filter-container');
const sortSelect = document.getElementById('sort-select');
const paginationContainer = document.getElementById('pagination-container');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const pageInfoSpan = document.getElementById('page-info');
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
const semanticSearchInput = document.getElementById('semantic-search-input'); // semantic-search
const semanticSearchButton = document.getElementById('semantic-search-button'); // semantic-search

// === Constants ===
const ITEMS_PER_PAGE = 49; // Number of Pokémon per page
const ALL_POKEMON_DATA_URL = 'data/all_pokemon_summary.json'; // Path to pre-built JSON
const GEMINI_API_KEY = ''; // <<<<< ONLY FOR LOCAL TESTING
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;


// API URLs for detailed modal data (when a card is clicked)
const POKEAPI_POKEMON_URL = 'https://pokeapi.co/api/v2/pokemon/';
const POKEAPI_SPECIES_URL = 'https://pokeapi.co/api/v2/pokemon-species/';
const POKEAPI_EVOLUTION_URL = 'https://pokeapi.co/api/v2/evolution-chain/';
const POKEAPI_TYPE_URL = 'https://pokeapi.co/api/v2/type/';

// === Caches (for DETAILED data fetched for the modal on demand) ===
const detailPokemonCache = {};
const speciesCache = {};
const evolutionCache = {};
const typeDataCache = {};

// === State Variables ===
let allPokemonSummaryData = []; // Will store data from all_pokemon_summary.json
let currentlyDisplayedData = []; // Stores filtered & sorted data for current page view
let currentFilters = {
    searchTerm: '',
    selectedType: 'all',
    selectedGeneration: 'all'
};
let currentSort = 'id_asc';
let currentPage = 1;
let totalPages = 1;
let favorites = [];

// === Helper & Fetch Functions ===
const formatPokemonId = (id) => `#${String(id).padStart(4, '0')}`;

const fetchLiveApiData = async (url, cache) => {
    if (cache[url]) return cache[url];
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${url}`);
        const data = await response.json();
        cache[url] = data;
        return data;
    } catch (error) {
        console.error(`Could not fetch data from ${url}:`, error);
        return null;
    }
};

const fetchDetailPokemonData = (idOrName) => fetchLiveApiData(`${POKEAPI_POKEMON_URL}${String(idOrName).toLowerCase()}`, detailPokemonCache);
const fetchSpeciesData = (idOrName) => fetchLiveApiData(`${POKEAPI_SPECIES_URL}${String(idOrName).toLowerCase()}`, speciesCache);
const fetchEvolutionChain = (chainId) => chainId ? fetchLiveApiData(`${POKEAPI_EVOLUTION_URL}${chainId}`, evolutionCache) : null;
const fetchTypeData = (typeName) => fetchLiveApiData(`${POKEAPI_TYPE_URL}${typeName}`, typeDataCache);

// --- Gemini API Call ---
async function fetchSemanticSuggestions(query) {
    semanticSearchButton.disabled = true;
    semanticSearchButton.textContent = 'Thinking...';
    loadingMessage.textContent = 'Getting semantic suggestions...';
    loadingMessage.style.display = 'block';

    // --- Prompt Engineering: ---
    // Ask Gemini to extract types and keywords from the user's query.
    // This prompt structure is an example and might need refinement.
    const prompt = `
        User query for Pokémon: "${query}"

        Based on this query, extract the following information to help filter a Pokémon database:
        1. Relevant Pokémon Types (e.g., fire, water, grass, psychic, dark, steel). List up to two types.
        2. Descriptive Keywords (e.g., strong, fast, small, legendary, swims, flies, red, shiny). List up to five keywords.

        Format your response clearly, for example:
        TYPES: water, flying
        KEYWORDS: large, bird, ocean, fast

        If no specific types or keywords can be confidently extracted, state "TYPES: none" or "KEYWORDS: none".
    `;

    try {
        if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
            console.error("Gemini API Key not set. Please replace 'YOUR_GEMINI_API_KEY' in script.js for local testing.");
            alert("Gemini API Key not configured for local testing. See console.");
            // Simulate a response for UI testing without actual API call
            return { types: [], keywords: ["test", "pokemon"] }; // Example fallback
        }

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                // Optional: Add generationConfig for temperature, topK, topP if needed
                // "generationConfig": {
                //   "temperature": 0.7,
                //   "topK": 1,
                //   "topP": 1,
                //   "maxOutputTokens": 256,
                // },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', errorData);
            throw new Error(`Gemini API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        // console.log('Gemini API Raw Response:', data); // For debugging

        // --- Parse Gemini's Response ---
        // This parsing logic depends HEAVILY on how Gemini formats its response
        // based on your prompt. You WILL need to inspect the actual response and adjust.
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        // console.log('Gemini Generated Text:', generatedText); // For debugging

        const extracted = { types: [], keywords: [] };
        const typeMatch = generatedText.match(/TYPES:\s*([\w,\s-]*)/i);
        if (typeMatch && typeMatch[1] && typeMatch[1].toLowerCase() !== 'none') {
            extracted.types = typeMatch[1].split(',')
                .map(t => t.trim().toLowerCase())
                .filter(t => t.length > 0);
        }

        const keywordMatch = generatedText.match(/KEYWORDS:\s*([\w,\s-]*)/i);
        if (keywordMatch && keywordMatch[1] && keywordMatch[1].toLowerCase() !== 'none') {
            extracted.keywords = keywordMatch[1].split(',')
                .map(k => k.trim().toLowerCase())
                .filter(k => k.length > 0);
        }
        return extracted;

    } catch (error) {
        console.error('Error fetching semantic suggestions:', error);
        alert(`Error with Semantic Search: ${error.message}. Check console for details.`);
        return { types: [], keywords: [] }; // Return empty on error
    } finally {
        semanticSearchButton.disabled = false;
        semanticSearchButton.textContent = 'Semantic Search';
        loadingMessage.style.display = 'none';
    }
}

// === Favorites Management ===
const loadFavorites = () => {
    const favs = localStorage.getItem('pokedexFavoritesAllGens');
    favorites = favs ? JSON.parse(favs) : [];
};
const saveFavorites = () => {
    localStorage.setItem('pokedexFavoritesAllGens', JSON.stringify(favorites));
};
const isFavorite = (pokemonId) => favorites.includes(parseInt(pokemonId));
const addFavorite = (pokemonId) => {
    const id = parseInt(pokemonId); if (!isFavorite(id)) { favorites.push(id); saveFavorites(); }
};
const removeFavorite = (pokemonId) => {
    const id = parseInt(pokemonId); favorites = favorites.filter(favId => favId !== id); saveFavorites();
};
const toggleFavorite = (pokemonId, buttonElement, cardElement = null) => {
     const id = parseInt(pokemonId);
     const wasFavorite = isFavorite(id);
     if (wasFavorite) removeFavorite(id);
     else addFavorite(id);
     const isNowFavorite = !wasFavorite;
     buttonElement.classList.toggle('active', isNowFavorite);
     buttonElement.textContent = isNowFavorite ? '★' : '☆';
     buttonElement.title = isNowFavorite ? 'Remove from Favorites' : 'Add to Favorites';
     if (cardElement) {
        cardElement.classList.toggle('favorite-card', isNowFavorite);
     }
};

// === UI Functions ===
const createPokemonCard = (pokemonSummary) => {
    const card = document.createElement('div');
    card.classList.add('pokemon-card');
    if (isFavorite(pokemonSummary.id)) card.classList.add('favorite-card');
    card.dataset.pokemonId = pokemonSummary.id;
    card.dataset.pokemonName = pokemonSummary.name;
    card.dataset.pokemonTypes = JSON.stringify(pokemonSummary.types);
    card.dataset.pokemonGeneration = pokemonSummary.generation;
    const spriteUrl = pokemonSummary.sprite || 'placeholder.png';
    const pokemonName = pokemonSummary.name;
    const pokemonIdFormatted = formatPokemonId(pokemonSummary.id);
    const favButton = document.createElement('button');
    favButton.classList.add('favorite-button');
    const isFav = isFavorite(pokemonSummary.id);
    favButton.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
    favButton.textContent = isFav ? '★' : '☆';
    if (isFav) favButton.classList.add('active');
    favButton.onclick = (event) => {
        event.stopPropagation();
        toggleFavorite(pokemonSummary.id, favButton, card);
    };
    card.innerHTML = `
        <img src="${spriteUrl}" alt="${pokemonName}" loading="lazy">
        <h3>${pokemonName}</h3>
        <p>${pokemonIdFormatted}</p>
    `;
    card.appendChild(favButton);
    card.addEventListener('click', () => displayPokemonModal(pokemonSummary.id));
    return card;
};

const sortPokemonData = (data, sortCriteria) => {
    const sortedData = [...data];
    switch (sortCriteria) {
        case 'id_asc': sortedData.sort((a, b) => a.id - b.id); break;
        case 'id_desc': sortedData.sort((a, b) => b.id - a.id); break;
        case 'name_asc': sortedData.sort((a, b) => a.name.localeCompare(b.name)); break;
        case 'name_desc': sortedData.sort((a, b) => b.name.localeCompare(a.name)); break;
    }
    return sortedData;
};

// --- MODIFIED: filterPokemonData to accept semantic keywords ---
const filterPokemonData = (data, filters, semanticKeywords = []) => {
    // Define thresholds (these are examples, adjust as you see fit)
    // Height is in decimetres (0.1 meters), Weight is in hectograms (0.1 kg)
    const SMALL_HEIGHT_THRESHOLD = 5;  // Less than 0.5 meters
    const LARGE_HEIGHT_THRESHOLD = 20; // More than 2 meters
    const LIGHT_WEIGHT_THRESHOLD = 100; // Less than 10 kg
    const HEAVY_WEIGHT_THRESHOLD = 1000;// More than 100 kg

    return data.filter(pokemon => {
        const nameMatch = pokemon.name.toLowerCase().includes(filters.searchTerm);
        const typeMatch = filters.selectedType === 'all' || (pokemon.types && pokemon.types.includes(filters.selectedType));
        const generationMatch = filters.selectedGeneration === 'all' || pokemon.generation === filters.selectedGeneration;

        let semanticMatch = true; // Assume true if no semantic keywords to check
        if (semanticKeywords.length > 0) {
            // Check if the Pokémon satisfies ALL semantic keywords provided by Gemini
            semanticMatch = semanticKeywords.every(keyword => {
                if (keyword === 'small' && pokemon.height !== undefined) {
                    return pokemon.height < SMALL_HEIGHT_THRESHOLD;
                } else if (keyword === 'large' && pokemon.height !== undefined) {
                    return pokemon.height > LARGE_HEIGHT_THRESHOLD;
                } else if (keyword === 'light' && pokemon.weight !== undefined) {
                    return pokemon.weight < LIGHT_WEIGHT_THRESHOLD;
                } else if (keyword === 'heavy' && pokemon.weight !== undefined) {
                    return pokemon.weight > HEAVY_WEIGHT_THRESHOLD;
                }
                // Add more specific keyword checks here if desired (e.g., colors, abilities if you add them to summary)
                else {
                    // Default keyword check: search in Pokémon name
                    return pokemon.name.toLowerCase().includes(keyword);
                }
            });
        }
        return nameMatch && typeMatch && generationMatch && semanticMatch;
    });
};

// --- MODIFIED: processAndDisplayPokemon to handle semantic keywords ---
let currentSemanticKeywords = []; // Add this to global state variables

const processAndDisplayPokemon = () => {
    // 1. Filter (Pass semantic keywords here)
    let processedData = filterPokemonData(allPokemonSummaryData, currentFilters, currentSemanticKeywords);
    // ... (rest of sort, paginate, render - remains the same) ...
    processedData = sortPokemonData(processedData, currentSort);
    totalPages = Math.max(1, Math.ceil(processedData.length / ITEMS_PER_PAGE));
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    currentlyDisplayedData = processedData.slice(startIndex, endIndex);
    displayPokemonGrid(currentlyDisplayedData);
    renderPaginationControls();
};


const displayPokemonGrid = (pokemonList) => {
    pokedexGrid.innerHTML = '';
    if (pokemonList.length === 0) {
        pokedexGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">No Pokémon match the current filters.</p>';
        paginationContainer.style.display = 'none';
        return;
    }
    pokemonList.forEach(pokemonData => {
        const card = createPokemonCard(pokemonData);
        pokedexGrid.appendChild(card);
    });
    paginationContainer.style.display = 'flex';
};

const renderPaginationControls = () => {
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages;
};

const handleSearchInput = (event) => {
    currentFilters.searchTerm = event.target.value.toLowerCase();
    currentPage = 1; processAndDisplayPokemon();
};
const handleTypeFilterClick = (event) => {
    const targetButton = event.target.closest('.type-filter-button');
    if (!targetButton) return;
    currentFilters.selectedType = targetButton.dataset.type;
    currentPage = 1;
    document.querySelectorAll('.type-filter-button').forEach(button => {
        button.classList.toggle('active', button.dataset.type === currentFilters.selectedType);
    });
    processAndDisplayPokemon();
};
const handleGenerationFilterClick = (event) => {
    const targetButton = event.target.closest('.generation-filter-button');
    if (!targetButton) return;
    currentFilters.selectedGeneration = targetButton.dataset.generation;
    currentPage = 1;
    document.querySelectorAll('.generation-filter-button').forEach(button => {
        button.classList.toggle('active', button.dataset.generation === currentFilters.selectedGeneration);
    });
    processAndDisplayPokemon();
};
const handleSortChange = (event) => {
    currentSort = event.target.value;
    currentPage = 1; processAndDisplayPokemon();
};

// --- ADDED: Semantic Search Button Handler ---
const handleSemanticSearch = async () => {
    const query = semanticSearchInput.value.trim();
    if (!query) {
        alert("Please enter a description for semantic search.");
        return;
    }

    const suggestions = await fetchSemanticSuggestions(query);
    // console.log("Applying suggestions:", suggestions); // For debugging

    // Reset simple search when semantic search is used, or combine them.
    // For simplicity, let's prioritize semantic results for now.
    currentFilters.searchTerm = ''; // Clear the basic search term
    searchInput.value = ''; // Clear the basic search input field

    currentSemanticKeywords = suggestions.keywords || []; // Store keywords for filtering

    // Apply extracted types (if any)
    // This is a simple take: uses the first valid type found.
    // You might want to allow multiple type selections or more sophisticated logic.
    let typeApplied = false;
    if (suggestions.types && suggestions.types.length > 0) {
        const validTypes = allPokemonSummaryData.flatMap(p => p.types); // Get all unique types from your data
        const firstValidSuggestedType = suggestions.types.find(st => validTypes.includes(st));

        if (firstValidSuggestedType) {
            currentFilters.selectedType = firstValidSuggestedType;
            // Update UI for type filter buttons
            document.querySelectorAll('.type-filter-button').forEach(button => {
                button.classList.toggle('active', button.dataset.type === firstValidSuggestedType);
            });
            typeApplied = true;
        }
    }
    // If no types suggested or applied from Gemini, reset to 'all' if you want, or keep current
    if (!typeApplied) {
        // currentFilters.selectedType = 'all';
        // document.querySelectorAll('.type-filter-button').forEach(button => {
        //     button.classList.toggle('active', button.dataset.type === 'all');
        // });
    }


    currentPage = 1; // Reset to first page
    processAndDisplayPokemon();
};

const goToPrevPage = () => { if (currentPage > 1) { currentPage--; processAndDisplayPokemon(); }};
const goToNextPage = () => { if (currentPage < totalPages) { currentPage++; processAndDisplayPokemon(); }};

const resetModal = () => {
    modalPokemonName.textContent = 'Loading...'; modalPokemonNumber.textContent = '#????';
    modalPokemonSprite.src = ''; modalPokemonSprite.alt = 'Loading sprite';
    modalPokemonTypes.innerHTML = ''; modalPokemonHeight.textContent = 'N/A'; modalPokemonWeight.textContent = 'N/A';
    modalPokemonDescription.textContent = 'Loading description...'; modalPokemonStats.innerHTML = '';
    evolutionContainer.innerHTML = '<p id="evolution-loading" style="text-align:center; color:#888;">Loading evolution...</p>';
    typeEffectivenessContainer.innerHTML = '<p id="effectiveness-loading" style="text-align:center; color:#888;">Calculating effectiveness...</p>';
    shinyToggleButton.classList.remove('active'); shinyToggleButton.style.display = 'none'; shinyToggleButton.onclick = null;
    favoriteToggleButtonModal.classList.remove('active'); favoriteToggleButtonModal.textContent = '☆'; favoriteToggleButtonModal.onclick = null;
};

const calculateTypeEffectiveness = async (pokemonTypeNames) => {
    const effectiveness = { weak: new Set(), resistant: new Set(), immune: new Set() };
    const allDamageRelations = await Promise.all(pokemonTypeNames.map(name => fetchTypeData(name)));
    const allGameTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
    allGameTypes.forEach(attackingType => {
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

const displayTypeEffectiveness = (effectivenessData) => {
    typeEffectivenessContainer.innerHTML = '';
    const createList = (types, title) => {
        if (types.size === 0) return;
        const section = document.createElement('div'); section.classList.add('effectiveness-section');
        const heading = document.createElement('h4'); heading.textContent = title;
        const list = document.createElement('ul'); list.classList.add('type-effectiveness-list');
        types.forEach(typeName => {
            const li = document.createElement('li'); const badge = document.createElement('span');
            badge.classList.add('type-badge', `type-${typeName}`); badge.textContent = typeName;
            li.appendChild(badge); list.appendChild(li);
        });
        section.appendChild(heading); section.appendChild(list); typeEffectivenessContainer.appendChild(section);
    };
    createList(effectivenessData.weak, 'Weak Against (x2/x4)');
    createList(effectivenessData.resistant, 'Resistant To (x0.5/x0.25)');
    createList(effectivenessData.immune, 'Immune To (x0)');
    if (typeEffectivenessContainer.innerHTML === '') {
        typeEffectivenessContainer.innerHTML = '<p style="text-align:center; color:#666;">Normal effectiveness against all types.</p>';
    }
};

const displayEvolutionChain = async (chainDataFromApi) => {
    evolutionContainer.innerHTML = ''; let currentStage = chainDataFromApi; let stageCount = 0;
    while (currentStage) {
        stageCount++; const speciesName = currentStage.species.name;
        if (stageCount > 1) { const arrow = document.createElement('div'); arrow.classList.add('evolution-arrow'); arrow.innerHTML = '→'; evolutionContainer.appendChild(arrow); }
        const stagePokemonData = await fetchDetailPokemonData(speciesName);
        const spriteUrl = stagePokemonData?.sprites?.front_default || 'placeholder.png';
        const stageDiv = document.createElement('div'); stageDiv.classList.add('evolution-stage');
        stageDiv.onclick = () => {
             const currentModalPokemonData = detailPokemonCache[`${POKEAPI_POKEMON_URL}${modalPokemonName.textContent.toLowerCase()}`];
             if (stagePokemonData && currentModalPokemonData && stagePokemonData.id !== currentModalPokemonData.id) {
                 hideModal(); displayPokemonModal(stagePokemonData.id);
             }
        };
        stageDiv.innerHTML = `<img src="${spriteUrl}" alt="${speciesName}" loading="lazy"><span>${speciesName}</span>`;
        evolutionContainer.appendChild(stageDiv);
        currentStage = currentStage.evolves_to.length > 0 ? currentStage.evolves_to[0] : null;
    }
    if (stageCount === 0) evolutionContainer.innerHTML = '<p style="text-align:center; color:#888;">No evolution data found.</p>';
};

const displayPokemonModal = async (pokemonIdentifier) => {
    resetModal();
    modal.style.display = 'flex';
    const pokemonData = await fetchDetailPokemonData(pokemonIdentifier);
    if (!pokemonData) {
        modalPokemonName.textContent = 'Error';
        modalPokemonDescription.textContent = `Could not load data for ${pokemonIdentifier}.`;
        return;
    }
    const speciesDataPromise = fetchSpeciesData(pokemonData.id);
    modalPokemonName.textContent = pokemonData.name;
    modalPokemonNumber.textContent = formatPokemonId(pokemonData.id);
    const defaultSprite = pokemonData.sprites?.front_default || 'placeholder.png';
    const shinySprite = pokemonData.sprites?.front_shiny;
    modalPokemonSprite.src = defaultSprite;
    modalPokemonSprite.alt = pokemonData.name;
    modalPokemonHeight.textContent = `${pokemonData.height / 10} m`;
    modalPokemonWeight.textContent = `${pokemonData.weight / 10} kg`;
    let isShiny = false;
    if (shinySprite) {
        shinyToggleButton.style.display = 'inline-block';
        shinyToggleButton.onclick = () => {
            isShiny = !isShiny;
            modalPokemonSprite.src = isShiny ? shinySprite : defaultSprite;
            shinyToggleButton.classList.toggle('active', isShiny);
        };
    } else {
         shinyToggleButton.style.display = 'none';
    }
    const pokemonId = pokemonData.id;
    const isCurrentlyFavorite = isFavorite(pokemonId);
    favoriteToggleButtonModal.classList.toggle('active', isCurrentlyFavorite);
    favoriteToggleButtonModal.textContent = isCurrentlyFavorite ? '★' : '☆';
    favoriteToggleButtonModal.title = isCurrentlyFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    favoriteToggleButtonModal.onclick = () => {
        const cardElement = pokedexGrid.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
        toggleFavorite(pokemonId, favoriteToggleButtonModal, cardElement);
    };
    modalPokemonTypes.innerHTML = '';
    pokemonData.types.forEach(typeInfo => {
        const typeSpan = document.createElement('span');
        typeSpan.classList.add('type-badge', `type-${typeInfo.type.name}`);
        typeSpan.textContent = typeInfo.type.name;
        modalPokemonTypes.appendChild(typeSpan);
    });
    modalPokemonStats.innerHTML = '';
    const maxStatValue = 255;
    pokemonData.stats.forEach(statInfo => {
        const statRow = document.createElement('div');
        statRow.classList.add('stat-row', `stat-${statInfo.stat.name.replace('special-', 'sp-')}`);
        const statValue = statInfo.base_stat;
        const statPercentage = (statValue / maxStatValue) * 100;
        statRow.innerHTML = `<div class="stat-label">${statInfo.stat.name.replace('special-', 'Sp. ').replace('-', ' ')}</div> <div class="stat-bar-container"><div class="stat-bar" style="width: ${statPercentage}%;"></div><span class="stat-value-tooltip">${statValue}</span></div>`;
        modalPokemonStats.appendChild(statRow);
    });
    const speciesData = await speciesDataPromise;
    let description = "No description available.";
    if (speciesData?.flavor_text_entries) {
        const preferredVersions = ['sword', 'shield', 'scarlet', 'violet', 'ultra-sun', 'ultra-moon', 'sun', 'moon', 'omega-ruby', 'alpha-sapphire', 'x', 'y'];
        let englishEntry = null;
        for (const version of preferredVersions) {
            englishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en' && entry.version.name === version);
            if (englishEntry) break;
        }
        if (!englishEntry) {
             englishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
        }
        if (englishEntry) description = englishEntry.flavor_text.replace(/[\n\f\r]/g, ' ');
    }
    modalPokemonDescription.textContent = description;
    if (speciesData?.evolution_chain?.url) {
        try {
            const chainId = speciesData.evolution_chain.url.split('/').filter(Boolean).pop();
            const evolutionData = await fetchEvolutionChain(chainId);
            if (evolutionData) await displayEvolutionChain(evolutionData.chain);
            else evolutionContainer.innerHTML = '<p style="text-align:center; color:#888;">Could not load evolution data.</p>';
        } catch (error) { console.error("Error fetching/processing evolution chain:", error); evolutionContainer.innerHTML = '<p style="text-align:center; color:#888;">Error loading evolution.</p>'; }
    } else { evolutionContainer.innerHTML = '<p style="text-align:center; color:#888;">No evolution data found.</p>'; }
    try {
        const typeNamesForEffectiveness = pokemonData.types.map(t => t.type.name);
        const effectivenessData = await calculateTypeEffectiveness(typeNamesForEffectiveness);
        displayTypeEffectiveness(effectivenessData);
    } catch (error) { console.error("Error calculating/displaying type effectiveness:", error); typeEffectivenessContainer.innerHTML = '<p style="text-align:center; color:#888;">Error calculating effectiveness.</p>';}
};

const hideModal = () => {
    modal.style.display = 'none';
};

function romanToNum(romanUpper) {
    if (!romanUpper) return 0;
    const roman = romanUpper.toUpperCase();
    const map = { 'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000 };
    let num = 0;
    for (let i = 0; i < roman.length; i++) {
        const curr = map[roman[i]];
        const next = map[roman[i + 1]];
        if (curr === undefined) return NaN; // Not a valid Roman numeral character
        if (next !== undefined && curr < next) {
            num -= curr;
        } else {
            num += curr;
        }
    }
    return num;
}

// === Initialization ===
const initializePokedex = async () => {
    currentSemanticKeywords = []; // <<< ADD THIS LINE HERE to reset semantic keywords

    loadFavorites();
    loadingMessage.textContent = 'Loading Pokémon Data...';
    loadingMessage.style.display = 'block';
    pokedexGrid.innerHTML = '';
    try {
        const response = await fetch(ALL_POKEMON_DATA_URL);
        if (!response.ok) throw new Error(`Failed to load ${ALL_POKEMON_DATA_URL}: ${response.statusText}. Make sure the file exists in the 'data' folder.`);
        allPokemonSummaryData = await response.json();
        if (!allPokemonSummaryData || allPokemonSummaryData.length === 0) {
             throw new Error("No Pokémon data found in summary file or file is empty.");
        }
        const allTypesFound = new Set();
        allPokemonSummaryData.forEach(p => p.types.forEach(t => allTypesFound.add(t)));
        typeFilterContainer.innerHTML = '<button class="type-filter-button active" data-type="all">All Types</button>';
        Array.from(allTypesFound).sort().forEach(type => {
             const button = document.createElement('button');
             button.classList.add('type-filter-button', `type-${type}`);
             button.dataset.type = type; button.textContent = type;
             typeFilterContainer.appendChild(button);
        });
        const allGenerationsFound = new Set();
        allPokemonSummaryData.forEach(p => allGenerationsFound.add(p.generation));
        generationFilterContainer.innerHTML = '<button class="generation-filter-button active" data-generation="all">All Gens</button>';
        Array.from(allGenerationsFound).sort((a,b) => {
            const numA = romanToNum(a.split('-')[1]);
            const numB = romanToNum(b.split('-')[1]);
            return numA - numB;
        }).forEach(gen => {
             const button = document.createElement('button');
             button.classList.add('generation-filter-button');
             button.dataset.generation = gen;
             const genParts = gen.split('-');
             const genDisplay = genParts.length > 1 ? `Gen ${genParts[1].toUpperCase()}` : gen;
             button.textContent = genDisplay;
             generationFilterContainer.appendChild(button);
        });
        loadingMessage.style.display = 'none';
        processAndDisplayPokemon();
    } catch (error) {
        loadingMessage.textContent = `Error initializing Pokédex: ${error.message}. Please ensure 'data/all_pokemon_summary.json' exists in the correct location and is valid. You might need to generate it first.`;
        console.error("Initialization Error:", error);
    }
};


// === Event Listeners ===
searchInput.addEventListener('input', handleSearchInput);
typeFilterContainer.addEventListener('click', handleTypeFilterClick);
generationFilterContainer.addEventListener('click', handleGenerationFilterClick);
sortSelect.addEventListener('change', handleSortChange);
prevPageButton.addEventListener('click', goToPrevPage);
nextPageButton.addEventListener('click', goToNextPage);
closeModalButton.addEventListener('click', hideModal);
window.addEventListener('click', (event) => { if (event.target === modal) hideModal(); });
window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.style.display === 'flex') hideModal(); });

semanticSearchButton.addEventListener('click', handleSemanticSearch); // New
semanticSearchInput.addEventListener('keypress', (event) => { // Optional: allow Enter key
    if (event.key === 'Enter') {
        handleSemanticSearch();
    }
});

// Initialize
initializePokedex();