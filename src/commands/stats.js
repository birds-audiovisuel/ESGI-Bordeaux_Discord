import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { SCHOOLS, ROLES } from '../config/schools.js';
import database from '../database/database.js';
import mygesService from '../services/mygesService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Afficher les statistiques du serveur')
    .addSubcommand(subcommand =>
      subcommand
        .setName('general')
        .setDescription('Statistiques générales du serveur')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ecoles')
        .setDescription('Répartition des membres par école')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('auth')
        .setDescription('Statistiques d\'authentification')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('activite')
        .setDescription('Statistiques d\'activité')
    ),

  async execute(interaction, client) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Déférer la réponse car les statistiques peuvent prendre du temps
      await interaction.deferReply();

      switch (subcommand) {
        case 'general':
          await this.handleGeneralStats(interaction);
          break;
        case 'ecoles':
          await this.handleSchoolStats(interaction);
          break;
        case 'auth':
          await this.handleAuthStats(interaction);
          break;
        case 'activite':
          await this.handleActivityStats(interaction);
          break;
        default:
          await interaction.editReply({ content: '❌ Sous-commande non reconnue.' });
      }

    } catch (error) {
      console.error('❌ Erreur commande stats:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de la récupération des statistiques.');

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  async handleGeneralStats(interaction) {
    try {
      const guild = interaction.guild;
      
      // Données de base pour ce serveur
      const totalMembers = guild.memberCount;
      const authenticatedUsers = await database.getServerUsers(guild.id);
      const authenticatedCount = authenticatedUsers.length;
      const authenticationRate = totalMembers > 0 ? ((authenticatedCount / totalMembers) * 100).toFixed(1) : 0;
      
      // Statistiques des membres en ligne
      const onlineMembers = guild.members.cache.filter(member =>
        member.presence?.status && member.presence.status !== 'offline'
      ).size;
      
      // Statistiques des salons
      const textChannels = guild.channels.cache.filter(c => c.isTextBased()).size;
      const voiceChannels = guild.channels.cache.filter(c => c.isVoiceBased()).size;
      const categories = guild.channels.cache.filter(c => c.type === 4).size; // CategoryChannel
      
      // Statistiques des rôles
      const totalRoles = guild.roles.cache.size;
      const schoolRoles = Object.keys(SCHOOLS).length;
      
      // Répartition étudiants/professeurs
      const students = authenticatedUsers.filter(user => !user.is_teacher).length;
      const teachers = authenticatedUsers.filter(user => user.is_teacher).length;
      
      // Date de création du serveur
      const serverAge = Math.floor((Date.now() - guild.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      const generalEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📊 Statistiques Générales du Campus')
        .setDescription(`**${guild.name}**\n*Serveur créé il y a ${serverAge} jours*`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          {
            name: '👥 Membres',
            value: [
              `**Total :** ${totalMembers}`,
              `**Authentifiés :** ${authenticatedCount} (${authenticationRate}%)`,
              `**En ligne :** ${onlineMembers}`,
              `**Étudiants :** ${students}`,
              `**Enseignants :** ${teachers}`
            ].join('\n'),
            inline: true
          },
          {
            name: '📝 Salons',
            value: [
              `**Texte :** ${textChannels}`,
              `**Vocal :** ${voiceChannels}`,
              `**Catégories :** ${categories}`,
              `**Total :** ${textChannels + voiceChannels + categories}`
            ].join('\n'),
            inline: true
          },
          {
            name: '🏷️ Rôles',
            value: [
              `**Total :** ${totalRoles}`,
              `**Écoles :** ${schoolRoles}`,
              `**Système :** 5`
            ].join('\n'),
            inline: true
          }
        )
        .setFooter({ 
          text: `Campus Éducative Bordeaux • ${Object.keys(SCHOOLS).length} écoles`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [generalEmbed] });

    } catch (error) {
      console.error('❌ Erreur statistiques générales:', error);
      await interaction.editReply({ content: '❌ Erreur lors de la récupération des statistiques générales.' });
    }
  },

  async handleSchoolStats(interaction) {
    try {
      const authenticatedUsers = await database.getServerUsers(interaction.guild.id);
      
      // Compter les membres par école
      const schoolCounts = {};
      Object.keys(SCHOOLS).forEach(school => {
        schoolCounts[school] = 0;
      });
      
      authenticatedUsers.forEach(user => {
        if (user.school && schoolCounts.hasOwnProperty(user.school)) {
          schoolCounts[user.school]++;
        }
      });
      
      // Trier par nombre de membres (décroissant)
      const sortedSchools = Object.entries(schoolCounts)
        .sort(([,a], [,b]) => b - a);
      
      const schoolEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🎓 Répartition par École')
        .setDescription(`**Total des étudiants authentifiés :** ${authenticatedUsers.length}`);

      // Ajouter les écoles avec des membres
      const schoolsWithMembers = sortedSchools.filter(([, count]) => count > 0);
      const schoolsWithoutMembers = sortedSchools.filter(([, count]) => count === 0);

      if (schoolsWithMembers.length > 0) {
        const schoolList = schoolsWithMembers.map(([schoolCode, count]) => {
          const schoolInfo = SCHOOLS[schoolCode];
          const percentage = authenticatedUsers.length > 0 ? 
            ((count / authenticatedUsers.length) * 100).toFixed(1) : '0.0';
          
          return `🎓 **${schoolInfo.name}** : ${count} membre(s) (${percentage}%)`;
        }).join('\n');

        schoolEmbed.addFields({
          name: '📈 Écoles avec des membres',
          value: schoolList,
          inline: false
        });
      }

      if (schoolsWithoutMembers.length > 0) {
        const emptySchoolList = schoolsWithoutMembers.map(([schoolCode]) => {
          const schoolInfo = SCHOOLS[schoolCode];
          return `• ${schoolInfo.name}`;
        }).join('\n');

        schoolEmbed.addFields({
          name: '📉 Écoles sans membre',
          value: emptySchoolList,
          inline: false
        });
      }

      // Ajouter des statistiques additionnelles
      const topSchool = schoolsWithMembers[0];
      if (topSchool) {
        const [topSchoolCode, topCount] = topSchool;
        schoolEmbed.addFields({
          name: '🏆 École la plus représentée',
          value: `**${SCHOOLS[topSchoolCode].name}** avec ${topCount} membre(s)`,
          inline: true
        });
      }

      const diversityIndex = schoolsWithMembers.length;
      schoolEmbed.addFields({
        name: '🌈 Diversité',
        value: `${diversityIndex}/${Object.keys(SCHOOLS).length} écoles représentées`,
        inline: true
      });

      schoolEmbed.setFooter({ text: 'Statistiques basées sur les utilisateurs authentifiés via MyGES' })
        .setTimestamp();

      await interaction.editReply({ embeds: [schoolEmbed] });

    } catch (error) {
      console.error('❌ Erreur statistiques écoles:', error);
      await interaction.editReply({ content: '❌ Erreur lors de la récupération des statistiques d\'école.' });
    }
  },

  async handleAuthStats(interaction) {
    try {
      // Récupérer toutes les données d'authentification pour ce serveur
      const authenticatedUsers = await database.getServerUsers(interaction.guild.id);
      const totalMembers = interaction.guild.memberCount;
      
      // Calculer les taux
      const authRate = totalMembers > 0 ? ((authenticatedUsers.length / totalMembers) * 100).toFixed(1) : 0;
      const unauthenticated = totalMembers - authenticatedUsers.length;
      
      // Statistiques temporelles
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const recentAuth24h = authenticatedUsers.filter(user => 
        new Date(user.last_login) >= last24h
      ).length;
      
      const recentAuthWeek = authenticatedUsers.filter(user => 
        new Date(user.created_at) >= lastWeek
      ).length;
      
      const recentAuthMonth = authenticatedUsers.filter(user => 
        new Date(user.created_at) >= lastMonth
      ).length;
      
      // Répartition par statut
      const students = authenticatedUsers.filter(user => !user.is_teacher).length;
      const teachers = authenticatedUsers.filter(user => user.is_teacher).length;
      
      const authEmbed = new EmbedBuilder()
        .setColor(0x9932cc)
        .setTitle('🔐 Statistiques d\'Authentification')
        .setDescription('Données sur l\'authentification MyGES du serveur')
        .addFields(
          {
            name: '📊 Vue d\'ensemble',
            value: [
              `**Authentifiés :** ${authenticatedUsers.length}/${totalMembers} (${authRate}%)`,
              `**Non-authentifiés :** ${unauthenticated}`,
              `**Taux d\'adoption :** ${authRate}%`
            ].join('\n'),
            inline: true
          },
          {
            name: '👥 Répartition',
            value: [
              `**Étudiants :** ${students}`,
              `**Enseignants :** ${teachers}`,
              `**Ratio E/P :** ${teachers > 0 ? (students/teachers).toFixed(1) : 'N/A'}`
            ].join('\n'),
            inline: true
          },
          {
            name: '📈 Évolution récente',
            value: [
              `**Dernières 24h :** ${recentAuth24h} connexions`,
              `**Dernière semaine :** ${recentAuthWeek} nouveaux`,
              `**Dernier mois :** ${recentAuthMonth} nouveaux`
            ].join('\n'),
            inline: true
          }
        );

      // Ajouter un graphique de progression (simulation textuelle)
      const progressBar = this.generateProgressBar(authRate, 100);
      authEmbed.addFields({
        name: '📈 Progression de l\'authentification',
        value: `${progressBar} ${authRate}%`,
        inline: false
      });

      // Recommandations basées sur le taux d'authentification
      let recommendation = '';
      if (authRate < 50) {
        recommendation = '⚠️ **Recommandation :** Taux d\'authentification faible. Considérez rappeler l\'obligation d\'authentification aux nouveaux membres.';
      } else if (authRate < 80) {
        recommendation = '📢 **Recommandation :** Bon taux d\'authentification. Continuez à encourager l\'authentification.';
      } else {
        recommendation = '🎉 **Excellent :** Très bon taux d\'authentification ! Le serveur est bien sécurisé.';
      }

      authEmbed.addFields({
        name: '💡 Analyse',
        value: recommendation,
        inline: false
      });

      authEmbed.setFooter({ text: 'Authentification via API MyGES' })
        .setTimestamp();

      await interaction.editReply({ embeds: [authEmbed] });

    } catch (error) {
      console.error('❌ Erreur statistiques auth:', error);
      await interaction.editReply({ content: '❌ Erreur lors de la récupération des statistiques d\'authentification.' });
    }
  },

  async handleActivityStats(interaction) {
    try {
      const guild = interaction.guild;
      
      // Statistiques des membres en ligne
      const presenceStats = {
        online: 0,
        idle: 0,
        dnd: 0,
        offline: 0
      };

      guild.members.cache.forEach(member => {
        if (member.presence?.status) {
          presenceStats[member.presence.status]++;
        } else {
          presenceStats.offline++;
        }
      });

      // Statistiques des salons vocaux
      const voiceStats = {
        totalVoiceChannels: guild.channels.cache.filter(c => c.isVoiceBased()).size,
        activeVoiceChannels: 0,
        membersInVoice: 0
      };

      guild.channels.cache
        .filter(channel => channel.isVoiceBased())
        .forEach(channel => {
          if (channel.members.size > 0) {
            voiceStats.activeVoiceChannels++;
            voiceStats.membersInVoice += channel.members.size;
          }
        });

      // Activité récente (basée sur les membres authentifiés récemment connectés sur ce serveur)
      const authenticatedUsers = await database.getServerUsers(interaction.guild.id);
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const activeToday = authenticatedUsers.filter(user => 
        new Date(user.last_login) >= last24h
      ).length;

      // Calculs de pourcentages
      const totalMembers = guild.memberCount;
      const onlinePercentage = totalMembers > 0 ? ((presenceStats.online / totalMembers) * 100).toFixed(1) : 0;
      const voiceUsage = voiceStats.totalVoiceChannels > 0 ? ((voiceStats.activeVoiceChannels / voiceStats.totalVoiceChannels) * 100).toFixed(1) : 0;

      const activityEmbed = new EmbedBuilder()
        .setColor(0xff6600)
        .setTitle('⚡ Statistiques d\'Activité')
        .setDescription('Activité en temps réel du serveur')
        .addFields(
          {
            name: '🟢 Présence des membres',
            value: [
              `🟢 **En ligne :** ${presenceStats.online} (${onlinePercentage}%)`,
              `🟡 **Absent :** ${presenceStats.idle}`,
              `🔴 **Occupé :** ${presenceStats.dnd}`,
              `⚫ **Hors ligne :** ${presenceStats.offline}`
            ].join('\n'),
            inline: true
          },
          {
            name: '🎤 Activité vocale',
            value: [
              `**Salons vocaux :** ${voiceStats.totalVoiceChannels}`,
              `**Salons actifs :** ${voiceStats.activeVoiceChannels}`,
              `**Membres en vocal :** ${voiceStats.membersInVoice}`,
              `**Taux d\'usage :** ${voiceUsage}%`
            ].join('\n'),
            inline: true
          },
          {
            name: '📈 Activité récente',
            value: [
              `**Actifs aujourd\'hui :** ${activeToday}`,
              `**Taux d\'engagement :** ${totalMembers > 0 ? ((activeToday / totalMembers) * 100).toFixed(1) : 0}%`,
              `**Pic d\'activité :** ${Math.max(presenceStats.online, presenceStats.idle, presenceStats.dnd)} membres`
            ].join('\n'),
            inline: true
          }
        );

      // Graphique de répartition des présences
      const presenceBar = this.generatePresenceBar(presenceStats, totalMembers);
      activityEmbed.addFields({
        name: '📊 Répartition des présences',
        value: presenceBar,
        inline: false
      });

      // Top 3 des salons vocaux les plus actifs
      const activeVoiceChannels = guild.channels.cache
        .filter(channel => channel.isVoiceBased() && channel.members.size > 0)
        .sort((a, b) => b.members.size - a.members.size)
        .first(3);

      if (activeVoiceChannels.length > 0) {
        const voiceList = activeVoiceChannels.map((channel, index) => {
          const emoji = ['🥇', '🥈', '🥉'][index] || '🏅';
          return `${emoji} **${channel.name}** : ${channel.members.size} membre(s)`;
        }).join('\n');

        activityEmbed.addFields({
          name: '🎤 Top salons vocaux actifs',
          value: voiceList,
          inline: false
        });
      }

      // Heure de mise à jour
      activityEmbed.setFooter({ text: 'Données en temps réel' })
        .setTimestamp();

      await interaction.editReply({ embeds: [activityEmbed] });

    } catch (error) {
      console.error('❌ Erreur statistiques activité:', error);
      await interaction.editReply({ content: '❌ Erreur lors de la récupération des statistiques d\'activité.' });
    }
  },

  // Fonction utilitaire pour générer une barre de progression
  generateProgressBar(current, max, length = 20) {
    const percentage = Math.min((current / max), 1);
    const filledLength = Math.round(length * percentage);
    const emptyLength = length - filledLength;
    
    const filledBar = '█'.repeat(filledLength);
    const emptyBar = '░'.repeat(emptyLength);
    
    return `${filledBar}${emptyBar}`;
  },

  // Fonction utilitaire pour générer un graphique de présence
  generatePresenceBar(stats, total) {
    const statuses = [
      { key: 'online', emoji: '🟢', color: 'En ligne' },
      { key: 'idle', emoji: '🟡', color: 'Absent' },
      { key: 'dnd', emoji: '🔴', color: 'Occupé' },
      { key: 'offline', emoji: '⚫', color: 'Hors ligne' }
    ];

    return statuses.map(status => {
      const count = stats[status.key];
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      const bar = this.generateProgressBar(count, total, 10);
      return `${status.emoji} ${status.color}: ${bar} ${count} (${percentage}%)`;
    }).join('\n');
  }
};