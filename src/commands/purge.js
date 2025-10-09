import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';

// Fonction pour obtenir l'émoji selon le type de salon
function getChannelEmoji(channelType) {
  const emojis = {
    0: '💬', // Text Channel
    2: '🔊', // Voice Channel
    4: '📁', // Category Channel
    5: '📢', // News Channel
    10: '🧵', // News Thread
    11: '🧵', // Public Thread
    12: '🔒', // Private Thread
    13: '🎤', // Stage Voice Channel
    15: '🎪', // Forum Channel
    16: '🎯'  // Media Channel
  };
  return emojis[channelType] || '📂';
}

// Fonction pour obtenir l'émoji selon le type de rôle
function getRoleEmoji(role) {
  const name = role.name.toLowerCase();

  // Rôles système/bots
  if (role.managed) return '🤖';

  // Rôles d'administration
  if (role.permissions.has('Administrator')) return '👑';
  if (name.includes('admin')) return '⚙️';
  if (name.includes('mod')) return '🛡️';

  // Rôles d'écoles
  if (name.includes('esgi') || name.includes('école') || name.includes('school')) return '🎓';
  if (name.includes('étudiant') || name.includes('student')) return '📚';
  if (name.includes('professeur') || name.includes('teacher')) return '👨‍🏫';

  // Rôles spéciaux
  if (name.includes('vip') || name.includes('premium')) return '💎';
  if (name.includes('member') || name.includes('membre')) return '👤';
  if (name.includes('verified') || name.includes('authentifié')) return '✅';

  // Rôles de couleur ou décoratifs
  if (role.color !== 0) return '🎨';

  // Défaut
  return '🏷️';
}

