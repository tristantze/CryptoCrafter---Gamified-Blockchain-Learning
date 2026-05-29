#include "BluetoothSerial.h"
#include <ESP32Servo.h>

BluetoothSerial SerialBT;
Servo latchServo;

const int SERVO_PIN = 13;
const int LED_PIN = 2;

const int LOCK_POSITION = 90;
const int OPEN_POSITION = 180;

void lockBox();
void openBox();
void handleCommand(String command);
void handleStateCommand(const String& payload);

void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);

  latchServo.attach(SERVO_PIN);
  lockBox();

  SerialBT.begin("CryptoCrafter_Box");

  Serial.println("Bluetooth started.");
  Serial.println("Pair with: CryptoCrafter_Box");
  Serial.println("Commands: open, lock, HELLO, STATE|mining|verification|chain|unlock");
}

void loop() {
  if (SerialBT.available()) {
    String command = SerialBT.readStringUntil('\n');
    command.trim();
    handleCommand(command);
  }
}

void handleCommand(String command) {
  if (command.length() == 0) return;

  Serial.print("Bluetooth command received: ");
  Serial.println(command);

  if (command == "HELLO") {
    SerialBT.println("BOX_READY");
  } else if (command == "open") {
    openBox();
    SerialBT.println("STATUS|Box opened");
  } else if (command == "lock" || command == "RESET") {
    lockBox();
    SerialBT.println("STATUS|Box locked");
  } else if (command.startsWith("SCENE|")) {
    SerialBT.println("STATUS|Scene " + command.substring(6));
  } else if (command.startsWith("STATE|")) {
    handleStateCommand(command.substring(6));
  } else if (command.startsWith("REWARD|")) {
    SerialBT.println("STATUS|Reward " + command.substring(7));
  } else {
    SerialBT.println("STATUS|Unknown command");
  }
}

void handleStateCommand(const String& payload) {
  int first = payload.indexOf('|');
  int second = payload.indexOf('|', first + 1);
  int third = payload.indexOf('|', second + 1);

  if (first < 0 || second < 0 || third < 0) {
    SerialBT.println("STATUS|Malformed STATE payload");
    return;
  }

  const bool miningComplete = payload.substring(0, first).toInt() == 1;
  const bool verificationComplete = payload.substring(first + 1, second).toInt() == 1;
  const bool chainComplete = payload.substring(second + 1, third).toInt() == 1;
  const bool shouldOpen = payload.substring(third + 1).toInt() == 1;

  if (shouldOpen) {
    openBox();
    SerialBT.println("STATUS|Reward box opened");
  } else {
    lockBox();
    if (chainComplete) {
      SerialBT.println("STATUS|Chain complete, waiting for unlock");
    } else if (verificationComplete) {
      SerialBT.println("STATUS|Verification complete");
    } else if (miningComplete) {
      SerialBT.println("STATUS|Mining complete");
    } else {
      SerialBT.println("STATUS|Reward box locked");
    }
  }
}

void lockBox() {
  latchServo.write(LOCK_POSITION);
  digitalWrite(LED_PIN, LOW);
}

void openBox() {
  latchServo.write(OPEN_POSITION);
  digitalWrite(LED_PIN, HIGH);
}
