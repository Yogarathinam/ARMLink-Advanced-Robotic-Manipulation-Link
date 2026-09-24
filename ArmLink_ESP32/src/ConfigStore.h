#ifndef CONFIG_STORE_H
#define CONFIG_STORE_H

#include <Arduino.h>
#include <Preferences.h>
#include "Config.h"

class ConfigStore {
public:
  ConfigStore();
  bool begin();
  void loadJointConfigs(JointConfig configs[NUM_JOINTS]);
  void saveJointConfig(uint8_t jointIdx, const JointConfig& config);
  void saveAllJointConfigs(const JointConfig configs[NUM_JOINTS]);
  void resetToDefaults(JointConfig configs[NUM_JOINTS]);

  String getWifiSSID();
  String getWifiPass();
  void saveWifiCredentials(const String& ssid, const String& pass);

private:
  Preferences prefs;
};

extern ConfigStore configStore;

#endif // CONFIG_STORE_H
