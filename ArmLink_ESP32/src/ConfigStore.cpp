#include "ConfigStore.h"

ConfigStore configStore;

ConfigStore::ConfigStore() {}

bool ConfigStore::begin() {
  return true;
}

void ConfigStore::loadJointConfigs(JointConfig configs[NUM_JOINTS]) {
  prefs.begin("armlink_joints", true); // Read-only mode
  bool isInitialized = prefs.getBool("init", false);
  prefs.end();

  if (!isInitialized) {
    Serial.println("[ConfigStore] NVS uninitialized. Writing defaults...");
    resetToDefaults(configs);
    return;
  }

  prefs.begin("armlink_joints", true);
  for (uint8_t i = 0; i < NUM_JOINTS; ++i) {
    String prefix = "j" + String(i) + "_";
    configs[i].pcaChannel = prefs.getUChar((prefix + "ch").c_str(), DEFAULT_JOINT_CONFIGS[i].pcaChannel);
    configs[i].minAngle = prefs.getFloat((prefix + "min").c_str(), DEFAULT_JOINT_CONFIGS[i].minAngle);
    configs[i].maxAngle = prefs.getFloat((prefix + "max").c_str(), DEFAULT_JOINT_CONFIGS[i].maxAngle);
    configs[i].centerAngle = prefs.getFloat((prefix + "ctr").c_str(), DEFAULT_JOINT_CONFIGS[i].centerAngle);
    configs[i].reverse = prefs.getBool((prefix + "rev").c_str(), DEFAULT_JOINT_CONFIGS[i].reverse);
    configs[i].offset = prefs.getFloat((prefix + "off").c_str(), DEFAULT_JOINT_CONFIGS[i].offset);
    configs[i].maxSpeed = prefs.getFloat((prefix + "spd").c_str(), DEFAULT_JOINT_CONFIGS[i].maxSpeed);
    configs[i].maxAccel = prefs.getFloat((prefix + "acc").c_str(), DEFAULT_JOINT_CONFIGS[i].maxAccel);
    configs[i].minPulseUs = prefs.getUShort((prefix + "pmin").c_str(), DEFAULT_JOINT_CONFIGS[i].minPulseUs);
    configs[i].maxPulseUs = prefs.getUShort((prefix + "pmax").c_str(), DEFAULT_JOINT_CONFIGS[i].maxPulseUs);
  }
  prefs.end();
  Serial.println("[ConfigStore] Joint configs loaded successfully from NVS.");
}

void ConfigStore::saveJointConfig(uint8_t jointIdx, const JointConfig& config) {
  if (jointIdx >= NUM_JOINTS) return;
  prefs.begin("armlink_joints", false);
  String prefix = "j" + String(jointIdx) + "_";
  prefs.putUChar((prefix + "ch").c_str(), config.pcaChannel);
  prefs.putFloat((prefix + "min").c_str(), config.minAngle);
  prefs.putFloat((prefix + "max").c_str(), config.maxAngle);
  prefs.putFloat((prefix + "ctr").c_str(), config.centerAngle);
  prefs.putBool((prefix + "rev").c_str(), config.reverse);
  prefs.putFloat((prefix + "off").c_str(), config.offset);
  prefs.putFloat((prefix + "spd").c_str(), config.maxSpeed);
  prefs.putFloat((prefix + "acc").c_str(), config.maxAccel);
  prefs.putUShort((prefix + "pmin").c_str(), config.minPulseUs);
  prefs.putUShort((prefix + "pmax").c_str(), config.maxPulseUs);
  prefs.putBool("init", true);
  prefs.end();
  Serial.printf("[ConfigStore] Joint %d config saved to NVS.\n", jointIdx);
}

void ConfigStore::saveAllJointConfigs(const JointConfig configs[NUM_JOINTS]) {
  for (uint8_t i = 0; i < NUM_JOINTS; ++i) {
    saveJointConfig(i, configs[i]);
  }
}

void ConfigStore::resetToDefaults(JointConfig configs[NUM_JOINTS]) {
  for (uint8_t i = 0; i < NUM_JOINTS; ++i) {
    configs[i] = DEFAULT_JOINT_CONFIGS[i];
  }
  saveAllJointConfigs(configs);
}

String ConfigStore::getWifiSSID() {
  prefs.begin("armlink_wifi", true);
  String ssid = prefs.getString("ssid", "");
  prefs.end();
  return ssid;
}

String ConfigStore::getWifiPass() {
  prefs.begin("armlink_wifi", true);
  String pass = prefs.getString("pass", "");
  prefs.end();
  return pass;
}

void ConfigStore::saveWifiCredentials(const String& ssid, const String& pass) {
  prefs.begin("armlink_wifi", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.end();
}
