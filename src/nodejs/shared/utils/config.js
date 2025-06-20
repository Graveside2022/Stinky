const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = {};
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  get(key, defaultValue = null) {
    return this.config[key] || defaultValue;
  }

  set(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }
}

module.exports = { ConfigManager };