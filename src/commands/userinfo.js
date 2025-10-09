import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Affiche toutes les informations sur un membre')
    .addUserOption(option =>
      option.setName('membre')
        .setDescription('Le membre à inspecter')
        .setRequired(false)),

  async execute(interaction, client) {
    try {
      // Récupérer le membre ciblé ou l'utilisateur qui exécute la commande
      const targetUser = interaction.options.getUser('membre') || interaction.user;
      const targetMember = interaction.guild.members.cache.get(targetUser.id);

      if (!targetMember) {
        return await interaction.reply({
          content: '❌ Membre introuvable sur ce serveur.',
          ephemeral: true
        });
      }

      // Création de l'embed avec les informations
      const userEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`📋 Informations sur ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          {
            name: '👤 Utilisateur',
            value: `**Nom :** ${targetUser.tag}\n**ID :** ${targetUser.id}\n**Mention :** ${targetUser}`,
            inline: true
          },
          {
            name: '📅 Dates',
            value: `**Compte créé :** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>\n**Rejoint le serveur :** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`,
            inline: true
          },
          {
            name: '🏷️ Rôles',
            value: targetMember.roles.cache.size > 1
              ? targetMember.roles.cache.filter(role => role.name !== '@everyone').map(role => role).join(', ')
              : 'Aucun rôle',
            inline: false
          }
        )
        .setFooter({
          text: `Informations demandées par ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      // Ajouter des informations supplémentaires si disponibles
      if (targetMember.nickname) {
        userEmbed.addFields({
          name: '📝 Surnom',
          value: targetMember.nickname,
          inline: true
        });
      }

      await interaction.reply({ embeds: [userEmbed] });

    } catch (error) {
      console.error('❌ Erreur commande userinfo:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la récupération des informations.',
        ephemeral: true
      });
    }
  }
};