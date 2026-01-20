# 🇸🇦 Sekaya Form Filler

A customized Chrome extension specifically designed for the **SEKAYA Crowdfunding System (CFS)** project.

## 🚀 Features for Sekaya

This extension is tailored to the unique requirements of the Sekaya project:

- **🇸🇦 Saudi-Specific Data:** Generates realistic names, cities, and regions from Saudi Arabia.
- **✨ Smart Phone Pattern:** Automatically generates numbers starting with `+966 5`.
- **🆔 National ID Generator:** Creates valid 10-digit Saudi National IDs (starting with 1 or 2).
- **📅 Hijri Date Support:** Generates formatted Hijri dates for birth date fields.
- **🏢 Charity Data:** Includes realistic association names, registration numbers, and websites.
- **💰 Donation Data:** Quick-fill for amount and anonymous settings.
- **🛠️ Angular/PrimeNG Optimized:** Engineered to trigger Angular's change detection (Signals & Reactive Forms).

## 📂 Installation

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the folder: `C:\Users\new m\Documents\My Extensions\sekaya-form-filler`.

## 📖 How to Use

### 1. Donor Registration
On the donor registration page, open the extension and click **Fill Donor Registration**. 
- Fills: Name, Email, Phone, DOB (Greg/Hijri), Region, City, Passwords.

### 2. Charity Registration
On the charity onboarding page, click **Fill Charity Registration**.
- Fills: Commissioner data, Executive Director info, Association details, and Bank info.

### 3. Donation Form
On the donation widget, click **Fill Donation Form**.
- Fills: Amount and Anonymous checkbox.

## 🛠️ Technical Details

### Saudi Cities & Regions
The extension includes a built-in mapping of all major Saudi regions (Riyadh, Makkah, Madinah, etc.) and their corresponding cities to ensure data consistency during testing.

### Field Detection
Uses a multi-layered detection algorithm that looks for:
1. `formcontrolname` (Angular specific)
2. `name` and `id` attributes
3. `placeholder` text (case-insensitive)

### Change Detection
Automatically dispatches `input`, `change`, and `blur` events to ensure Angular components recognize the filled data immediately.

---

**Built for: SEKAYA Crowdfunding Project** 🚀
