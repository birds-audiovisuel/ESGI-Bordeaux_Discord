import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import database from '../database/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('global')
    .setDescription('Statistiques globales du bot (tous serveurs)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Statistiques globales')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('servers')
        .setDescription('Liste des serveurs connectés')
    ),

  async execute(interaction, client) {
    try {
      // Vérification que l'utilisateur est développeur/propriétaire du bot
      const botOwnerId = process.env.BOT_OWNER_ID;
      if (botOwnerId && interaction.user.id !== botOwnerId) {
        const noPermEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('❌ Permission refusée')
          .setDescription('Seul le propriétaire du bot peut utiliser cette commande.');
        
        return await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
      }

      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'stats':
          await this.handleGlobalStats(interaction, client);
          break;
        case 'servers':
          await this.handleServersList(interaction, client);
          break;
        default:
          await interaction.reply({ content: '❌ Sous-commande non reconnue.', ephemeral: true });
      }

    } catch (error) {
      console.error('❌ Erreur commande global:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de l\'exécution de la commande.');

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },

  async handleGlobalStats(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Statistiques Discord globales
      const totalGuilds = client.guilds.cache.size;
      const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      
      // Statistiques de la base de données
      const allServers = await database.getAllServers();
      const configuredServers = allServers.filter(server => server.configured).length;
      const globalStats = await database.getGlobalStats();
      
      // Statistiques d'authentification par serveur
      const serverStats = [];
      for (const server of allServers.slice(0, 10)) { // Top 10 serveurs
        const guild = client.guilds.cache.get(server.guild_id);
        if (guild) {
          const serverUsers = await database.getServerUsers(server.guild_id);
          serverStats.push({
            name: guild.name,
            members: guild.memberCount,
            authenticated: serverUsers.length,
            rate: guild.memberCount > 0 ? ((serverUsers.length / guild.memberCount) * 100).toFixed(1) : '0'
          });
        }
      }
      
      // Embed des statistiques globales
      const statsEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🌍 Statistiques Globales du Bot')
        .setDescription('Vue d\'ensemble de tous les serveurs connectés')
        .addFields(
          {
            name: '🤖 Bot Discord',
            value: [
              `**Serveurs connectés :** ${totalGuilds}`,
              `**Serveurs configurés :** ${configuredServers}`,
              `**Utilisateurs totaux :** ${totalUsers.toLocaleString()}`,
              `**Uptime :** ${this.formatUptime(client.uptime)}`
            ].join('\n'),
            inline: true
          },
          {
            name: '🗄️ Base de données',
            value: [
              `**Utilisateurs uniques :** ${globalStats.total}`,
              `**Utilisateurs actifs :** ${globalStats.active}`,
              `**Taux global :** ${globalStats.total > 0 ? ((globalStats.active / globalStats.total) * 100).toFixed(1) : '0'}%`
            ].join('\n'),
            inline: true
          },
          {
            name: '📊 Performance',
            value: [
              `**Mémoire utilisée :** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
              `**Version Node.js :** ${process.version}`,
              `**Ping :** ${client.ws.ping}ms`
            ].join('\n'),
            inline: true
          }
        )
        .setTimestamp();

      // Top serveurs si disponible
      if (serverStats.length > 0) {
        const topServers = serverStats
          .sort((a, b) => b.authenticated - a.authenticated)
          .slice(0, 5)
          .map((server, index) => {
            const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
            return `${medal} **${server.name}** : ${server.authenticated}/${server.members} (${server.rate}%)`;
          })
          .join('\n');

        statsEmbed.addFields({
          name: '🏆 Top 5 Serveurs (par utilisateurs authentifiés)',
          value: topServers,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [statsEmbed] });

    } catch (error) {
      console.error('❌ Erreur statistiques globales:', error);
      await interaction.editReply({ content: '❌ Erreur lors de la récupération des statistiques globales.' });
    }
  },

  async handleServersList(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const allServers = await database.getAllServers();
      const guilds = client.guilds.cache;

      const serversEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🏠 Liste des Serveurs')
        .setDescription(`**Total :** ${guilds.size} serveur(s) connecté(s)`);

      // Serveurs connectés et configurés
      const connectedConfigured = [];
      const connectedNotConfigured = [];
      const disconnectedServers = [];

      for (const server of allServers) {
        const guild = guilds.get(server.guild_id);
        
        if (guild) {
          const serverUsers = await database.getServerUsers(server.guild_id);
          const info = `**${guild.name}** (${guild.memberCount} membres, ${serverUsers.length} auth)`;
          
          if (server.configured) {
            connectedConfigured.push(info);
          } else {
            connectedNotConfigured.push(info);
          }
        } else {
          disconnectedServers.push(`**${server.guild_name}** (Déconnecté)`);
        }
      }

      // Nouveaux serveurs (connectés mais pas en base)
      const newServers = guilds.filter(guild => 
        !allServers.find(server => server.guild_id === guild.id)
      ).map(guild => `**${guild.name}** (${guild.memberCount} membres) - NOUVEAU`);

      if (connectedConfigured.length > 0) {
        serversEmbed.addFields({
          name: '✅ Serveurs configurés',
          value: connectedConfigured.slice(0, 10).join('\n') + (connectedConfigured.length > 10 ? `\n... et ${connectedConfigured.length - 10} autres` : ''),
          inline: false
        });
      }

      if (connectedNotConfigured.length > 0) {
        serversEmbed.addFields({
          name: '⚠️ Serveurs non configurés',
          value: connectedNotConfigured.slice(0, 5).join('\n') + (connectedNotConfigured.length > 5 ? `\n... et ${connectedNotConfigured.length - 5} autres` : ''),
          inline: false
        });
      }

      if (newServers.length > 0) {
        serversEmbed.addFields({
          name: '🆕 Nouveaux serveurs',
          value: newServers.slice(0, 5).join('\n') + (newServers.length > 5 ? `\n... et ${newServers.length - 5} autres` : ''),
          inline: false
        });
      }

      if (disconnectedServers.length > 0) {
        serversEmbed.addFields({
          name: '💔 Serveurs déconnectés',
          value: disconnectedServers.slice(0, 5).join('\n') + (disconnectedServers.length > 5 ? `\n... et ${disconnectedServers.length - 5} autres` : ''),
          inline: false
        });
      }

      serversEmbed.setFooter({ text: 'Statistiques en temps réel' })
        .setTimestamp();

      await interaction.editReply({ embeds: [serversEmbed] });

    } catch (error) {
      console.error('❌ Erreur liste serveurs:', error);
      await interaction.editReply({ content: '❌ Erreur lors de la récupération de la liste des serveurs.' });
    }
  },

  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}j ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
};