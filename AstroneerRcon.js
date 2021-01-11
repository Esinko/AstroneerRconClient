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
    // ------------------------------------------------------------------------------------------------------------------------------------------------
    // Custom type defenitions
    // ------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * The client options object
     * @typedef {{ip: String, port: Number, password?: String, timeout?: Number}} ClientOptions
     * @property {String} ip The IP-address to connect to
     * @property {Number} port The port number the server is listening for rcon
     * @property {String} password The rcon password, leave emtpy if the server does not require an rcon password
     * @property {Number} timeout The timeout limit in ms. If not set, will default to 15000
     */
    
    /**
     * A query object to search for players
     * @typedef {{guid?: String, name?: String, index?: Number}} PlayerQuery
     * @property {String} guid A player guid. This is a string id unique for each player, which never changes
     * @property {String} name The playername
     * @property {Number} index The player index (in the known players list)
     */

    /**
     * A player category string
     * @typedef {"Unlisted"|"Blacklisted"|"Whitelisted"|"Admin"|"Pending"|"Owner"} PlayerCategory Player category
     * - Unlisted = No permissions, blocked by whitelist if enabled
     * - Blacklisted = Same as banned
     * - Whitelisted = No permissions, allowed by whitelist if enabled
     * - Admin = Max permissions possible for anyone but the owner
     * - Pending = Not yet set, will be automatically set to Unlisted on next connect if not changed by then
     * - Owner = The owner, all permissions
     */

    /**
     * Creative save configuration
     * @typedef {{fuel: Boolean, invincible: Boolean, hazards: Boolan, oxygen: Boolean, backpackpower: Boolean}} CreativeConfig Save's creative configuration
     * @property {Boolean} fuel Should fuel consumption be enabled?
     * @property {Boolean} invincible Should invincibility be enabled?
     * @property {Boolean} hazards Should hazards be enabled?
     * @property {Boolean} oxygen Should oxygen system be enabled?
     * @property {Boolean} backpackpower Should the backpack power limit be enabled?
     */

    // ------------------------------------------------------------------------------------------------------------------------------------------------
    // Basic socket operations
    // ------------------------------------------------------------------------------------------------------------------------------------------------

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
                socket: null, // The socket
                eventLoop: null,
                eventLoopState: null,
                eventCache: {
                    saves: null,
                    players: null
                }
            }
            // Static regex values
            this.regex = {
                ip: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/g,
                port: /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/g
            }
            // General constants
            this.const = {
                permissionCategories: ["Unlisted", "Blacklisted", "Whitelisted", "Admin", "Pending", "Owner"], // Pending is just empty?
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
                        let loop = () => {
                            // Start the loops
                            // Events: playerjoin, playerleft, newplayer, playercategory, save, newsave, setsave, deletesave, disconnect
                            this._.eventLoop = async () => {
                                // Check players 
                                this.sendRaw("ListGames\nDSListPlayers").then(async response => {
                                    let players = response[1]
                                    let saves = response[0]
                                    // Parse the data
                                    let newList = []
                                    for(let i = 0; i < players.playerInfo.length; i++){
                                        newList.push({
                                            guid: players.playerInfo[i].playerGuid,
                                            category: players.playerInfo[i].playerCategory,
                                            name: players.playerInfo[i].playerName,
                                            inGame: players.playerInfo[i].inGame,
                                            index: players.playerInfo[i].index
                                        })
                                    }
                                    players = newList
                                    let active = saves.activeSaveName
                                    let list = saves.gameList
                                    newList = []
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
                                        // Push the new list
                                        let c = {
                                            name: save.name,
                                            lastEdited: dateObj,
                                            creative: save.bHasBeenFlaggedAsCreativeModeSave,
                                            index: i
                                        }
                                        newList.push(c)
                                        if(save.name == active) active = c
                                    }
                                    // Active save has never been loaded
                                    if(typeof active == "string"){
                                        active = {
                                            name: active,
                                            lastEdited: null,
                                            creative: null,
                                            index: null
                                        }
                                        newList.push(active)
                                    }
                                    saves = {
                                        active: active,
                                        list: newList
                                    }

                                    // Update players
                                    if(this._.eventCache.players == null){
                                        this._.eventCache.players = players
                                    }else {
                                        let copy = players.slice(0)
                                        for(let i = 0; i < players.length; i++){
                                            let player = players[i]
                                            for(let ii = 0; ii < this._.eventCache.players.length; ii++){
                                                let cachePlayer = this._.eventCache.players[ii]
                                                if(player.guid == cachePlayer.guid){
                                                    copy[cachePlayer.index] = null
                                                    // Handle changes
                                                    if(cachePlayer.inGame == true && player.inGame == false){
                                                        this.emit("playerleft", player)
                                                    }else if(cachePlayer.inGame == false && player.inGame == true){
                                                        this.emit("playerjoin"), player
                                                    }
                                                    if(cachePlayer.category == player.category){
                                                        this.emit("playercategory", player)
                                                    }
                                                }
                                            }
                                        }
                                        // Handle new players
                                        for(let i = 0; i < copy.length; i++){
                                            if(copy[i] == null) continue
                                            this.emit("newplayer", copy[i])
                                        }
                                        this._.eventCache.players = players
                                    }
                                    // Update saves
                                    if(this._.eventCache.saves == null){
                                        this._.eventCache.saves = saves
                                    }else {
                                        let copy = this._.eventCache.saves
                                        copy.list = this._.eventCache.saves.list.slice(0)
                                        let cacheCopy = saves.list.slice(0)
                                        // Handle modified save
                                        for(let i = 0; i < saves.list.length; i++){
                                            let save = saves.list[i]
                                            for(let ii = 0; ii < copy.list.length; ii++){
                                                let cacheSave = copy.list[ii]
                                                if(cacheSave == null) continue
                                                if(save.name == cacheSave.name){
                                                    copy.list[ii] = null
                                                    cacheCopy[ii] = null
                                                    if(save.lastEdited != null && cacheSave.lastEdited != null && save.lastEdited.toUTCString() != cacheSave.lastEdited.toUTCString()){
                                                        this.emit("save", save)
                                                    }
                                                }
                                            }
                                        }
                                        // Handle active save
                                        //console.log(this._.eventCache.saves.active, saves.active)
                                        if(this._.eventCache.saves.active.name != saves.active.name){
                                            this.emit("setsave", saves.active)
                                        }
                                        // Handle deleted saves
                                        for(let i = 0; i < copy.list.length; i++){
                                            if(copy.list[i] == null) continue
                                            this.emit("newsave", copy.list[i])
                                        }
                                        // Handle new saves
                                        for(let i = 0; i < cacheCopy.length; i++){
                                            if(cacheCopy[i] == null) continue
                                            this.emit("deletesave", cacheCopy[i])
                                        }
                                        this._.eventCache.saves = saves
                                    }
                                    setTimeout(() => {
                                        this._.eventLoop()
                                    }, 2000)
                                })
                            }
                            setTimeout(() => {
                                this._.eventLoop()
                            }, 1000)
                        }
                        if(this.password != undefined){
                            // Write the password to the socket
                            socket.write(Uint8Array.from(new Buffer.from(this.password + "\n", "binary")))
                            this.listPlayers().then(response => {
                                this.emit("connected")
                                loop()
                            })
                        }else {
                            // We're already all done
                            this.listPlayers().then(response => {
                                this.emit("connected")
                                loop()
                            })
                        }   
                    })
                    // Socket event handlers
                    let tmpCache = ""
                    let waiting = false
                    let processCache = async (data) => {
                        waiting = false
                        // Parse the data
                        let st = new String(data)
                        data = st.split("\r\n")
                        let resultCache = []
                        for(let i = 0; i < data.length; i++){
                            let inner = data[i]
                            //console.log([inner])
                            if(inner != ""){
                                try {
                                    if(this._.handler.options.notJson != true){
                                        inner = JSON.parse(new Buffer.from(inner).toString()) // To JSON response
                                    }else {
                                        inner = new Buffer.from(inner).toString() // To String response
                                    }
                                    try {
                                        resultCache.push(inner)
                                    }
                                    catch(err){
                                        this._error("Failed to handle socket response data", err)
                                    }
                                }
                                catch(err){
                                    this._error("Failed to parse socket response data (" + st + ")", err)
                                }
                            }
                        }
                        // Send the data event
                        this.emit("data", data)
                        // Do we have a handler?
                        if(this._.handler != null && typeof this._.handler.function == "function"){
                            try {
                                this._.handler.function(resultCache.length == 1 ? resultCache[0] : resultCache) // Trigger the handler function
                            }
                            catch(err){
                                this._error("Failed to run handler function", err)
                            }
                        }else {
                            this._error("Recieved an unexpected packet", new Error(JSON.stringify(data)))
                        }
                    }
                    socket.on("data", async data => {
                        // Sometimes the packet can actually arrive in 2 packets
                        // Which really makes no sense, but this hacky fix will do
                        // Here we basically just wait 90ms after a packet has arrived
                        // If another packet comes in within that 90ms window, it will be merged with the first packet
                        if(waiting == false){ // This means we or not in ^that 90ms windows of mergi packets
                            waiting = true
                            tmpCache = data
                            setTimeout(async () => {
                                processCache(tmpCache)
                            }, 90)
                        }else {
                            tmpCache = tmpCache + data
                        }
                    })
                    socket.on("close", async () => {
                        this.emit("disconnect")
                        this.cons() // Restore to defaults
                    })
                    socket.on("error", async error => {
                        // Destroy the socket and handle the error
                        try {
                            this.emit("disconnect")
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
     * @param {Boolean} notJson The expected response does not contain json
     * @param {Boolean} noResponse This packet does not get a response from the server
     */
    async sendRaw(data, notJson, noResponse){
        return new Promise((resolve) => {
            let self = () => {
                try {
                    // Are we the first element in the queue beind handled?
                    if(this._.queue[0] == self) this._.queue.splice(0,1) // Remove ourself from the queue
                    //Format: <prefix><command>\n
                    let encoded = Uint8Array.from(new Buffer.from(this.const.commandPrefix + data + "\n", "binary"))
                    if(this._.socket.writable == true){
                        if(this._.handler != null){
                            // Add it to the queue
                            this._.queue.push(self)
                        }else {
                            this._.socket.write(encoded, () => {
                                // The data has been sent
                                let cleared = false
                                let handler = (data) => { // Define a handler
                                    // Clear timeout
                                    cleared = true
                                    // Resolve the promise
                                    this._.handler = null
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
                                if(noResponse == true){
                                    resolve()
                                }else {
                                    this._.handler = {
                                        function: handler,
                                        options: {
                                            notJson: notJson
                                        }
                                    } // Define handler
                                    // Timeout
                                    let t = setTimeout(async () => {
                                        if(cleared != false) return
                                        this._error("Server timedout", new Error("Timedout"))
                                    }, this.timeout)
                                }
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


    // ------------------------------------------------------------------------------------------------------------------------------------------------
    // Commands
    // ------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * List all the players known to the server
     * State: Stable
     */
    async listPlayers(){
        return new Promise((resolve) => {
            this.sendRaw("ListPlayers").then(response => {
                let newList = []
                for(let i = 0; i < response.playerInfo.length; i++){
                    newList.push({
                        guid: response.playerInfo[i].playerGuid,
                        category: response.playerInfo[i].playerCategory,
                        name: response.playerInfo[i].playerName,
                        inGame: response.playerInfo[i].inGame,
                        index: response.playerInfo[i].index
                    })
                }
                resolve(newList)
            }).catch(async error => {this._error("Failed to list players", error)})
        })
    }
    
    /**
     * Get a specific player by guid, index or name
     * @param {PlayerQuery} options The player query options
     */
    async getPlayer(options){
        return new Promise((resolve, reject) => {
            try {
                this.listPlayers().then(async response => {
                    if(options.guid != undefined){
                        // Get by guid
                        let got = null
                        for(let i = 0; i < response.length; i++){
                            if(response[i].guid == options.guid){
                                got = response[i]
                                break
                            }
                        }
                        resolve(got)
                    }else if(options.name != undefined){
                        // Get by name, return an array
                        let got = []
                        for(let i = 0; i < response.length; i++){
                            if(response[i].name == options.name){
                                got.push(response[i])
                            }
                        }
                        resolve(got)
                    }else if(options.index != undefined){
                        resolve(response[options.index])
                    }else {
                        reject("No supported query parameter suplied")
                    }
                })
            }
            catch(err){
                reject(err)
            }
        })
    }

    /**
     * Kick a player from the game
     * @param {PlayerQuery} player The player query options
     * State: Stable 
     */
    async kick(player){
        return new Promise((resolve, reject) => {
            this.getPlayer(player).then(async player => {
                if(player.category == "Owner"){ // TODO: Is this a real limitation. Test it!
                    reject("Cannot kick owner")
                }else {
                    let kick = () => {
                        if(player.inGame == false){
                            reject("That player is not online")
                        }else {
                            this.sendRaw("KickPlayerGuid " + player.guid, true).then(async response => {
                                // This just dumps the internal debug log for us
                                response = response.trim()
                                if(response.endsWith("????d")){
                                    // We kicked the user
                                    resolve()
                                }else {
                                    // Something went wrong?
                                    reject("Failed to kick player, response: " + response)
                                }
                            })
                        }
                    }
                    if(Array.isArray(player)){
                        if(player.length == 0){
                            reject("Player not found")
                        }else if(player.length > 1){
                            reject("Found multiple players that match the query. Please be more precise in selecting the player to apply the category to. Use an index or a guid.")
                        }else {
                            player = player[0]
                            kick()
                        }
                    }else if(player != null){
                        kick()
                    }else {
                        reject("Player not found")
                    }
                }
            })
        })
    }

    /**
     * Kick all players from the server
     * State: Unstable
     */
    async kickAll(){
        return new Promise((resolve) => {
            this.listPlayers().then(async players => {
                let processed = 0
                let complete = () => {
                    if(processed == players.length){
                        resolve()
                    }
                }
                for(let i = 0; i < players.length; i++){
                    this.kick(players[i].guid).then(() => {
                        ++processed
                        complete()
                    }).catch(err => {
                        this._error("Failed to kick player while running kick all", err)
                        ++processed
                        complete()
                    })
                }
            })
        })
    }

    /**
     * Set a players category (also know as permission level)
     * @param {PlayerQuery} player The player query options
     * @param {PlayerCategory} category The category to apply
     * State: Stable (limitations)
     */
    async setPlayerCategory(player, category){
        return new Promise((resolve, reject) => {
            if(this.const.permissionCategories.includes(category)){
                this.getPlayer(player).then(async player => {
                    let apply = () => {
                        if(player.category == "Owner"){
                            reject("Cannot change Owner's category")
                        }else {
                            //this.sendRaw("SetPlayerCategoryForPlayerGuid " + player.guid + " " + category).then(async response => {
                            //  if(response.status == true){
                            //        player.category = category
                            //        resolve(player)
                            //    }else {
                            //        reject("Unexpected server response: " + JSON.stringify(response))
                            //    }
                            //})
                            // This is VERY bad, but yet the only way we can apply categories at the moment...
                            // This sucks ik, but just remove that ForPlayerName bs and uncomment the lines above when categories get fixed.
                            if(player.name == ""){
                                reject("Due to the limitations of the Astroneer Dedicated server the category of this user cannot be modified")
                            }else {
                                this.sendRaw("SetPlayerCategoryForPlayerName " + player.name + " " + category).then(async response => {
                                    if(response.status == true){
                                        player.category = category
                                        resolve(player)
                                    }else {
                                        reject("Unexpected server response: " + JSON.stringify(response))
                                    }
                                })
                            }
                        }
                    }
                    if(Array.isArray(player)){
                        if(player.length == 0){
                            reject("Player not found")
                        }else if(player.length > 1){
                            reject("Found multiple players that match the query. Please be more precise in selecting the player to apply the category to. Use an index or a guid.")
                        }else {
                            player = player[0]
                            apply()
                        }
                    }else if(player != null){
                        apply()
                    }else {
                        reject("Player not found")
                    }
                }).catch(async err => {
                    this._error("Failed to get player", err)
                })
            }else {
                reject("No such category (Note: All categories' name's first charecter is uppercase!)")
            }
        })
    }

    /**
     * Get the save information, such as active save and list of available saves
     * State: Stable
     */
    async listSaves(){
        return new Promise((resolve) => {
            let t = () => {
                this.sendRaw("ListGames").then(async response => {
                    // Parse the response
                    let active = response.activeSaveName
                    let list = response.gameList
                    let newList = []
                    if(list == undefined){
                        setTimeout(async () => {
                            t()
                        }, 500)
                    }else {
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
                            // Push the new list
                            let c = {
                                name: save.name,
                                lastEdited: dateObj,
                                creative: save.bHasBeenFlaggedAsCreativeModeSave,
                                index: i
                            }
                            newList.push(c)
                            if(save.name == active) active = c
                        }
                        // Active save has never been loaded
                        if(typeof active == "string"){
                            active = {
                                name: active,
                                lastEdited: null,
                                creative: null,
                                index: null
                            }
                            newList.push(active)
                        }
                        resolve({
                            active: active,
                            list: newList
                        })
                    }
                })
            }
            t()
        })
    }

    /**
     * Save the game
     * @param {String} name (This parameter is optiona!) Set the name of the new save
     * State: Unstable
     */
    async save(name){
        return new Promise((resolve, reject) => {
            this.listSaves().then(async saves => {
                let edited = saves.active.lastEdited
                if(name != undefined){
                    // Check the name
                    let found = false
                    for(let i = 0; i < saves.list.length; i++){
                        if(saves.list[i].name == name){
                            found = true
                            break
                        }
                    }
                    if(found != false){
                        reject("A save with the given name already exists")
                    }else {
                        this.sendRaw("SaveGame " + name, null, true).then(async response => {
                            // No response
                            let e = () => {
                                this.listSaves().then(async saves => {
                                    if(saves.active.lastEdited != edited){
                                        // The game has been saved
                                        resolve()
                                    }else {
                                        setTimeout(async () => {
                                            e()
                                        }, 100)
                                    }
                                })
                            }
                            e()
                        })
                    }
                }else {
                    this.sendRaw("SaveGame", null, true).then(async response => {
                        // No response
                        let e = () => {
                            this.listSaves().then(async saves => {
                                if(saves.active.lastEdited != edited){
                                    // The game has been saved
                                    resolve()
                                }else {
                                    setTimeout(async () => {
                                        e()
                                    }, 100)
                                }
                            })
                        }
                        e()
                    })
                }
            })
        })
    }
    
    /**
     * Shutdown the server
     * @param {Boolean} force Force the server shutdown without saving
     * State: Stable
     */
    async shutdown(force){
        return new Promise((resolve) => {
            if(force != true){
                this.sendRaw("ServerShutdown", null, true).then(async () => {
                    resolve()
                })
            }else {
                this.save().then(async () => {
                    this.sendRaw("ServerShutdown", null, true).then(async () => {
                        resolve()
                    })
                })
            }
        })
    }

    /**
     * Load a new save in the server
     * @param {String} name The name of the save
     * State: Stable
     */
    async setSave(name){
        return new Promise((resolve, reject) => {
            // Save current game
            this.save().then(async () => {
                this.listSaves().then(async saves => {
                    let save = null
                    for(let i = 0; i < saves.list.length; i++){
                        if(saves.list[i].name == name){
                            save = saves.list[i]
                            break
                        }
                    }
                    if(save != null){
                        // We have a valid save
                        if(save == saves.active){
                            // The save is already loaded
                            reject("Save already loaded")
                        }else {
                            // Now we are sure the save can be loaded
                            this.sendRaw("LoadGame " + save.name).then(async response => {
                                if(response.status == true){
                                    resolve()
                                }else {
                                    reject("Unexpected response", response)
                                }
                            })
                        }
                    }else {
                        reject("No save found")
                    }
                })
            })
        })
    }

    /**
     * Rename a save
     * @param {String} name The save to rename
     * @param {String} newname The name to apply
     */
    async renameSave(name, newname){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Delete a save
     * @param {String} name The name of the save
     */
    async deleteSave(name){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Set the interval to autosave at
     * @param {Number} ms The time in ms
     */
    async setSaveInternal(ms){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Set the server password, leave empty to disable it
     * @param {String} password The password string
     */
    async setPassword(password){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Set the activity timeout for the server
     * @param {Number} ms The time in ms
     */
    async setActivityTimeout(ms){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Enable or modify creative setting for the currently loaded game
     * @param {CreativeConfig} options The creative configuration
     */
    async setCreative(options){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Create a new save
     * @param {String} name The name of the save
     * @param {Boolean} activate Should the new save be set as active
     * State: Stable (sometimes causes client crashes)
     */
    async createSave(name, activate){
        return new Promise((resolve, reject) => {
            // Save current game
            this.save().then(async () => {
                // Make sure the name is not in use
                this.listSaves().then(async saves => {
                    let found = false
                    let oldActive = saves.active
                    for(let i = 0; i < saves.list.length; i++){
                        if(saves.list[i].name == name){
                            found = true
                            break
                        }
                    }
                    if(found == false){
                        this.sendRaw("NewGame " + name, null, true).then(() => {
                            // No response?
                            let e = async () => {
                                this.listSaves().then(async saves1 => {
                                    if(saves1.active.name == name){
                                        let e = 0 // This just makes it work I guess...
                                        if(activate == false){
                                            // We don't want the save to be activated
                                            this.setSave(oldActive.name).then(() => {
                                                resolve()
                                            }).catch(err => {
                                                reject(err)
                                            })
                                        }else {
                                            // We're fine with the save automatically activating
                                            resolve()
                                        }
                                    }else {
                                        setTimeout(async () => {
                                            e()
                                        }, 1000)
                                    }
                                })
                            }
                            e()
                        })
                    }else {
                        reject("A save with that name already exists")
                    }
                })
            })
        })
    }

    /**
     * Enable or disable the whitelist
     * @param {Boolean} boolean The state for the 
     */
    async setWhitelist(boolean){
        return new Promise((resolve, reject) => {
            if(typeof boolean == "boolean"){
                this.sendRaw("SetDenyUnlisted " + boolean.toString(), true).then(async response => {
                    if(response.includes("changed: ")){
                        resolve()
                    }else {
                        reject("Whitelist state unchanged")
                    }
                })
            }else {
                reject("The first function parameter must be a boolean")
            }
        })
    }

    /**
     * Get general information about the server
     * State: Stable
     */
    async getInfo(){
        return new Promise((resolve) => {
            this.sendRaw("ServerStatistics").then(async response => {
                // Resolve save
                this.listSaves().then(async save => {
                    save.active.creative = response.creativeMode
                    this.listPlayers().then(async players => {
                        let owner = null
                        for(let i = 0; i < players.length; i++){
                            if(players[i].category == "Owner"){
                                owner = players[i]
                                break
                            }
                        }
                        resolve({
                            version: response.build,
                            owner: owner,
                            maxPlayers: response.maxInGamePlayers,
                            onlinePlayers: response.playersInGame,
                            knownPlayers: response.playersKnownToGame,
                            save: save.active,
                            timePlayed: response.secondsInGame,
                            name: response.serverName,
                            url: response.serverURL,
                            fps: response.averageFPS,
                            passwordProtected: response.hasServerPassword,
                            whitelistEnabled: response.isEnforcingWhitelist,
                            achievementsEnabled: !response.isAchievementProgressionDisabled
                        })
                    })
                })
            })
        })
    }
}


// Link clas is WIP!
/**
 * Custom client implementation for the popular server management software called AstroLauncher.
 * 
 * Implements the same functionality in the class above (with some limitations), but through AstroLauncher's api.
 * 
 * As there can be only one rcon client connected to the server at once and AstroLauncher automatically occupies that socket.
 */
class Link extends require("events").EventEmitter {
    // ------------------------------------------------------------------------------------------------------------------------------------------------
    // Custom type defenitions
    // ------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * The link client options object
     * @typedef {{ip: String, port: Number, password?: String, timeout?: Number}} ClientOptions
     * @property {String} ip The IP-address to connect to
     * @property {Number} port The port number the server is listening for rcon
     * @property {String} password The Astrolauncher password
     */
    
    /**
     * A query object to search for players
     * @typedef {{guid?: String, name?: String, index?: Number}} PlayerQuery
     * @property {String} guid A player guid. This is a string id unique for each player, which never changes
     * @property {String} name The playername
     * @property {Number} index The player index (in the known players list)
     */

    /**
     * A player category string
     * @typedef {"Unlisted"|"Blacklisted"|"Whitelisted"|"Admin"|"Pending"|"Owner"} PlayerCategory Player category
     * - Unlisted = No permissions, blocked by whitelist if enabled
     * - Blacklisted = Same as banned
     * - Whitelisted = No permissions, allowed by whitelist if enabled
     * - Admin = Max permissions possible for anyone but the owner
     * - Pending = Not yet set, will be automatically set to Unlisted on next connect if not changed by then
     * - Owner = The owner, all permissions
     */

    /**
     * Creative save configuration
     * @typedef {{fuel: Boolean, invincible: Boolean, hazards: Boolan, oxygen: Boolean, backpackpower: Boolean}} CreativeConfig Save's creative configuration
     * @property {Boolean} fuel Should fuel consumption be enabled?
     * @property {Boolean} invincible Should invincibility be enabled?
     * @property {Boolean} hazards Should hazards be enabled?
     * @property {Boolean} oxygen Should oxygen system be enabled?
     * @property {Boolean} backpackpower Should the backpack power limit be enabled?
     */

    // ------------------------------------------------------------------------------------------------------------------------------------------------
    // Basic socket operations
    // ------------------------------------------------------------------------------------------------------------------------------------------------

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
            // Libraries
            this.http = require("http")
            this.https = require("https")
            // Internal memory object
            this._ = {
                queue: [], // The request queue
                handler: null, // The current response callback handler
                socket: null, // The socket
                eventLoop: null,
                eventLoopState: null,
                eventCache: {
                    saves: null,
                    players: null
                }
            }
            // Static regex values
            this.regex = {
                ip: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/g,
                port: /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/g
            }
            // General constants
            this.const = {
                permissionCategories: ["Unlisted", "Blacklisted", "Whitelisted", "Admin", "Pending", "Owner"], // Pending is just empty?
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
            
        }
        catch(err){
            this._error("Internal error", err)
        }
    }


    // ------------------------------------------------------------------------------------------------------------------------------------------------
    // Commands
    // ------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * List all the players known to the server
     * State: Stable
     */
    async listPlayers(){
        return new Promise((resolve) => {
            
        })
    }
    
    /**
     * Get a specific player by guid, index or name
     * @param {PlayerQuery} options The player query options
     */
    async getPlayer(options){
        return new Promise((resolve, reject) => {
            
        })
    }

    /**
     * Kick a player from the game
     * @param {PlayerQuery} player The player query options
     * State: Stable 
     */
    async kick(player){
        return new Promise((resolve, reject) => {
            
        })
    }

    /**
     * Kick all players from the server
     * State: Unstable
     */
    async kickAll(){
        return new Promise((resolve) => {
            
        })
    }

    /**
     * Set a players category (also know as permission level)
     * @param {PlayerQuery} player The player query options
     * @param {PlayerCategory} category The category to apply
     * State: Stable (limitations)
     */
    async setPlayerCategory(player, category){
        return new Promise((resolve, reject) => {
            
        })
    }

    /**
     * Get the save information, such as active save and list of available saves
     * State: Stable
     */
    async listSaves(){
        return new Promise((resolve) => {
            
        })
    }

    /**
     * Save the game
     * @param {String} name (This parameter is optiona!) Set the name of the new save
     * State: Unstable
     */
    async save(name){
        return new Promise((resolve, reject) => {
            
        })
    }
    
    /**
     * Shutdown the server
     * @param {Boolean} force Force the server shutdown without saving
     * State: Stable
     */
    async shutdown(force){
        return new Promise((resolve) => {
            
        })
    }

    /**
     * Load a new save in the server
     * @param {String} name The name of the save
     * State: Stable
     */
    async setSave(name){
        return new Promise((resolve, reject) => {
            
        })
    }

    /**
     * Rename a save
     * @param {String} name The save to rename
     * @param {String} newname The name to apply
     */
    async renameSave(name, newname){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Delete a save
     * @param {String} name The name of the save
     */
    async deleteSave(name){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Set the interval to autosave at
     * @param {Number} ms The time in ms
     */
    async setSaveInternal(ms){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Set the server password, leave empty to disable it
     * @param {String} password The password string
     */
    async setPassword(password){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Set the activity timeout for the server
     * @param {Number} ms The time in ms
     */
    async setActivityTimeout(ms){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Enable or modify creative setting for the currently loaded game
     * @param {CreativeConfig} options The creative configuration
     */
    async setCreative(options){
        return new Promise((resolve, reject) => {
            reject("This function is currently not functional, because of a bug in the dedicated server.")
        })
    }

    /**
     * Create a new save
     * @param {String} name The name of the save
     * @param {Boolean} activate Should the new save be set as active
     * State: Stable (sometimes causes client crashes)
     */
    async createSave(name, activate){
        return new Promise((resolve, reject) => {
            
        })
    }

    /**
     * Enable or disable the whitelist
     * @param {Boolean} boolean The state for the 
     */
    async setWhitelist(boolean){
        return new Promise((resolve, reject) => {
            
        })
    }

    /**
     * Get general information about the server
     * State: Stable
     */
    async getInfo(){
        return new Promise((resolve) => {
            
        })
    }
}

module.exports = {
    client: Client,
    link: Link
}