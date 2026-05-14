# stashButtplugRestim

  

A plugin to connect stashApp to Buttplugio. (Only supports linear devices currently)

Unlike <a  href="https://github.com/happykinkster/stashInteractive">happykinksters</a> plugin, this uses positionWithDuration.

This was done because what i use (restim) expects a position with a duration over which to move to it, instead of getting sent interpolated position updates that expect the device to move instantly


This plugin can also be used to send raw Tcode to any websocket server


Has the following config options:

- **serverUrl**: The address of your Intiface Central server (e.g. http://127.0.0.1:12345) (or restim if you want to skip buttplug, in which case the url should be something like ws://localhost:12346/tcode)
latency: Adjust timing synchronization (negative to have actions play earlier)
- **skipButtplug**: Wether you want to skip Buttplug and send straight Tcode to Server URL
- **expandAxis**: Only needed for restim if you skip Buttplug and send Tcode straight to restim. Will use the same Math that Restim uses to "generate beta axis"
