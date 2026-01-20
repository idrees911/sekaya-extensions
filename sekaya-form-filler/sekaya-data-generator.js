// sekaya-data-generator.js - Generates Saudi-specific data for Sekaya forms

const SekayaDataGenerator = {
  // Customizable rules
  rules: {
    phonePattern: '9665',   // Default Saudi pattern
    emailDomain: null,      // Force specific email domain
    nationalIdPrefix: null, // Force National ID start (1 for Citizen, 2 for Resident)
    zipCodeLength: 5,       // Default Saudi ZIP length
    country: 'Saudi Arabia', // Default country
    registrationNumberPattern: null, // Custom reg number pattern
    registrationNumberLength: 10,  // Target length (min 3, max 100)
    ibanPrefix: 'SA',       // Default Saudi IBAN prefix
    accountNumberPrefix: null, // Custom account number prefix
    accountNumberLength: 15    // Default Saudi account length
  },

  // Set custom rules
  setRules(customRules) {
    this.rules = { ...this.rules, ...customRules };
  },

  // Reset rules to defaults
  resetRules() {
    this.rules = {
      phonePattern: '9665',
      emailDomain: null,
      nationalIdPrefix: null,
      zipCodeLength: 5,
      country: 'Saudi Arabia',
      registrationNumberPattern: null,
      registrationNumberLength: 10,
      ibanPrefix: 'SA',
      accountNumberPrefix: null,
      accountNumberLength: 15
    };
  },

  // Saudi first names (Arabic transliterated)
  saudiFirstNames: [
    'Mohammed', 'Abdullah', 'Fahd', 'Khalid', 'Sultan', 'Faisal', 'Saud', 'Turki',
    'Fatima', 'Aisha', 'Maryam', 'Noura', 'Sara', 'Hind', 'Lama', 'Reem',
    'Ahmed', 'Ali', 'Omar', 'Youssef', 'Hassan', 'Ibrahim', 'Mansour', 'Nasser',
    'Layla', 'Amira', 'Nada', 'Hessa', 'Jawaher', 'Latifa', 'Maha', 'Salma'
  ],

  // Saudi last names (family names)
  saudiLastNames: [
    'Al-Saud', 'Al-Otaibi', 'Al-Dosari', 'Al-Ghamdi', 'Al-Zahrani', 'Al-Harbi',
    'Al-Qahtani', 'Al-Mutairi', 'Al-Malki', 'Al-Shammari', 'Al-Rashid', 'Al-Anzi',
    'Al-Subai', 'Al-Juhani', 'Al-Shahrani', 'Al-Amri', 'Al-Yami', 'Al-Dawsari',
    'Al-Ahmadi', 'Al-Balawi', 'Al-Harthi', 'Al-Sulami', 'Al-Thubaiti', 'Al-Omari'
  ],

  // Saudi regions
  saudiRegions: [
    'Riyadh', 'Makkah', 'Madinah', 'Eastern Province', 'Asir', 'Tabuk',
    'Qassim', 'Ha\'il', 'Northern Borders', 'Jazan', 'Najran', 'Al-Baha', 'Al-Jouf'
  ],

  // Saudi cities by region
  saudiCities: {
    'Riyadh': ['Riyadh', 'Al-Kharj', 'Al-Majma\'ah', 'Al-Quwayiyah', 'Afif'],
    'Makkah': ['Makkah', 'Jeddah', 'Taif', 'Rabigh', 'Khulais'],
    'Madinah': ['Madinah', 'Yanbu', 'Al-Ula', 'Badr', 'Khaybar'],
    'Eastern Province': ['Dammam', 'Khobar', 'Dhahran', 'Jubail', 'Al-Ahsa'],
    'Asir': ['Abha', 'Khamis Mushait', 'Bisha', 'Sarat Abidah', 'Ahad Rafidah'],
    'Tabuk': ['Tabuk', 'Duba', 'Tayma', 'Umluj', 'Haql']
  },

  // Saudi charity/association names
  charityNames: [
    'Helping Hands Association', 'Saudi Charity Foundation', 'Hope for Tomorrow',
    'Community Care Society', 'Al-Bir Charitable Society', 'Takaful Association',
    'Social Development Foundation', 'Mercy Relief Organization', 'Future Builders',
    'Humanitarian Aid Society', 'Goodness Foundation', 'Unity Charity', 'Care & Share'
  ],

  // Generate random Saudi phone number (starts with 9665)
  generateSaudiPhone() {
    const pattern = this.rules.phonePattern || '9665';
    const remainingLength = 12 - pattern.length; // Standard 966 + 9 digits = 12
    let number = pattern;
    
    for (let i = 0; i < remainingLength; i++) {
      number += Math.floor(Math.random() * 10);
    }
    
    // Format: +966 5XX XXX XXX (specifically for Saudi default)
    if (pattern === '9665') {
      return `+${number.substring(0, 3)} ${number.substring(3, 4)}${number.substring(4, 6)} ${number.substring(6, 9)} ${number.substring(9)}`;
    }
    
    return `+${number}`;
  },

  // Generate Saudi National ID (10 digits, starts with 1 or 2)
  generateNationalId() {
    const firstDigit = this.rules.nationalIdPrefix || (Math.random() < 0.5 ? '1' : '2');
    const remainingDigits = Array.from({length: 9}, () => Math.floor(Math.random() * 10)).join('');
    return firstDigit + remainingDigits;
  },

  // Generate random Saudi name
  generateSaudiName() {
    const firstName = this.randomItem(this.saudiFirstNames);
    const lastName = this.randomItem(this.saudiLastNames);
    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
  },

  // Generate Saudi email
  generateEmail(firstName, lastName) {
    const fn = firstName.toLowerCase().replaceAll(/[^a-z]/g, '');
    const ln = lastName.toLowerCase().replaceAll(/[^a-z]/g, '').replaceAll('al', '');
    const domains = ['gmail.com', 'hotmail.com', 'outlook.sa', 'email.com'];
    const domain = this.rules.emailDomain || this.randomItem(domains);
    
    const patterns = [
      `${fn}.${ln}@${domain}`,
      `${fn}${ln}@${domain}`,
      `${fn}_${ln}@${domain}`,
      `${fn}.${ln}${this.randomInt(1, 99)}@${domain}`
    ];
    return this.randomItem(patterns);
  },

  // Generate random Saudi region
  generateRegion() {
    return this.randomItem(this.saudiRegions);
  },

  // Generate city based on region
  generateCity(region) {
    const cities = this.saudiCities[region] || this.saudiCities['Riyadh'];
    return this.randomItem(cities);
  },

  // Generate registration number (for charities) - Numeric only, min 3 max 100
  generateRegistrationNumber() {
    const pattern = this.rules.registrationNumberPattern || '';
    const targetLength = this.rules.registrationNumberLength || 10; // Default to 10
    
    // Ensure we meet minLength(3)
    const minLen = Math.max(3, targetLength);
    // Respect maxLength(100)
    const finalLen = Math.min(100, minLen);
    
    let result = String(pattern).replaceAll(/\D/g, '');
    
    while (result.length < finalLen) {
      result += Math.floor(Math.random() * 10);
    }
    
    // If pattern pushed it over 100
    return result.substring(0, 100);
  },

  // Generate charity/association name
  generateCharityName() {
    return this.randomItem(this.charityNames);
  },

  // Generate website for charity
  generateWebsite(charityName) {
    const domain = charityName.toLowerCase()
      .replaceAll(/[^a-z0-9\s]/g, '')
      .replaceAll(/\s+/g, '')
      .substring(0, 20);
    return `https://www.${domain}.org.sa`;
  },

  // Generate ZIP/Postal Code based on rules
  generateZipCode() {
    const length = this.rules.zipCodeLength || 5;
    let zip = '';
    for (let i = 0; i < length; i++) {
      zip += Math.floor(Math.random() * 10);
    }
    return zip;
  },

  // Generate Gregorian date (for DOB - 18-70 years old)
  generateDOBGregorian() {
    const today = new Date();
    const minAge = 18;
    const maxAge = 70;
    const age = this.randomInt(minAge, maxAge);
    const birthYear = today.getFullYear() - age;
    const birthMonth = this.randomInt(0, 11);
    const birthDay = this.randomInt(1, 28); // Safe day for all months
    
    return new Date(birthYear, birthMonth, birthDay);
  },

  // Generate Hijri date (approximate conversion)
  generateDOBHijri() {
    // Approximate: Hijri year ≈ Gregorian year - 579
    const gregorianDate = this.generateDOBGregorian();
    const gregorianYear = gregorianDate.getFullYear();
    const hijriYear = gregorianYear - 579;
    const month = gregorianDate.getMonth() + 1;
    const day = gregorianDate.getDate();
    
    return `${day}/${month}/${hijriYear}`;
  },

  // Generate future date (for registration expiration)
  generateFutureDate(yearsAhead = 5) {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setFullYear(today.getFullYear() + yearsAhead);
    return futureDate;
  },

  // Generate past date (for registration date)
  generatePastDate(yearsBack = 10) {
    const today = new Date();
    const yearsAgo = this.randomInt(1, yearsBack);
    const pastDate = new Date(today);
    pastDate.setFullYear(today.getFullYear() - yearsAgo);
    return pastDate;
  },

  // Generate IBAN (Saudi format)
  generateIBAN() {
    const prefix = this.rules.ibanPrefix || 'SA';
    const bankCode = this.randomInt(10, 99);
    const remainingLength = 24 - prefix.length - 2; // Saudi IBAN is 24 chars
    const accountNumber = Array.from({length: remainingLength}, () => Math.floor(Math.random() * 10)).join('');
    return `${prefix}${bankCode}${accountNumber}`;
  },

  // Generate random account number
  generateAccountNumber() {
    const prefix = this.rules.accountNumberPrefix || '';
    const length = this.rules.accountNumberLength || 15;
    
    let result = String(prefix).replaceAll(/\D/g, '');
    while (result.length < length) {
      result += Math.floor(Math.random() * 10);
    }
    return result.substring(0, 30); // Guard against extreme lengths
  },

  // Helper: Random integer
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Helper: Random item from array
  randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  // Generate complete donor data
  generateDonorData() {
    const name = this.generateSaudiName();
    const region = this.generateRegion();
    
    return {
      // Personal Info
      name: name.fullName,
      firstName: name.firstName,
      lastName: name.lastName,
      email: this.generateEmail(name.firstName, name.lastName),
      phoneNumber: this.generateSaudiPhone(),
      
      // Date of Birth
      dobGregorian: this.generateDOBGregorian(),
      dobHijri: this.generateDOBHijri(),
      
      // Location
      region: region,
      city: this.generateCity(region),
      country: this.rules.country,
      postalCode: this.generateZipCode(),
      
      // Password (for registration)
      password: 'Sekaya@123',
      confirmPassword: 'Sekaya@123'
    };
  },

  // Generate complete charity commissioner data
  generateCommissionerData() {
    const name = this.generateSaudiName();
    
    return {
      nationalId: this.generateNationalId(),
      name: name.fullName,
      phoneNumber: this.generateSaudiPhone(),
      email: this.generateEmail(name.firstName, name.lastName),
      dobGregorian: this.generateDOBGregorian(),
      dobHijri: this.generateDOBHijri()
    };
  },

  // Generate complete executive director data
  generateDirectorData() {
    const name = this.generateSaudiName();
    
    return {
      name: name.fullName,
      nationalId: this.generateNationalId(),
      phoneNumber: this.generateSaudiPhone(),
      email: this.generateEmail(name.firstName, name.lastName),
      dobGregorian: this.generateDOBGregorian(),
      dobHijri: this.generateDOBHijri()
    };
  },

  // Generate complete association data
  generateAssociationData() {
    const charityName = this.generateCharityName();
    const region = this.generateRegion();
    
    return {
      registrationNumber: this.generateRegistrationNumber(),
      associationName: charityName,
      registrationExpirationDate: this.generateFutureDate(5),
      associationWebsite: this.generateWebsite(charityName),
      registrationDate: this.generatePastDate(10),
      associationEmail: `info@${charityName.toLowerCase().replaceAll(/[^a-z]/g, '')}.org.sa`,
      phoneNumber: this.generateSaudiPhone(),
      region: region,
      city: this.generateCity(region),
      postalCode: this.generateZipCode(),
      transparencyStandards: 'Yes' // or random selection
    };
  },

  // Generate bank account data
  generateBankData() {
    return {
      iban: this.generateIBAN(),
      accountNumber: this.generateAccountNumber(),
      bankName: this.randomItem(['Al Rajhi Bank', 'Saudi National Bank', 'Riyad Bank', 'Al Bilad Bank', 'Alinma Bank']),
      accountHolderName: this.generateSaudiName().fullName
    };
  },

  // Generate complete charity registration data
  generateCharityRegistrationData() {
    return {
      commissioner: this.generateCommissionerData(),
      director: this.generateDirectorData(),
      association: this.generateAssociationData(),
      bank: this.generateBankData()
    };
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SekayaDataGenerator;
}
