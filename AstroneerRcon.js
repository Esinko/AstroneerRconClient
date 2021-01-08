/**
 * -------------------------------------------
 * 
 * Rcon client for the gameserver of Astroneer
 * 
 * Github: https://github.com/Esinko/AstroneerRconClient
 * 
 * -------------------------------------------
 * 
 * By: @Esinko
 * 
 * Github: https://github.com/Esinko/
 * 
 * License: SEE "LICENSE" FILE
 * (Copyright 2020 Esinko. Licensed under the Apache License, Version 2.0)
 * 
 * -------------------------------------------
 */
class Client extends require("events").EventEmitter {
    /**
     * The client options object
     * @typedef {{ip: String, port: Number, password?: String, timeout?: Number}} ClientOptions
     * @property {String} ip The IP-address to connect to
     * @property {Number} port The port number the server is listening for rcon
     * @property {String} password The rcon password, leave emtpy if the server does not require an rcon password
     * @property {Number} timeout The timeout limit in ms. If not set, will default to 15000
     */
    /**
     * Create a new rcon client instance
     * @param {ClientOptions} options The client options
     */
    constructor(options){
        super()
        this.cons = () => {
            // Constructor parameters
            this.ip = options.ip
            this.port = options.port
            this.password = options.password
            this.timeout = options.timeout != undefined ? options.timeout : 15000
            // Libraries
            this.net = require("net")
            // Internal memory object
            this._ = {
                queue: [], // The request queue
                handler: null, // The current response callback handler
                socket: null // The socket
            }
            // Static regex values
            this.regex = {
                ip: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/g,
                port: /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/g
            }
            // General constants
            this.const = {
                permissionCategories: ["unlisted", "blacklisted", "whitelisted", "admin"],
                commandPrefix: "DS"
            }
        }
        this.cons()
    }

    /**
     * Handle an internal error
     * @param {String} message The message to be included with the error
     * @param {Error} err The error
     */
    async _error(message, error){
        try {
            if(this.listeners("error").length == 0){
                throw error
            }else {
                this.emit("error", {msg: message, error: error})
            }
        }
        catch(err_){
            throw err_
        }
    }

    /**
     * Connect to the server. Emits the "connecting" event when ran and "connected" event when connected to the server.
     */
    async connect(){
        try {
            if(this._.socket == null){ // Already connected?
                // Test the constructor parameters
                let ipTest = this.regex.ip.test(this.ip)
                let portTest = this.regex.port.test(this.port)
                if(ipTest == true && portTest == true){
                    // All tests passed, create socket
                    let socket = new this.net.Socket() // Just because I'm lazy
                    this._.socket = socket
                    this.emit("connecting")
                    // Trigger connect
                    socket.connect(this.port, this.ip, async () => {
                        // Do we have a password?
                        if(this.password != undefined){
                            // Write the password to the socket
                            socket.write(Uint8Array.from(new Buffer.from(this.password + "\n", "binary")))
                            this.listPlayers().then(response => {
                                this.emit("connected")
                            })
                        }else {
                            // We're already all done
                            this.listPlayers().then(response => {
                                this.emit("connected")
                            })
                        }   
                    })
                    // Socket event handlers
                    socket.on("data", async data => {
                        let st = new String(data)
                        // Parse the data
                        try {
                            data = JSON.parse(new Buffer.from(data).toString()) // To JSON response
                            try {
                                // Send the data event
                                this.emit("data", data)
                                // Do we have a handler?
                                if(this._.handler != null && typeof this._.handler == "function"){
                                    try {
                                        this._.handler(data) // Trigger the handler function
                                    }
                                    catch(err){
                                        this._error("Failed to run handler function", err)
                                    }
                                }else {
                                    this._error("Recieved an unexpected packet", new Error({data: data}))
                                }
                            }
                            catch(err){
                                this._error("Failed to handle socket response data", err)
                            }
                        }
                        catch(err){
                            this._error("Failed to parse socket response data (" + st + ")", err)
                        }
                    })
                    socket.on("close", async () => {
                        this.emit("closed")
                        this.cons() // Restore to defaults
                    })
                    socket.on("error", async error => {
                        // Destroy the socket and handle the error
                        try {
                            socket.destroy()
                            this.cons() // Restore to defaults
                        }
                        catch(err){
                            this._error("Failed to destroy socket", err)
                        }
                        this._error("Socket error", error)
                    })
                }else {
                    this._error("Constructor parameter validation failed", new Error({ip: ipTest == false ? "Failed" : "Passed", port: portTest == false ? "Failed" : "Passed"}))
                }
            }else {
                this._error("Socket already established", null)
            }
        }
        catch(err){
            this._error("Internal error", err)
        }
    }

