#include "WifiManager.h"

WifiManager wifiManager;

WifiManager::WifiManager() : webSocket(WEBSOCKET_PORT), pState(nullptr), pConfigs(nullptr) {}

void WifiManager::webSocketEventCallback(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  wifiManager.onWebSocketEvent(num, type, payload, length);
}

void WifiManager::begin(ArmStateStruct* statePtr, JointConfig* configsPtr) {
  pState = statePtr;
  pConfigs = configsPtr;

  // Start Wi-Fi in Access Point mode as fallback/primary
  WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASS);
  IPAddress apIP = WiFi.softAPIP();
  Serial.printf("[WifiManager] Wi-Fi Access Point Started: %s (Password: %s)\n", WIFI_AP_SSID, WIFI_AP_PASS);
  Serial.printf("[WifiManager] AP IP Address: %s\n", apIP.toString().c_str());

  // Initialize WebSockets server
  webSocket.begin();
  webSocket.onEvent(webSocketEventCallback);
  Serial.printf("[WifiManager] WebSocket server listening on port %d\n", WEBSOCKET_PORT);
}

void WifiManager::onWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.printf("[WifiManager] Client #%u disconnected\n", num);
      break;
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[WifiManager] Client #%u connected from %s\n", num, ip.toString().c_str());
      // Send initial state on connection
      if (pState) {
        String stateJson = commandParser.createServoStateJson(*pState, "wifi");
        webSocket.sendTXT(num, stateJson);
      }
      break;
    }
    case WStype_TEXT: {
      String jsonStr = String((char*)payload);
      if (pState && pConfigs) {
        String response;
        commandParser.parseCommand(jsonStr, *pState, pConfigs, response);
        webSocket.sendTXT(num, response);
      }
      break;
    }
    default:
      break;
  }
}

void WifiManager::loop() {
  webSocket.loop();
}

void WifiManager::broadcastState(const String& stateJson) {
  webSocket.broadcastTXT(stateJson);
}

bool WifiManager::isConnected() const {
  return (WiFi.softAPgetStationNum() > 0);
}
