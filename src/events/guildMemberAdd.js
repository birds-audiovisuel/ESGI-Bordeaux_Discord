import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import database from '../database/database.js';

export default {
  name: 'guildMemberAdd',
  async execute(member, client) {
    console.log(`👋 Nouveau membre: ${member.user.tag} (${member.id})`);
    
    try {
      // Récupérer les informations du serveur depuis la base de données
      const serverConfig = await database.getServer(member.guild.id);
      if (!serverConfig || !serverConfig.configured) {
        console.warn(`⚠️  Serveur ${member.guild.name} non configuré`);
        return;
      }
      
      // Canal d'arrivée configuré pour ce serveur
      const welcomeChannelId = serverConfig.welcome_channel_id || process.env.WELCOME_CHANNEL_ID;
      if (!welcomeChannelId) {
        console.warn(`⚠️  Canal de bienvenue non configuré pour ${member.guild.name}`);
        return;
      }
      
      const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
      if (!welcomeChannel) {
        console.warn('⚠️  Canal de bienvenue introuvable');
        return;
      }
      
      // Embed de bienvenue
      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🎓 Bienvenue sur le Campus Éducative Bordeaux !')
        .setDescription(
          `Salut ${member.user} ! 👋\n\n` +
          `Pour accéder au serveur, tu dois **obligatoirement** t'authentifier avec tes identifiants MyGES.\n\n` +
          `🔐 **Étapes à suivre :**\n` +
          `1. Clique sur le bouton \"S'authentifier\" ci-dessous\n` +
          `2. Utilise la commande \`/auth\` dans tes messages privés avec le bot\n` +
          `3. Entre tes identifiants MyGES\n` +
          `4. Ton pseudo sera automatiquement défini avec ton prénom et nom\n` +
          `5. Tu recevras accès aux salons de ton école\n\n` +
          `⚠️ **Important :** Sans authentification, tu n'auras accès à aucun salon.`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ 
          text: 'Campus Éducative Bordeaux - 14 écoles, une communauté',
          iconURL: member.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();
      
      // Bouton d'authentification
      const authButton = new ButtonBuilder()
        .setCustomId('start_auth')
        .setLabel('🔐 S\'authentifier')
        .setStyle(ButtonStyle.Primary);
      
      const row = new ActionRowBuilder().addComponents(authButton);
      
      // Envoi du message de bienvenue
      await welcomeChannel.send({
        content: `${member.user}`,
        embeds: [welcomeEmbed],
        components: [row]
      });
      
      // Message privé de bienvenue (optionnel)
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🎓 Bienvenue sur le Campus Éducative Bordeaux !')
          .setDescription(
            `Salut ! Pour accéder au serveur, authentifie-toi avec tes identifiants MyGES :\n\n` +
            `Utilise la commande \`/auth\` ici ou dans le serveur.`
          );
        
        await member.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.warn(`⚠️  Impossible d'envoyer un MP à ${member.user.tag}:`, dmError.message);
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'arrivée d\'un membre:', error);
    }
  }
};