    /**
     * Send raw string data encoded to a Uint8Array to the socket
     * @param {String} data The string data to be sent and encoded
     */
    async sendRaw(data){
        return new Promise((resolve) => {
            let self = () => {
                try {
                    // Are we the first element in the queue beind handled?
                    console.log("sending")
                    if(this._.queue[0] == self) this._.queue.splice(0,1) // Remove ourself from the queue
                    //Format: <prefix><command>\n
                    let encoded = Uint8Array.from(new Buffer.from(this.const.commandPrefix + data + "\n", "binary"))
                    console.log(encoded, data)
                    if(this._.socket.writable == true){
                        if(this._.handler != null){
                            // Add it to the queue
                            console.log("Added to queue", this._.handler)
                            this._.queue.push(self)
                        }else {
                            this._.socket.write(encoded, () => {
                                console.log("sent")
                                // The data has been sent
                                let cleared = false
                                let handler = (data) => { // Define a handler
                                    // Clear timeout
                                    cleared = true
                                    // Resolve the promise
                                    this._.handler = null
                                    console.log("Handler cleared")
                                    resolve(data)
                                    // Do we have something in the queue?
                                    if(this._.queue.length != 0){
                                        // We have something in the queue, handle the first item
                                        if(typeof this._.queue[0] == "function"){
                                            try {
                                                this._.queue[0]()
                                            }
                                            catch(err){
                                                this._error("Failed to run queue item function", err)
                                            }
                                        }else {
                                            this._error("Unexpected queue item type", new Error({expected: "function", got: typeof this._.queue[0]}))
                                        }
                                    }
                                }
                                console.log("handler is now", data)
                                this._.handler = handler // Define handler
                                // Timeout
                                let t = setTimeout(async () => {
                                    if(cleared != false) return
                                    this._error("Server timedout", new Error("Timedout"))
                                }, this.timeout)
                            })
                        }
                    }else {
                        this._error("Socket not writable", null)
                    }
                }
                catch(err){
                    this._error("Internal error", err)
                }
            }
            self()
        })
    }

    // ------------------------------------------------
    // Commands
    // ------------------------------------------------

    /**
     * List the currently connected players
     * State: Unstable
     */
    async listPlayers(){
        return new Promise((resolve) => {
            this.sendRaw("ListPlayers").then(response => {
                resolve(response.playerInfo)
            }).catch(async error => {this._error("Failed to list players", error)})
        })
    }

    /**
     * Get the save information, such as active save and list of available saves
     * State: Stable
     */
    async listSaves(){
        return new Promise((resolve) => {
            this.sendRaw("ListGames").then(async response => {
                // Parse the response
                let active = response.activeSaveName
                let activeIndex = null
                let list = response.gameList
                let newList = []
                for(let i = 0; i < list.length; i++){
                    // Parse each entry in the list
                    let save = list[i]
                    // Create date obj
                    let dateObj = new Date()
                    dateObj.setFullYear(save.date.split(".")[0])
                    dateObj.setMonth(save.date.split(".")[1].startsWith("0") ? parseInt(save.date.split(".")[1].split("")[1])-1 : parseInt(save.date.split(".")[1])-1)
                    dateObj.setHours(parseInt(save.date.split("-")[1].split(".")[0])+2) // Why does this register as 2 behind...?
                    dateObj.setMinutes(save.date.split("-")[1].split(".")[1])
                    dateObj.setSeconds(save.date.split("-")[1].split(".")[2])
                    console.log(save.date)
                    if(save.name == active) activeIndex = i
                    // Push the new list
                    newList.push({
                        name: save.name,
                        lastEdited: dateObj,
                        creative: save.bHasBeenFlaggedAsCreativeModeSave
                    })
                }
                resolve({
                    active: {
                        name: active,
                        index: activeIndex
                    },
                    list: newList
                })
            })
        })
    }

