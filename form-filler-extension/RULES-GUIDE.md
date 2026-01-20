# 📋 Custom Rules Guide

## Overview

The **Rules** feature allows you to customize how random data is generated. This is perfect for testing forms with specific requirements (e.g., Saudi Arabian phone numbers, corporate email domains, etc.).

---

## 🎯 Available Rules

### 📱 Phone Number Rules

#### **Phone Pattern (Prefix)**
- **Purpose:** Force phone numbers to start with a specific pattern
- **Example:** `9665` for Saudi Arabia
- **Result:** Generates numbers like `+966 5XX XXX XXX`
- **Use Case:** Testing forms that require specific country phone formats

#### **Phone Prefix (if no pattern)**
- **Purpose:** Set default country code when no pattern is specified
- **Example:** `+44` for UK, `+1` for US
- **Default:** `+1` (United States)
- **Use Case:** General country-specific testing

### 📧 Email Rules

#### **Force Email Domain**
- **Purpose:** All generated emails use this domain
- **Example:** `company.com`
- **Result:** Emails like `john.doe@company.com`
- **Use Case:** Testing corporate email validation

### 🌍 Location Rules

#### **Force Country**
- **Purpose:** Always use this specific country
- **Example:** `Saudi Arabia`, `United Kingdom`
- **Use Case:** Testing country-specific forms

#### **ZIP/Postal Code Length**
- **Purpose:** Set number of digits in postal codes
- **Example:** `6` for Canadian postal codes
- **Default:** `5` (US ZIP codes)
- **Range:** 3-10 digits

---

## 💡 Common Use Cases

### Saudi Arabia Testing
```
Phone Pattern: 9665
Country: Saudi Arabia
ZIP Length: 5
```
**Result:** Saudi phone numbers (+966 5XX XXX XXX) with Saudi addresses

### UK Testing
```
Phone Prefix: +44
Country: United Kingdom
ZIP Length: 6
```
**Result:** UK phone numbers with British addresses

### Corporate Testing
```
Email Domain: mycompany.com
Phone Prefix: +1
```
**Result:** All emails use @mycompany.com domain

### Canadian Testing
```
Phone Prefix: +1
Country: Canada
ZIP Length: 6
```
**Result:** Canadian phone numbers with 6-digit postal codes

---

## 🔧 How to Use

### 1. Configure Rules
1. Open the extension popup
2. Click the **Rules** tab
3. Fill in desired rules
4. Click **Save Rules**

### 2. Generate Data
1. Go to **Fill Form** tab
2. Click **Fill with Random Data** 🎲
3. Data is generated according to your rules!

### 3. Reset to Defaults
- Click **Reset to Defaults** in the Rules tab
- Confirms before resetting
- Clears all custom rules

---

## 📝 Examples

### Example 1: Saudi Phone Numbers

**Configuration:**
- Phone Pattern: `9665`

**Generated Phone:**
```
+966 512 345 678
+966 598 765 432
+966 523 456 789
```

### Example 2: Corporate Emails

**Configuration:**
- Email Domain: `techcorp.com`

**Generated Emails:**
```
john.smith@techcorp.com
sarah.johnson@techcorp.com
michael.brown@techcorp.com
```

### Example 3: UK Addresses

**Configuration:**
- Phone Prefix: `+44`
- Country: `United Kingdom`
- ZIP Length: `6`

**Generated Data:**
```
Phone: +44 (234) 567-8901
Country: United Kingdom
ZIP: 123456
```

---

## ⚙️ Technical Details

### How Rules Work

1. **Storage:** Rules are saved in Chrome's sync storage
2. **Application:** Rules are applied before each random data generation
3. **Priority:** Custom rules override default values
4. **Persistence:** Rules persist across browser sessions

### Phone Pattern Logic

```javascript
// If pattern is set (e.g., "9665")
phonePattern: "9665"
// Generates: +966 5XX XXX XXX

// If no pattern, uses prefix
phonePrefix: "+44"
// Generates: +44 (XXX) XXX-XXXX
```

### Default Values

```javascript
{
  phonePrefix: '+1',        // US format
  phonePattern: null,       // No custom pattern
  emailDomain: null,        // Random domains
  countryCode: null,        // Random countries
  zipCodeLength: 5          // US ZIP format
}
```

---

## 🎨 UI Features

### Visual Indicators
- **Purple button:** Fill with your saved data
- **Pink button:** Fill with random data (uses rules)
- **Help text:** Explains each rule field
- **Examples box:** Shows common configurations

### Form Validation
- ZIP length: 3-10 digits
- All fields optional
- Empty = use defaults

---

## 🔄 Workflow

```
1. Set Rules (Rules tab)
      ↓
2. Save Rules
      ↓
3. Rules stored in Chrome sync
      ↓
4. Click "Fill with Random Data"
      ↓
5. Rules loaded and applied
      ↓
6. Data generated with custom rules
      ↓
7. Form filled!
```

---

## 💾 Storage

Rules are stored separately from your personal data:
- **Personal Data:** Settings tab → Your real information
- **Rules:** Rules tab → Data generation patterns

Both sync across your Chrome browsers!

---

## 🚀 Pro Tips

1. **Test Multiple Scenarios:** Save different rule sets for different countries
2. **Corporate Testing:** Use company email domain for realistic testing
3. **Quick Reset:** Use "Reset to Defaults" to start fresh
4. **Combine Rules:** Mix phone patterns with email domains for comprehensive testing
5. **Check Console:** Open DevTools (F12) to see generated data logged

---

## ❓ FAQ

**Q: Do rules affect "Fill Current Form" button?**  
A: No, only "Fill with Random Data" uses rules.

**Q: Can I have multiple rule sets?**  
A: Currently one set at a time. Clear and reconfigure for different scenarios.

**Q: What happens if I leave fields empty?**  
A: Default values are used (US format).

**Q: Can I use custom patterns for other countries?**  
A: Yes! Enter any pattern for phone numbers.

**Q: Do rules sync across devices?**  
A: Yes, if you're signed into Chrome.

---

**Happy Testing! 🎉**
