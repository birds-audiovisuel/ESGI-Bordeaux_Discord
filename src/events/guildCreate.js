import { EmbedBuilder } from 'discord.js';
import database from '../database/database.js';

export default {
  name: 'guildCreate',
  async execute(guild, client) {
    console.log(`🆕 Bot ajouté au serveur: ${guild.name} (${guild.id})`);
    console.log(`👥 Membres: ${guild.memberCount}`);
    
    try {
      // Enregistrer le nouveau serveur dans la base de données
      const serverData = {
        guild_id: guild.id,
        guild_name: guild.name,
        owner_id: guild.ownerId,
        configured: false, // Pas encore configuré
        welcome_channel_id: null,
        log_channel_id: null,
        admin_role_ids: [],
        config_data: {
          added_at: new Date().toISOString(),
          added_by_bot: true
        }
      };
      
      await database.createServer(serverData);
      
      // Trouver un canal général ou système pour envoyer un message d'accueil
      let welcomeChannel = null;
      
      // Chercher un canal approprié (général, accueil, bot-commands, etc.)
      const channelNames = ['général', 'general', 'accueil', 'welcome', 'bot-commands', 'commandes'];
      for (const name of channelNames) {
        welcomeChannel = guild.channels.cache.find(channel => 
          channel.isTextBased() && 
          channel.name.toLowerCase().includes(name) &&
          channel.permissionsFor(guild.members.me).has(['ViewChannel', 'SendMessages'])
        );
        if (welcomeChannel) break;
      }
      
      // Si aucun canal spécifique trouvé, prendre le premier canal texte accessible
      if (!welcomeChannel) {
        welcomeChannel = guild.channels.cache
          .filter(channel => 
            channel.isTextBased() && 
            channel.permissionsFor(guild.members.me).has(['ViewChannel', 'SendMessages'])
          )
          .first();
      }
      
      if (welcomeChannel) {
        // Embed de présentation du bot
        const welcomeEmbed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🎓 Merci d\'avoir ajouté le Bot Campus Éducative Bordeaux !')
          .setDescription(
            `Salut ! Je suis le bot officiel du **Campus Éducative Bordeaux**.\n\n` +
            `🔐 **Authentification MyGES obligatoire**\n` +
            `Ce bot nécessite une authentification via MyGES pour accéder au serveur.\n\n` +
            `⚙️ **Configuration requise**\n` +
            `Un administrateur doit d\'abord configurer le serveur avec la commande \`/setup\`.\n\n` +
            `**Fonctionnalités principales :**\n` +
            `• 🏫 Gestion automatique des 14 écoles du campus\n` +
            `• 🏷️ Attribution automatique des rôles et pseudos\n` +
            `• 🛡️ Système de modération professionnel\n` +
            `• 📊 Statistiques avancées\n` +
            `• 🔧 Administration complète\n\n` +
            `**Première étape :** Un administrateur doit lancer \`/setup\` pour initialiser le serveur.`
          )
          .addFields(
            {
              name: '🚀 Commande d\'initialisation',
              value: '`/setup` - Configure automatiquement le serveur',
              inline: true
            },
            {
              name: '🔐 Authentification',
              value: '`/auth` - S\'authentifier via MyGES (après setup)',
              inline: true
            },
            {
              name: '📖 Aide',
              value: 'Tapez `/` pour voir toutes les commandes disponibles',
              inline: true
            }
          )
          .setFooter({ 
            text: 'Campus Éducative Bordeaux - 14 écoles, une communauté',
            iconURL: client.user.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();
        
        await welcomeChannel.send({ embeds: [welcomeEmbed] });
        
        console.log(`✅ Message d'accueil envoyé dans ${welcomeChannel.name}`);
      } else {
        console.warn(`⚠️  Aucun canal accessible trouvé sur ${guild.name}`);
      }
      
      // Informer les développeurs/logs
      console.log(`📊 Stats du nouveau serveur:`);
      console.log(`   - Nom: ${guild.name}`);
      console.log(`   - ID: ${guild.id}`);
      console.log(`   - Propriétaire: ${guild.ownerId}`);
      console.log(`   - Membres: ${guild.memberCount}`);
      console.log(`   - Canaux: ${guild.channels.cache.size}`);
      console.log(`   - Rôles: ${guild.roles.cache.size}`);
      
    } catch (error) {
      console.error(`❌ Erreur lors de l'ajout au serveur ${guild.name}:`, error);
    }
  }
};