#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include "Config.h"
#include "CommandParser.h"

class WifiManager {
public:
  WifiManager();
  void begin(ArmStateStruct* statePtr, JointConfig* configsPtr);
  void loop();
  void broadcastState(const String& stateJson);
  bool isConnected() const;

private:
  WebSocketsServer webSocket;
  ArmStateStruct* pState;
  JointConfig* pConfigs;
  
  void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length);
  static void webSocketEventCallback(uint8_t num, WStype_t type, uint8_t * payload, size_t length);
};

extern WifiManager wifiManager;

#endif // WIFI_MANAGER_H
