import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import database from '../database/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Afficher le message de bienvenue et d\'authentification')
    .setDefaultMemberPermissions('0'),

  async execute(interaction, client) {
    try {
      // Vérifier si l'utilisateur est propriétaire ou administrateur
      const isOwner = interaction.user.id === interaction.guild.ownerId;
      const isAdmin = interaction.member.permissions.has('Administrator');

      if (!isOwner && !isAdmin) {
        return await interaction.reply({
          content: '❌ Seuls le propriétaire du serveur et les administrateurs peuvent utiliser cette commande.',
          ephemeral: true
        });
      }

      // Embed de bienvenue générique
      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🎓 Bienvenue sur le Campus Éducative Bordeaux !')
        .setDescription(
          `Salut ! 👋\n\n` +
          `Pour accéder au serveur, tu dois **obligatoirement** t'authentifier avec tes identifiants MyGES.\n\n` +
          `🔐 **Étapes à suivre :**\n` +
          `1. Utilise la commande \`/auth\` dans ce serveur ou en message privé\n` +
          `2. Entre tes identifiants MyGES\n` +
          `3. Ton pseudo sera automatiquement défini avec ton prénom et nom\n` +
          `4. Tu recevras accès aux salons de ton école\n\n` +
          `⚠️ **Important :** Sans authentification, tu n'auras accès à aucun salon.\n\n` +
          `📚 **Écoles supportées :**\n` +
          `• ESGI Bordeaux\n` +
          `• EFAB\n` +
          `• ETS\n` +
          `• SUP'DE COM\n` +
          `• ETNA\n` +
          `• EBS\n` +
          `• Et bien d'autres...`
        )
        .setFooter({
          text: 'Campus Éducative Bordeaux - 14 écoles, une communauté',
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      // Bouton d'authentification
      const authButton = new ButtonBuilder()
        .setCustomId('start_auth')
        .setLabel('🔐 S\'authentifier avec MyGES')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(authButton);

      // Envoyer le message
      await interaction.reply({
        embeds: [welcomeEmbed],
        components: [row]
      });

    } catch (error) {
      console.error('❌ Erreur commande welcome:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de l\'affichage du message de bienvenue.',
        ephemeral: true
      });
    }
  }
};