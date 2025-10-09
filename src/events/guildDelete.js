import database from '../database/database.js';

export default {
  name: 'guildDelete',
  async execute(guild, client) {
    console.log(`👋 Bot retiré du serveur: ${guild.name} (${guild.id})`);
    
    try {
      // Marquer tous les utilisateurs de ce serveur comme inactifs
      // (Ne pas supprimer complètement car ils peuvent être sur d'autres serveurs)
      const serverUsers = await database.getServerUsers(guild.id);
      
      for (const user of serverUsers) {
        // Désactiver l'utilisateur sur ce serveur spécifiquement
        await database.db.run(
          'UPDATE user_servers SET is_active = 0 WHERE discord_id = ? AND guild_id = ?',
          [user.discord_id, guild.id]
        );
      }
      
      // Optionnel: Marquer le serveur comme supprimé plutôt que de le supprimer
      await database.db.run(
        'UPDATE servers SET configured = 0, config_data = ? WHERE guild_id = ?',
        [JSON.stringify({ 
          removed_at: new Date().toISOString(),
          removed_reason: 'Bot removed from server'
        }), guild.id]
      );
      
      console.log(`✅ Données nettoyées pour ${guild.name}`);
      console.log(`📊 ${serverUsers.length} utilisateur(s) désactivé(s) sur ce serveur`);
      
      // Log pour les statistiques
      console.log(`📉 Serveur perdu:`);
      console.log(`   - Nom: ${guild.name}`);
      console.log(`   - ID: ${guild.id}`);
      console.log(`   - Utilisateurs authentifiés: ${serverUsers.length}`);
      
    } catch (error) {
      console.error(`❌ Erreur lors du nettoyage pour ${guild.name}:`, error);
    }
  }
};