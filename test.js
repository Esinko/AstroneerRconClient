const Client = require("./AstroneerRcon.js")
let instance = new Client({
    ip: "192.168.1.2",
    port: 1234,
    password: "ertgjdpgmfhf947fk"
})
instance.on("connecting", () => {
    console.log("Connecting to server...")
})
instance.on("connected", async () => {
    console.log("Connected to server!")
    let players = await instance.test()
    console.log(players)
})
instance.on("error", async error => {
    console.log(error)
})
instance.connect()