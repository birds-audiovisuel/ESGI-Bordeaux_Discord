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
  try {
    const commandsPath = join(__dirname, 'src', 'commands');
    const commandFiles = await readdir(commandsPath);

    for (const file of commandFiles) {
      if (!file.endsWith('.js')) continue;

      const filePath = pathToFileURL(join(commandsPath, file)).href;
      const command = await import(filePath);

      if (command.default && command.default.data && command.default.execute) {
        commands.push(command.default.data.toJSON());
        console.log(`✅ Commande chargée: ${command.default.data.name}`);
      } else {
        console.log(`⚠️  Commande ignorée (structure invalide): ${file}`);
      }
    }

    console.log(`📋 Total des commandes chargées: ${commands.length}`);

  } catch (error) {
    console.error('❌ Erreur lors du chargement des commandes:', error);
    process.exit(1);
  }
}

// Déployer les commandes
async function deployCommands() {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔄 Déploiement des commandes slash en cours...');

    // Déploiement pour un serveur spécifique (développement)
    if (process.env.GUILD_ID) {
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ ${data.length} commande(s) déployée(s) sur le serveur ${process.env.GUILD_ID}`);
    }
    // Déploiement global (production)
    else {
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ ${data.length} commande(s) déployée(s) globalement`);
      console.log('⚠️  Les commandes globales peuvent prendre jusqu\'à 1 heure pour être disponibles.');
    }

  } catch (error) {
    console.error('❌ Erreur lors du déploiement des commandes:', error);
    process.exit(1);
  }
}

// Script principal
async function main() {
  // Vérifier les variables d'environnement
  if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN manquant dans les variables d\'environnement');
    process.exit(1);
  }

  if (!process.env.CLIENT_ID) {
    console.error('❌ CLIENT_ID manquant dans les variables d\'environnement');
    process.exit(1);
  }

  console.log('🚀 Démarrage du déploiement des commandes...');
  console.log(`🤖 Client ID: ${process.env.CLIENT_ID}`);
  console.log(`🏠 Guild ID: ${process.env.GUILD_ID || 'Global (non spécifié)'}`);

  // Charger et déployer les commandes
  await loadCommands();
  await deployCommands();

  console.log('🎉 Déploiement terminé avec succès !');
}

// Exécution
main().catch(console.error);