// Fonction pour supprimer uniquement tous les rôles
async function purgeRolesOnly(interaction) {
  const guild = interaction.guild;
  const startTime = Date.now();
  let deleted = { roles: 0 };

  console.log('🏷️ Suppression de TOUS les rôles...');
  console.log(`📊 Total des rôles sur le serveur: ${guild.roles.cache.size}`);

  // Afficher tous les rôles pour debug
  guild.roles.cache.forEach(role => {
    console.log(`🔍 Rôle: "${role.name}" | ID: ${role.id} | Deletable: ${role.deletable} | Managed: ${role.managed} | Position: ${role.position}`);
  });

  // Supprimer TOUS les rôles (sauf @everyone et le rôle du bot)
  const roles = guild.roles.cache.filter(role => {
    // Garder @everyone
    if (role.name === '@everyone') return false;

    // Garder le rôle du bot s'il existe
    if (role.managed && role.tags?.botId === interaction.client.user.id) return false;

    // Supprimer tous les autres
    return true;
  });

  console.log(`🎯 Rôles à supprimer: ${roles.size}`);

  for (const [id, role] of roles) {
    try {
      const roleEmoji = getRoleEmoji(role);
      console.log(`🗑️ Tentative suppression: ${role.name} (deletable: ${role.deletable})`);

      await role.delete('Suppression de tous les rôles demandée par ' + interaction.user.tag);
      deleted.roles++;
      console.log(`${roleEmoji} Rôle supprimé: ${role.name}`);

      // Attendre un peu pour éviter le rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Erreur suppression rôle ${role.name}:`, error.message);
    }
  }

  // Message final
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const resultEmbed = new EmbedBuilder()
    .setColor(0xff6600)
    .setTitle('🏷️ Suppression des rôles terminée !')
    .setDescription(
      `**🗑️ Tous les rôles ont été supprimés !**\n\n` +
      `🏷️ **Rôles supprimés:** ${deleted.roles}\n` +
      `👥 **Rôle @everyone:** Conservé\n\n` +
      `**🗑️ Rôles supprimés par:** ${interaction.user.tag}\n` +
      `⏰ **Durée:** ${duration} secondes`
    )
    .addFields(
      {
        name: '🗑️ Éléments supprimés',
        value: `🏷️ Tous les rôles: ${deleted.roles}`,
        inline: true
      },
      {
        name: '✅ Éléments conservés',
        value: [
          `💬 Tous les salons`,
          `📁 Toutes les catégories`,
          `👥 Rôle @everyone`,
          `📝 Tous les messages`
        ].join('\n'),
        inline: true
      }
    )
    .setFooter({ text: 'Tous les rôles ont été supprimés, le serveur garde sa structure' })
    .setTimestamp();

  await interaction.editReply({ embeds: [resultEmbed] });
  console.log(`✅ Suppression des rôles terminée par ${interaction.user.tag}`);
}

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('⚠️ DANGER: Supprimer tous les salons, catégories et rôles du serveur')
    .addBooleanOption(option =>
      option.setName('confirmer')
        .setDescription('Tapez "true" pour confirmer la suppression TOTALE')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    try {
      // Vérification des permissions administrateur ou propriétaire
      const isOwner = interaction.user.id === interaction.guild.ownerId;
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isOwner && !isAdmin) {
        return await interaction.reply({
          content: '❌ Seuls le propriétaire du serveur et les administrateurs peuvent utiliser cette commande.',
          ephemeral: true
        });
      }

      const confirmation = interaction.options.getBoolean('confirmer');

      if (!confirmation) {
        const warningEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('⚠️ Commande de purge')
          .setDescription(
            '**ATTENTION:** Cette commande va supprimer **DÉFINITIVEMENT** :\n\n' +
            '🗑️ **Tous les salons texte et vocaux**\n' +
            '📁 **Toutes les catégories**\n' +
            '🏷️ **Tous les rôles** (sauf @everyone et rôles de bots)\n\n' +
            '**⚠️ CETTE ACTION EST IRRÉVERSIBLE !**\n\n' +
            'Pour confirmer, utilisez: `/purge confirmer:True`'
          )
          .setFooter({ text: 'Réfléchissez bien avant de continuer...' });

        return await interaction.reply({ embeds: [warningEmbed], ephemeral: true });
      }

      // Double confirmation avec boutons et gestion d'expiration
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xff6600)
        .setTitle('🚨 CONFIRMATION FINALE')
        .setDescription(
          `**Êtes-vous ABSOLUMENT certain de vouloir détruire ce serveur ?**\n\n` +
          `**Serveur:** ${interaction.guild.name}\n` +
          `**Salons à supprimer:** ${interaction.guild.channels.cache.size}\n` +
          `**Rôles à supprimer:** ${interaction.guild.roles.cache.size - 1}\n\n` +
          `**⚠️ DERNIÈRE CHANCE - CETTE ACTION EST DÉFINITIVE !**\n\n` +
          `⏰ **Vous avez 5 minutes pour confirmer**`
        );

      const confirmButton = new ButtonBuilder()
        .setCustomId('purge_confirm')
        .setLabel('🗑️ OUI, DÉTRUIRE LE SERVEUR')
        .setStyle(ButtonStyle.Danger);

      const purgeRolesButton = new ButtonBuilder()
        .setCustomId('purge_roles_only')
        .setLabel('🏷️ SUPPRIMER TOUS LES RÔLES')
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId('purge_cancel')
        .setLabel('❌ Annuler')
        .setStyle(ButtonStyle.Secondary);

      const row1 = new ActionRowBuilder().addComponents(confirmButton, purgeRolesButton);
      const row2 = new ActionRowBuilder().addComponents(cancelButton);

      // Répondre immédiatement pour éviter l'expiration
      await interaction.reply({
        embeds: [confirmEmbed],
        components: [row1, row2],
        ephemeral: true
      });

      // Créer un collecteur de boutons avec une durée plus longue
      const collector = interaction.channel.createMessageComponentCollector({
        filter: (buttonInteraction) => {
          return (buttonInteraction.customId === 'purge_confirm' ||
                  buttonInteraction.customId === 'purge_cancel' ||
                  buttonInteraction.customId === 'purge_roles_only')
                 && buttonInteraction.user.id === interaction.user.id;
        },
        time: 300000 // 5 minutes
      });

      collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'purge_cancel') {
          await interaction.editReply({
            content: '✅ Purge annulée. Le serveur est sauf !',
            embeds: [],
            components: []
          });
          collector.stop();
          return;
        }

        if (buttonInteraction.customId === 'purge_roles_only') {
          // Supprimer uniquement tous les rôles
          await interaction.editReply({
            content: '🏷️ **SUPPRESSION DE TOUS LES RÔLES EN COURS...** Ne fermez pas Discord !',
            embeds: [],
            components: []
          });
          collector.stop();

          // Acknowledge l'interaction du bouton
          await buttonInteraction.deferUpdate();

          await purgeRolesOnly(interaction);
          return;
        }

        // Commencer la purge complète
        await interaction.editReply({
          content: '🚨 **PURGE COMPLÈTE EN COURS...** Ne fermez pas Discord !',
          embeds: [],
          components: []
        });
        collector.stop();

        // Acknowledge l'interaction du bouton
        await buttonInteraction.deferUpdate();

        const guild = interaction.guild;
        const startTime = Date.now();
        let deleted = {
          channels: 0,
          categories: 0,
          roles: 0
        };

        // 1. Supprimer tous les salons et catégories
        console.log('🗑️ Suppression des salons et catégories...');
        const channels = guild.channels.cache.filter(channel => channel.deletable);

        for (const [id, channel] of channels) {
          try {
            const channelEmoji = getChannelEmoji(channel.type);
            await channel.delete('Purge du serveur demandée par ' + interaction.user.tag);

            if (channel.type === 4) { // CategoryChannel
              deleted.categories++;
            } else {
              deleted.channels++;
            }
            console.log(`${channelEmoji} Supprimé: ${channel.name} (type: ${channel.type})`);

            // Attendre un peu pour éviter le rate limit
            await new Promise(resolve => setTimeout(resolve, 5000));
          } catch (error) {
            console.error(`❌ Erreur suppression ${channel.name}:`, error.message);
          }
        }

        // 2. Supprimer TOUS les rôles (sauf @everyone)
        console.log('🗑️ Suppression de TOUS les rôles...');
        const roles = guild.roles.cache.filter(role =>
          role.deletable &&
          role.name !== '@everyone'
          // On supprime même les rôles de bots maintenant
        );

        for (const [id, role] of roles) {
          try {
            const roleEmoji = getRoleEmoji(role);
            await role.delete('Purge du serveur demandée par ' + interaction.user.tag);
            deleted.roles++;
            console.log(`${roleEmoji} Rôle supprimé: ${role.name}`);

            // Attendre un peu pour éviter le rate limit
            await new Promise(resolve => setTimeout(resolve, 5000));
          } catch (error) {
            console.error(`❌ Erreur suppression rôle ${role.name}:`, error.message);
          }
        }

        // 3. Créer un salon de base pour pouvoir répondre
        try {
          const newChannel = await guild.channels.create({
            name: 'général',
            type: 0, // Text channel
            reason: 'Canal de base après purge'
          });

          // Réponse finale dans le nouveau salon
          const duration = Math.floor((Date.now() - startTime) / 1000);
          const resultEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Purge terminée !')
            .setDescription(
              `**🔥 Serveur complètement nettoyé !**\n\n` +
              `💬 **Salons supprimés:** ${deleted.channels}\n` +
              `📁 **Catégories supprimées:** ${deleted.categories}\n` +
              `🏷️ **Rôles supprimés:** ${deleted.roles}\n` +
              `📊 **Total supprimé:** ${deleted.channels + deleted.categories + deleted.roles} éléments\n\n` +
              `**🔥 Serveur rasé par:** ${interaction.user.tag}\n` +
              `⏰ **Durée:** ${duration} secondes`
            )
            .addFields(
              {
                name: '🗑️ Éléments supprimés',
                value: [
                  `💬 Salons texte/vocaux: ${deleted.channels}`,
                  `📁 Catégories: ${deleted.categories}`,
                  `🏷️ Rôles: ${deleted.roles}`
                ].join('\n'),
                inline: true
              },
              {
                name: '🆕 Nouveau contenu',
                value: [
                  `💬 Salon "général" créé`,
                  `👥 Rôle @everyone conservé`,
                  `🎯 Serveur prêt à reconfigurer`
                ].join('\n'),
                inline: true
              }
            )
            .setFooter({ text: 'Le serveur est maintenant vierge et prêt à être reconfiguré' })
            .setTimestamp();

          await newChannel.send({ embeds: [resultEmbed] });

        } catch (error) {
          console.error('❌ Erreur création salon de base:', error);
        }

        console.log(`✅ Purge terminée par ${interaction.user.tag}`);
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          await interaction.editReply({
            content: '⏰ Temps écoulé (5 minutes). Purge annulée par sécurité.',
            embeds: [],
            components: []
          });
        }
      });

    } catch (error) {
      console.error('❌ Erreur commande purge:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de la purge.');

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};