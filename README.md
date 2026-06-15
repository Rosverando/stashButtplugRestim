# stashButtplugRestim

  

A plugin to connect stashApp to Buttplugio. (Only supports linear devices currently)

Unlike <a  href="https://github.com/happykinkster/stashInteractive">happykinksters</a> plugin, this uses positionWithDuration.

This was done because what i use (restim) expects a position with a duration over which to move to it, instead of getting sent interpolated position updates that expect the device to move instantly


This plugin can also be used to send raw Tcode to any websocket server


Has the following config options:

- **serverUrl**: The address of your Intiface Central server (e.g. http://127.0.0.1:12345) (or restim if you want to skip buttplug, in which case the url should be something like ws://localhost:12346/tcode)
- **latency**: Adjust timing synchronization (negative to have actions play earlier)
- **skipButtplug**: Wether you want to skip Buttplug and send straight Tcode to Server URL
- **cumHotkey**: Wether you want script playback to pause when pressing <PAUSE> on your keyboard (video will not pause)
- **cumHotkeyPosition**: The Position you want the device to home to when pressing <PAUSE>, only neede if using cumHotKey


## Installation

Add this repository as a plugin source in StashApp:

1. Go to **Settings > Plugins**.
2. Click **Sources** -> **Add Source**.
3. Enter:
   - **Name**: stashButtplugRestim
   - **URL**: `https://rosverando.github.io/stashButtplugRestim/main/index.yml`
4. install the **stashButtplugRestim** plugin from the **Available** tab.
