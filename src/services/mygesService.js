import axios from 'axios';

class MyGESService {
  constructor() {
    this.baseURL = process.env.MYGES_API_URL || 'http://localhost:3001';
    this.apiKey = process.env.MYGES_API_KEY || '';
  }
  
  async authenticateUser(username, password) {
    try {
      const response = await axios.post(`${this.baseURL}/auth`, {
        username: username,
        password: password
      }, {
        timeout: 30000, // 30 secondes
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Discord-Bot-Campus-Bordeaux/1.0'
        }
      });
      
      if (response.data && response.data.success) {
        return {
          success: true,
          token: response.data.token,
          user: response.data.user
        };
      } else {
        return {
          success: false,
          error: 'Authentication failed'
        };
      }
      
    } catch (error) {
      console.error('❌ Erreur authentification MyGES:', error);
      
      if (error.response) {
        // Erreur de réponse du serveur
        return {
          success: false,
          error: error.response.data?.error || 'Authentication failed',
          status: error.response.status
        };
      } else if (error.request) {
        // Erreur de requête (pas de réponse)
        return {
          success: false,
          error: 'MyGES service unavailable'
        };
      } else {
        // Erreur de configuration
        return {
          success: false,
          error: 'Internal service error'
        };
      }
    }
  }
  
  async getUserAgenda(username, token) {
    try {
      const response = await axios.get(`${this.baseURL}/user/${username}/agenda`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      
      if (response.data && response.data.success) {
        return {
          success: true,
          agenda: response.data.agenda
        };
      } else {
        return {
          success: false,
          error: 'Failed to fetch agenda'
        };
      }
      
    } catch (error) {
      console.error('❌ Erreur récupération agenda:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch agenda'
      };
    }
  }
  
  async getUserGrades(username, token) {
    try {
      const response = await axios.get(`${this.baseURL}/user/${username}/grades`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      
      if (response.data && response.data.success) {
        return {
          success: true,
          grades: response.data.grades
        };
      } else {
        return {
          success: false,
          error: 'Failed to fetch grades'
        };
      }
      
    } catch (error) {
      console.error('❌ Erreur récupération notes:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch grades'
      };
    }
  }
  
  // Fonction utilitaire pour mapper les écoles MyGES vers nos codes
  mapSchoolToCode(schoolName) {
    // Mapping approximatif - à ajuster selon les vraies données MyGES
    const schoolMapping = {
      'ESGI': 'ESGI',
      'PPA': 'PPA',
      'École de Business': 'EDBS',
      'EFAB': 'EFAB',
      'EFET': 'EFET_CREA', // Par défaut créa
      'EFET Photographie': 'EFET_PHOTO',
      'EIML': 'EIML',
      'ESIS': 'ESIS',
      'ICAN': 'ICAN',
      'ISA': 'ISA',
      'ISFJ': 'ISFJ',
      'Maestris': 'MAESTRIS',
      'MODART': 'MODART',
      'PPA Sport': 'PPA_SPORT'
    };
    
    // Recherche exacte
    if (schoolMapping[schoolName]) {
      return schoolMapping[schoolName];
    }
    
    // Recherche approximative
    const lowerSchool = schoolName?.toLowerCase() || '';
    
    if (lowerSchool.includes('esgi')) return 'ESGI';
    if (lowerSchool.includes('ppa') && lowerSchool.includes('sport')) return 'PPA_SPORT';
    if (lowerSchool.includes('ppa')) return 'PPA';
    if (lowerSchool.includes('business') || lowerSchool.includes('edbs')) return 'EDBS';
    if (lowerSchool.includes('efab') || lowerSchool.includes('immobilier')) return 'EFAB';
    if (lowerSchool.includes('photo')) return 'EFET_PHOTO';
    if (lowerSchool.includes('efet') || lowerSchool.includes('créa') || lowerSchool.includes('design')) return 'EFET_CREA';
    if (lowerSchool.includes('eiml') || lowerSchool.includes('luxe')) return 'EIML';
    if (lowerSchool.includes('esis') || lowerSchool.includes('cinéma') || lowerSchool.includes('son')) return 'ESIS';
    if (lowerSchool.includes('ican') || lowerSchool.includes('jeux')) return 'ICAN';
    if (lowerSchool.includes('isa') || lowerSchool.includes('audiovisuel')) return 'ISA';
    if (lowerSchool.includes('isfj') || lowerSchool.includes('journalisme')) return 'ISFJ';
    if (lowerSchool.includes('maestris') || lowerSchool.includes('banque') || lowerSchool.includes('assurance')) return 'MAESTRIS';
    if (lowerSchool.includes('modart') || lowerSchool.includes('mode')) return 'MODART';
    
    // Par défaut, retourner ESGI si aucune correspondance
    console.warn(`⚠️  École non reconnue: "${schoolName}", attribution par défaut à ESGI`);
    return 'ESGI';
  }
  
  // Fonction pour nettoyer et formater un nom
  formatName(name) {
    if (!name) return '';
    
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Générer un pseudo Discord à partir des données utilisateur
  generateDiscordNickname(firstName, lastName) {
    const formattedFirst = this.formatName(firstName);
    const formattedLast = this.formatName(lastName);
    
    // Format: "Prénom NOM"
    return `${formattedFirst} ${formattedLast.toUpperCase()}`;
  }
}

// Instance singleton
const mygesService = new MyGESService();

export default mygesService;