    /**
     * Get general information about the server
     */
    async getInfo(){
        return new Promise((resolve) => {
            this.sendRaw("ServerStatistics").then(async response => {
                // Resolve save
                this.listSaves().then(async save => {
                    // TODO: Resolve player
                    save.active.creative = response.creativeMode
                    resolve({
                        version: response.build,
                        owner: null, // TODO: Resolve player
                        maxPlayers: response.maxInGamePlayers,
                        onlinePlayers: response.playersInGame,
                        knownPlayers: response.playersKnownToGame,
                        save: save.active,
                        timePlayed: response.secondsInGame,
                        name: response.serverName,
                        url: response.serverUrl,
                        fps: response.averageFPS,
                        passwordProtected: response.hasServerPassword,
                        whitelistEnabled: response.isEnforcingWhitelist,
                        achievementsEnabled: !response.isAchievementProgressionDisabled
                    })
                })
            })
        })
    }

    async test(){
        let encoded = Uint8Array.from(new Buffer.from("DSSetDenyUnlisted\n", "binary"))
        this._.socket.write(encoded)
    }
}
/**
 * Command syntaxes:
 *  DSAddFavorite ...? | Disabled
 *  DSBackupSaveGames ...? | Unknown
 *  DSClearFavoritesList ...? | Disabled
 *  DSClearRecentsList ...? | Disabled
 *  DSCreativeMode ...? | Disabled
 *  DSDeleteGame ...? | Disabled
 *  DSGetFavoritesList ...? | Disabled
 *  DSGetProperties ...? | Disabled
 *  DSGetRecentsList ...? | Disabled
 *  DSGetServerList ...? | Disabled
 *  DSKickPlayer ...? | Unkown
 *  DSKickPlayerGuid <guid> | Functional
 *  DSListGames | Functional
 *  DSListPlayers | Functional
 *  DSLoadGame | Functional
 *  DSNewGame | Functional
 *  DSRemote ...? | Unkown
 *  DSRemoveFavorite ...? | Disabled
 *  DSRenameGame ...? | Disabled
 *  DSSaveGame | Functional
 *  DSServerShutdown | Functional
 *  DSServerStatistics | Functional
 *  DSSetActivityTimeout ...? | Unkown
 *  DSSetBackpackPowerUnlimitedCreative ...? | Disabled
 *  DSSetBackupSaveGamesInterval ...? | Disabled
 *  DSSetDenyUnlisted <boolean> | Functional
 *  DSSetFuelFreeCreative ...? | Disabled
 *  DSSetInvincibleCreative ...? | Disabled
 *  DSSetInvisibleToHazardsCreative ...? | Disabled
 *  DSSetOxygenFreeCreative ...? | Disabled
 *  DSSetPassword ...? | Disabled
 *  DSSetPlayerCategory ...? | Disabled
 *  DSSetPlayerCategoryForPlayerName <name> <category> | Functional
 *  DSSetPlayerCategoryGuid <guid> <category> | Functional
 *  DSSetPlayerCategoryIdx ...? | Unkown
 *  DSSetSaveGameInterval ...? | Unkown
 *  DSTravel ...? | Unkown
 *  DSTravelFriend ...? | Unkown
 *  DSTravelName ...? | Unkown
 *  DSTravelPass ...? | Unkown
 *  DSTravelURL ...? | Unkown
 */
module.exports = Client