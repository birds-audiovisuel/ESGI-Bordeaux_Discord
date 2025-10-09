import { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import mygesService from '../services/mygesService.js';
import database from '../database/database.js';
import { SCHOOLS, ROLES } from '../config/schools.js';

export default {
  data: new SlashCommandBuilder()
    .setName('auth')
    .setDescription('S\'authentifier avec ses identifiants MyGES pour accéder au serveur'),

  async execute(interaction, client) {
    try {
      // Vérifier si l'utilisateur est déjà authentifié sur ce serveur
      const existingUser = await database.getUserInServer(interaction.user.id, interaction.guild.id);
      
      if (existingUser) {
        const alreadyAuthEmbed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('⚠️ Déjà authentifié')
          .setDescription(
            `Tu es déjà authentifié en tant que **${existingUser.nickname}**.\n\n` +
            `📚 École: **${existingUser.school}**\n` +
            `📧 Email: **${existingUser.email}**\n\n` +
            `Si tu souhaites changer de compte, contacte un administrateur.`
          )
          .setTimestamp();
        
        return await interaction.reply({ embeds: [alreadyAuthEmbed], flags: MessageFlags.Ephemeral });
      }
      
      // Créer le modal d'authentification
      const authModal = new ModalBuilder()
        .setCustomId('myges_auth_modal')
        .setTitle('🔐 Authentification MyGES');
      
      // Champ nom d'utilisateur
      const usernameInput = new TextInputBuilder()
        .setCustomId('myges_username')
        .setLabel('Nom d\'utilisateur MyGES')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ton identifiant MyGES')
        .setRequired(true)
        .setMaxLength(50);
      
      // Champ mot de passe
      const passwordInput = new TextInputBuilder()
        .setCustomId('myges_password')
        .setLabel('Mot de passe MyGES')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ton mot de passe MyGES')
        .setRequired(true)
        .setMaxLength(100);
      
      // Créer les rangées
      const firstActionRow = new ActionRowBuilder().addComponents(usernameInput);
      const secondActionRow = new ActionRowBuilder().addComponents(passwordInput);
      
      // Ajouter les composants au modal
      authModal.addComponents(firstActionRow, secondActionRow);
      
      // Afficher le modal
      await interaction.showModal(authModal);
      
      // Écouter la soumission du modal
      const modalFilter = (modalInteraction) => {
        return modalInteraction.customId === 'myges_auth_modal' && modalInteraction.user.id === interaction.user.id;
      };
      
      try {
        const modalSubmission = await interaction.awaitModalSubmit({ 
          filter: modalFilter, 
          time: 300000 // 5 minutes
        });
        
        // Répondre immédiatement pour éviter l'expiration
        await modalSubmission.deferReply({ flags: MessageFlags.Ephemeral });
        
        // Récupérer les données du modal
        const username = modalSubmission.fields.getTextInputValue('myges_username').trim();
        const password = modalSubmission.fields.getTextInputValue('myges_password').trim();
        
        if (!username || !password) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Erreur')
            .setDescription('Le nom d\'utilisateur et le mot de passe sont requis.');
          
          return await modalSubmission.editReply({ embeds: [errorEmbed] });
        }
        
        // Vérifier si ce compte MyGES est déjà utilisé (global)
        const existingUsername = await database.getUserByMyGESUsername(username);
        if (existingUsername && existingUsername.discord_id !== interaction.user.id) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Compte déjà utilisé')
            .setDescription(
              `Ce compte MyGES est déjà associé à un autre utilisateur Discord.\n\n` +
              `Si c'est ton compte et que tu as changé de compte Discord, contacte un administrateur.`
            );
          
          await database.logAuthentication(interaction.user.id, username, false, 'Username already used', interaction.guild.id);
          return await modalSubmission.editReply({ embeds: [errorEmbed] });
        }
        
        // Authentification via le service MyGES
        const authResult = await mygesService.authenticateUser(username, password);
        
        if (!authResult.success) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Authentification échouée')
            .setDescription(
              `Impossible de se connecter à MyGES.\n\n` +
              `**Erreur:** ${authResult.error}\n\n` +
              `Vérifie tes identifiants et réessaie.`
            );
          
          await database.logAuthentication(interaction.user.id, username, false, authResult.error, interaction.guild.id);
          return await modalSubmission.editReply({ embeds: [errorEmbed] });
        }
        
        // Récupérer les informations utilisateur
        const userInfo = authResult.user;
        const schoolCode = mygesService.mapSchoolToCode(userInfo.school);
        const nickname = mygesService.generateDiscordNickname(userInfo.first_name, userInfo.last_name);
        
        // Sauvegarder l'utilisateur global (si nouveau)
        if (!existingUsername || existingUsername.discord_id !== interaction.user.id) {
          const userData = {
            discord_id: interaction.user.id,
            myges_username: username,
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            email: userInfo.email,
            school: schoolCode,
            class: userInfo.class,
            year: userInfo.year,
            student_id: userInfo.student_id,
            is_teacher: userInfo.is_teacher,
            nickname: nickname
          };
          
          await database.createUser(userData);
        }
        
        // Ajouter l'utilisateur à ce serveur spécifique
        await database.addUserToServer(interaction.user.id, interaction.guild.id, {
          nickname: nickname,
          roles: []
        });
        
        await database.logAuthentication(interaction.user.id, username, true, null, interaction.guild.id);
        
        // Attribuer les rôles Discord
        const member = interaction.member;
        if (member) {
          try {
            // Changer le pseudo
            await member.setNickname(nickname);
            
            // Attribuer le rôle authentifié
            const authenticatedRole = interaction.guild.roles.cache.find(role => role.name === ROLES.AUTHENTICATED);
            if (authenticatedRole) {
              await member.roles.add(authenticatedRole);
            }
            
            // Attribuer le rôle étudiant/professeur
            const statusRole = interaction.guild.roles.cache.find(role => 
              role.name === (userInfo.is_teacher ? ROLES.TEACHER : ROLES.STUDENT)
            );
            if (statusRole) {
              await member.roles.add(statusRole);
            }
            
            // Attribuer le rôle de l'école
            const schoolInfo = SCHOOLS[schoolCode];
            if (schoolInfo) {
              const schoolRole = interaction.guild.roles.cache.find(role => role.name === schoolInfo.name);
              if (schoolRole) {
                await member.roles.add(schoolRole);
              }
            }
            
          } catch (roleError) {
            console.error('❌ Erreur attribution rôles:', roleError);
          }
        }
        
        // Message de succès
        const successEmbed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('✅ Authentification réussie !')
          .setDescription(
            `Bienvenue **${nickname}** !\n\n` +
            `🎓 **École:** ${SCHOOLS[schoolCode]?.fullName || schoolCode}\n` +
            `📚 **Classe:** ${userInfo.class || 'Non spécifiée'}\n` +
            `👤 **Statut:** ${userInfo.is_teacher ? 'Enseignant' : 'Étudiant'}\n\n` +
            `Tu as maintenant accès aux salons de ton école et à la communauté du campus !`
          )
          .setFooter({ text: 'Authentifié via MyGES' })
          .setTimestamp();
        
        await modalSubmission.editReply({ embeds: [successEmbed] });
        
        console.log(`✅ Utilisateur authentifié: ${interaction.user.tag} -> ${nickname} (${schoolCode})`);
        
      } catch (modalError) {
        if (modalError.code === 'InteractionCollectorError') {
          // Timeout du modal
          console.log(`⏰ Timeout authentification pour ${interaction.user.tag}`);
        } else {
          console.error('❌ Erreur modal authentification:', modalError);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur commande auth:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erreur technique')
        .setDescription('Une erreur technique est survenue. Réessaie plus tard ou contacte un administrateur.');
      
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};