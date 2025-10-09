import { ChannelType, PermissionFlagsBits, OverwriteType } from 'discord.js';
import { SCHOOLS, CAMPUS_CHANNELS, ROLES } from '../config/schools.js';
import RoleManager from './roleManager.js';

class ServerSetup {
  constructor(guild) {
    this.guild = guild;
    this.roleManager = new RoleManager(guild);
  }
  
  async initializeServer() {
    console.log('🚀 Initialisation complète du serveur...');
    
    try {
      // 1. Créer les rôles système
      await this.roleManager.createSystemRoles();
      
      // 2. Créer les rôles d'école
      await this.roleManager.createSchoolRoles();
      
      // 3. Organiser la hiérarchie des rôles
      await this.roleManager.setupRoleHierarchy();
      
      // 4. Créer la catégorie Campus
      await this.createCampusCategory();
      
      // 5. Créer les catégories et salons des écoles
      await this.createSchoolCategories();
      
      console.log('✅ Initialisation du serveur terminée !');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du serveur:', error);
      throw error;
    }
  }
  
  async createCampusCategory() {
    console.log('🏫 Création de la catégorie Campus...');
    
    try {
      // Vérifier si la catégorie existe déjà
      let campusCategory = this.guild.channels.cache.find(
        channel => channel.name === '🏫・CAMPUS' && channel.type === ChannelType.GuildCategory
      );
      
      if (!campusCategory) {
        // Permissions pour la catégorie Campus
        const campusPermissions = [
          {
            id: this.guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: await this.getRoleId(ROLES.AUTHENTICATED),
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak
            ]
          },
          {
            id: await this.getRoleId(ROLES.TEACHER),
            allow: [
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.MuteMembers
            ]
          },
          {
            id: await this.getRoleId(ROLES.MODERATOR),
            allow: [              
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.MoveMembers
            ]
          }
        ].filter(perm => perm.id); // Filtrer les rôles non trouvés
        
        campusCategory = await this.guild.channels.create({
          name: '🏫・CAMPUS',
          type: ChannelType.GuildCategory,
          permissionOverwrites: campusPermissions,
          reason: 'Création automatique de la catégorie Campus'
        });
        
        console.log('✅ Catégorie Campus créée');
      } else {
        console.log('ℹ️  Catégorie Campus existante');
      }
      
      // Créer les salons campus
      await this.createCampusChannels(campusCategory);
      
      return campusCategory;
      
    } catch (error) {
      console.error('❌ Erreur création catégorie Campus:', error);
      throw error;
    }
  }
  
  async createCampusChannels(category) {
    console.log('📝 Création des salons Campus...');
    
    const channelTypes = [
      { name: '📢・annonces-campus', type: ChannelType.GuildText, topic: 'Annonces officielles du campus Éducative Bordeaux' },
      { name: '💬・général-campus', type: ChannelType.GuildText, topic: 'Discussion générale entre toutes les écoles du campus' },
      { name: '🎉・événements', type: ChannelType.GuildText, topic: 'Événements inter-écoles et activités du campus' },
      { name: '❓・aide-générale', type: ChannelType.GuildText, topic: 'Entraide générale entre étudiants' },
      { name: '💡・suggestions', type: ChannelType.GuildText, topic: 'Suggestions pour améliorer la vie du campus' },
      { name: '☕・café-détente', type: ChannelType.GuildText, topic: 'Discussions détendues et hors-sujet' },
      { name: '🔊・Vocal Campus', type: ChannelType.GuildVoice, userLimit: 0 }
    ];
    
    for (const channelData of channelTypes) {
      try {
        // Vérifier si le salon existe déjà
        const existingChannel = this.guild.channels.cache.find(
          channel => channel.name === channelData.name && channel.parentId === category.id
        );
        
        if (!existingChannel) {
          const channelOptions = {
            name: channelData.name,
            type: channelData.type,
            parent: category.id,
            reason: 'Création automatique des salons Campus'
          };
          
          if (channelData.topic) {
            channelOptions.topic = channelData.topic;
          }
          
          if (channelData.userLimit !== undefined) {
            channelOptions.userLimit = channelData.userLimit;
          }
          
          // Permissions spéciales pour les annonces (lecture seule pour les étudiants)
          if (channelData.name.includes('annonces')) {
            channelOptions.permissionOverwrites = [
              {
                id: this.guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
              },
              {
                id: await this.getRoleId(ROLES.AUTHENTICATED),
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                deny: [PermissionFlagsBits.SendMessages]
              },
              {
                id: await this.getRoleId(ROLES.TEACHER),
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              },
              {
                id: await this.getRoleId(ROLES.MODERATOR),
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ManageMessages
                ]
              }
            ].filter(perm => perm.id);
          }
          
          const channel = await this.guild.channels.create(channelOptions);
          console.log(`✅ Salon Campus créé: ${channel.name}`);
        } else {
          console.log(`ℹ️  Salon Campus existant: ${existingChannel.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur création salon ${channelData.name}:`, error);
      }
    }
  }
  
  async createSchoolCategories() {
    console.log('🎓 Création des catégories d\'école...');
    
    for (const [schoolCode, schoolData] of Object.entries(SCHOOLS)) {
      try {
        await this.createSchoolCategory(schoolCode, schoolData);
      } catch (error) {
        console.error(`❌ Erreur création catégorie ${schoolData.name}:`, error);
      }
    }
  }
  
  async createSchoolCategory(schoolCode, schoolData) {
    const categoryName = `🎓・${schoolData.name.toUpperCase()}`;
    
    // Vérifier si la catégorie existe déjà
    let schoolCategory = this.guild.channels.cache.find(
      channel => channel.name === categoryName && channel.type === ChannelType.GuildCategory
    );
    
    if (!schoolCategory) {
      // Permissions pour la catégorie d'école
      const schoolPermissions = [
        {
          id: this.guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: await this.getRoleId(schoolData.name), // Rôle de l'école
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak
          ]
        },
        {
          id: await this.getRoleId(ROLES.TEACHER),
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.MuteMembers
          ]
        },
        {
          id: await this.getRoleId(ROLES.MODERATOR),
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.MoveMembers
          ]
        }
      ].filter(perm => perm.id);
      
      schoolCategory = await this.guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        permissionOverwrites: schoolPermissions,
        reason: `Création automatique de la catégorie ${schoolData.fullName}`
      });
      
      console.log(`✅ Catégorie créée: ${categoryName}`);
    } else {
      console.log(`ℹ️  Catégorie existante: ${categoryName}`);
    }
    
    // Créer les salons de l'école
    await this.createSchoolChannels(schoolCategory, schoolCode, schoolData);
    
    return schoolCategory;
  }
  
  async createSchoolChannels(category, schoolCode, schoolData) {
    const baseChannels = [
      { name: '💬・général', type: ChannelType.GuildText, topic: `Discussion générale ${schoolData.fullName}` },
      { name: '📋・projets', type: ChannelType.GuildText, topic: 'Projets étudiants, collaboration et entraide' },
      { name: '💼・stages', type: ChannelType.GuildText, topic: 'Offres de stage, retours d\'expérience, conseils' },
      { name: '❓・aide', type: ChannelType.GuildText, topic: 'Entraide technique et pédagogique' }
    ];
    
    // Ajouter les salons spécialisés de l'école
    const specializedChannels = schoolData.channels.slice(4).map(channelName => ({
      name: `🔧・${channelName}`,
      type: ChannelType.GuildText,
      topic: `Discussion spécialisée: ${channelName}`
    }));
    
    // Salon vocal principal
    const voiceChannels = [
      { 
        name: `🔊・${schoolData.name} Général`, 
        type: ChannelType.GuildVoice, 
        userLimit: 0 
      }
    ];
    
    const allChannels = [...baseChannels, ...specializedChannels, ...voiceChannels];
    
    for (const channelData of allChannels) {
      try {
        // Vérifier si le salon existe déjà
        const existingChannel = this.guild.channels.cache.find(
          channel => channel.name === channelData.name && channel.parentId === category.id
        );
        
        if (!existingChannel) {
          const channelOptions = {
            name: channelData.name,
            type: channelData.type,
            parent: category.id,
            reason: `Création automatique des salons ${schoolData.fullName}`
          };
          
          if (channelData.topic) {
            channelOptions.topic = channelData.topic;
          }
          
          if (channelData.userLimit !== undefined) {
            channelOptions.userLimit = channelData.userLimit;
          }
          
          const channel = await this.guild.channels.create(channelOptions);
          console.log(`✅ Salon créé: ${channel.name} (${schoolData.name})`);
          
          // Petit délai pour éviter les rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log(`ℹ️  Salon existant: ${existingChannel.name} (${schoolData.name})`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur création salon ${channelData.name}:`, error);
      }
    }
  }
  
  async getRoleId(roleName) {
    const role = this.guild.roles.cache.find(role => role.name === roleName);
    return role ? role.id : null;
  }
  
  // Fonction utilitaire pour créer des salons vocaux temporaires
  async setupDynamicVoiceChannels() {
    console.log('🎤 Configuration des salons vocaux dynamiques...');
    
    for (const [schoolCode, schoolData] of Object.entries(SCHOOLS)) {
      try {
        const categoryName = `🎓・${schoolData.name.toUpperCase()}`;
        const category = this.guild.channels.cache.find(
          channel => channel.name === categoryName && channel.type === ChannelType.GuildCategory
        );
        
        if (category) {
          // Créer un salon "Créer un salon" pour chaque école
          const createChannelName = `➕・Créer un salon ${schoolData.name}`;
          const existingCreateChannel = this.guild.channels.cache.find(
            channel => channel.name === createChannelName && channel.parentId === category.id
          );
          
          if (!existingCreateChannel) {
            await this.guild.channels.create({
              name: createChannelName,
              type: ChannelType.GuildVoice,
              parent: category.id,
              userLimit: 1, // Limite à 1 pour trigger la création
              reason: `Salon de création automatique pour ${schoolData.fullName}`
            });
            
            console.log(`✅ Salon de création vocale: ${createChannelName}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Erreur setup salons dynamiques ${schoolData.name}:`, error);
      }
    }
  }
}

export default ServerSetup;