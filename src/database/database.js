import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import { dirname } from 'path';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/bot.db';

class Database {
  constructor() {
    this.db = null;
  }
  
  async initialize() {
    try {
      // Créer le dossier data s'il n'existe pas
      const dbDir = dirname(DATABASE_PATH);
      await fs.mkdir(dbDir, { recursive: true });
      
      // Ouvrir la base de données
      this.db = new sqlite3.Database(DATABASE_PATH);
      
      // Créer les tables
      await this.createTables();
      
      console.log('✅ Base de données initialisée');
    } catch (error) {
      console.error('❌ Erreur d\'initialisation de la base de données:', error);
      throw error;
    }
  }
  
  async createTables() {
    return new Promise((resolve, reject) => {
      const queries = [
        // Table des utilisateurs authentifiés (global, partagé entre serveurs)
        `CREATE TABLE IF NOT EXISTS users (
          discord_id TEXT PRIMARY KEY,
          myges_username TEXT UNIQUE NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT,
          school TEXT,
          class TEXT,
          year TEXT,
          student_id TEXT,
          is_teacher BOOLEAN DEFAULT 0,
          nickname TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Table des serveurs Discord configurés
        `CREATE TABLE IF NOT EXISTS servers (
          guild_id TEXT PRIMARY KEY,
          guild_name TEXT NOT NULL,
          owner_id TEXT,
          configured BOOLEAN DEFAULT 0,
          welcome_channel_id TEXT,
          log_channel_id TEXT,
          admin_role_ids TEXT, -- JSON array des rôles admin
          config_data TEXT, -- JSON pour config personnalisée
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Table de liaison utilisateurs-serveurs
        `CREATE TABLE IF NOT EXISTS user_servers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          discord_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          roles_data TEXT, -- JSON des rôles spécifiques au serveur
          server_nickname TEXT,
          is_active BOOLEAN DEFAULT 1,
          FOREIGN KEY (discord_id) REFERENCES users (discord_id),
          FOREIGN KEY (guild_id) REFERENCES servers (guild_id),
          UNIQUE(discord_id, guild_id)
        )`,
        
        // Table des rôles d'école par serveur
        `CREATE TABLE IF NOT EXISTS school_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT NOT NULL,
          school_code TEXT NOT NULL,
          role_id TEXT NOT NULL,
          role_name TEXT NOT NULL,
          color INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (guild_id) REFERENCES servers (guild_id),
          UNIQUE(guild_id, school_code)
        )`,
        
        // Table des statistiques par serveur
        `CREATE TABLE IF NOT EXISTS server_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT NOT NULL,
          date DATE NOT NULL,
          total_members INTEGER DEFAULT 0,
          authenticated_members INTEGER DEFAULT 0,
          new_members INTEGER DEFAULT 0,
          messages_count INTEGER DEFAULT 0,
          voice_minutes INTEGER DEFAULT 0,
          school_breakdown TEXT, -- JSON des stats par école
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (guild_id) REFERENCES servers (guild_id),
          UNIQUE(guild_id, date)
        )`,
        
        // Table des logs d'authentification
        `CREATE TABLE IF NOT EXISTS auth_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          discord_id TEXT NOT NULL,
          guild_id TEXT,
          myges_username TEXT NOT NULL,
          success BOOLEAN NOT NULL,
          ip_address TEXT,
          error_message TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Table de configuration par serveur
        `CREATE TABLE IF NOT EXISTS server_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (guild_id) REFERENCES servers (guild_id),
          UNIQUE(guild_id, key)
        )`
      ];
      
      let completed = 0;
      const total = queries.length;
      
      queries.forEach((query) => {
        this.db.run(query, (err) => {
          if (err) {
            console.error('❌ Erreur création table:', err);
            reject(err);
            return;
          }
          
          completed++;
          if (completed === total) {
            resolve();
          }
        });
      });
    });
  }
  
  // Méthodes pour les serveurs
  async createServer(serverData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO servers 
        (guild_id, guild_name, owner_id, configured, welcome_channel_id, log_channel_id, admin_role_ids, config_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        serverData.guild_id,
        serverData.guild_name,
        serverData.owner_id,
        serverData.configured ? 1 : 0,
        serverData.welcome_channel_id,
        serverData.log_channel_id,
        JSON.stringify(serverData.admin_role_ids || []),
        JSON.stringify(serverData.config_data || {})
      ];
      
      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
  
  async getServer(guildId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM servers WHERE guild_id = ?';
      
      this.db.get(query, [guildId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            // Parser les JSON
            row.admin_role_ids = JSON.parse(row.admin_role_ids || '[]');
            row.config_data = JSON.parse(row.config_data || '{}');
          }
          resolve(row || null);
        }
      });
    });
  }
  
  async getAllServers() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM servers ORDER BY created_at DESC';
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parser les JSON pour chaque serveur
          const servers = rows.map(row => ({
            ...row,
            admin_role_ids: JSON.parse(row.admin_role_ids || '[]'),
            config_data: JSON.parse(row.config_data || '{}')
          }));
          resolve(servers);
        }
      });
    });
  }
  
  async updateServerConfig(guildId, configData) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE servers 
        SET configured = ?, config_data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE guild_id = ?
      `;
      
      this.db.run(query, [1, JSON.stringify(configData), guildId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }
  
  // Méthodes pour les liaisons utilisateur-serveur
  async addUserToServer(discordId, guildId, serverData = {}) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO user_servers
        (discord_id, guild_id, roles_data, server_nickname, is_active)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const values = [
        discordId,
        guildId,
        JSON.stringify(serverData.roles || []),
        serverData.nickname,
        1
      ];
      
      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
  
  async getUserInServer(discordId, guildId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT us.*, u.* FROM user_servers us
        JOIN users u ON us.discord_id = u.discord_id
        WHERE us.discord_id = ? AND us.guild_id = ? AND us.is_active = 1
      `;
      
      this.db.get(query, [discordId, guildId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            row.roles_data = JSON.parse(row.roles_data || '[]');
          }
          resolve(row || null);
        }
      });
    });
  }
  
  async getServerUsers(guildId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT us.*, u.* FROM user_servers us
        JOIN users u ON us.discord_id = u.discord_id
        WHERE us.guild_id = ? AND us.is_active = 1
        ORDER BY us.joined_at DESC
      `;
      
      this.db.all(query, [guildId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const users = rows.map(row => ({
            ...row,
            roles_data: JSON.parse(row.roles_data || '[]')
          }));
          resolve(users);
        }
      });
    });
  }

  // Méthodes pour les utilisateurs
  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO users 
        (discord_id, myges_username, first_name, last_name, email, school, class, year, student_id, is_teacher, nickname, last_login)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const values = [
        userData.discord_id,
        userData.myges_username,
        userData.first_name,
        userData.last_name,
        userData.email,
        userData.school,
        userData.class,
        userData.year,
        userData.student_id,
        userData.is_teacher ? 1 : 0,
        userData.nickname
      ];
      
      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
  
  async getUserByDiscordId(discordId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE discord_id = ?';
      
      this.db.get(query, [discordId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }
  
  async getUserByMyGESUsername(username) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE myges_username = ?';
      
      this.db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }
  
  async getAllUsers() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users ORDER BY created_at DESC';
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  // Méthodes pour les logs d'authentification
  async logAuthentication(discordId, mygesUsername, success, errorMessage = null, guildId = null) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO auth_logs (discord_id, guild_id, myges_username, success, error_message)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [discordId, guildId, mygesUsername, success ? 1 : 0, errorMessage], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }
  
  // Méthodes pour la configuration par serveur
  async setConfig(guildId, key, value, description = null) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO server_config (guild_id, key, value, description, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(query, [guildId, key, value, description], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }
  
  async getConfig(guildId, key) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT value FROM server_config WHERE guild_id = ? AND key = ?';
      
      this.db.get(query, [guildId, key], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.value : null);
        }
      });
    });
  }
  
  // Statistiques par serveur
  async getServerStats(guildId) {
    return new Promise((resolve, reject) => {
      // Vérifier que la base de données est initialisée
      if (!this.db) {
        reject(new Error('Base de données non initialisée. Appelez initialize() d\'abord.'));
        return;
      }

      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN u.last_login > datetime('now', '-30 days') THEN 1 END) as active
        FROM user_servers us
        JOIN users u ON us.discord_id = u.discord_id
        WHERE us.guild_id = ? AND us.is_active = 1
      `;

      this.db.get(query, [guildId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || { total: 0, active: 0 });
        }
      });
    });
  }
  
  // Statistiques globales (tous serveurs)
  async getGlobalStats() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT COUNT(*) as total, COUNT(CASE WHEN last_login > datetime(\'now\', \'-30 days\') THEN 1 END) as active FROM users';
      
      this.db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
  
  async close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Erreur fermeture base de données:', err);
        } else {
          console.log('✅ Base de données fermée');
        }
      });
    }
  }
}

// Instance singleton
const database = new Database();

export default database;