# Hardware Integration Handover

This document describes the ground-station changes required before connecting the GUI to the flight hardware. The GUI communicates with the Node.js backend, which parses telemetry and ACK messages from the ground station. Apply the three `ground_station.ino` changes below before connecting the GUI.

## Required ground-station changes

### 1. Send the raw ACK string over Serial

Change:

```cpp
Serial.printf("ACK_RX,%s\n", text);
```

to:

```cpp
Serial.printf("%s\n", text);
```

The Node.js parser requires the raw ACK string. The `ACK_RX,` prefix is not part of the expected ACK input and prevents the parser from recognizing it.

### 2. Require exactly 16 telemetry fields

Change:

```cpp
if (n != 17 || strcmp(f[0], TEAM_ID))
```

to:

```cpp
if (n != 16 || strcmp(f[0], TEAM_ID))
```

The UI now strictly expects telemetry records with 16 fields. The ground station must apply the same field-count check so records with the wrong number of fields are rejected consistently.

### 3. Accept all eight uplink commands

Expand the command whitelist in `userLine()` to accept the following eight commands:

```cpp
if (!strcmp(s, "BOOT") || !strcmp(s, "HC") || !strcmp(s, "CALC") ||
    !strcmp(s, "TX_ON") || !strcmp(s, "TX_OFF") || !strcmp(s, "STATUS") ||
    !strcmp(s, "RESET") || !strcmp(s, "RW")) queueCmd(s);
```

`RW` is the new Reaction Wheel command. Keep the existing commands available; `RW` should be added to the whitelist, not substituted for another command.

## ACK timing and uplink behavior

The ground station queues ACKs rather than returning them immediately. If radio retries are needed, an ACK can take up to 7.5 seconds to reach Node.js. The GUI uses an 8-second sending timeout to allow that retry interval to complete. Do not treat a delayed ACK within this interval as an immediate command failure.

When an uplink command is submitted, the ground station should queue/process that command and return its ACK as the raw ACK string on Serial. The GUI reports success when the backend receives and recognizes the ACK. The available uplink commands are `BOOT`, `HC`, `CALC`, `TX_ON`, `TX_OFF`, `STATUS`, `RESET`, and `RW`.

## Integration sequence

1. Make all three `ground_station.ino` changes above and flash the updated ground-station firmware.
2. Connect the ground station to the Node.js host and confirm that telemetry is emitted with exactly 16 fields.
3. Confirm that received ACKs are emitted on Serial as the raw ACK string, without an `ACK_RX,` prefix.
4. Start the Node.js backend and open the GUI using the project's normal setup instructions in `README.md`.
5. Send a supported uplink command and confirm that the GUI remains in its waiting state until the ACK arrives, then reports the result.
6. Test `RW` as an uplink command and confirm that the ground station accepts and queues it.

## Handover checklist

- [ ] The telemetry field-count check requires exactly 16 fields.
- [ ] ACK Serial output contains no `ACK_RX,` prefix.
- [ ] The `userLine()` whitelist accepts all eight commands, including `RW`.
- [ ] The hardware team has verified delayed ACK handling against the 7.5-second maximum retry interval.
- [ ] A test uplink and its returned ACK have been confirmed end-to-end through the GUI.
