# Kanto Pokédex

A simple, interactive web application displaying information about the first 151 Pokémon (Generation 1 - Kanto region).

Inspired by this tweet, tried recreating: https://x.com/Teknium1/status/1913665661659971589

## Description

This project provides a grid view of the Kanto Pokémon. Clicking on a Pokémon card opens a modal window showing more detailed information, including its sprite, number, types, height, weight, a brief description, and base stats.

## Features

*   Displays the first 151 Pokémon in a responsive grid.
*   Clickable Pokémon cards to view details.
*   Modal view showing:
    *   Official Sprite
    *   Pokédex Number
    *   Type(s) (with corresponding colors)
    *   Height and Weight
    *   Flavor Text (description)
    *   Base Stats visualized with bars (HP, Attack, Defense, Sp. Atk, Sp. Def, Speed)
*   Fetches data dynamically from the PokeAPI.

## Technologies Used

*   HTML5
*   CSS3 (including CSS Grid for layout)
*   Vanilla JavaScript (ES6+)
*   [PokeAPI (v2)](https://pokeapi.co/) - for Pokémon data

## Getting Started / Running Locally

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ethanchang235/Kanto_Pokedex.git # Replace with your actual repository URL if different
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd Kanto_Pokedex # Or your actual folder name
    ```
3.  **Open `index.html` with a Live Server:**
    *   The easiest way is using a development server that automatically reloads the page when you make changes.
    *   If you are using Visual Studio Code, you can install the "Live Server" extension.
    *   Once installed, right-click the `index.html` file in the VS Code explorer and select "Open with Live Server".
    *   Alternatively, you can simply open the `index.html` file directly in your web browser, but live reloading won't work.

## Data Source

All Pokémon data and sprites are retrieved from the free and open [PokeAPI](https://pokeapi.co/). 
