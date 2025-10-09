export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Gestion des commandes slash
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`❌ Commande ${interaction.commandName} non trouvée.`);
        return;
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`❌ Erreur lors de l'exécution de ${interaction.commandName}:`, error);
        
        const errorMessage = {
          content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }
    
    // Gestion des boutons
    else if (interaction.isButton()) {
      if (interaction.customId === 'start_auth') {
        try {
          await interaction.reply({
            content: 'Pour t\'authentifier, utilise la commande `/auth` ici ou en message privé avec le bot.',
            ephemeral: true
          });
        } catch (error) {
          console.error('❌ Erreur bouton start_auth:', error);
        }
      } else {
        console.log(`🔘 Bouton pressé: ${interaction.customId} par ${interaction.user.tag}`);
      }
    }
    
    // Gestion des menus déroulants
    else if (interaction.isStringSelectMenu()) {
      // Logique pour les menus de sélection (choix d'école, etc.)
      console.log(`📋 Menu sélectionné: ${interaction.customId} par ${interaction.user.tag}`);
    }
  }
};