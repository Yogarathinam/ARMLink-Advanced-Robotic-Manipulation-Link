#ifndef BLE_MANAGER_H
#define BLE_MANAGER_H

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "Config.h"
#include "CommandParser.h"

class BleManager : public BLEServerCallbacks, public BLECharacteristicCallbacks {
public:
  BleManager();
  void begin(ArmStateStruct* statePtr, JointConfig* configsPtr);
  void broadcastState(const String& stateJson);
  bool isConnected() const;

  // Standard ESP32 BLE Callbacks
  void onConnect(BLEServer* pServer) override;
  void onDisconnect(BLEServer* pServer) override;
  void onWrite(BLECharacteristic* pCharacteristic) override;

private:
  BLEServer* pServer;
  BLECharacteristic* pTxCharacteristic;
  BLECharacteristic* pRxCharacteristic;
  
  ArmStateStruct* pState;
  JointConfig* pConfigs;
  bool deviceConnected;
};

extern BleManager bleManager;

#endif // BLE_MANAGER_H
