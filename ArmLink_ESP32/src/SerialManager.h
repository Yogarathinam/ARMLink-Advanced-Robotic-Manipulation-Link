#ifndef SERIAL_MANAGER_H
#define SERIAL_MANAGER_H

#include <Arduino.h>
#include "Config.h"
#include "CommandParser.h"

class SerialManager {
public:
  SerialManager();
  void begin(uint32_t baudRate = 115200);
  void handleSerialInput(ArmStateStruct& state, JointConfig configs[NUM_JOINTS]);
  void broadcastState(const String& stateJson);

private:
  String inputBuffer;
};

extern SerialManager serialManager;

#endif // SERIAL_MANAGER_H
