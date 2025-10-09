import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import RoleManager from '../utils/roleManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Commandes de modération')
    .addSubcommand(subcommand =>
      subcommand
        .setName('warn')
        .setDescription('Avertir un utilisateur')
        .addUserOption(option =>
          option.setName('utilisateur')
            .setDescription('Utilisateur à avertir')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('raison')
            .setDescription('Raison de l\'avertissement')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('mute')
        .setDescription('Mettre en sourdine un utilisateur')
        .addUserOption(option =>
          option.setName('utilisateur')
            .setDescription('Utilisateur à mute')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('durée')
            .setDescription('Durée du mute (ex: 10m, 1h, 1d)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('raison')
            .setDescription('Raison du mute')
            .setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unmute')
        .setDescription('Retirer la sourdine d\'un utilisateur')
        .addUserOption(option =>
          option.setName('utilisateur')
            .setDescription('Utilisateur à unmute')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('kick')
        .setDescription('Expulser un utilisateur')
        .addUserOption(option =>
          option.setName('utilisateur')
            .setDescription('Utilisateur à expulser')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('raison')
            .setDescription('Raison de l\'expulsion')
            .setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ban')
        .setDescription('Bannir un utilisateur')
        .addUserOption(option =>
          option.setName('utilisateur')
            .setDescription('Utilisateur à bannir')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('raison')
            .setDescription('Raison du bannissement')
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('supprimer_messages')
            .setDescription('Nombre de jours de messages à supprimer (0-7)')
            .setMinValue(0)
            .setMaxValue(7))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Supprimer des messages')
        .addIntegerOption(option =>
          option.setName('nombre')
            .setDescription('Nombre de messages à supprimer (1-100)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100))
        .addUserOption(option =>
          option.setName('utilisateur')
            .setDescription('Supprimer uniquement les messages de cet utilisateur')
            .setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    try {
      // Vérification des permissions
      const roleManager = new RoleManager(interaction.guild);
      if (!roleManager.isModerator(interaction.member) && !roleManager.isTeacher(interaction.member)) {
        const noPermEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('❌ Permission refusée')
          .setDescription('Seuls les modérateurs, administrateurs et professeurs peuvent utiliser cette commande.');
        
        return await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
      }

      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'warn':
          await this.handleWarn(interaction);
          break;
        case 'mute':
          await this.handleMute(interaction);
          break;
        case 'unmute':
          await this.handleUnmute(interaction);
          break;
        case 'kick':
          await this.handleKick(interaction);
          break;
        case 'ban':
          await this.handleBan(interaction);
          break;
        case 'clear':
          await this.handleClear(interaction);
          break;
        default:
          await interaction.reply({ content: '❌ Sous-commande non reconnue.', ephemeral: true });
      }

    } catch (error) {
      console.error('❌ Erreur commande modération:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de l\'exécution de la commande de modération.');

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },

  async handleWarn(interaction) {
    const targetUser = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison');
    
    const member = interaction.guild.members.cache.get(targetUser.id);
    if (!member) {
      return await interaction.reply({ content: '❌ Utilisateur non trouvé sur le serveur.', ephemeral: true });
    }

    // Vérifier si l'utilisateur peut être modéré
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return await interaction.reply({ content: '❌ Vous ne pouvez pas avertir cet utilisateur (rôle supérieur ou égal).', ephemeral: true });
    }

    try {
      // Créer l'embed d'avertissement
      const warnEmbed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Avertissement')
        .setDescription(`**${targetUser.tag}** a reçu un avertissement`)
        .addFields(
          { name: '👤 Utilisateur', value: `${targetUser} (${targetUser.tag})`, inline: true },
          { name: '👮 Modérateur', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '📝 Raison', value: reason, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      // Envoyer un message privé à l'utilisateur
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('⚠️ Avertissement reçu')
          .setDescription(`Vous avez reçu un avertissement sur le serveur **${interaction.guild.name}**`)
          .addFields(
            { name: '👮 Modérateur', value: interaction.user.tag, inline: true },
            { name: '📝 Raison', value: reason, inline: false }
          )
          .setFooter({ text: 'Respectez le règlement du serveur pour éviter d\'autres sanctions.' })
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.warn(`⚠️  Impossible d'envoyer un MP à ${targetUser.tag}:`, dmError.message);
      }

      await interaction.reply({ embeds: [warnEmbed] });

      console.log(`⚠️  ${targetUser.tag} averti par ${interaction.user.tag} pour: ${reason}`);

    } catch (error) {
      console.error('❌ Erreur warn:', error);
      await interaction.reply({ content: '❌ Erreur lors de l\'avertissement.', ephemeral: true });
    }
  },

  async handleMute(interaction) {
    const targetUser = interaction.options.getUser('utilisateur');
    const duration = interaction.options.getString('durée');
    const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
    
    const member = interaction.guild.members.cache.get(targetUser.id);
    if (!member) {
      return await interaction.reply({ content: '❌ Utilisateur non trouvé sur le serveur.', ephemeral: true });
    }

    // Vérifier si l'utilisateur peut être modéré
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return await interaction.reply({ content: '❌ Vous ne pouvez pas mute cet utilisateur (rôle supérieur ou égal).', ephemeral: true });
    }

    // Parser la durée
    const timeMs = this.parseDuration(duration);
    if (!timeMs) {
      return await interaction.reply({ content: '❌ Format de durée invalide. Utilisez: 10m, 1h, 2d, etc.', ephemeral: true });
    }

    try {
      // Appliquer le timeout Discord
      await member.timeout(timeMs, reason);

      const muteEmbed = new EmbedBuilder()
        .setColor(0xff6600)
        .setTitle('🔇 Utilisateur mis en sourdine')
        .setDescription(`**${targetUser.tag}** a été mis en sourdine`)
        .addFields(
          { name: '👤 Utilisateur', value: `${targetUser} (${targetUser.tag})`, inline: true },
          { name: '👮 Modérateur', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '⏱️ Durée', value: duration, inline: true },
          { name: '📝 Raison', value: reason, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      // Message privé
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xff6600)
          .setTitle('🔇 Vous avez été mis en sourdine')
          .setDescription(`Vous avez été mis en sourdine sur le serveur **${interaction.guild.name}**`)
          .addFields(
            { name: '👮 Modérateur', value: interaction.user.tag, inline: true },
            { name: '⏱️ Durée', value: duration, inline: true },
            { name: '📝 Raison', value: reason, inline: false }
          )
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.warn(`⚠️  Impossible d'envoyer un MP à ${targetUser.tag}`);
      }

      await interaction.reply({ embeds: [muteEmbed] });

      console.log(`🔇 ${targetUser.tag} mute par ${interaction.user.tag} pour ${duration}: ${reason}`);

    } catch (error) {
      console.error('❌ Erreur mute:', error);
      await interaction.reply({ content: '❌ Erreur lors du mute. Vérifiez mes permissions.', ephemeral: true });
    }
  },

  async handleUnmute(interaction) {
    const targetUser = interaction.options.getUser('utilisateur');
    
    const member = interaction.guild.members.cache.get(targetUser.id);
    if (!member) {
      return await interaction.reply({ content: '❌ Utilisateur non trouvé sur le serveur.', ephemeral: true });
    }

    try {
      await member.timeout(null);

      const unmuteEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🔊 Sourdine retirée')
        .setDescription(`**${targetUser.tag}** n'est plus en sourdine`)
        .addFields(
          { name: '👤 Utilisateur', value: `${targetUser} (${targetUser.tag})`, inline: true },
          { name: '👮 Modérateur', value: `${interaction.user} (${interaction.user.tag})`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [unmuteEmbed] });

      console.log(`🔊 ${targetUser.tag} unmute par ${interaction.user.tag}`);

    } catch (error) {
      console.error('❌ Erreur unmute:', error);
      await interaction.reply({ content: '❌ Erreur lors du unmute.', ephemeral: true });
    }
  },

  async handleKick(interaction) {
    const targetUser = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
    
    const member = interaction.guild.members.cache.get(targetUser.id);
    if (!member) {
      return await interaction.reply({ content: '❌ Utilisateur non trouvé sur le serveur.', ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return await interaction.reply({ content: '❌ Vous ne pouvez pas expulser cet utilisateur.', ephemeral: true });
    }

    try {
      // Message privé avant l'expulsion
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xff3300)
          .setTitle('👢 Vous avez été expulsé')
          .setDescription(`Vous avez été expulsé du serveur **${interaction.guild.name}**`)
          .addFields(
            { name: '👮 Modérateur', value: interaction.user.tag, inline: true },
            { name: '📝 Raison', value: reason, inline: false }
          )
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.warn(`⚠️  Impossible d'envoyer un MP à ${targetUser.tag}`);
      }

      await member.kick(reason);

      const kickEmbed = new EmbedBuilder()
        .setColor(0xff3300)
        .setTitle('👢 Utilisateur expulsé')
        .setDescription(`**${targetUser.tag}** a été expulsé du serveur`)
        .addFields(
          { name: '👤 Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: '👮 Modérateur', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '📝 Raison', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [kickEmbed] });

      console.log(`👢 ${targetUser.tag} expulsé par ${interaction.user.tag}: ${reason}`);

    } catch (error) {
      console.error('❌ Erreur kick:', error);
      await interaction.reply({ content: '❌ Erreur lors de l\'expulsion.', ephemeral: true });
    }
  },

  async handleBan(interaction) {
    const targetUser = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
    const deleteMessageDays = interaction.options.getInteger('supprimer_messages') || 0;
    
    const member = interaction.guild.members.cache.get(targetUser.id);
    
    if (member && member.roles.highest.position >= interaction.member.roles.highest.position) {
      return await interaction.reply({ content: '❌ Vous ne pouvez pas bannir cet utilisateur.', ephemeral: true });
    }

    try {
      // Message privé avant le ban (si le membre est sur le serveur)
      if (member) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🔨 Vous avez été banni')
            .setDescription(`Vous avez été banni du serveur **${interaction.guild.name}**`)
            .addFields(
              { name: '👮 Modérateur', value: interaction.user.tag, inline: true },
              { name: '📝 Raison', value: reason, inline: false }
            )
            .setTimestamp();

          await member.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.warn(`⚠️  Impossible d'envoyer un MP à ${targetUser.tag}`);
        }
      }

      await interaction.guild.members.ban(targetUser, { 
        reason: reason,
        deleteMessageDays: deleteMessageDays
      });

      const banEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔨 Utilisateur banni')
        .setDescription(`**${targetUser.tag}** a été banni du serveur`)
        .addFields(
          { name: '👤 Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: '👮 Modérateur', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '📝 Raison', value: reason, inline: false }
        );

      if (deleteMessageDays > 0) {
        banEmbed.addFields({ name: '🗑️ Messages supprimés', value: `${deleteMessageDays} jour(s)`, inline: true });
      }

      banEmbed.setTimestamp();

      await interaction.reply({ embeds: [banEmbed] });

      console.log(`🔨 ${targetUser.tag} banni par ${interaction.user.tag}: ${reason}`);

    } catch (error) {
      console.error('❌ Erreur ban:', error);
      await interaction.reply({ content: '❌ Erreur lors du bannissement.', ephemeral: true });
    }
  },

  async handleClear(interaction) {
    const amount = interaction.options.getInteger('nombre');
    const targetUser = interaction.options.getUser('utilisateur');

    if (!interaction.channel.isTextBased()) {
      return await interaction.reply({ content: '❌ Cette commande ne peut être utilisée que dans un salon texte.', ephemeral: true });
    }

    try {
      let messages;
      
      if (targetUser) {
        // Récupérer plus de messages pour filtrer par utilisateur
        const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
        messages = fetchedMessages.filter(msg => msg.author.id === targetUser.id).first(amount);
      } else {
        messages = await interaction.channel.messages.fetch({ limit: amount });
      }

      if (messages.size === 0) {
        return await interaction.reply({ content: '❌ Aucun message à supprimer.', ephemeral: true });
      }

      await interaction.channel.bulkDelete(messages, true);

      const clearEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🧹 Messages supprimés')
        .setDescription(`**${messages.size}** message(s) supprimé(s)`)
        .addFields(
          { name: '👮 Modérateur', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '📍 Salon', value: interaction.channel.toString(), inline: true }
        );

      if (targetUser) {
        clearEmbed.addFields({ name: '👤 Utilisateur ciblé', value: `${targetUser} (${targetUser.tag})`, inline: true });
      }

      clearEmbed.setTimestamp();

      const reply = await interaction.reply({ embeds: [clearEmbed] });
      
      // Supprimer le message de confirmation après 5 secondes
      setTimeout(async () => {
        try {
          await reply.delete();
        } catch (deleteError) {
          console.warn('⚠️  Impossible de supprimer le message de confirmation:', deleteError.message);
        }
      }, 5000);

      console.log(`🧹 ${messages.size} messages supprimés par ${interaction.user.tag} dans ${interaction.channel.name}`);

    } catch (error) {
      console.error('❌ Erreur clear:', error);
      await interaction.reply({ content: '❌ Erreur lors de la suppression des messages.', ephemeral: true });
    }
  },

  parseDuration(duration) {
    const regex = /^(\d+)([smhd])$/;
    const match = duration.match(regex);
    
    if (!match) return null;
    
    const amount = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
      s: 1000,          // secondes
      m: 60 * 1000,     // minutes
      h: 60 * 60 * 1000, // heures
      d: 24 * 60 * 60 * 1000 // jours
    };
    
    return amount * multipliers[unit];
  }
};