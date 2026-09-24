#ifndef COMMAND_PARSER_H
#define COMMAND_PARSER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include "Config.h"
#include "SafetyManager.h"
#include "MotionPlanner.h"
#include "ConfigStore.h"

class CommandParser {
public:
  CommandParser();
  
  bool parseCommand(const String& jsonStr, ArmStateStruct& state, JointConfig configs[NUM_JOINTS], String& responseOut);
  String createServoStateJson(const ArmStateStruct& state, const char* transportStr);
  String createConfigJson(const JointConfig configs[NUM_JOINTS]);
  String createStatusJson(const ArmStateStruct& state);
};

extern CommandParser commandParser;

#endif // COMMAND_PARSER_H
