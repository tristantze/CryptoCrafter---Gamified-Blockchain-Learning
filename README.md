# CryptoCrafter Prototype

CryptoCrafter is a work-in-progress educational game prototype built with React, TypeScript, Vite, and Phaser.

The current build is designed as a short interactive experience that introduces blockchain ideas through simple game scenes such as story setup, mining, verification, and chain forging. It is an early prototype rather than a finished product.

## Current Scope

- Main menu with project framing and blockchain info
- Story-driven scene flow
- Mining gameplay
- Verification gameplay
- Chain forging scene
- Android APK build
- ESP32 BluetoothSerial reward-box bridge
- Local save/resume checkpoints
- Touch-first mobile browser support
- Pixel-art asset pipeline for prototype presentation

## Tech Stack

- React 19
- TypeScript
- Vite
- Phaser 3

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL in a desktop browser or on a phone on the same network. The game now scales with Phaser's `FIT` mode and uses pointer-driven interactions, so the full scene flow works on touch devices.

## Build

```bash
npm run build
```

## Android APK

```bash
npm run android:sync
cd android
gradlew.bat assembleDebug
```

The debug APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

This repository also keeps a convenience copy at:

```text
CryptoCrafter-debug.apk
```

## Notes

- This repository is a prototype and still in progress.
- Some systems, balancing, polish, and hardware-linked ideas are not final yet.
- The current focus is gameplay flow, scene transitions, and communicating the blockchain learning concept clearly.
- The APK uses native Android Bluetooth. Pair the ESP32 from Android system settings first, then use `Connect Box` inside the app.
- Game progress is saved locally on the device. Returning to the app shows `Continue` on the main menu when a saved checkpoint exists.

## ESP32 Reward Box Integration

The main menu now exposes a `Connect Box` panel backed by `src/game/arduinoBridge.ts`.

Inside the APK, native Android code connects to the paired `CryptoCrafter_Box` BluetoothSerial device and sends newline-delimited commands:

```text
HELLO
SCENE|MainMenuScene
STATE|0|0|0|0
REWARD|Miner Badge
open
lock
```

`STATE|mining|verification|chain|unlock` mirrors the three lesson completions plus the final reward-box unlock state. When `unlock` is `1`, the ESP32 opens the servo latch. The `Connect Box` panel includes debug buttons for `Open`, `Lock`, and a simulated final unlock state.

The companion ESP32 sketch lives at `arduino/CryptoCrafterRewardBox/CryptoCrafterRewardBox.ino`. It uses GPIO 13 for the servo and GPIO 2 for the built-in LED, matching the test sketch.

## Project Structure

```text
src/
  game/
    MainMenuScene.ts
    StoryScene.ts
    MiningScene.ts
    VerificationScene.ts
    ChainScene.ts
    assets.ts
```

## Status

This repository is currently shared as a clean WIP snapshot.
