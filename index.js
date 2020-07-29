//Require
const net = require("net")
const events = require("events")

//Config
const prefix = "DS" //This is the RCON prefix that appears in the start of every sent command

//Memory and presets
const portRegex = /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/g
const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/g
const categories = ["unlisted", "blacklisted", "whitelisted", "admin"]

//Classes
/**
 * The parser class
 * @param {*} data Data to parse
 */
const Parser = class Parser {
    constructor(data){
        this.data = data
    }
    async parse(){
        return new Promise(async (resolve, reject) => {
            try {
                this.data = JSON.parse(new Buffer.from(this.data).toString())
                resolve(this.data)
            }
            catch(err){
                //console.log(new Buffer.from(this.data).toString())
                reject(err)
            }
        })
    }
}
/**
 * The commands class
 * @param {Socket} client The socket client
 * @param {EventEmitter} events Socket class event emitter
 * @param {*} _ Socket class settings / memory
 * @param {*} self Socket class
 */
const command = class Command {
    constructor(client, events, _, self){
        this.client = client
        this.events = events
        this._ = _
        this.send = self.send
        this.self = self
    }
    /**
     * Get a list of players in the server.
     * @returns Promise
     */
    async getPlayers(){
        return new Promise(async (resolve, reject) => {
            this.send("ListPlayers").then(async data => {
                let parser = new Parser(data)
                parser.parse().then(async data => {
                    resolve(data)
                }).catch(async err => {
                    reject(err)
                })
            }).catch(async err => {
                reject(err)
            })
        })
    }

    /**
     * Kick a player from the server
     * @param {{name: "", guid: ""}} options Json object with either a guid or name field
     * @returns Promise
     */
    async kickPlayer(options){
        return new Promise(async (resolve, reject) => {
            if(options.name != undefined){
                this.send("ListPlayers").then(async data => {
                    let parser = new Parser(data)
                    parser.parse().then(async data => {
                        let found = false
                        let at = 0
                        data.playerInfo.forEach(async player => {
                            if(player.playerName == options.name && found == false){
                                found = true
                                if(player.inGame == false){
                                    reject("That player is not online")
                                }else {
                                    this.send("KickPlayerGuid " + player.playergGuid).then(async data => {
                                        data = new Buffer.from(data).toString()
                                        if(data.includes("????d")){
                                            resolve("Player kicked")
                                        }else {
                                            reject("Unable to kick player. Player not online or invalid.")
                                        }
                                    }).catch(async err => {
                                        reject(err)
                                    })
                                }
                            }
                            ++at
                            if(at == data.playerInfo.length){
                                if(found == false){
                                    reject("No such player")
                                }
                            }
                        })
                    }).catch(async err => {
                        reject(err)
                    })
                }).catch(async err => {
                    reject(err)
                })
            }else if(options.guid != undefined){
                this.send("KickPlayerGuid " + options.guid).then(async data => {
                    data = new Buffer.from(data).toString()
                    if(data.includes("????d")){
                        resolve("Player kicked")
                    }else {
                        reject("Unable to kick player. Player not online or invalid.")
                    }
                }).catch(async err => {
                    reject(err)
                })
            }else {
                reject("Invalid options")
            }
        })
    }

    /**
     * Get a list of the save games available
     */
    async getSavegames(){
        return new Promise(async (resolve, reject) => {
            this.send("ListGames").then(async data => {
                let parser = new Parser(data)
                parser.parse().then(async data => {
                    resolve(data)
                }).catch(async err => {
                    reject(err)
                })
            }).catch(async err => {
                reject(err)
            })
        })
    }

    /**
     * Load a savegame by name
     * @param {""} name The name of the save
     * @returns Promise
     */
    async loadSavegame(name){
        return new Promise(async (resolve, reject) => {
            if(name == undefined || typeof name != "string" || name.length == 0){
                reject("The name value must be a string and not empty")
            }else {
                reject("Not tested")
                return;
                this.send("LoadGame " + name).then(async data => {
                    let parser = new Parser(data)
                    parser.parse().then(async data => {
                        resolve(data)
                    }).catch(async err => {
                        reject(err)
                    })
                }).catch(async err => {
                    reject(err)
                })
            }
        })
    }

    /**
     * Save the game in the server
     */
    async save(){
        return new Promise(async (resolve, reject) => {
            this.send("SaveGame").then(async data => {
                let parser = new Parser(data)
                parser.parse().then(async data => {
                    resolve(data)
                }).catch(async err => {
                    reject(err)
                })
            }).catch(async err => {
                reject(err)
            })
        })
    }
    
    /**
     * Shutdown the server, don't forget to save first!
     * @returns Promise
     */
    async shutdown(){
        return new Promise(async (resolve, reject) => {
            this.send("ServerShutdown").then(async data => {
                let parser = new Parser(data)
                parser.parse().then(async data => {
                    resolve(data)
                }).catch(async err => {
                    reject(err)
                })
            }).catch(async err => {
                reject(err)
            })
        })
    }

    /**
     * Get information about the server
     * @returns Promise
     */
    async getStatistics(){
        return new Promise(async (resolve, reject) => {
            this.send("ServerStatistics").then(async data => {
                let parser = new Parser(data)
                parser.parse().then(async data => {
                    resolve(data)
                }).catch(async err => {
                    reject(err)
                })
            }).catch(async err => {
                reject(err)
            })
        })
    }

    /**
     * Enable or disable the whitelist
     * @param {false | true} boolean The state boolean, true=on false=off
     */
    async setWhitelist(boolean){
        return new Promise(async (resolve, reject) => {
            if(typeof boolean == "boolean"){
                this.send("SetDenyUnlisted " + boolean).then(async data => {
                    if(boolean){
                        resolve("Whitelist enabled")
                    }else {
                        resolve("Whitelist disabled")
                    }
                }).catch(async err => {
                    reject(err)
                })
            }else {
                reject("The boolen value must be a boolean")
            }
        })
    }

    /**
     * Set a player category. 
     * @param {""} name 
     * @param {"admin" | "whitelisted" | "unlisted" | "blacklisted"} category The category to add. Unlisted is the same as none, whitelisted allows the user to bypass the whitelist, blacklisted is the same as banned and admin allows for all permissions.
     * @returns Promise 
     */
    async setPlayerCategory(name, category){
        return new Promise(async (resolve, reject) => {
            if(categories.includes(category)){
                this.send("SetPlayerCategoryForPlayerName " + name + " " + category).then(async data => {
                    let parser = new Parser(data)
                    parser.parse().then(async data => {
                        resolve(data)
                    }).catch(async err => {
                        reject(err)
                    })
                }).catch(async err => {
                    reject(err)
                })
            }else {
                reject("Invalid category, it can be: " + categories.join(", "))
            }
        })
    }
    
    /**
     * Create a new save by name
     * @param {""} name The name of the save
     * @returns Promise
     */
    async createNewSave(name){
        return new Promise(async (resolve, reject) => {
            if(name == undefined || typeof name != "string" || name.length == 0){
                reject("The name value must be a string and not empty")
            }else {
                this.send("NewGame " + name).then(async data => {
                    let parser = new Parser(data)
                    parser.parse().then(async data => {
                        resolve(data)
                    }).catch(async err => {
                        reject(err)
                    })
                }).catch(async err => {
                    reject(err)
                })
            }
        })
    }

    /**
     * UNKOWN, EXPERIMENTAL
     * @param {*} index UNKOWN. If given 0 or 1 all players will lose connection.
     */
    async travel(index){
        return new Promise(async (resolve, reject) => {
            if(self._.experimental == false) {
                reject("Experimental commands are disabled. Enable with [command-class]._.experimental = true.")
                return
            }
            console.warn("The travel command is experimental and should not be used!")
            this.send("Travel " + index).then(async data => {
                let parser = new Parser(data)
                parser.parse().then(async data => {
                    resolve(data)
                }).catch(async err => {
                    reject(err)
                })
            }).catch(async err => {
                reject(err)
            })
        })
    }

}
const socket = class Net {
    constructor(ip, port){
        this.ip = ip
        this.port = port
        this._ = {
            client: null,
            queue: [],
            pending: null,
            experimental: false,
            loop: null,
            requestLoop: null,
            cache: {},
            interval: 0
        }
        this.events = new events.EventEmitter()
        this.events.setMaxListeners(32) //Handle for queues
    }   
    /**
     * Connect to the server
     * @returns Promise
     */
    async connect(){
        return new Promise(async (resolve, reject) => {
            if(this._.client == null){
                //Check for valid settings
                if(portRegex.test(this.port)){
                    if(ipRegex.test(this.ip)){
                        this._.client = new net.Socket()
                        let client = this._.client
                        let resolved = false
                        this.events.emit("connecting", this.port, this.ip)
                        client.connect(this.port, this.ip, async () => {
                            this.events.emit("connected", this.port, this.ip)
                            resolved = true
                            this._.loop = setInterval(async () => {
                                if(this._.interval == null) this._.interval = 1
                                else ++this._.interval
                                if(this._.interval >= 5){
                                    this._.interval = null
                                    try {
                                        this.send("ListPlayers").then(async data => {
                                            let parser = new Parser(data)
                                            parser.parse().then(async data => {
                                                if(this._.cache.players == undefined){
                                                    this._.cache.players = data.playerInfo
                                                }else {
                                                    data.playerInfo.forEach(async player => {
                                                        let at = 0
                                                        let found = false
                                                        this._.cache.players.forEach(async playerCached => {
                                                            if(player.playerGuid == playerCached.playerGuid){
                                                                found = true
                                                                if(player.inGame != playerCached.inGame){
                                                                    if(player.inGame == false){
                                                                        this.events.emit("playerLeft", player)
                                                                    }else {
                                                                        this.events.emit("playerJoined", player)
                                                                    }
                                                                }
                                                            }
                                                            ++at
                                                            if(at == playerCached.length && found == false){
                                                                this.events.emit("playerNew", player)
                                                            }
                                                        })
                                                    })
                                                    this._.cache.players = data.playerInfo
                                                }
                                            }).catch(async err => {
                                                this.events.emit("error", err)
                                            })
                                        }).catch(async err => {
                                            this.events.emit("error", err)
                                        })
                                    }
                                    catch(err){
                                        this.events.emit("error", err)
                                    }
                                }
                            }, 1000) 
                            this._.requestLoop = setInterval(async () => {
                                if(this._.queue.length != 0 && this._.pending == null){
                                    let json = this._.queue.shift()
                                    try {
                                        this._.pending = json.data
                                        let command = Uint8Array.from(new Buffer.from(prefix + json.data + "\n", "binary"))
                                        this._.client.write(command, async () => {
                                            this.events.emit("commandSent", json.id)
                                            this.events.once("data", async data => {
                                                this.events.emit("free", {data: data, id: json.id})
                                                this._.pending = null
                                            })
                                        })
                                    }
                                    catch(err){
                                        this.events.emit("free", {error: err, id: json.id})
                                    }
                                }
                            }, 50)
                            let responded = false
                            this.send("ListPlayers").then(async () => {
                                responded = true
                                resolve(new command(client, this.events, this._, this))
                            }).catch(async err => {
                                reject(err)
                            })
                            setTimeout(async () => {
                                if(responded == false){
                                    reject("The rcon port of the server has already been taken by some other program or the connection is very slow.")
                                }
                            }, 10000)
                        })
                        client.on("data", async data => {
                            this.events.emit("data", data)
                        })
                        client.on("close", async () => {
                            this.events.emit("closed")
                            this._.client = false
                            clearInterval(this._.requestLoop)
                            clearInterval(this._.queue)
                        })
                        client.on("error", async error => {
                            this.events.emit("error", error)
                            if(resolved == false){
                                reject(error)
                            }
                        })
                    }else {
                        reject("Invalid ip")
                    }
                }else {
                    reject("Invalid port")
                }
            }else {
                if(this._.client == false){
                    reject("Connection to server lost")
                }else {
                    reject("Already connected to " + this.ip + ":" + this.port)
                }
            }
        })
    }
    /**
     * Send data to the server. This should only be used internally.
     * @param {*} data 
     * @returns Promise
     */
    async send(data){
        return new Promise(async (resolve, reject) => {
            //Two contexts here require special handling
            if(this.genid == undefined){
                if(this.self._.queue.length > 31){
                    reject("The request queue is full. Check connections are goind through.")
                    return;
                }
                this.self.genid(10).then(async id => {
                    this.self._.queue.push({data: data, id: id})
                    let self = this.self
                    async function callback(idFrom){
                        if(id == idFrom){
                            self.events.removeListener("commandSent", callback)
                            self.events.once("free", async data => {
                                if(data.error == undefined){
                                    resolve(data.data)
                                }else {
                                    reject(data.error)
                                }
                            })
                        }
                    }
                    this.self.events.on("commandSent", callback)
                }).catch(async err => {
                    reject(err)
                })
            }else{
                if(this._.queue.length > 31){
                    reject("The request queue is full. Check connections are goind through.")
                    return;
                }
                this.genid(10).then(async id => {
                    this._.queue.push({data: data, id: id})
                    let self = this
                    async function callback(idFrom){
                        if(id == idFrom){
                            self.events.removeListener("commandSent", callback)
                            self.events.once("free", async data => {
                                if(data.error == undefined){
                                    resolve(data.data)
                                }else {
                                    reject(data.error)
                                }
                            })
                        }
                    }
                    this.events.on("commandSent", callback)
                }).catch(async err => {
                    reject(err)
                })
            }
        })
    }
    /**
     * Generate a (semi)random string. This should only be used internally.
     * @param {*} length The lenght of the (semi)random string
     * @returns Promise
     */
    async genid(length){
        return new Promise(async (resolve, reject) => {
            try {
                let result = '';
                let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let charactersLength = characters.length;
                for (let i = 0;i < length;i++) {
                    result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                resolve(result)
            }
            catch(err){
                reject(err)
            }
        })
    }
    /**
     * Close the connection with the server
     * @returns Promise
     */
    async close(){
        return new Promise(async (resolve, reject) => {
            if(this._.client != null){
                try {
                    await this._.client.destroy()
                    resolve()
                }
                catch(err){

                }
            }else {
                reject("The connection is already closed or has been never opened.")
            }
        })
    }
}
module.exports = socket
