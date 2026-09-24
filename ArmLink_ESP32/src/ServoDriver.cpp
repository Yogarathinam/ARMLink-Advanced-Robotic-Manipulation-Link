#include "ServoDriver.h"

ServoDriver servoDriver;

ServoDriver::ServoDriver() : pwm(PCA9685_I2C_ADDR), isInitialized(false) {}

bool ServoDriver::begin(uint8_t sdaPin, uint8_t sclPin) {
  Wire.begin(sdaPin, sclPin, 400000); // 400 kHz Fast I2C
  pwm.begin();
  pwm.setOscillatorFrequency(27000000);
  pwm.setPWMFreq(SERVO_FREQ_HZ); // 50 Hz for standard analog/digital servos
  isInitialized = true;
  Serial.println("[ServoDriver] PCA9685 initialized at 50Hz.");
  return true;
}

uint16_t ServoDriver::angleToMicroseconds(float angleDeg, const JointConfig& config) {
  // Apply offset
  float effectiveAngle = angleDeg + config.offset;

  // Apply reversing if set
  if (config.reverse) {
    effectiveAngle = 180.0f - effectiveAngle;
  }

  // Constrain to 0 - 180 deg for map
  effectiveAngle = constrain(effectiveAngle, 0.0f, 180.0f);

  // Map to pulse width in microseconds
  float pulseUs = config.minPulseUs + (effectiveAngle / 180.0f) * (config.maxPulseUs - config.minPulseUs);
  return (uint16_t)pulseUs;
}

void ServoDriver::setJointAngle(uint8_t jointIdx, float angleDeg, const JointConfig& config) {
  if (!isInitialized || jointIdx >= NUM_JOINTS) return;

  uint16_t pulseUs = angleToMicroseconds(angleDeg, config);
  setPWMUs(config.pcaChannel, pulseUs);
}

void ServoDriver::setPWMUs(uint8_t channel, uint16_t pulseUs) {
  if (!isInitialized || channel >= 16) return;

  // Convert pulse microseconds to 12-bit PCA9685 ticks (4096 ticks per 20000us period)
  // pulseTicks = (pulseUs / 20000.0) * 4096
  float pulseTicks = (pulseUs / 20000.0f) * 4096.0f;
  uint16_t ticks = (uint16_t)constrain(pulseTicks, 0.0f, 4095.0f);

  pwm.setPWM(channel, 0, ticks);
}

void ServoDriver::turnOffAllServos() {
  if (!isInitialized) return;
  for (uint8_t ch = 0; ch < 16; ++ch) {
    pwm.setPWM(ch, 0, 0); // 0 pulse turns off signal
  }
  Serial.println("[ServoDriver] All servo PWM outputs turned off.");
}
