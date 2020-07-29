# AstroneerRconClient
A client for the Astroneer Rcon server built with Node.Js

# Defenitions of document specific words
guid = A user specific unique id
server = The dedicated self-hosted Astroneer server
client = The software iusing a net-socket connection to the server(read above)

# Quickstart
```
const AstroneerRconClient = require("index.js")
const Client = new AstroneerRconClient("127.0.0.1", 1234)

Client.connect().then(async server => {
  	console.log("Connected to the server!")
        //Issue commands here
        //Example, Get the current players:
        server.getPlayers().then(async response => {
            console.log(response)
            Client.close().then(async () => {
                console.log("Connection to server closed.")
            }).catch(async error => {
                console.log(error]
            })
    }).catch(async error => {
        console.log(error)
    })
}).catch(async error => {
  console.log(error)
})
```

# Commands
The list of commands(functions) in the "session" class (returned by connect function, known as "server" in the quickstart).

All commands follow this syntax:
```
[server].[commandName]([optional parameter]).then(async [anyResponseVariableName] => {
    [code after server responded, read response from above anyResponseVariableName]
}).catch(async [anyErrorvariableName] => {
    [code ran when error occured, error details from above anyErrorVariableName]
})
```
This syntax is pretty much a standard Node.JS promise.

Commands list:
- .getPlayers()
    - Get the list of players
- .kickPlayer({guid: guidOfPlayer} or {name: nameOfPlayer})
    - Kick a player by name or guid
- .getSavegames()
    - Get a list of savegames in the server
- .loadSavegame(nameOfSave)
    - Load a savegame by name
- .save()
    - Save the game (in the server)
- .shutdown()
    - Shutdown the server
- .getStatistics()
    - Get information about the server (number of players, server-fps, version etc.)
- .setWhitelist(true or false)
    - Enable / Disable the server whitelist
- .setPlayerCategory(playerName, category)
    - Set the player's category. (unlisted=None, blacklisted=banned, whitelisted=whitelist bypass, admin=all permissions)
- .createNewSave(name)
    - Create a new savegame by name
# Events
Events are available in \[server].events

For example if you want to run code when a user joins do this:
``[client].events.on("playerJoined", async player => {
    console.log(player.playerName + " just joined the game!")
})``

List of events:
- connecting
    - The client is connecting to the server
- connected
    - The client is connected to the server
- close
    - The connection to the server has closed
- error
    - An error occured in the client (error in event)
- commandSent
    - A command has been sent and the client is waiting for a response (internal)
- free
    - The server has responded and the client is no longer waiting for a response (internal)
- data
    - The server has reponded with some data (internal)
- playerNew
    - A new player has joined the server (playerObject in event)
- playerJoined
    - A player joined the server (playerObject in event)
- playerLeft
    - A player left the server (playerObject in event)
# Client functions
All of these functions return a promise (same syntax as in commands)
- .connect()
    - Connect to the server
- .close()
    - Close the connection to the server
