(async function () {
    const self = this;
    self.buttplugjs = await import('https://cdn.jsdelivr.net/npm/buttplug@4.0.1/dist/web/buttplug.mjs');
    
    //add event listener for PAUSE key and keep track of if we should be transmitting funscript right now
    //evaluation at sending time depends on if setting cumHotkey is true/false
    document.addEventListener('keydown', (e) => {
        if(e.key!=="Pause"){return}
        if(!self.settings.cumHotkey){return}
        self.cumPaused = !self.cumPaused
        console.log("newPuased",self.cumPaused)
        //if we are newly paused, send goto 0 in 0ms
        if(self.cumPaused){
                
            if(self.settings.skipButtplug){
                this.websocket.send("L0" + String(self.settings.cumHotkeyPosition).padStart(3, '0') + "I" + 0)
            }else{
                let homePos = self.settings.cumHotkeyPosition
                if(self.settings.bugfix){
                    homePos = homePos/1000*999
                }
                self.device.runOutput(self.buttplugjs.DeviceOutput.PositionWithDuration.percent(self.settings.cumHotkeyPosition/100, 1))
            }
            
        }
    });

    let currentLoop = null
    //abortable sleep
    function sleep(duration, signal) {
        return new Promise((resolve, reject) => {
            const id = setTimeout(resolve, duration)
            signal.addEventListener('abort', () => {
                clearTimeout(id)
                reject(new DOMException('Aborted', 'AbortError'))
            })
        })
    }

    async function funscriptLoop(playAt,delay,startVideo,speed){
        //needed so we can autostart video after we are truly ready
        let videoStarted = false

        //might be needed for restim expansion
        const timeouts = []
        

        //in case we are already running a funscript loop
        if (currentLoop) currentLoop.abort()

        const controller = new AbortController()
        currentLoop = controller

        
        //seconds to millis
        playAt = playAt * 1000

        //startPlayTime for continuous time sync
        //using delay here should work for all actions
        //delay can be negative (earlier) or positive(later)
        //so play at 5400ms becomes play at 5300ms with a delay of -100
        let startTime = performance.now()-playAt+delay

        // Binary search for the first action at or after playAt
        let lo = 0, hi = self.funscript.length - 1, startIndex = self.funscript.length
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1
            if (self.funscript[mid].at >= playAt) {
                startIndex = mid
                hi = mid - 1
            } else {
                lo = mid + 1
            }
        }


        let lastAt
        if (startIndex > 0) {
            lastAt = self.funscript[startIndex - 1].at
        } else {
            lastAt = playAt
        }

        for( let i = startIndex; i<self.funscript.length;i++){
            let action = self.funscript[i]
            let nextAt = action["at"] //int 0-100
            let pos = action["pos"] //millis


            if(startVideo && !videoStarted){
                videoStarted = true
                PluginApi.player.play()
            }

            //we should now be between two actions
            //lastAt and nextAt
            //we need both so we can adjust for starting in the middle of two actions
            //currently not doing that
            let currentTime = performance.now()
            let passedTime = currentTime - startTime


            //calculate the duration over which to move to the next action
            let idealDur = nextAt-lastAt
            let realDur = Math.round(nextAt-passedTime)
            
            //dummy placeholder
            if(!self.settings.skipButtplug){
                if(self.settings.cumHotkey){
                    if(!self.cumPaused){


                        if(self.settings.bugfix){
                            self.device.runOutput(self.buttplugjs.DeviceOutput.PositionWithDuration.percent(pos*10/999, realDur))
                        }else{
                            self.device.runOutput(self.buttplugjs.DeviceOutput.PositionWithDuration.percent(pos/100, realDur))
                        }
                        
                    }
                }else{
                    self.device.runOutput(self.buttplugjs.DeviceOutput.PositionWithDuration.percent(pos/100, realDur))
                }
                
            }else if(self.settings.skipButtplug){
                const mappedPos = Math.round(pos * 9.99);
                this.websocket.send("L0" + String(mappedPos).padStart(3, '0') + "I" + realDur)                
            }

            lastAt = nextAt

            //again, its an abortable sleep
            //an abort should throw an exception which should abort the rest
            try {
                await sleep(realDur, controller.signal)
            } catch (e) {
                break
            }   
        }
    }

    async function fetchSettings() {
        console.log("fetching settings for stashButtplugRestim")
        try {
            const query = { query: "{ configuration { plugins } }" };
            const res = await fetch("/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(query)
            });
            const data = await res.json();
            const settings = data?.data?.configuration?.plugins?.stashButtplugRestim;
            if (settings) {
                console.log(settings)
                self.settings = settings
            }
        } catch (e) { console.error("error fetching settings for stashButtplugRestim", e); }
    }

    // Initial fetch
    await fetchSettings();
    
    //ignore buttplug stuff if we send straight to restim/tcode 
    if(!this.settings.skipButtplug){
        //url e.g http://127.0.0.1:12345
        const connector = new buttplugjs.ButtplugBrowserWebsocketClientConnector(self.settings.serverUrl);
        const client = new buttplugjs.ButtplugClient("StashApp");

        await client.connect(connector);
    
        for(let i = 0;i<client._devices.size;i++){
            console.log(client.devices.get(i)._deviceInfo.DeviceName,i)
        }

        let deviceArr = Array.from(client.devices.values())
        self.device = deviceArr[0]

    }else if(this.settings.skipButtplug){
        //connect to websocket server
        self.websocket = new WebSocket(self.settings.serverUrl);
    }

    function handlePause (e) {
        console.log("pause")
        if (currentLoop) currentLoop.abort()
    }

    function handlePlay(e) {
        console.log("play")
        funscriptLoop(PluginApi.player.currentTime(),self.settings.latency,true)
    }

    function handleWaiting(e) {
        console.log("buffering")
        if (currentLoop) currentLoop.abort()
    }

    function handleSeek (e) {
        console.log("seek")
        //not needed since seek triggers pause->play
    }

    function handleRateChange(e){
        console.log("rateChange")
        //not yet implemented
        //might be able to change rate live without pausing eventually
        //lets not tho, that sounds like ass to implement
        return

        PluginApi.player.pause()
        let newRate = PluginApi.player.playbackRate()
    }

    async function init() {
        console.log("init")

        //getting the current funscript is ok to repeat
        let v = document.querySelector('video');
        let id = window.location.pathname.match(/\/scenes\/(\d+)/)?.[1];
        let funscriptUrl = window.location.origin
        funscriptUrl += `/scene/${id}/funscript`

        let json = await fetch(funscriptUrl).then(r => r.json());

        self.funscript = json.actions
        let newPlayer = document.querySelector("video-js").player;
        
        //so we dont get play -> click on next -> play
        handlePause()
        
        //in case we go scene -> stash -> scene
        //disable old player listeners so we dont double play/stop/seek
        //not that that seemed to have any negative consequences
        //but its less chance to fuck up delay
        if(PluginApi.player){
            PluginApi.player.off("pause", handlePause);
            PluginApi.player.off("playing", handlePlay);
            PluginApi.player.off("seeked", handleSeek);
            PluginApi.player.off("ratechange", handleRateChange);
            PluginApi.player.off("waiting", handleWaiting);
        }


        PluginApi.player = newPlayer
        PluginApi.player.on("pause", handlePause);
        PluginApi.player.on("playing", handlePlay);
        PluginApi.player.on("seeked", handleSeek);
        PluginApi.player.on("ratechange", handleRateChange);
        PluginApi.player.on("waiting", handleWaiting);
        PluginApi.player.options({playbackRateMenuButton: false})

        handlePlay()
    }

    PluginApi.Event.addEventListener("stash:location", () => wfke("video-js", init))
    //so we stop playing when we switch to e.g scenes where no video player is present
    //side effect that if you open a new tab, playback gets stopped for funscript only (fine imo)
    PluginApi.Event.addEventListener("stash:location", handlePause)
    //inital init in case of page reload
    wfke("video-js", init)
})();
