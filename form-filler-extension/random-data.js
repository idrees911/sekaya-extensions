// random-data.js - Generates random form data for testing

const RandomDataGenerator = {
  // Random first names
  firstNames: [
    'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica',
    'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra', 'Ashley',
    'Emily', 'Emma', 'Olivia', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Charlotte'
  ],

  // Random last names
  lastNames: [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
    'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King'
  ],

  // Random street names
  streetNames: [
    'Main', 'Oak', 'Maple', 'Cedar', 'Elm', 'Washington', 'Lake', 'Hill',
    'Park', 'Pine', 'First', 'Second', 'Third', 'Fourth', 'Fifth',
    'Sunset', 'River', 'Spring', 'Church', 'Center', 'Market', 'Water'
  ],

  // Random street types
  streetTypes: ['St', 'Ave', 'Rd', 'Blvd', 'Dr', 'Ln', 'Way', 'Ct', 'Pl'],

  // Random cities
  cities: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'Seattle', 'Denver', 'Boston', 'Portland', 'Miami', 'Atlanta', 'Detroit',
    'Nashville', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque'
  ],

  // Random states
  states: [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ],

  // Random companies
  companies: [
    'Tech Solutions Inc', 'Global Enterprises', 'Innovation Labs', 'Digital Dynamics',
    'Creative Studios', 'Apex Corporation', 'Summit Group', 'Horizon Technologies',
    'Nexus Systems', 'Quantum Industries', 'Velocity Corp', 'Pinnacle Solutions',
    'Fusion Enterprises', 'Catalyst Group', 'Momentum Inc', 'Vertex Technologies'
  ],

  // Random domains
  domains: ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'example.com'],

  // Customizable rules (can be overridden)
  rules: {
    phonePrefix: '+1',      // Default US format
    phonePattern: null,     // Custom pattern (e.g., '9665' for Saudi Arabia)
    emailDomain: null,      // Force specific email domain
    countryCode: null,      // Force specific country
    zipCodeLength: 5        // ZIP code length
  },

  // Set custom rules
  setRules(customRules) {
    this.rules = { ...this.rules, ...customRules };
  },

  // Reset rules to defaults
  resetRules() {
    this.rules = {
      phonePrefix: '+1',
      phonePattern: null,
      emailDomain: null,
      countryCode: null,
      zipCodeLength: 5
    };
  },

  // Generate random number in range
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Pick random item from array
  randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  // Generate random first name
  generateFirstName() {
    return this.randomItem(this.firstNames);
  },

  // Generate random last name
  generateLastName() {
    return this.randomItem(this.lastNames);
  },

  // Generate random email
  generateEmail(firstName, lastName) {
    const fn = firstName.toLowerCase();
    const ln = lastName.toLowerCase();
    const domain = this.rules.emailDomain || this.randomItem(this.domains);
    const patterns = [
      `${fn}.${ln}@${domain}`,
      `${fn}${ln}@${domain}`,
      `${fn}_${ln}@${domain}`,
      `${fn}${this.randomInt(1, 999)}@${domain}`,
      `${fn}.${ln}${this.randomInt(1, 99)}@${domain}`
    ];
    return this.randomItem(patterns);
  },

  // Generate random phone number
  generatePhone() {
    // If custom pattern is set (e.g., '9665' for Saudi Arabia)
    if (this.rules.phonePattern) {
      const pattern = this.rules.phonePattern;
      const remainingDigits = 10 - pattern.length; // Assuming 10 total digits
      let number = pattern;
      
      for (let i = 0; i < remainingDigits; i++) {
        number += this.randomInt(0, 9);
      }
      
      // Format: +966 5XX XXX XXX (for Saudi example)
      if (pattern === '9665') {
        return `+${number.substring(0, 3)} ${number.substring(3, 4)}${number.substring(4, 6)} ${number.substring(6, 9)} ${number.substring(9)}`;
      }
      
      // Generic formatting for other patterns
      return `+${number}`;
    }
    
    // Default US format
    const areaCode = this.randomInt(200, 999);
    const prefix = this.randomInt(200, 999);
    const lineNumber = this.randomInt(1000, 9999);
    return `${this.rules.phonePrefix} (${areaCode}) ${prefix}-${lineNumber}`;
  },

  // Generate random street address
  generateAddress() {
    const number = this.randomInt(1, 9999);
    const street = this.randomItem(this.streetNames);
    const type = this.randomItem(this.streetTypes);
    return `${number} ${street} ${type}`;
  },

  // Generate random city
  generateCity() {
    return this.randomItem(this.cities);
  },

  // Generate random state
  generateState() {
    return this.randomItem(this.states);
  },

  // Generate random ZIP code
  generateZipCode() {
    const length = this.rules.zipCodeLength || 5;
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(this.randomInt(min, max));
  },

  // Generate random country
  generateCountry() {
    if (this.rules.countryCode) {
      return this.rules.countryCode;
    }
    const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Saudi Arabia'];
    return this.randomItem(countries);
  },

  // Generate random company
  generateCompany() {
    return this.randomItem(this.companies);
  },

  // Generate random website
  generateWebsite(company) {
    const domain = company.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    const tlds = ['.com', '.net', '.org', '.io', '.co'];
    return `https://www.${domain}${this.randomItem(tlds)}`;
  },

  // Generate complete random data set
  generateRandomData() {
    const firstName = this.generateFirstName();
    const lastName = this.generateLastName();
    const company = this.generateCompany();

    return {
      firstName: firstName,
      lastName: lastName,
      email: this.generateEmail(firstName, lastName),
      phone: this.generatePhone(),
      address: this.generateAddress(),
      city: this.generateCity(),
      state: this.generateState(),
      zipCode: this.generateZipCode(),
      country: this.generateCountry(),
      company: company,
      website: this.generateWebsite(company)
    };
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RandomDataGenerator;
}
