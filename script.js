// === DOM Elements (add new ones) ===
const pokedexGrid = document.getElementById('pokedex-grid');
const loadingMessage = document.getElementById('loading-message');
const searchInput = document.getElementById('search-input');
const typeFilterContainer = document.getElementById('type-filter-container'); // Type filter buttons container
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
const favoriteToggleButtonModal = document.getElementById('favorite-toggle'); // Favorite button in modal
const evolutionContainer = document.getElementById('modal-evolution-chain');
const evolutionLoading = document.getElementById('evolution-loading');
const typeEffectivenessContainer = document.getElementById('modal-type-effectiveness'); // Type effectiveness container
const effectivenessLoading = document.getElementById('effectiveness-loading'); // Loading text for effectiveness

const POKEMON_COUNT = 151;
const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon/';
const POKEAPI_SPECIES_URL = 'https://pokeapi.co/api/v2/pokemon-species/';
const POKEAPI_EVOLUTION_URL = 'https://pokeapi.co/api/v2/evolution-chain/';
const POKEAPI_TYPE_URL = 'https://pokeapi.co/api/v2/type/';

// === Caches ===
const pokemonCache = {};
const speciesCache = {};
const evolutionCache = {};
const typeDataCache = {}; // Cache for fetched type data

// === State Variables ===
let allPokemonData = []; // Store fetched data for all Pokemon for filtering
let currentFilters = {
    searchTerm: '',
    selectedType: 'all' // 'all' or a specific type name
};
let favorites = []; // Array to hold favorite Pokémon IDs

// === Helper Functions ===
const formatPokemonId = (id) => `#${String(id).padStart(3, '0')}`;

