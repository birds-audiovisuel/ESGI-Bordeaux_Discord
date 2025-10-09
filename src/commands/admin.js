import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import RoleManager from '../utils/roleManager.js';
import { SCHOOLS, ROLES } from '../config/schools.js';
import database from '../database/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription("Commandes d'administration du serveur")
    .addSubcommand(subcommand =>
      subcommand
        .setName('users')
        .setDescription('Gérer les utilisateurs authentifiés')
        .addUserOption(option =>
          option.setName('utilisateur')
            .setDescription('Utilisateur à gérer')
            .setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('channels')
        .setDescription('Gérer les salons et catégories')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action à effectuer')
            .setRequired(true)
            .addChoices(
              { name: 'Créer salon texte', value: 'create_text' },
              { name: 'Créer salon vocal', value: 'create_voice' },
              { name: 'Supprimer salon', value: 'delete_channel' },
              { name: 'Lister salons', value: 'list_channels' }
            ))
        .addStringOption(option =>
          option.setName('nom')
            .setDescription('Nom du salon (pour création)')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('salon')
            .setDescription('Salon à gérer')
            .setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('roles')
        .setDescription('Gérer les rôles')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action à effectuer')
            .setRequired(true)
            .addChoices(
              { name: 'Lister rôles', value: 'list_roles' },
              { name: 'Attribuer rôle', value: 'assign_role' },
              { name: 'Retirer rôle', value: 'remove_role' }
            ))
        .addUserOption(option =>
          option.setName('utilisateur')
            .setDescription("Utilisateur pour l'attribution/retrait de rôle")
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Rôle à attribuer/retirer')
            .setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Statistiques détaillées du serveur')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
      // Vérification des permissions
      const roleManager = new RoleManager(interaction.guild);
      if (!roleManager.isModerator(interaction.member)) {
        const noPermEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('❌ Permission refusée')
          .setDescription('Seuls les modérateurs et administrateurs peuvent utiliser cette commande.');
        
        return await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
      }

      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'users':
          await this.handleUsersCommand(interaction, roleManager);
          break;
        case 'channels':
          await this.handleChannelsCommand(interaction);
          break;
        case 'roles':
          await this.handleRolesCommand(interaction, roleManager);
          break;
        case 'stats':
          await this.handleStatsCommand(interaction);
          break;
        default:
          await interaction.reply({ content: '❌ Sous-commande non reconnue.', ephemeral: true });
      }

    } catch (error) {
      console.error('❌ Erreur commande admin:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erreur')
        .setDescription("Une erreur est survenue lors de l'exécution de la commande.");

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },

  async handleUsersCommand(interaction, roleManager) {
    const targetUser = interaction.options.getUser('utilisateur');

    if (targetUser) {
      // Afficher les informations d'un utilisateur spécifique sur ce serveur
      const userData = await database.getUserInServer(targetUser.id, interaction.guild.id);
      const member = interaction.guild.members.cache.get(targetUser.id);

      const userEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`👤 Informations utilisateur`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

      if (userData) {
        userEmbed.setDescription(`**${userData.nickname}** (Authentifié)`)
          .addFields(
            { name: '🆔 Discord', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
            { name: '🎓 MyGES', value: `${userData.myges_username}\n${userData.email}`, inline: true },
            { name: '🏫 École', value: userData.school || 'Non spécifiée', inline: true },
            { name: '📚 Classe', value: userData.class || 'Non spécifiée', inline: true },
            { name: '👤 Statut', value: userData.is_teacher ? 'Enseignant' : 'Étudiant', inline: true },
            { name: '📅 Inscription', value: `<t:${Math.floor(new Date(userData.created_at).getTime() / 1000)}:R>`, inline: true }
          );
      } else {
        userEmbed.setDescription('**Non authentifié**')
          .addFields(
            { name: '🆔 Discord', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
            { name: '⚠️ Statut', value: 'Utilisateur non authentifié via MyGES', inline: true }
          );
      }

      if (member) {
        const roles = member.roles.cache
          .filter(role => role.id !== interaction.guild.id)
          .map(role => role.name)
          .join(', ') || 'Aucun';
        
        userEmbed.addFields(
          { name: '🏷️ Rôles', value: roles, inline: false },
          { name: '📅 Membre depuis', value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`, inline: true }
        );
      }

      await interaction.reply({ embeds: [userEmbed], ephemeral: true });

    } else {
      // Lister tous les utilisateurs authentifiés sur ce serveur
      const users = await database.getServerUsers(interaction.guild.id);
      
      const listEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('👥 Utilisateurs authentifiés')
        .setDescription(`**Total :** ${users.length} utilisateur(s) authentifié(s)`);

      if (users.length > 0) {
        const userList = users.slice(0, 25).map(user => {
          const member = interaction.guild.members.cache.get(user.discord_id);
          const status = member ? '🟢' : '🔴';
          return `${status} **${user.nickname}** - ${user.school} - <@${user.discord_id}>`;
        }).join('\n');

        listEmbed.addFields({
          name: 'Utilisateurs',
          value: userList || 'Aucun utilisateur authentifié',
          inline: false
        });

        if (users.length > 25) {
          listEmbed.setFooter({ text: `Affichage de 25/${users.length} utilisateurs` });
        }
      }

      await interaction.reply({ embeds: [listEmbed], ephemeral: true });
    }
  },

  async handleChannelsCommand(interaction) {
    const action = interaction.options.getString('action');
    const channelName = interaction.options.getString('nom');
    const targetChannel = interaction.options.getChannel('salon');

    switch (action) {
      case 'create_text':
        if (!channelName) {
          return await interaction.reply({ content: '❌ Nom du salon requis pour la création.', ephemeral: true });
        }

        try {
          const textChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            reason: `Créé par ${interaction.user.tag} via commande admin`
          });

          const createEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Salon créé')
            .setDescription(`Salon texte **${textChannel.name}** créé avec succès !`)
            .addFields({ name: 'ID', value: textChannel.id, inline: true });

          await interaction.reply({ embeds: [createEmbed], ephemeral: true });
        } catch (error) {
          await interaction.reply({ content: `❌ Erreur lors de la création: ${error.message}`, ephemeral: true });
        }
        break;

      case 'create_voice':
        if (!channelName) {
          return await interaction.reply({ content: '❌ Nom du salon requis pour la création.', ephemeral: true });
        }

        try {
          const voiceChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            reason: `Créé par ${interaction.user.tag} via commande admin`
          });

          const createEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Salon créé')
            .setDescription(`Salon vocal **${voiceChannel.name}** créé avec succès !`)
            .addFields({ name: 'ID', value: voiceChannel.id, inline: true });

          await interaction.reply({ embeds: [createEmbed], ephemeral: true });
        } catch (error) {
          await interaction.reply({ content: `❌ Erreur lors de la création: ${error.message}`, ephemeral: true });
        }
        break;

      case 'delete_channel':
        if (!targetChannel) {
          return await interaction.reply({ content: '❌ Salon à supprimer requis.', ephemeral: true });
        }

        const confirmEmbed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('⚠️ Confirmation de suppression')
          .setDescription(`Êtes-vous sûr de vouloir supprimer le salon **${targetChannel.name}** ?\n\n**Cette action est irréversible !**`);

        const confirmRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`delete_channel_${targetChannel.id}`)
              .setLabel('Confirmer la suppression')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('cancel_delete')
              .setLabel('Annuler')
              .setStyle(ButtonStyle.Secondary)
          );

        await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], ephemeral: true });
        break;

      case 'list_channels':
        const channels = interaction.guild.channels.cache
          .filter(channel => channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice)
          .sort((a, b) => a.name.localeCompare(b.name));

        const listEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('📋 Liste des salons')
          .setDescription(`**Total :** ${channels.size} salon(s)`);

        const textChannels = channels.filter(c => c.type === ChannelType.GuildText).first(20);
        const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).first(20);

        if (textChannels.length > 0) {
          listEmbed.addFields({
            name: '📝 Salons texte',
            value: textChannels.map(c => `• ${c.name} (${c.id})`).join('\n'),
            inline: false
          });
        }

        if (voiceChannels.length > 0) {
          listEmbed.addFields({
            name: '🔊 Salons vocaux',
            value: voiceChannels.map(c => `• ${c.name} (${c.id})`).join('\n'),
            inline: false
          });
        }

        await interaction.reply({ embeds: [listEmbed], ephemeral: true });
        break;
    }
  },

  async handleRolesCommand(interaction, roleManager) {
    const action = interaction.options.getString('action');
    const targetUser = interaction.options.getUser('utilisateur');
    const targetRole = interaction.options.getRole('role');

    switch (action) {
      case 'list_roles':
        const roles = interaction.guild.roles.cache
          .filter(role => role.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position);

        const roleEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('🏷️ Liste des rôles')
          .setDescription(`**Total :** ${roles.size} rôle(s)`);

        const roleList = roles.first(30).map(role => {
          const memberCount = role.members.size;
          return `• **${role.name}** - ${memberCount} membre(s)`;
        }).join('\n');

        roleEmbed.addFields({
          name: 'Rôles',
          value: roleList || 'Aucun rôle',
          inline: false
        });

        if (roles.size > 30) {
          roleEmbed.setFooter({ text: `Affichage de 30/${roles.size} rôles` });
        }

        await interaction.reply({ embeds: [roleEmbed], ephemeral: true });
        break;

      case 'assign_role':
        if (!targetUser || !targetRole) {
          return await interaction.reply({ content: '❌ Utilisateur et rôle requis.', ephemeral: true });
        }

        const memberToAssign = interaction.guild.members.cache.get(targetUser.id);
        if (!memberToAssign) {
          return await interaction.reply({ content: '❌ Membre non trouvé sur le serveur.', ephemeral: true });
        }

        const assignSuccess = await roleManager.assignRoleToMember(memberToAssign, targetRole.name);
        
        if (assignSuccess) {
          const assignEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Rôle attribué')
            .setDescription(`Rôle **${targetRole.name}** attribué à **${targetUser.tag}**`);
          
          await interaction.reply({ embeds: [assignEmbed], ephemeral: true });
        } else {
          await interaction.reply({ content: "❌ Erreur lors de l'attribution du rôle.", ephemeral: true });
        }
        break;

      case 'remove_role':
        if (!targetUser || !targetRole) {
          return await interaction.reply({ content: '❌ Utilisateur et rôle requis.', ephemeral: true });
        }

        const memberToRemove = interaction.guild.members.cache.get(targetUser.id);
        if (!memberToRemove) {
          return await interaction.reply({ content: '❌ Membre non trouvé sur le serveur.', ephemeral: true });
        }

        const removeSuccess = await roleManager.removeRoleFromMember(memberToRemove, targetRole.name);
        
        if (removeSuccess) {
          const removeEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Rôle retiré')
            .setDescription(`Rôle **${targetRole.name}** retiré de **${targetUser.tag}**`);
          
          await interaction.reply({ embeds: [removeEmbed], ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ Erreur lors de la suppression du rôle.', ephemeral: true });
        }
        break;
    }
  },

  async handleStatsCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Statistiques générales
      const totalMembers = interaction.guild.memberCount;
      const onlineMembers = interaction.guild.members.cache.filter(member => member.presence?.status !== 'offline').size;
      
      // Statistiques de la base de données pour ce serveur
      const dbStats = await database.getServerStats(interaction.guild.id);
      const authenticatedUsers = await database.getServerUsers(interaction.guild.id);
      
      // Répartition par école
      const schoolStats = {};
      authenticatedUsers.forEach(user => {
        if (user.school) {
          schoolStats[user.school] = (schoolStats[user.school] || 0) + 1;
        }
      });

      // Statistiques des salons
      const textChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
      const voiceChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
      const categories = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

      const statsEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📊 Statistiques du serveur')
        .setDescription(`**${interaction.guild.name}**`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          {
            name: '👥 Membres',
            value: `**Total :** ${totalMembers}\n**Authentifiés :** ${authenticatedUsers.length}\n**En ligne :** ${onlineMembers}`,
            inline: true
          },
          {
            name: '📝 Salons',
            value: `**Texte :** ${textChannels}\n**Vocal :** ${voiceChannels}\n**Catégories :** ${categories}`,
            inline: true
          },
          {
            name: '🏷️ Rôles',
            value: `**Total :** ${interaction.guild.roles.cache.size}\n**Écoles :** ${Object.keys(SCHOOLS).length}`,
            inline: true
          }
        );

      // Répartition par école
      if (Object.keys(schoolStats).length > 0) {
        const schoolBreakdown = Object.entries(schoolStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([school, count]) => `**${SCHOOLS[school]?.name || school} :** ${count}`)
          .join('\n');

        statsEmbed.addFields({
          name: '🎓 Répartition par école',
          value: schoolBreakdown,
          inline: false
        });
      }

      statsEmbed.setFooter({ text: 'Campus Éducative Bordeaux' })
        .setTimestamp();

      await interaction.editReply({ embeds: [statsEmbed] });

    } catch (error) {
      console.error('❌ Erreur statistiques:', error);
      await interaction.editReply({ content: '❌ Erreur lors de la récupération des statistiques.' });
    }
  }
};