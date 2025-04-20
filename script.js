// DOM Elements
const pokedexGrid = document.getElementById('pokedex-grid');
const loadingMessage = document.getElementById('loading-message');
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

const POKEMON_COUNT = 151; // Kanto Region
const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon/';
const POKEAPI_SPECIES_URL = 'https://pokeapi.co/api/v2/pokemon-species/';

// Store fetched data to avoid repeated API calls for modal view
const pokemonCache = {};

// --- Functions ---

// Format Pokemon ID with leading zeros
const formatPokemonId = (id) => {
    return `#${String(id).padStart(3, '0')}`;
};

// Fetch data for a single Pokemon
const fetchPokemonData = async (id) => {
    if (pokemonCache[id]) {
        return pokemonCache[id];
    }
    try {
        const response = await fetch(`${POKEAPI_URL}${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        pokemonCache[id] = data; // Cache the data
        return data;
    } catch (error) {
        console.error("Could not fetch Pokemon data:", error);
        return null; // Return null or handle error appropriately
    }
};

// Fetch species data for description
const fetchSpeciesData = async (id) => {
    try {
        const response = await fetch(`${POKEAPI_SPECIES_URL}${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Could not fetch species data:", error);
        return null;
    }
};

// Create a Pokemon card element
const createPokemonCard = (pokemonData) => {
    const card = document.createElement('div');
    card.classList.add('pokemon-card');
    card.dataset.pokemonId = pokemonData.id; // Store ID for modal click

    const spriteUrl = pokemonData.sprites.front_default || 'placeholder.png'; // Use official sprite
    const pokemonName = pokemonData.name;
    const pokemonIdFormatted = formatPokemonId(pokemonData.id);

    card.innerHTML = `
        <img src="${spriteUrl}" alt="${pokemonName}">
        <h3>${pokemonName}</h3>
        <p>${pokemonIdFormatted}</p>
    `;

    // Add click listener to open modal
    card.addEventListener('click', async () => {
        await displayPokemonModal(pokemonData.id);
    });

    return card;
};

// Populate and display the modal
const displayPokemonModal = async (id) => {
    const pokemonData = await fetchPokemonData(id); // Get data (possibly from cache)
    if (!pokemonData) return; // Handle case where data fetch failed

    const speciesData = await fetchSpeciesData(id);

    // Update basic info
    modalPokemonName.textContent = pokemonData.name;
    modalPokemonNumber.textContent = formatPokemonId(pokemonData.id);
    modalPokemonSprite.src = pokemonData.sprites.front_default || 'placeholder.png';
    modalPokemonSprite.alt = pokemonData.name;
    modalPokemonHeight.textContent = `${pokemonData.height / 10} m`; // Convert decimetres to meters
    modalPokemonWeight.textContent = `${pokemonData.weight / 10} kg`; // Convert hectograms to kilograms

    // Update types
    modalPokemonTypes.innerHTML = ''; // Clear previous types
    pokemonData.types.forEach(typeInfo => {
        const typeSpan = document.createElement('span');
        typeSpan.classList.add('type-badge', `type-${typeInfo.type.name}`);
        typeSpan.textContent = typeInfo.type.name;
        modalPokemonTypes.appendChild(typeSpan);
    });

    // Update description (find English flavor text)
    let description = "No description available.";
    if (speciesData && speciesData.flavor_text_entries) {
        const englishEntry = speciesData.flavor_text_entries.find(
            entry => entry.language.name === 'en'
        );
        if (englishEntry) {
            // Clean up flavor text (remove form feeds, newlines, etc.)
            description = englishEntry.flavor_text.replace(/[\n\f]/g, ' ');
        }
    }
    modalPokemonDescription.textContent = description;

    // Update stats
    modalPokemonStats.innerHTML = ''; // Clear previous stats
    const maxStatValue = 200; // A reasonable max for scaling bars visually
    pokemonData.stats.forEach(statInfo => {
        const statRow = document.createElement('div');
        statRow.classList.add('stat-row', `stat-${statInfo.stat.name.replace('special-', 'sp-')}`); // Class for coloring

        const statValue = statInfo.base_stat;
        const statPercentage = Math.min(100, (statValue / maxStatValue) * 100); // Cap at 100%

        statRow.innerHTML = `
            <div class="stat-label">${statInfo.stat.name.replace('special-', 'Sp. ').replace('-', ' ')}</div>
            <div class="stat-bar-container">
                <div class="stat-bar" style="width: ${statPercentage}%;"></div>
                 <span class="stat-value-tooltip">${statValue}</span>
            </div>
        `;
        modalPokemonStats.appendChild(statRow);
    });


    // Show the modal
    modal.style.display = 'flex'; // Use flex for centering
};

// Hide the modal
const hideModal = () => {
    modal.style.display = 'none';
};

// --- Event Listeners ---

// Close modal when clicking the close button
closeModalButton.addEventListener('click', hideModal);

// Close modal when clicking outside the modal content
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        hideModal();
    }
});

// --- Initialization ---

// Fetch all Pokemon and create cards
const fetchAndDisplayPokemon = async () => {
    try {
        // Create an array of promises for fetching each Pokemon's data
        const pokemonPromises = [];
        for (let i = 1; i <= POKEMON_COUNT; i++) {
            pokemonPromises.push(fetchPokemonData(i));
        }

        // Wait for all promises to resolve
        const allPokemonData = await Promise.all(pokemonPromises);

        // Clear loading message
        loadingMessage.style.display = 'none';

        // Create and append cards for successfully fetched Pokemon
        allPokemonData.forEach(pokemonData => {
            if (pokemonData) { // Check if data was fetched successfully
                const card = createPokemonCard(pokemonData);
                pokedexGrid.appendChild(card);
            } else {
                 console.warn(`Skipping card creation for a Pokemon due to fetch error.`);
            }
        });

    } catch (error) {
        loadingMessage.textContent = "Failed to load Pokémon data.";
        console.error("Error fetching Pokémon list:", error);
    }
};

// Initialize the Pokedex on page load
fetchAndDisplayPokemon();