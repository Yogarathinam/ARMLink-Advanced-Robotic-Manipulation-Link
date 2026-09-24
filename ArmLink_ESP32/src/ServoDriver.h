#ifndef SERVO_DRIVER_H
#define SERVO_DRIVER_H

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include "Config.h"

class ServoDriver {
public:
  ServoDriver();
  bool begin(uint8_t sdaPin = PIN_I2C_SDA, uint8_t sclPin = PIN_I2C_SCL);
  void setJointAngle(uint8_t jointIdx, float angleDeg, const JointConfig& config);
  void setPWMUs(uint8_t channel, uint16_t pulseUs);
  void turnOffAllServos();
  uint16_t angleToMicroseconds(float angleDeg, const JointConfig& config);

private:
  Adafruit_PWMServoDriver pwm;
  bool isInitialized;
};

extern ServoDriver servoDriver;

#endif // SERVO_DRIVER_H
