import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import ServerSetup from '../utils/serverSetup.js';
import database from '../database/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Initialiser complètement le serveur du campus (rôles, catégories, salons)')
    .addBooleanOption(option =>
      option.setName('sans-myges')
        .setDescription('Configurer le serveur sans authentification MyGES (optionnel)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    try {
      // Vérification des permissions (propriétaire ou administrateur)
      const isOwner = interaction.user.id === interaction.guild.ownerId;
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isOwner && !isAdmin) {
        const noPermEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('❌ Permission refusée')
          .setDescription('Seuls le propriétaire du serveur et les administrateurs peuvent utiliser cette commande.');

        return await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
      }

      // Fonction pour mettre à jour le message avec la progression
      const updateProgress = async (step, currentStep, totalSteps, status, details = '') => {
        const progressBar = '█'.repeat(Math.floor((currentStep / totalSteps) * 20)) +
                           '░'.repeat(20 - Math.floor((currentStep / totalSteps) * 20));

        const progressEmbed = new EmbedBuilder()
          .setColor(status === 'error' ? 0xff0000 : (currentStep === totalSteps ? 0x00ff00 : 0x0099ff))
          .setTitle('🚀 Configuration du serveur Campus')
          .setDescription(
            `**Progression: ${currentStep}/${totalSteps}**\n` +
            `${progressBar} ${Math.floor((currentStep / totalSteps) * 100)}%\n\n` +
            `**Étape actuelle:** ${step}\n` +
            (details ? `📋 ${details}\n\n` : '\n') +
            `**État:** ${status === 'error' ? '❌ Erreur' : status === 'done' ? '✅ Terminé' : '⏳ En cours...'}`
          );

        if (status !== 'error') {
          progressEmbed.addFields({
            name: '📋 Étapes',
            value: [
              `${currentStep >= 1 ? '✅' : '⏳'} Initialisation base de données`,
              `${currentStep >= 2 ? '✅' : '⏳'} Création des rôles système`,
              `${currentStep >= 3 ? '✅' : '⏳'} Création des rôles d'école`,
              `${currentStep >= 4 ? '✅' : '⏳'} Organisation hiérarchie`,
              `${currentStep >= 5 ? '✅' : '⏳'} Création catégorie Campus`,
              `${currentStep >= 6 ? '✅' : '⏳'} Création catégories d'école`,
              `${currentStep >= 7 ? '✅' : '⏳'} Création des salons`,
              `${currentStep >= 8 ? '✅' : '⏳'} Configuration finale`
            ].join('\n'),
            inline: false
          });
        }

        progressEmbed.setFooter({ text: 'Campus Éducative Bordeaux - Configuration' })
                    .setTimestamp();

        await interaction.editReply({ embeds: [progressEmbed] });
      };

      // Réponse initiale
      await interaction.reply({ content: '🚀 Démarrage de la configuration...' });
      await updateProgress('Préparation...', 0, 8, 'loading');

      try {
        // Étape 1: Initialisation de la base de données
        await updateProgress('Initialisation de la base de données...', 1, 8, 'loading', 'Configuration des tables et structures');
        await database.initialize();

        // Enregistrer ce serveur en base
        const serverData = {
          guild_id: interaction.guild.id,
          guild_name: interaction.guild.name,
          owner_id: interaction.guild.ownerId,
          configured: true,
          welcome_channel_id: null,
          log_channel_id: null,
          admin_role_ids: [],
          config_data: {}
        };
        await database.createServer(serverData);

        // Étape 2-7: Initialisation du serveur avec progression
        const serverSetup = new ServerSetup(interaction.guild);

        // Récupérer l'option sans MyGES
        const sansMyges = interaction.options.getBoolean('sans-myges') || false;

        // Créer une version modifiée qui met à jour la progression
        const originalInitialize = serverSetup.initializeServer;
        serverSetup.initializeServer = async function() {
          await updateProgress('Création des rôles système...', 2, 8, 'loading', sansMyges ? 'Rôles de base (sans MyGES)' : 'Administrateur, Modérateur, Authentifié...');
          await this.roleManager.createSystemRoles();

          if (!sansMyges) {
            await updateProgress('Création des rôles d\'école...', 3, 8, 'loading', '14 écoles du campus Éducative');
            await this.roleManager.createSchoolRoles();
          } else {
            await updateProgress('Rôles d\'école ignorés...', 3, 8, 'loading', 'Mode sans MyGES activé');
          }

          await updateProgress('Organisation de la hiérarchie...', 4, 8, 'loading', 'Définition des permissions et ordre');
          await this.roleManager.setupRoleHierarchy();

          await updateProgress('Création de la catégorie Campus...', 5, 8, 'loading', 'Espaces communs et administration');
          await this.createCampusCategory();

          if (!sansMyges) {
            await updateProgress('Création des catégories d\'école...', 6, 8, 'loading', 'Espaces privés par établissement');
            await this.createSchoolCategories();
          } else {
            await updateProgress('Catégories d\'école ignorées...', 6, 8, 'loading', 'Mode sans MyGES activé');
          }

          await updateProgress('Création des salons...', 7, 8, 'loading', 'Salons texte, vocaux et forums');
          // Note: createChannels n'existe pas, on utilise les méthodes existantes
        };

        await serverSetup.initializeServer();

        // Étape 8: Configuration finale
        await updateProgress('Configuration finale...', 8, 8, 'loading', 'Salons vocaux dynamiques et paramètres');
        await serverSetup.setupDynamicVoiceChannels();

        // Sauvegarder la configuration
        await database.setConfig(interaction.guild.id, 'server_initialized', 'true', 'Serveur initialisé avec succès');
        await database.setConfig(interaction.guild.id, 'setup_date', new Date().toISOString(), 'Date d\'initialisation du serveur');
        await database.setConfig(interaction.guild.id, 'setup_by', interaction.user.id, 'ID de l\'utilisateur ayant effectué le setup');

        // Message final de succès avec progression complète
        await updateProgress('Configuration terminée !', 8, 8, 'done', 'Serveur Campus entièrement configuré');

        // Attendre un peu pour que l'utilisateur voie la progression complète
        setTimeout(async () => {
          try {
            // Message de succès détaillé
            const successEmbed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle('✅ Serveur initialisé avec succès !')
              .setDescription(
                `🎉 Le serveur ${sansMyges ? 'générique' : 'Campus Éducative Bordeaux'} est maintenant prêt !\n\n` +
                '**Configuration créée :**\n' +
                `• 🏷️ **Rôles système** : ${sansMyges ? 'Rôles de base seulement' : 'Authenticated, Étudiant, Professeur, Modérateur, Administrateur'}\n` +
                `• 🎓 **Rôles d\'école** : ${sansMyges ? 'Aucun (mode sans MyGES)' : '14 rôles pour chaque école du campus'}\n` +
                '• 🏫 **1 catégorie Campus** : Avec salons communautaires\n' +
                `• 🎓 **Catégories d\'école** : ${sansMyges ? 'Aucune (mode sans MyGES)' : 'Chacune avec ses salons spécialisés'}\n` +
                '• 🎤 **Salons vocaux dynamiques** : Création automatique à la demande\n' +
                '• 🗄️ **Base de données** : Initialisée et prête\n\n' +
                '**Prochaines étapes :**\n' +
                `${sansMyges ?
                  '1. Le serveur est prêt à utiliser directement\n' +
                  '2. Assignez manuellement les rôles aux membres\n' +
                  '3. Configurez les permissions selon vos besoins\n' +
                  '4. Utilisez `/welcome` pour afficher un message d\'accueil'
                  :
                  '1. Les nouveaux membres doivent utiliser `/auth` pour s\'authentifier\n' +
                  '2. L\'authentification MyGES est **obligatoire** pour accéder aux salons\n' +
                  '3. Les pseudos seront automatiquement formatés (Prénom NOM)\n' +
                  '4. Les rôles d\'école seront attribués automatiquement'
                }\n\n` +
                `💡 **Mode utilisé :** ${sansMyges ? '🔓 Sans authentification MyGES' : '🔐 Avec authentification MyGES'}`
              )
              .addFields(
                {
                  name: sansMyges ? '👥 Gestion manuelle' : '🔐 Authentification',
                  value: sansMyges ? 'Assignez les rôles manuellement aux membres' : 'Les membres utilisent `/auth` avec leurs identifiants MyGES',
                  inline: true
                },
                {
                  name: '📊 Statistiques',
                  value: 'Utilise `/stats` pour voir l\'activité du serveur',
                  inline: true
                },
                {
                  name: '⚙️ Administration',
                  value: 'Utilise `/admin` pour gérer le serveur',
                  inline: true
                }
              )
              .setFooter({
                text: `Initialisé par ${interaction.user.tag} • Campus Éducative Bordeaux`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
              })
              .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            // Log dans la console
            console.log('🎉 Setup complet terminé avec succès !');
            console.log(`📋 Serveur: ${interaction.guild.name} (${interaction.guild.id})`);
            console.log(`👤 Par: ${interaction.user.tag} (${interaction.user.id})`);
            console.log(`📊 Membres: ${interaction.guild.memberCount}`);
          } catch (err) {
            console.error('❌ Erreur message final:', err);
          }
        }, 2000); // Attendre 2 secondes
        
      } catch (setupError) {
        console.error('❌ Erreur lors du setup:', setupError);

        // Afficher l'erreur avec la progression
        await updateProgress('Erreur durant la configuration', 0, 8, 'error', setupError.message);

        setTimeout(async () => {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Erreur lors de l\'initialisation')
            .setDescription(
              'Une erreur est survenue pendant l\'initialisation du serveur.\n\n' +
              `**Erreur :** ${setupError.message}\n\n` +
              '**Actions recommandées :**\n' +
              '• Vérifier que le bot a les permissions nécessaires\n' +
              '• S\'assurer que le service MyGES API est démarré\n' +
              '• Consulter les logs du bot pour plus de détails\n' +
              '• Réessayer la commande si l\'erreur est temporaire'
            )
            .setFooter({ text: 'Contacte un développeur si le problème persiste' })
            .setTimestamp();

          await interaction.editReply({ embeds: [errorEmbed] });
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Erreur commande setup:', error);
      
      const globalErrorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erreur technique')
        .setDescription('Une erreur technique critique est survenue. Contacte un administrateur.');

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [globalErrorEmbed] });
      } else {
        await interaction.reply({ embeds: [globalErrorEmbed], ephemeral: true });
      }
    }
  }
};