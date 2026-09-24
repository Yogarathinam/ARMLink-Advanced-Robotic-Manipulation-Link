#include "SerialManager.h"

SerialManager serialManager;

SerialManager::SerialManager() {}

void SerialManager::begin(uint32_t baudRate) {
  Serial.begin(baudRate);
  inputBuffer.reserve(256);
  Serial.println("[SerialManager] Serial port initialized for Web Serial.");
}

void SerialManager::handleSerialInput(ArmStateStruct& state, JointConfig configs[NUM_JOINTS]) {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      inputBuffer.trim();
      if (inputBuffer.length() > 0) {
        String response;
        commandParser.parseCommand(inputBuffer, state, configs, response);
        Serial.println(response);
      }
      inputBuffer = "";
    } else if (c != '\r') {
      inputBuffer += c;
    }
  }
}

void SerialManager::broadcastState(const String& stateJson) {
  Serial.println(stateJson);
}
