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

    for (let id = 1; id <= MAX_POKEMON_ID; id++) {
        try {
            console.log(`Fetching data for ID: ${id} (${++processedCount}/${MAX_POKEMON_ID})`);

            const pokemonResponse = await fetch(`${POKEAPI_BASE_URL}pokemon/${id}`);
            if (!pokemonResponse.ok) {
                console.warn(`Skipping ID ${id}: Failed to fetch main data (status ${pokemonResponse.status})`);
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }
            const pokemonData = await pokemonResponse.json();

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
            const generationName = speciesData.generation ? speciesData.generation.name : 'unknown-generation';

            allPokemonSummaries.push({
                id: pokemonData.id,
                name: pokemonData.name,
                sprite: pokemonData.sprites.front_default,
                types: pokemonData.types.map(typeInfo => typeInfo.type.name),
                generation: generationName,
                height: pokemonData.height,   // <<< ADD THIS LINE
                weight: pokemonData.weight    // <<< ADD THIS LINE
            });

            await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err) {
            console.error(`Error processing ID ${id}: ${err.message}`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return allPokemonSummaries;
}

async function generateSummaryFile() {
    // ... (this function remains the same as before) ...
    try {
        const summaries = await fetchAllPokemonDetails();
        const dirPath = path.join(__dirname, 'data');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`Created directory: ${dirPath}`);
        }
        const filePath = path.join(dirPath, 'all_pokemon_summary.json');
        fs.writeFileSync(filePath, JSON.stringify(summaries, null, 2));
        console.log(`\nSuccessfully generated ${filePath} with ${summaries.length} Pokémon!`);
    } catch (error) {
        console.error('Failed to generate summary file:', error);
    }
}

generateSummaryFile();
