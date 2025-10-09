import { ActivityType } from 'discord.js';

export default {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`🎯 Bot connecté en tant que ${client.user.tag}`);
    console.log(`📊 Connecté à ${client.guilds.cache.size} serveur(s)`);
    console.log(`👥 ${client.users.cache.size} utilisateurs en cache`);
    
    // Définir le statut du bot
    client.user.setActivity('Campus Éducative Bordeaux | /auth pour commencer', {
      type: ActivityType.Watching
    });
    
    console.log('✅ Bot prêt et opérationnel !');
  }
};