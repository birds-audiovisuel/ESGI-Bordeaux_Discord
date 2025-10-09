import { PermissionFlagsBits } from 'discord.js';
import { SCHOOLS, ROLES } from '../config/schools.js';

class RoleManager {
  constructor(guild) {
    this.guild = guild;
  }
  
  async createSystemRoles() {
    console.log('🔄 Création des rôles système...');
    
    const systemRoles = [
      {
        name: ROLES.AUTHENTICATED,
        color: 0x00ff00,
        permissions: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.UseExternalEmojis,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.UseVAD
        ],
        hoist: false,
        mentionable: false
      },
      {
        name: ROLES.STUDENT,
        color: 0x0099ff,
        permissions: [],
        hoist: true,
        mentionable: true
      },
      {
        name: ROLES.TEACHER,
        color: 0xff9900,
        permissions: [
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers
        ],
        hoist: true,
        mentionable: true
      },
      {
        name: ROLES.MODERATOR,
        color: 0xff6600,
        permissions: [
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageNicknames,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.ModerateMembers
        ],
        hoist: true,
        mentionable: true
      },
      {
        name: ROLES.ADMIN,
        color: 0xff0000,
        permissions: [
          PermissionFlagsBits.Administrator
        ],
        hoist: true,
        mentionable: true
      }
    ];
    
    const createdRoles = [];
    
    for (const roleData of systemRoles) {
      try {
        // Vérifier si le rôle existe déjà
        let existingRole = this.guild.roles.cache.find(role => role.name === roleData.name);
        
        if (!existingRole) {
          const role = await this.guild.roles.create({
            name: roleData.name,
            color: roleData.color,
            permissions: roleData.permissions,
            hoist: roleData.hoist,
            mentionable: roleData.mentionable,
            reason: 'Création automatique des rôles système du campus'
          });
          
          createdRoles.push(role);
          console.log(`✅ Rôle système créé: ${role.name}`);
        } else {
          console.log(`ℹ️  Rôle système existant: ${existingRole.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur création rôle ${roleData.name}:`, error);
      }
    }
    
    return createdRoles;
  }
  
  async createSchoolRoles() {
    console.log('🔄 Création des rôles d\'école...');
    
    const createdRoles = [];
    
    for (const [schoolCode, schoolData] of Object.entries(SCHOOLS)) {
      try {
        // Vérifier si le rôle existe déjà
        let existingRole = this.guild.roles.cache.find(role => role.name === schoolData.name);
        
        if (!existingRole) {
          const role = await this.guild.roles.create({
            name: schoolData.name,
            color: schoolData.color,
            permissions: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak
            ],
            hoist: true,
            mentionable: true,
            reason: `Création automatique du rôle école ${schoolData.fullName}`
          });
          
          createdRoles.push({
            role: role,
            school: schoolCode,
            data: schoolData
          });
          
          console.log(`✅ Rôle école créé: ${role.name} (${schoolData.description})`);
        } else {
          console.log(`ℹ️  Rôle école existant: ${existingRole.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur création rôle école ${schoolData.name}:`, error);
      }
    }
    
    return createdRoles;
  }
  
  async setupRoleHierarchy() {
    console.log('🔄 Organisation de la hiérarchie des rôles...');
    
    try {
      // Définir l'ordre des rôles (du plus haut au plus bas)
      const roleOrder = [
        ROLES.ADMIN,
        ROLES.MODERATOR,
        ROLES.TEACHER,
        ...Object.values(SCHOOLS).map(school => school.name), // Tous les rôles d'école
        ROLES.STUDENT,
        ROLES.AUTHENTICATED
      ];
      
      // Réorganiser les rôles
      const botRole = this.guild.members.me.roles.highest;
      let position = botRole.position - 1;
      
      for (const roleName of roleOrder) {
        const role = this.guild.roles.cache.find(r => r.name === roleName);
        if (role && role.editable) {
          try {
            await role.setPosition(position);
            position--;
            console.log(`📍 Position mise à jour: ${roleName} -> ${position + 1}`);
          } catch (posError) {
            console.warn(`⚠️  Impossible de repositionner ${roleName}:`, posError.message);
          }
        }
      }
      
      console.log('✅ Hiérarchie des rôles organisée');
      
    } catch (error) {
      console.error('❌ Erreur organisation hiérarchie:', error);
    }
  }
  
  async getRoleByName(roleName) {
    return this.guild.roles.cache.find(role => role.name === roleName);
  }
  
  async assignRoleToMember(member, roleName) {
    try {
      const role = await this.getRoleByName(roleName);
      if (!role) {
        console.error(`❌ Rôle non trouvé: ${roleName}`);
        return false;
      }
      
      if (member.roles.cache.has(role.id)) {
        console.log(`ℹ️  Membre ${member.user.tag} a déjà le rôle ${roleName}`);
        return true;
      }
      
      await member.roles.add(role);
      console.log(`✅ Rôle ${roleName} attribué à ${member.user.tag}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Erreur attribution rôle ${roleName} à ${member.user.tag}:`, error);
      return false;
    }
  }
  
  async removeRoleFromMember(member, roleName) {
    try {
      const role = await this.getRoleByName(roleName);
      if (!role) {
        console.error(`❌ Rôle non trouvé: ${roleName}`);
        return false;
      }
      
      if (!member.roles.cache.has(role.id)) {
        console.log(`ℹ️  Membre ${member.user.tag} n'a pas le rôle ${roleName}`);
        return true;
      }
      
      await member.roles.remove(role);
      console.log(`✅ Rôle ${roleName} retiré de ${member.user.tag}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Erreur suppression rôle ${roleName} de ${member.user.tag}:`, error);
      return false;
    }
  }
  
  // Vérifier si un membre est authentifié
  isAuthenticated(member) {
    return member.roles.cache.some(role => role.name === ROLES.AUTHENTICATED);
  }
  
  // Obtenir l'école d'un membre
  getMemberSchool(member) {
    for (const [schoolCode, schoolData] of Object.entries(SCHOOLS)) {
      if (member.roles.cache.some(role => role.name === schoolData.name)) {
        return schoolCode;
      }
    }
    return null;
  }
  
  // Vérifier si un membre est professeur
  isTeacher(member) {
    return member.roles.cache.some(role => role.name === ROLES.TEACHER);
  }
  
  // Vérifier si un membre est modérateur, admin ou propriétaire
  isModerator(member) {
    // Vérifier si c'est le propriétaire du serveur
    const isOwner = member.id === member.guild.ownerId;

    // Vérifier les rôles et permissions
    const hasRoleOrPermission = member.roles.cache.some(role =>
      role.name === ROLES.MODERATOR ||
      role.name === ROLES.ADMIN ||
      role.permissions.has(PermissionFlagsBits.Administrator)
    );

    return isOwner || hasRoleOrPermission;
  }
}

export default RoleManager;