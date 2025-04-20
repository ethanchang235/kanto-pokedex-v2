// DOM Elements
const pokedexGrid = document.getElementById('pokedex-grid');
const loadingMessage = document.getElementById('loading-message');
const searchInput = document.getElementById('search-input'); // Search input
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
const shinyToggleButton = document.getElementById('shiny-toggle'); // Shiny toggle button
const evolutionContainer = document.getElementById('modal-evolution-chain'); // Evolution chain container
const evolutionLoading = document.getElementById('evolution-loading'); // Loading text for evolution

const POKEMON_COUNT = 151; // Kanto Region
const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon/';
const POKEAPI_SPECIES_URL = 'https://pokeapi.co/api/v2/pokemon-species/';
const POKEAPI_EVOLUTION_URL = 'https://pokeapi.co/api/v2/evolution-chain/';

// Store fetched data to avoid repeated API calls
const pokemonCache = {};
const speciesCache = {};
const evolutionCache = {};

// Store references to all pokemon card elements for filtering
let allPokemonCards = [];

// --- Helper Functions ---

// Format Pokemon ID with leading zeros
const formatPokemonId = (id) => {
    return `#${String(id).padStart(3, '0')}`;
};

// Fetch basic data for a single Pokemon
const fetchPokemonData = async (idOrName) => {
    const identifier = String(idOrName).toLowerCase();
    if (pokemonCache[identifier]) {
        return pokemonCache[identifier];
    }
    try {
        const response = await fetch(`${POKEAPI_URL}${identifier}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        pokemonCache[identifier] = data; // Cache by id
        pokemonCache[data.name] = data; // Cache by name too
        return data;
    } catch (error) {
        console.error(`Could not fetch Pokemon data for ${identifier}:`, error);
        return null;
    }
};

// Fetch species data
const fetchSpeciesData = async (idOrName) => {
    const identifier = String(idOrName).toLowerCase();
    if (speciesCache[identifier]) {
        return speciesCache[identifier];
    }
    try {
        const response = await fetch(`${POKEAPI_SPECIES_URL}${identifier}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        speciesCache[identifier] = data; // Cache by id/name used
        speciesCache[data.id] = data;   // Cache by actual ID
        speciesCache[data.name] = data; // Cache by actual name
        return data;
    } catch (error) {
        console.error(`Could not fetch species data for ${identifier}:`, error);
        return null;
    }
};

// Fetch evolution chain data
const fetchEvolutionChain = async (chainId) => {
    if (evolutionCache[chainId]) {
        return evolutionCache[chainId];
    }
     if (!chainId) {
        console.error("No evolution chain ID provided.");
        return null;
    }
    try {
        const response = await fetch(`${POKEAPI_EVOLUTION_URL}${chainId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        evolutionCache[chainId] = data;
        return data;
    } catch (error) {
        console.error(`Could not fetch evolution chain ${chainId}:`, error);
        return null;
    }
};


// --- UI Functions ---

// Create a Pokemon card element
const createPokemonCard = (pokemonData) => {
    const card = document.createElement('div');
    card.classList.add('pokemon-card');
    card.dataset.pokemonId = pokemonData.id;
    card.dataset.pokemonName = pokemonData.name; // Store name for searching

    const spriteUrl = pokemonData.sprites?.front_default || 'placeholder.png';
    const pokemonName = pokemonData.name;
    const pokemonIdFormatted = formatPokemonId(pokemonData.id);

    card.innerHTML = `
        <img src="${spriteUrl}" alt="${pokemonName}" loading="lazy"> <!-- Added lazy loading -->
        <h3>${pokemonName}</h3>
        <p>${pokemonIdFormatted}</p>
    `;

    card.addEventListener('click', () => displayPokemonModal(pokemonData.id));
    return card;
};

// Filter displayed Pokemon based on search input
const filterPokemon = () => {
    const searchTerm = searchInput.value.toLowerCase();
    allPokemonCards.forEach(card => {
        const pokemonName = card.dataset.pokemonName;
        if (pokemonName.includes(searchTerm)) {
            card.style.display = 'block'; // Show matching cards
        } else {
            card.style.display = 'none'; // Hide non-matching cards
        }
    });
};

// Reset and clear modal content before loading new data
const resetModal = () => {
    modalPokemonName.textContent = 'Loading...';
    modalPokemonNumber.textContent = '#???';
    modalPokemonSprite.src = ''; // Or a placeholder loading image
    modalPokemonSprite.alt = 'Loading sprite';
    modalPokemonTypes.innerHTML = '';
    modalPokemonHeight.textContent = 'N/A';
    modalPokemonWeight.textContent = 'N/A';
    modalPokemonDescription.textContent = 'Loading description...';
    modalPokemonStats.innerHTML = '';
    evolutionContainer.innerHTML = '<p id="evolution-loading">Loading evolution...</p>'; // Reset evolution section
    shinyToggleButton.classList.remove('active'); // Ensure shiny toggle is off
    shinyToggleButton.onclick = null; // Remove previous click handler
};

// Populate and display the modal
const displayPokemonModal = async (id) => {
    resetModal(); // Clear previous data first
    modal.style.display = 'flex'; // Show modal immediately

    // --- Fetch required data concurrently ---
    const pokemonDataPromise = fetchPokemonData(id);
    const speciesDataPromise = fetchSpeciesData(id);
    const [pokemonData, speciesData] = await Promise.all([pokemonDataPromise, speciesDataPromise]);

    if (!pokemonData) {
        modalPokemonName.textContent = 'Error';
        modalPokemonDescription.textContent = 'Could not load Pokémon data.';
        return; // Exit if primary data fails
    }

    // --- Update basic info ---
    modalPokemonName.textContent = pokemonData.name;
    modalPokemonNumber.textContent = formatPokemonId(pokemonData.id);
    const defaultSprite = pokemonData.sprites?.front_default || 'placeholder.png';
    const shinySprite = pokemonData.sprites?.front_shiny;
    modalPokemonSprite.src = defaultSprite;
    modalPokemonSprite.alt = pokemonData.name;
    modalPokemonHeight.textContent = `${pokemonData.height / 10} m`;
    modalPokemonWeight.textContent = `${pokemonData.weight / 10} kg`;

    // --- Shiny Toggle Logic ---
    let isShiny = false;
    if (shinySprite) { // Only enable toggle if shiny sprite exists
        shinyToggleButton.style.display = 'inline-block'; // Show the button
        shinyToggleButton.onclick = () => {
            isShiny = !isShiny;
            modalPokemonSprite.src = isShiny ? shinySprite : defaultSprite;
            shinyToggleButton.classList.toggle('active', isShiny);
        };
    } else {
        shinyToggleButton.style.display = 'none'; // Hide button if no shiny
    }


    // --- Update types ---
    modalPokemonTypes.innerHTML = '';
    pokemonData.types.forEach(typeInfo => {
        const typeSpan = document.createElement('span');
        typeSpan.classList.add('type-badge', `type-${typeInfo.type.name}`);
        typeSpan.textContent = typeInfo.type.name;
        modalPokemonTypes.appendChild(typeSpan);
    });

    // --- Update description ---
    let description = "No description available.";
    if (speciesData && speciesData.flavor_text_entries) {
        const englishEntry = speciesData.flavor_text_entries.find(
            entry => entry.language.name === 'en'
        );
        if (englishEntry) {
            description = englishEntry.flavor_text.replace(/[\n\f\r]/g, ' '); // Clean up text
        }
    }
    modalPokemonDescription.textContent = description;

    // --- Update stats ---
    modalPokemonStats.innerHTML = '';
    const maxStatValue = 200; // Visual scaling reference
    pokemonData.stats.forEach(statInfo => {
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

    // --- Fetch and Display Evolution Chain ---
    if (speciesData && speciesData.evolution_chain?.url) {
        try {
            const chainId = speciesData.evolution_chain.url.split('/').filter(Boolean).pop(); // Extract ID from URL
            const evolutionData = await fetchEvolutionChain(chainId);
            displayEvolutionChain(evolutionData.chain);
        } catch (error) {
            console.error("Error fetching/processing evolution chain:", error);
            evolutionContainer.innerHTML = '<p>Could not load evolution data.</p>';
        }
    } else {
        evolutionContainer.innerHTML = '<p>No evolution data found.</p>';
    }
};

// Recursively parse and display the evolution chain
const displayEvolutionChain = async (chainData) => {
    evolutionContainer.innerHTML = ''; // Clear loading/previous chain

    let currentStage = chainData;
    let stageCount = 0;

    while (currentStage) {
        stageCount++;
        const speciesName = currentStage.species.name;

        // Add arrow between stages (except before the first one)
        if (stageCount > 1) {
            const arrow = document.createElement('div');
            arrow.classList.add('evolution-arrow');
            arrow.innerHTML = '→'; // Right arrow symbol
            evolutionContainer.appendChild(arrow);
        }

        // Fetch minimal data for the sprite
        const stagePokemonData = await fetchPokemonData(speciesName);
        const spriteUrl = stagePokemonData?.sprites?.front_default || 'placeholder.png';

        const stageDiv = document.createElement('div');
        stageDiv.classList.add('evolution-stage');
        // Make the stage clickable to show that Pokémon's details
        stageDiv.onclick = () => {
            hideModal(); // Close current modal first
            displayPokemonModal(speciesName); // Open modal for the clicked stage
        };

        stageDiv.innerHTML = `
            <img src="${spriteUrl}" alt="${speciesName}" loading="lazy">
            <span>${speciesName}</span>
        `;
        evolutionContainer.appendChild(stageDiv);

        // Move to the next stage in the chain
        if (currentStage.evolves_to.length > 0) {
             // Simple case: assume only the first evolution path for Gen 1 (no branching like Eevee here yet)
             // For full support, you'd need to handle branches (e.g. Eevee -> Vaporeon/Jolteon/Flareon)
             currentStage = currentStage.evolves_to[0];
        } else {
            currentStage = null; // End of chain
        }
    }

     if (stageCount === 0) {
         evolutionContainer.innerHTML = '<p>No evolution data found.</p>';
     }
};


// Hide the modal
const hideModal = () => {
    modal.style.display = 'none';
};

// --- Event Listeners ---

// Filter Pokemon on search input
searchInput.addEventListener('input', filterPokemon);

// Close modal listeners
closeModalButton.addEventListener('click', hideModal);
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        hideModal();
    }
});
// Close modal on Escape key press
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.style.display === 'flex') {
        hideModal();
    }
});


// --- Initialization ---

// Fetch all Pokemon and create cards
const fetchAndDisplayPokemon = async () => {
    try {
        const pokemonPromises = [];
        for (let i = 1; i <= POKEMON_COUNT; i++) {
            pokemonPromises.push(fetchPokemonData(i));
        }
        const allPokemonResults = await Promise.all(pokemonPromises);

        loadingMessage.style.display = 'none'; // Hide loading message

        allPokemonCards = []; // Clear previous card references
        pokedexGrid.innerHTML = ''; // Clear grid before adding new cards

        allPokemonResults.forEach(pokemonData => {
            if (pokemonData) {
                const card = createPokemonCard(pokemonData);
                pokedexGrid.appendChild(card);
                allPokemonCards.push(card); // Store card reference for filtering
            } else {
                 console.warn(`Skipping card creation for a Pokemon due to fetch error.`);
            }
        });

        if(allPokemonCards.length === 0 && POKEMON_COUNT > 0) {
             loadingMessage.textContent = "Failed to load any Pokémon data. Check API or network.";
             loadingMessage.style.display = 'block';
        }

    } catch (error) {
        loadingMessage.textContent = "Failed to load Pokémon list.";
        loadingMessage.style.display = 'block';
        console.error("Error fetching Pokémon list:", error);
    }
};

// Initialize the Pokedex on page load
fetchAndDisplayPokemon();