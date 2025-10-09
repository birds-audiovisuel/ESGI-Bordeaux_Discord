import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

// Configuration
config();
const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];

// Charger toutes les commandes
async function loadCommands() {
  const commandsPath = join(__dirname, 'src', 'commands');
  const commandFiles = await readdir(commandsPath);

  for (const file of commandFiles) {
    if (!file.endsWith('.js')) continue;

    const filePath = pathToFileURL(join(commandsPath, file)).href;
    const command = await import(filePath);

    if (command.default && command.default.data) {
      commands.push(command.default.data.toJSON());
      console.log(`✅ Commande chargée: ${command.default.data.name}`);
    }
  }
}

// Déployer les commandes
async function deployCommands() {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    console.log(`🚀 Déploiement de ${commands.length} commandes slash...`);

    // Déploiement global ou sur un serveur spécifique
    if (process.env.GUILD_ID) {
      // Déploiement sur un serveur spécifique (plus rapide pour les tests)
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ ${data.length} commandes déployées sur le serveur ${process.env.GUILD_ID}`);
    } else {
      // Déploiement global (peut prendre jusqu'à 1 heure)
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ ${data.length} commandes déployées globalement`);
    }

  } catch (error) {
    console.error('❌ Erreur lors du déploiement:', error);
  }
}

// Exécution
async function main() {
  await loadCommands();
  await deployCommands();
}

main();