#include "CommandParser.h"

CommandParser commandParser;

CommandParser::CommandParser() {}

bool CommandParser::parseCommand(const String& jsonStr, ArmStateStruct& state, JointConfig configs[NUM_JOINTS], String& responseOut) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, jsonStr);
  if (err) {
    Serial.printf("[CommandParser] JSON parse failed: %s\n", err.c_str());
    responseOut = "{\"type\":\"error\",\"message\":\"Invalid JSON payload\"}";
    return false;
  }

  const char* type = doc["type"] | "";

  if (strcmp(type, "servo_command") == 0) {
    safetyManager.feedWatchdog(state);
    
    JsonObject angles = doc["angles"];
    if (angles.isNull()) {
      responseOut = "{\"type\":\"error\",\"message\":\"Missing angles object\"}";
      return false;
    }

    float newTargets[NUM_JOINTS];
    for (int i = 0; i < NUM_JOINTS; ++i) {
      newTargets[i] = state.targetAngles[i]; // Default to current target if joint omitted
    }

    if (angles.containsKey("base"))       newTargets[JOINT_BASE]        = angles["base"];
    if (angles.containsKey("shoulder"))   newTargets[JOINT_SHOULDER]    = angles["shoulder"];
    if (angles.containsKey("elbow"))      newTargets[JOINT_ELBOW]       = angles["elbow"];
    if (angles.containsKey("wristPitch")) newTargets[JOINT_WRIST_PITCH] = angles["wristPitch"];
    if (angles.containsKey("wristRoll"))  newTargets[JOINT_WRIST_ROLL]  = angles["wristRoll"];
    if (angles.containsKey("gripper"))    newTargets[JOINT_GRIPPER]     = angles["gripper"];

    uint32_t duration = doc["duration"] | 300;
    motionPlanner.setTargetAngles(state, newTargets, duration, configs);

    responseOut = createServoStateJson(state, "command_ack");
    return true;
  }
  else if (strcmp(type, "home") == 0) {
    safetyManager.feedWatchdog(state);
    motionPlanner.moveHome(state, configs);
    responseOut = "{\"type\":\"ack\",\"action\":\"home\"}";
    return true;
  }
  else if (strcmp(type, "estop") == 0) {
    safetyManager.triggerEStop(state);
    responseOut = "{\"type\":\"ack\",\"action\":\"estop\",\"estop_active\":true}";
    return true;
  }
  else if (strcmp(type, "clear_estop") == 0 || strcmp(type, "enable_motion") == 0) {
    safetyManager.clearEStop(state);
    responseOut = "{\"type\":\"ack\",\"action\":\"enable_motion\",\"estop_active\":false}";
    return true;
  }
  else if (strcmp(type, "calibrate") == 0) {
    safetyManager.feedWatchdog(state);
    const char* joint = doc["joint"] | "";
    float angle = doc["angle"] | 90.0f;

    for (int i = 0; i < NUM_JOINTS; ++i) {
      if (strcmp(joint, JOINT_NAMES[i]) == 0) {
        float targets[NUM_JOINTS];
        for (int k = 0; k < NUM_JOINTS; ++k) targets[k] = state.targetAngles[k];
        targets[i] = angle;
        motionPlanner.setTargetAngles(state, targets, 200, configs);
        break;
      }
    }
    responseOut = "{\"type\":\"ack\",\"action\":\"calibrate\"}";
    return true;
  }
  else if (strcmp(type, "config_get") == 0) {
    responseOut = createConfigJson(configs);
    return true;
  }
  else if (strcmp(type, "config_set") == 0) {
    JsonObject limits = doc["limits"];
    if (!limits.isNull()) {
      for (int i = 0; i < NUM_JOINTS; ++i) {
        const char* jName = JOINT_NAMES[i];
        if (limits.containsKey(jName)) {
          JsonObject jLim = limits[jName];
          if (jLim.containsKey("min")) configs[i].minAngle = jLim["min"];
          if (jLim.containsKey("max")) configs[i].maxAngle = jLim["max"];
          if (jLim.containsKey("offset")) configs[i].offset = jLim["offset"];
          if (jLim.containsKey("reverse")) configs[i].reverse = jLim["reverse"];
          configStore.saveJointConfig(i, configs[i]);
        }
      }
    }
    responseOut = "{\"type\":\"ack\",\"action\":\"config_set\"}";
    return true;
  }
  else if (strcmp(type, "ping") == 0) {
    safetyManager.feedWatchdog(state);
    responseOut = "{\"type\":\"pong\",\"timestamp\":" + String(millis()) + "}";
    return true;
  }

  responseOut = "{\"type\":\"error\",\"message\":\"Unknown command type\"}";
  return false;
}

String CommandParser::createServoStateJson(const ArmStateStruct& state, const char* transportStr) {
  JsonDocument doc;
  doc["type"] = "servo_state";
  JsonObject angles = doc["angles"].to<JsonObject>();
  angles["base"]       = state.angles[JOINT_BASE];
  angles["shoulder"]   = state.angles[JOINT_SHOULDER];
  angles["elbow"]      = state.angles[JOINT_ELBOW];
  angles["wristPitch"] = state.angles[JOINT_WRIST_PITCH];
  angles["wristRoll"]  = state.angles[JOINT_WRIST_ROLL];
  angles["gripper"]    = state.angles[JOINT_GRIPPER];

  doc["timestamp"] = millis();
  doc["transport"] = transportStr;
  doc["estop_active"] = state.estopActive;
  doc["timeout_active"] = state.timeoutActive;

  String output;
  serializeJson(doc, output);
  return output;
}

String CommandParser::createConfigJson(const JointConfig configs[NUM_JOINTS]) {
  JsonDocument doc;
  doc["type"] = "config_state";
  JsonObject limits = doc["limits"].to<JsonObject>();

  for (int i = 0; i < NUM_JOINTS; ++i) {
    JsonObject jObj = limits[JOINT_NAMES[i]].to<JsonObject>();
    jObj["channel"] = configs[i].pcaChannel;
    jObj["min"] = configs[i].minAngle;
    jObj["max"] = configs[i].maxAngle;
    jObj["center"] = configs[i].centerAngle;
    jObj["reverse"] = configs[i].reverse;
    jObj["offset"] = configs[i].offset;
    jObj["maxSpeed"] = configs[i].maxSpeed;
  }

  String output;
  serializeJson(doc, output);
  return output;
}

String CommandParser::createStatusJson(const ArmStateStruct& state) {
  JsonDocument doc;
  doc["type"] = "status";
  doc["firmware_version"] = ARMLINK_FIRMWARE_VERSION;
  doc["uptime_ms"] = millis();
  doc["estop_active"] = state.estopActive;
  doc["timeout_active"] = state.timeoutActive;
  doc["motion_enabled"] = state.motionEnabled;

  String output;
  serializeJson(doc, output);
  return output;
}