// Generic fetch function with caching
const fetchData = async (url, cache) => {
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

// Specific fetch functions using the generic one
const fetchPokemonData = (idOrName) => fetchData(`${POKEAPI_URL}${String(idOrName).toLowerCase()}`, pokemonCache);
const fetchSpeciesData = (idOrName) => fetchData(`${POKEAPI_SPECIES_URL}${String(idOrName).toLowerCase()}`, speciesCache);
const fetchEvolutionChain = (chainId) => chainId ? fetchData(`${POKEAPI_EVOLUTION_URL}${chainId}`, evolutionCache) : null;
const fetchTypeData = (typeName) => fetchData(`${POKEAPI_TYPE_URL}${typeName}`, typeDataCache);


// --- Favorites Management ---
const loadFavorites = () => {
    const favs = localStorage.getItem('kantoFavorites');
    favorites = favs ? JSON.parse(favs) : [];
};

const saveFavorites = () => {
    localStorage.setItem('kantoFavorites', JSON.stringify(favorites));
};

const isFavorite = (pokemonId) => {
    return favorites.includes(parseInt(pokemonId)); // Ensure ID is number for comparison
};

const addFavorite = (pokemonId) => {
    const id = parseInt(pokemonId);
    if (!isFavorite(id)) {
        favorites.push(id);
        saveFavorites();
    }
};

const removeFavorite = (pokemonId) => {
    const id = parseInt(pokemonId);
    favorites = favorites.filter(favId => favId !== id);
    saveFavorites();
};

const toggleFavorite = (pokemonId, buttonElement, cardElement = null) => {
     const id = parseInt(pokemonId);
     if (isFavorite(id)) {
         removeFavorite(id);
         buttonElement.classList.remove('active');
         buttonElement.textContent = '☆'; // Outline star
         buttonElement.title = 'Add to Favorites';
         cardElement?.classList.remove('favorite-card'); // Update card style if provided
     } else {
         addFavorite(id);
         buttonElement.classList.add('active');
         buttonElement.textContent = '★'; // Filled star
         buttonElement.title = 'Remove from Favorites';
         cardElement?.classList.add('favorite-card'); // Update card style if provided
     }
 };


// --- UI Functions ---

// Create a Pokemon card element
const createPokemonCard = (pokemonData) => {
    const card = document.createElement('div');
    card.classList.add('pokemon-card');
    // Add favorite class immediately if it's a favorite on load
    if (isFavorite(pokemonData.id)) {
        card.classList.add('favorite-card'); // Add a class for potential styling
    }
    card.dataset.pokemonId = pokemonData.id;
    card.dataset.pokemonName = pokemonData.name;
    // Store types directly on the card for filtering
    card.dataset.pokemonTypes = JSON.stringify(pokemonData.types.map(t => t.type.name));

    const spriteUrl = pokemonData.sprites?.front_default || 'placeholder.png';
    const pokemonName = pokemonData.name;
    const pokemonIdFormatted = formatPokemonId(pokemonData.id);

    // Add favorite button to card
    const favButton = document.createElement('button');
    favButton.classList.add('favorite-button');
    favButton.title = isFavorite(pokemonData.id) ? 'Remove from Favorites' : 'Add to Favorites';
    favButton.textContent = isFavorite(pokemonData.id) ? '★' : '☆';
    if (isFavorite(pokemonData.id)) favButton.classList.add('active');
    favButton.onclick = (event) => {
        event.stopPropagation(); // Prevent modal opening when clicking favorite star
        toggleFavorite(pokemonData.id, favButton, card);
    };

    card.innerHTML = `
        <img src="${spriteUrl}" alt="${pokemonName}" loading="lazy">
        <h3>${pokemonName}</h3>
        <p>${pokemonIdFormatted}</p>
    `;
    card.appendChild(favButton); // Append the button

    card.addEventListener('click', () => displayPokemonModal(pokemonData.id));
    return card;
};

// Apply current filters (search term and type) to the grid
const applyFilters = () => {
    const searchTerm = currentFilters.searchTerm;
    const selectedType = currentFilters.selectedType;

    allPokemonData.forEach(pokemonData => {
        const card = pokedexGrid.querySelector(`.pokemon-card[data-pokemon-id="${pokemonData.id}"]`);
        if (!card) return; // Skip if card not found

        const nameMatch = pokemonData.name.includes(searchTerm);
        const pokemonTypes = pokemonData.types.map(t => t.type.name);
        const typeMatch = selectedType === 'all' || pokemonTypes.includes(selectedType);

        if (nameMatch && typeMatch) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
};

// Event handler for search input
const handleSearchInput = (event) => {
    currentFilters.searchTerm = event.target.value.toLowerCase();
    applyFilters();
};

// Event handler for type filter buttons
const handleTypeFilterClick = (event) => {
    const targetButton = event.target.closest('.type-filter-button');
    if (!targetButton) return; // Ignore clicks not on a button

    const selectedType = targetButton.dataset.type;
    currentFilters.selectedType = selectedType;

    // Update button active states
    document.querySelectorAll('.type-filter-button').forEach(button => {
        button.classList.toggle('active', button.dataset.type === selectedType);
    });

    applyFilters();
};

// Reset and clear modal content before loading new data
const resetModal = () => {
    modalPokemonName.textContent = 'Loading...';
    modalPokemonNumber.textContent = '#???';
    modalPokemonSprite.src = '';
    modalPokemonSprite.alt = 'Loading sprite';
    modalPokemonTypes.innerHTML = '';
    modalPokemonHeight.textContent = 'N/A';
    modalPokemonWeight.textContent = 'N/A';
    modalPokemonDescription.textContent = 'Loading description...';
    modalPokemonStats.innerHTML = '';
    evolutionContainer.innerHTML = '<p id="evolution-loading">Loading evolution...</p>';
    typeEffectivenessContainer.innerHTML = '<p id="effectiveness-loading">Calculating effectiveness...</p>';
    shinyToggleButton.classList.remove('active');
    shinyToggleButton.style.display = 'none'; // Hide until checked
    shinyToggleButton.onclick = null;
    favoriteToggleButtonModal.classList.remove('active'); // Reset favorite button style
    favoriteToggleButtonModal.textContent = '☆';
    favoriteToggleButtonModal.onclick = null; // Remove old handler
};


// --- Type Effectiveness Calculation ---
const calculateTypeEffectiveness = async (pokemonTypes) => {
    const typeNames = pokemonTypes.map(t => t.type.name);
    const effectiveness = {
        weak: new Set(),      // x2 or x4
        resistant: new Set(), // x0.5 or x0.25
        immune: new Set()       // x0
    };

    const allDamageRelations = await Promise.all(typeNames.map(name => fetchTypeData(name)));

    const allTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"]; // Gen 1 relevant + futureproofing

    allTypes.forEach(attackingType => {
        let multiplier = 1;
        allDamageRelations.forEach(typeData => {
            if (!typeData) return; // Skip if type data failed to load
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

// Display Type Effectiveness in the Modal
const displayTypeEffectiveness = (effectivenessData) => {
    typeEffectivenessContainer.innerHTML = ''; // Clear loading message

    const createList = (types, title) => {
        if (types.size === 0) return; // Don't show section if no types

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

    createList(effectivenessData.weak, 'Weak Against (x2 or x4)');
    createList(effectivenessData.resistant, 'Resistant To (x0.5 or x0.25)');
    createList(effectivenessData.immune, 'Immune To (x0)');

    if (typeEffectivenessContainer.innerHTML === '') {
         typeEffectivenessContainer.innerHTML = '<p>Normal effectiveness against all types.</p>';
    }
};

// --- Modal Display Logic (Updated) ---
const displayPokemonModal = async (id) => {
    resetModal();
    modal.style.display = 'flex';

    const pokemonData = await fetchPokemonData(id); // Ensure we have the main data first
    if (!pokemonData) {
        modalPokemonName.textContent = 'Error';
        modalPokemonDescription.textContent = 'Could not load Pokémon data.';
        return;
    }

    // Fetch species data concurrently while updating basic info
    const speciesDataPromise = fetchSpeciesData(id);

    // --- Update basic info & Setup Buttons ---
    modalPokemonName.textContent = pokemonData.name;
    modalPokemonNumber.textContent = formatPokemonId(pokemonData.id);
    const defaultSprite = pokemonData.sprites?.front_default || 'placeholder.png';
    const shinySprite = pokemonData.sprites?.front_shiny;
    modalPokemonSprite.src = defaultSprite;
    modalPokemonSprite.alt = pokemonData.name;
    modalPokemonHeight.textContent = `${pokemonData.height / 10} m`;
    modalPokemonWeight.textContent = `${pokemonData.weight / 10} kg`;

    // Shiny Toggle Setup
    let isShiny = false;
    if (shinySprite) {
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
    favoriteToggleButtonModal.classList.toggle('active', isCurrentlyFavorite);
    favoriteToggleButtonModal.textContent = isCurrentlyFavorite ? '★' : '☆';
    favoriteToggleButtonModal.title = isCurrentlyFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    favoriteToggleButtonModal.onclick = () => {
        // Find the corresponding card in the grid to update its star too
        const cardElement = pokedexGrid.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
        const cardFavButton = cardElement?.querySelector('.favorite-button');
        toggleFavorite(pokemonId, favoriteToggleButtonModal); // Update modal button
        if(cardFavButton) toggleFavorite(pokemonId, cardFavButton, cardElement); // Update card button & style
    };


    // --- Update types ---
    modalPokemonTypes.innerHTML = '';
    pokemonData.types.forEach(typeInfo => {
        const typeSpan = document.createElement('span');
        typeSpan.classList.add('type-badge', `type-${typeInfo.type.name}`);
        typeSpan.textContent = typeInfo.type.name;
        modalPokemonTypes.appendChild(typeSpan);
    });

    // --- Update stats ---
    modalPokemonStats.innerHTML = '';
    const maxStatValue = 200;
    pokemonData.stats.forEach(statInfo => {
         // ... (stat bar generation code - unchanged) ...
        const statRow = document.createElement('div');
        statRow.classList.add('stat-row', `stat-${statInfo.stat.name.replace('special-', 'sp-')}`);
        const statValue = statInfo.base_stat;
        const statPercentage = Math.min(100, (statValue / maxStatValue) * 100);
        statRow.innerHTML = `
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
    let description = "No description available.";
    if (speciesData?.flavor_text_entries) {
        const englishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
        if (englishEntry) description = englishEntry.flavor_text.replace(/[\n\f\r]/g, ' ');
    }
    modalPokemonDescription.textContent = description;

    // Fetch and Display Evolution Chain
    if (speciesData?.evolution_chain?.url) {
        try {
            const chainId = speciesData.evolution_chain.url.split('/').filter(Boolean).pop();
            const evolutionData = await fetchEvolutionChain(chainId);
            if(evolutionData) await displayEvolutionChain(evolutionData.chain); // Make sure displayEvolutionChain is async if it fetches data
            else evolutionContainer.innerHTML = '<p>Could not load evolution data.</p>';
        } catch (error) {
            console.error("Error fetching/processing evolution chain:", error);
            evolutionContainer.innerHTML = '<p>Could not load evolution data.</p>';
        }
    } else {
        evolutionContainer.innerHTML = '<p>No evolution data found.</p>';
    }

     // Calculate and Display Type Effectiveness
     try {
         const effectivenessData = await calculateTypeEffectiveness(pokemonData.types);
         displayTypeEffectiveness(effectivenessData);
     } catch (error) {
         console.error("Error calculating/displaying type effectiveness:", error);
         typeEffectivenessContainer.innerHTML = '<p>Could not calculate effectiveness.</p>';
     }
};

// Recursive parse and display the evolution chain (needs to be async now)
const displayEvolutionChain = async (chainData) => {
    evolutionContainer.innerHTML = ''; // Clear loading/previous chain
    let currentStage = chainData;
    let stageCount = 0;

    while (currentStage) {
        stageCount++;
        const speciesName = currentStage.species.name;

        if (stageCount > 1) {
            const arrow = document.createElement('div');
            arrow.classList.add('evolution-arrow');
            arrow.innerHTML = '→';
            evolutionContainer.appendChild(arrow);
        }

        // Fetch data for the sprite (use await)
        const stagePokemonData = await fetchPokemonData(speciesName); // Await fetch
        const spriteUrl = stagePokemonData?.sprites?.front_default || 'placeholder.png';

        const stageDiv = document.createElement('div');
        stageDiv.classList.add('evolution-stage');
        stageDiv.onclick = () => {
            // NOTE: Potential infinite loop if clicking same pokemon in chain - consider disabling click for current pokemon
            const currentModalPokemonId = parseInt(modalPokemonNumber.textContent.substring(1));
            if (stagePokemonData && stagePokemonData.id !== currentModalPokemonId) {
                 hideModal();
                 displayPokemonModal(stagePokemonData.id);
            }
        };
        stageDiv.innerHTML = `
            <img src="${spriteUrl}" alt="${speciesName}" loading="lazy">
            <span>${speciesName}</span>
        `;
        evolutionContainer.appendChild(stageDiv);

        if (currentStage.evolves_to.length > 0) {
             currentStage = currentStage.evolves_to[0];
        } else {
            currentStage = null;
        }
    }
    if (stageCount === 0) evolutionContainer.innerHTML = '<p>No evolution data found.</p>';
};

// Hide the modal
const hideModal = () => {
    modal.style.display = 'none';
};

// --- Event Listeners ---
searchInput.addEventListener('input', handleSearchInput);
typeFilterContainer.addEventListener('click', handleTypeFilterClick); // Add listener for type filters
closeModalButton.addEventListener('click', hideModal);
window.addEventListener('click', (event) => { if (event.target === modal) hideModal(); });
window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.style.display === 'flex') hideModal(); });


// --- Initialization ---
const initializePokedex = async () => {
    loadFavorites(); // Load favorites from localStorage first
    loadingMessage.style.display = 'block';
    pokedexGrid.innerHTML = ''; // Clear grid initially

    try {
        const pokemonPromises = [];
        for (let i = 1; i <= POKEMON_COUNT; i++) {
            pokemonPromises.push(fetchPokemonData(i)); // Fetch basic data for all
        }
        allPokemonData = (await Promise.all(pokemonPromises)).filter(Boolean); // Store fetched data, remove nulls

        if (allPokemonData.length === 0 && POKEMON_COUNT > 0) {
             throw new Error("Failed to fetch any Pokémon data.");
        }

        // Populate Type Filters (simple hardcoded for Gen 1)
        const kantoTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon"];
        kantoTypes.forEach(type => {
             const button = document.createElement('button');
             button.classList.add('type-filter-button', `type-${type}`);
             button.dataset.type = type;
             button.textContent = type;
             typeFilterContainer.appendChild(button);
        });

        // Create and display cards
        allPokemonData.forEach(pokemonData => {
            const card = createPokemonCard(pokemonData);
            pokedexGrid.appendChild(card);
        });

        loadingMessage.style.display = 'none'; // Hide loading message

    } catch (error) {
        loadingMessage.textContent = `Error initializing Pokédex: ${error.message}`;
        console.error("Initialization Error:", error);
    }
};

// Initialize the Pokedex on page load
initializePokedex();