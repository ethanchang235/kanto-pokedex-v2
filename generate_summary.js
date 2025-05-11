// generate_summary.js
const fs = require('fs');
const path = require('path');

// For older Node.js versions (like v16 or below) or CommonJS projects:
// You'll need to install node-fetch: npm install node-fetch@2
const fetch = require('node-fetch');

// If you are using Node.js v17.5+ and your package.json has "type": "module",
// you can use the built-in fetch like this:
// import fetch from 'node-fetch'; // (Still might need node-fetch for older setups)
// Or just use global fetch if available in your Node version.

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/';
const MAX_POKEMON_ID = 1025; // Current known max, adjust if needed for future gens

async function fetchAllPokemonDetails() {
    console.log(`Fetching details for Pokémon up to ID ${MAX_POKEMON_ID}...`);
    const allPokemonSummaries = [];
    let processedCount = 0;

    // Fetching by ID is generally more reliable than the full list for all details
    for (let id = 1; id <= MAX_POKEMON_ID; id++) {
        try {
            console.log(`Fetching data for ID: ${id} (${++processedCount}/${MAX_POKEMON_ID})`);

            const pokemonResponse = await fetch(`${POKEAPI_BASE_URL}pokemon/${id}`);
            if (!pokemonResponse.ok) {
                console.warn(`Skipping ID ${id}: Failed to fetch main data (status ${pokemonResponse.status})`);
                // Optionally add a short delay even on failure to avoid hammering API
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }
            const pokemonData = await pokemonResponse.json();

            // Ensure species URL is valid before fetching
            if (!pokemonData.species || !pokemonData.species.url) {
                console.warn(`Skipping ID ${id} (${pokemonData.name}): Missing species URL.`);
                await new Promise(resolve => setTimeout(resolve, 50));
                continue;
            }
            const speciesResponse = await fetch(pokemonData.species.url);
             if (!speciesResponse.ok) {
                console.warn(`Skipping ID ${id} (${pokemonData.name}): Failed to fetch species data (status ${speciesResponse.status})`);
                await new Promise(resolve => setTimeout(resolve, 50));
                continue;
            }
            const speciesData = await speciesResponse.json();

            // Ensure generation data exists
            const generationName = speciesData.generation ? speciesData.generation.name : 'unknown-generation';

            allPokemonSummaries.push({
                id: pokemonData.id,
                name: pokemonData.name,
                sprite: pokemonData.sprites.front_default, // Can be null for some forms
                types: pokemonData.types.map(typeInfo => typeInfo.type.name),
                generation: generationName
            });

            // Add a small delay to be respectful to the API
            await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
        } catch (err) {
            console.error(`Error processing ID ${id}: ${err.message}`);
            // Add a longer delay on error to avoid overwhelming the API if there's a persistent issue
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return allPokemonSummaries;
}

async function generateSummaryFile() {
    try {
        const summaries = await fetchAllPokemonDetails();
        const dirPath = path.join(__dirname, 'data'); // Creates 'data' folder in the script's directory (project root)
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`Created directory: ${dirPath}`);
        }
        const filePath = path.join(dirPath, 'all_pokemon_summary.json');
        fs.writeFileSync(filePath, JSON.stringify(summaries, null, 2)); // null, 2 for pretty printing
        console.log(`\nSuccessfully generated ${filePath} with ${summaries.length} Pokémon!`);
    } catch (error) {
        console.error('Failed to generate summary file:', error);
    }
}

generateSummaryFile();
