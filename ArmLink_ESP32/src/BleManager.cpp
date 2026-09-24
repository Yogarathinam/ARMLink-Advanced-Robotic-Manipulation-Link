#include "BleManager.h"

BleManager bleManager;

BleManager::BleManager() 
  : pServer(nullptr), pTxCharacteristic(nullptr), pRxCharacteristic(nullptr),
    pState(nullptr), pConfigs(nullptr), deviceConnected(false) {}

void BleManager::begin(ArmStateStruct* statePtr, JointConfig* configsPtr) {
  pState = statePtr;
  pConfigs = configsPtr;

  // Initialize BLE Device
  BLEDevice::init("ArmLink_BLE");

  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(this);

  // Create Nordic UART style BLE Service
  BLEService *pService = pServer->createService(BLE_SERVICE_UUID);

  // Create TX Characteristic (Notifications to Client)
  pTxCharacteristic = pService->createCharacteristic(
                        BLE_CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());

  // Create RX Characteristic (Commands from Client)
  pRxCharacteristic = pService->createCharacteristic(
                        BLE_CHARACTERISTIC_UUID_RX,
                        BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
                      );
  pRxCharacteristic->setCallbacks(this);

  // Start Service & Advertising
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // Functions that help with iPhone connection issues
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BleManager] BLE Server initialized. Advertising as 'ArmLink_BLE'.");
}

void BleManager::onConnect(BLEServer* pServer) {
  deviceConnected = true;
  Serial.println("[BleManager] BLE Client connected!");
}

void BleManager::onDisconnect(BLEServer* pServer) {
  deviceConnected = false;
  Serial.println("[BleManager] BLE Client disconnected. Restarting advertising...");
  pServer->startAdvertising();
}

void BleManager::onWrite(BLECharacteristic* pCharacteristic) {
  std::string value = pCharacteristic->getValue();
  if (value.length() > 0 && pState && pConfigs) {
    String jsonStr = String(value.c_str());
    String response;
    commandParser.parseCommand(jsonStr, *pState, pConfigs, response);
    broadcastState(response);
  }
}

void BleManager::broadcastState(const String& stateJson) {
  if (deviceConnected && pTxCharacteristic) {
    pTxCharacteristic->setValue(stateJson.c_str());
    pTxCharacteristic->notify();
  }
}

bool BleManager::isConnected() const {
  return deviceConnected;
}
