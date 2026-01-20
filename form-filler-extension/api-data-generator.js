// api-data-generator.js - Generates random data using external APIs

const APIDataGenerator = {
  // API endpoints
  apis: {
    randomUser: 'https://randomuser.me/api/',
    // Backup: JSONPlaceholder for company/website data
    jsonPlaceholder: 'https://jsonplaceholder.typicode.com/users'
  },

  // Cache for API responses
  cache: {
    lastFetch: null,
    data: null,
    expiryTime: 60000 // 1 minute cache
  },

  // Check if cache is valid
  isCacheValid() {
    if (!this.cache.lastFetch || !this.cache.data) {
      return false;
    }
    const now = Date.now();
    return (now - this.cache.lastFetch) < this.cache.expiryTime;
  },

  // Fetch random user data from API
  async fetchRandomUser() {
    try {
      console.log('🌐 Fetching random user data from API...');
      
      const response = await fetch(this.apis.randomUser);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error('No results from API');
      }

      // Cache the response
      this.cache.lastFetch = Date.now();
      this.cache.data = data.results[0];

      console.log('✅ API data fetched successfully');
      return data.results[0];
    } catch (error) {
      console.error('❌ Error fetching from API:', error);
      throw error;
    }
  },

  // Get random user data (with caching)
  async getRandomUser() {
    if (this.isCacheValid()) {
      console.log('📦 Using cached API data');
      return this.cache.data;
    }

    return await this.fetchRandomUser();
  },

  // Convert API data to our format
  async generateRandomData(customRules = {}) {
    try {
      const user = await this.getRandomUser();

      // Extract data from API response
      const firstName = user.name.first;
      const lastName = user.name.last;
      const email = user.email;
      const phone = this.formatPhone(user.phone, customRules);
      const address = `${user.location.street.number} ${user.location.street.name}`;
      const city = user.location.city;
      const state = user.location.state;
      const zipCode = this.formatZipCode(user.location.postcode, customRules);
      const country = user.location.country;

      // Generate company and website (API doesn't provide these)
      const company = this.generateCompany();
      const website = this.generateWebsite(company);

      return {
        firstName,
        lastName,
        email: customRules.emailDomain ? 
          `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${customRules.emailDomain}` : 
          email,
        phone,
        address,
        city,
        state,
        zipCode,
        country: customRules.countryCode || country,
        company,
        website
      };
    } catch (error) {
      console.error('Error generating API data:', error);
      console.log('⚠️ Falling back to static data generator');
      
      // Fallback to static generator
      return RandomDataGenerator.generateRandomData();
    }
  },

  // Format phone number according to rules
  formatPhone(apiPhone, rules) {
    // If custom pattern is set (e.g., '9665' for Saudi Arabia)
    if (rules.phonePattern) {
      const pattern = rules.phonePattern;
      const remainingDigits = 10 - pattern.length;
      let number = pattern;
      
      for (let i = 0; i < remainingDigits; i++) {
        number += Math.floor(Math.random() * 10);
      }
      
      // Format: +966 5XX XXX XXX (for Saudi example)
      if (pattern === '9665') {
        return `+${number.substring(0, 3)} ${number.substring(3, 4)}${number.substring(4, 6)} ${number.substring(6, 9)} ${number.substring(9)}`;
      }
      
      return `+${number}`;
    }

    // Use API phone or format with custom prefix
    const cleanPhone = apiPhone.replace(/\D/g, '');
    const prefix = rules.phonePrefix || '+1';
    
    if (cleanPhone.length >= 10) {
      const areaCode = cleanPhone.substring(0, 3);
      const firstPart = cleanPhone.substring(3, 6);
      const secondPart = cleanPhone.substring(6, 10);
      return `${prefix} (${areaCode}) ${firstPart}-${secondPart}`;
    }

    return apiPhone; // Return as-is if can't format
  },

  // Format ZIP code according to rules
  formatZipCode(apiZip, rules) {
    const zipStr = String(apiZip).replace(/\D/g, '');
    const length = rules.zipCodeLength || 5;

    if (zipStr.length >= length) {
      return zipStr.substring(0, length);
    }

    // Pad with random digits if too short
    let zip = zipStr;
    while (zip.length < length) {
      zip += Math.floor(Math.random() * 10);
    }

    return zip;
  },

  // Generate random company name
  generateCompany() {
    const companies = [
      'Tech Solutions Inc', 'Global Enterprises', 'Innovation Labs', 'Digital Dynamics',
      'Creative Studios', 'Apex Corporation', 'Summit Group', 'Horizon Technologies',
      'Nexus Systems', 'Quantum Industries', 'Velocity Corp', 'Pinnacle Solutions',
      'Fusion Enterprises', 'Catalyst Group', 'Momentum Inc', 'Vertex Technologies'
    ];
    return companies[Math.floor(Math.random() * companies.length)];
  },

  // Generate website from company name
  generateWebsite(company) {
    const domain = company.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    const tlds = ['.com', '.net', '.org', '.io', '.co'];
    const tld = tlds[Math.floor(Math.random() * tlds.length)];
    return `https://www.${domain}${tld}`;
  },

  // Clear cache (useful for testing)
  clearCache() {
    this.cache.lastFetch = null;
    this.cache.data = null;
    console.log('🗑️ API cache cleared');
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIDataGenerator;
}
