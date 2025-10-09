import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';
import database from './database/database.js';

// Configuration
config();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Création du client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

// Collections pour stocker les commandes et événements
client.commands = new Collection();
client.events = new Collection();

// Fonction pour charger les commandes
async function loadCommands() {
  try {
    const commandsPath = join(__dirname, 'commands');
    const commandFiles = await readdir(commandsPath);
    
    for (const file of commandFiles) {
      if (!file.endsWith('.js')) continue;
      
      const filePath = pathToFileURL(join(commandsPath, file)).href;
      const command = await import(filePath);
      
      if (command.default && command.default.data && command.default.execute) {
        client.commands.set(command.default.data.name, command.default);
        console.log(`✅ Commande chargée: ${command.default.data.name}`);
      } else {
        console.log(`⚠️  Commande ignorée (structure invalide): ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des commandes:', error);
  }
}

// Fonction pour charger les événements
async function loadEvents() {
  try {
    const eventsPath = join(__dirname, 'events');
    const eventFiles = await readdir(eventsPath);
    
    for (const file of eventFiles) {
      if (!file.endsWith('.js')) continue;
      
      const filePath = pathToFileURL(join(eventsPath, file)).href;
      const event = await import(filePath);
      
      if (event.default && event.default.name && event.default.execute) {
        if (event.default.disabled) {
          console.log(`⚠️  Événement désactivé: ${event.default.name}`);
          return;
        }

        if (event.default.once) {
          client.once(event.default.name, (...args) => event.default.execute(...args, client));
        } else {
          client.on(event.default.name, (...args) => event.default.execute(...args, client));
        }
        console.log(`✅ Événement chargé: ${event.default.name}`);
      } else {
        console.log(`⚠️  Événement ignoré (structure invalide): ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des événements:', error);
  }
}

// Gestion des erreurs globales
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée (Promise):', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});

// Fonction d'initialisation
async function initialize() {
  console.log('🚀 Initialisation du bot Campus Éducative Bordeaux...');

  // Initialisation de la base de données
  try {
    await database.initialize();
  } catch (error) {
    console.error('❌ Erreur initialisation base de données:', error);
    process.exit(1);
  }

  // Chargement des commandes et événements
  await loadCommands();
  await loadEvents();
  
  // Connexion du bot
  try {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN manquant dans le fichier .env');
    }

    console.log('🔐 Tentative de connexion avec le token...');
    await client.login(process.env.DISCORD_TOKEN);
    console.log('✅ Bot connecté avec succès !');
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
    console.error('💡 Vérifiez que le token Discord est valide et que le bot est activé');
    process.exit(1);
  }
}

// Lancement du bot
initialize();

// Export du client pour les autres modules
export default client;