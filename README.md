# AstroneerRconClient
<i><b>Version: 2.2</b></i>
<br>
A client for the Astroneer Rcon server built with Node.JS

# Table of contents
## Please take a moment to look at this list to find what you are looking for!
<dl>
<dt><a href="#How-it-works">How it works</a></dt>
<dd><p>In-depth documentation on how the remote console works.</p></dd>
<dd><a href="#sending-and-receiving-data">Sending and receiving data</a></dd>
<dd><a href="#command-reference">Command reference</a></dd>
<dl>
<dt><a href="#Usage">Usage</a></dt>
<dd><p>The documentation of this library. If you want to know how to use this library, start here!</p></dd>
<dd><a href="#Quickstart">Quickstart</a></dd>
<dd>
<dl>
<dt><a href="#Type-definitions">Type definitions</a></dt>
<dd><a href="#clientoptions">ClientOptions</a></dd>
<dd><a href="#playerquery">PlayerQuery</a></dd>
<dd><a href="#playercategory">PlayerCategory</a></dd>
<dd><a href="#creativeconfig">CreativeConfig</a></dd>
</dl>
</dd>
<dd>
<dl>
<dt><a href="#Client-class">Client class</a></dt>
<dd><a href="#constructor">Constructor</a></dd>
<dd><a href="#functions">Functions</a></dd>
<dd><a href="#events">Events</a></dd>
</dl>
</dd>
<dd><a href="#AstroLauncher-Link-class">AstroLauncher Link class</a></dd>
<dd><a href="#Errors-and-bugs">Errors and Bugs</a></dd>
</dl>

# How-it-works
How does rcon work in the Astroneer Dedicated server?
<br>
First to enable rcon for a server, set the ConsolePort value in the AstroServerSettings.ini in Astro/Saved/Config within the server folder.
<br>
It is also recommended to set ConsolePassword to a random secure password, that the rcon client will use to connect.

## What is it?
It is simply a tcp socket server that accepts one client to connect. This server will listen and respond with data depending on client requests as it is the socket continuous duplex stream.

## Before we continue...
Here is some stuff you need to know before reading this:
<br>
<dt><p>Guid = An unique identifier for each player calculated using MurMurHash x86_64-bit based on unknown arguments (perhaps Steam/Microsoft account id). This value never changes.</p></dt>
<dt><p>RCON = <b>R</b>emote <b>Con</b>sole</p></dt>
<dt><p>< x > = Anything between <> tags is a placeholder for a variable (user input) (with the <> tags marking the placeholder)</p></dt>
</dl>

## Sending-and-receiving-data
Commands are sent to the server as strings followed by a newline (\n), encoded into raw binary bytes. You will simply connect with a tcp socket client and start sending commands to the server.
<br>
If the server requires a password, send the password in the same encoded format and with it a following (\n) newline to allow commands to be executed.
<br>
The server will respond after command execution with the requested data, result of execution or with an error.
For some reason, not all the commands return responses, but most of them return JSON.
<br>Here are some examples of basic responses after command execution:

```
{ _message: "Some error occurred!", status: false} // Something went wrong :/
```

```
{ _message: "Success!", status: true} // It worked!
```

It's pretty easy to understand the basic structure of a response right? If the status JSON value is false, the _message value will contain an error.
If the status value is true, the _message value contains a success message.
<br>
Now it's important to understand a key difference between commands with responses and commands with data. Commands with responses, such as "DSSetPlayerCategoryForPlayerName"
return a standard response JSON object. If the command "has" data, which means you're requesting some data from the server, it will contain a command specific JSON response object.
As an example "DSListPlayers" will return a JSON object, which has a "playerInfo" array, which contains information about each known player with it's command specific structure.
<br>
Because of the continuous data stream nature of the tcp socket, the rcon server can also return responses to multiple requests at once. Responses are always separated by \r\n. 
<br>
The same applies for sending commands. You can send multiple commands separated by \n.

## Command-reference
The basic structure is this:
```
<command> <arguments,...>
```

First there is the command part, which is the command. Then there is the arguments part, which is a list of arguments separated by spaces.
<br>
If an argument contains a space, use " in the start and the end of the argument.
<br>
Here's a list of commands exposed to the rcon client and how to use them. Not all of these work due to bugs, or they may be disabled.
<br>
The (?) symbol in the description means that the use case of the function is unknown.
<br>
(The arguments format below works like this ``<ArgumentName>(<Type>)``)
<br>
<b>Written for server version 1.17.89.0 (9.1.2021)</b>
| Name | Arguments | Description | Functional? | Returns
| --- | --- | --- | --- | --- |
| DSRemote | \<ConsoleCommand>(String) | (?) Execute an in-game command in the in-game console | No | Unknown
| DSClearFavoritesList | None | (?) Unknown | No | Unknown
| DSRemoveFavorite | \<ServerUrl>(String, \<ip>:\<port>) | (?) Unknown | No | Unknown
| DSAddFavorite | \<ServerUrl>(String, \<ip>:\<port>) \<NickName>(String) | (?) Unknown | No | Unknown
| DSGetFavoritesList | None | (?) Unknown | No | Unknown
| DSClearRecentsList() | None | (?) Unknown | No | Unknown
| DSGetRecentsList() | None | (?) Unknown | No | Unknown
| DSBackupSaveGames() | None | (?) Backup the servers saves | No | Unknown
| DSSetBackupSaveGamesInterval | \<Seconds>(Number) | (?) Set the backup interval in seconds | No | Unknown
| DSSetPlayerCategoryForPlayerName | \<PlayerName>(String) \<Category>(String, PlayerCategory) | Set a player's category based on the player's name. See the type definition of PlayerCategory for more details on what the Category argument can be. | Yes | Unknown
| DSSetPlayerCategory | \<Player>(String?) \<Category>(String, PlayerCategory) \<Index>(Number?) | (?) Set a player's category based on the player object? | No | Unknown
| DSSetPlayerCategoryGuid | \<PlayerGuid> \<Category> | Set a player's category based on the player's guid. | No (Bug!) | Standard: <br>``{"_message":"updated entry: player=<PlayerName>, playerGuid=<PlayerGuid>, category=<PlayerGuid>","status":true}``
| DSSetPlayerCategoryIdx | \<PlayerIndex> \<Category> | Set a player's category based on their index in the known players list. Please not the index can change, so it's better to use the guid equivalent for this command | No (Bug!) | Standard: <br>``{"_message":"updated entry: player=<PlayerName>, playerGuid=<PlayerGuid>, category=<PlayerGuid>","status":true}``
| DSSetDenyUnlisted | \<Boolean>(Boolean) | Enable or disable the whitelist | Yes | Special: <br>``(UAstroServerCommExecutor::DSSetDenyUnlisted: SetDenyUnlistedPlayers <unchanged/changed>: <0/1>\r\n``
| DSSetSaveGameInterval | \<Seconds>(Number) | Set the autosave internal in seconds | No | Unknown
| DSSetActivityTimeout | \<Seconds>(Number) | Set the afk timeout in seconds | No | Unknown
| DSTravelPass | \<ServerName>(String?) \<Password>(String) <Index>(Number?) | (?) | No | Unknown
| DSTravelName | \<ServerName>(String?) \<Index>(Number?) \<Password>(String) | (?) | No | Unknown
| DSTravel | \<ServerIndex>(Number?) \<Password>(String) | (?) Maybe to connect to some other server? This is for clients, so I have no idea... | No | Unknown
| DSSetPassword | \<Password>(String) | Set the server password | No | Unknown
| DSKickPlayer | \<PlayerIndex>(Number) | Kick a player based on their index in the known players list | No | Unknown
| DSKickPlayerGuid | \<PlayerGuid>(Number) | Kick a player based on their guid | Yes | Special: <br>``UAstroServerCommExecutor::DSKickPlayerGuid: request to kick player <PlayerGuid>             ???\<d/ >\r\n'`` The variable here on the end of the data is either "d" or nothing. It is "d" for success.
| DSGetServerList | None | Unknown | No | Unknown
| DSSetBackpackPowerUnlimitedCreative | \<Boolean>(Boolean) | (?) Disable or enable backpack power limits | No | Unknown
| DSSetInvisibleToHazardsCreative | \<Boolean>(Boolean) | (?) Make the players invincible to hazards | No | Unknown
| DSSetInvincibleCreative | \<Boolean>(Boolean) | (?) Make the player invincible to any damage | No | Unknown 
| DSSetOxygenFreeCreative |\<Boolean>(Boolean) | (?) Disable / Enable oxygen limitations | No | Unknown
| DSSetFuelFreeCreative | \<Boolean>(Boolean) | (?) Disable / Enable fuel limitations | No | Unknown
| DSCreativeMode | \<Boolean>(Boolean) | (?) Enable creative mode for the active save | No | Unknown
| DSGetProperties | None | Unknown | No | Unknown
| DSServerStatistics() | None | Get information about the server | Yes | Special: ``{"build":"<ServerVersion>","ownerName":"<ServerOwnerName>","maxInGamePlayers":<ServerPlayerLimit>,"playersInGame":<PlayersInGame>,"playersKnownToGame":<KnownPlayers>,"saveGameName":"<ActiveSave>","playerActivityTimeout":<AfkTimeout>,"secondsInGame":<SecondsPlayed>,"serverName":<ServerRegistryServerName>,"serverURL":<ServerUrl>,"averageFPS":<ServerFps/TickSpeed>,"hasServerPassword":<HasPassword>,"isEnforcingWhitelist":<HasWhitelistEnabled>,"creativeMode":<ActiveSaveIsCreative>,"isAchievementProgressionDisabled":<NoAchievements>}\r\n``
| DSListPlayers | None | Get the known players list | Yes | Special: ``{"playerInfo":[{"playerGuid":"<PlayerGuid>","playerCategory":<PlayerCategory>,"playerName":<PlayerName>,"inGame":<PlayerConnected>,"index":<PlayerIndex>}, ...]}\r\n``
| DSRenameGame | \<Oldname>(String) \<NewName>(String) | Rename a save | No | Unknown
| DSDeleteGame | \<SaveName>(String) | Delete a save | No | Unknown
| DSLoadGame | \<SaveName>(String) | Load a new save and set it as the active save for the server | Yes | None
| DSSaveGame | \<Unknown>(String, Optional) | Save the game instantly | Yes | None
| DSNewGame | \<NewSaveName>(String) | Create a new save and set it as active. All players will be forced to reload. | Yes | None
| DSServerShutdown | None | Shutdown the server gracefully | Yes | None
| DSListGames | None | List all the saves available | Yes | Special: ``{"activeSaveName":"<ActiveSave>","gameList":[{"name":"<SaveName>","date":"<LastEdited, YYYY.MM.DD-hh.mm.ss>9,"bHasBeenFlaggedAsCreativeModeSave":<IsCreative>}, ...]}\r\n``
| DSTravelURL | \<ServerUrl> \<Password> \<Index> | (?) Go to another server? Again, this is for clients usually | No | Unknown
| DSTravelFriend | \<FriendName> \<Password> \<Index> | (?) Go/Connect to a friend? This is used to in clients to connect to a CoOp server usually | No | Unknown

# Usage
This library is written in Node.Js and is to be used in Node.Js applications as a CommonJS module.
<br>
This module exports an object which contains the <b>client class</b> and the link class known as the Astrolauncher <b>link class</b>.
<br>
Both classes implement same functionality, but the client class connects to the actual server, while the link class uses Astrolauncher's API to send commands to the server.
<br>
You can read more about it in the <b>How-it-works</b> section above.

# Quickstart
As both exported classes implement the same functionality, but execute them in different ways. This quickstart applies for both, with minor modifications depending on what you need to use.
<br>
In short. If you are using AstroLauncher you need to create a new instance of the <b>Link</b> class, if you're not using anything that already connects to the server rcon socket use, the <b>Client</b> class.
<br>
In this quickstart we will be using the Client class, but you may switch it by changing the end of the first line to ``.link``, instead of ``.client``.

## Step 1
First you need to download the library. You can do it using NPM:
```
npm install Esinko/AstroneerRcon
```

Then you need to import the CommonJs module, you can do that with:

```
const AstroneerRcon = require("astroneer-rcon").client
// Tip: If we are operating in the same directory replace the variable in the file path with a dot (.), or if AstroneerRcon is in a folder in your projects working directory. You may use ./<The folder you installed this lib with>/AstroneerRcon.js
```
If AstroneerRcon is undefined, or you get an error, make sure your filepath is correct.

## Step 2
Now that the library has been imported, you need to connect to the server (or the AstroLauncher api, this quickstart works for both!)
<br>
First you need to create a new instance of the client/link and call .connect() with the constructor appropriate parameters.
<br>
AstroneerRcon is event driven. You can register listeners for multiple things happening in the server and in the client.
<br>
There are a few good ones to include, like "connected" and "error".

```
const AstroneerRcon = require("astroneer-rcon").client
let myInstance = new client({
    // Here is the important part, the client configuration.
    ip: "127.0.0.1", // Your server ip
    port: 1234, // Your server port
    password: "MyVerySecureRandomPassword" // This is the server password, if required. You can make it as long as you want.
    // Always use a password for security reasons, if possible!!!
})
// Register event listeners
myInstance.on("error", async error => {
    console.log("An error occurred!\n", error)
    // It is very important you handle this. All unexpected errors will trigger this function, so you can handle it in your application.
})

myInstance.on("connected", async () => {
    console.log("Connected to server!")
    // This function gets ran when the connection to the server is established.
    // Your app code should live here.
})

myInstance.connect() // Connect to the server, keep this line last if possible. At least below all the event listener registrations. As they may not be registered correctly, if the client is already connecting or connected.
```

<br>
That's pretty much it! You can now start executing commands and gathering data from the server!

## Step 3
To execute commands, refer to the Client class functions list. Which can be found from the "Table of contents" above.
<br>
Here we simply get some basic data about the server.

```
const AstroneerRcon = require("astroneer-rcon").client
let myInstance = new client({
    // Here is the important part, the client configuration.
    ip: "127.0.0.1", // Your server ip
    port: 1234, // Your server port
    password: "MyVerySecureRandomPassword" // This is the server password, if required. You can make it as long as you want.
    // Always use a password for security reasons, if possible!!!
})
// Register event listeners
myInstance.on("error", async error => {
    console.log("An error occurred!\n", error)
    // It is very important you handle this. All unexpected errors will trigger this function, so you can handle it in your application.
})

myInstance.on("connected", async () => {
    console.log("Connected to server!")

    let server = await myInstance.getInfo()
    console.log("Got this information about the server:\n", server)
})

myInstance.connect() // Connect to the server, keep this line last if possible. At least below all the event listener registrations. As they may not be registered correctly, if the client is already connecting or connected.
```

That's pretty much all there is to know about the basic usage of this library.
<br>
Refer to the Client class section for more details on what you can do with this library!

# Client-class
The client class is where the rcon client lives. It contains all the commands you can execute against the server and it formats the data for easier usage across application.
<br>
Such as handling dates better and building cleaner response objects.

## Type-definitions
These are written using JSDoc.
<br>
In markdown:

### ClientOptions
<dl>
    <dt><p>{ip: String, port: Number, password?: String, timeout?: Number}</p></dt>
    <dd><p>Property: ip,<br>Type: String,<br>Description: The IP-address to connect to</p></dd>
    <dd><p>Property: port,<br>Type: Number,<br>Description: The port number the server is listening for rcon</p></dd>
    <dd><p>Property: password,<br>Type: String,<br>Description: The rcon password, leave empty if the server does not require an rcon password</p></dd>
    <dd><p>Property: timeout,<br>Type: Number,<br>Description: The timeout limit in ms. If not set, will default to 15000</p></dd>
    <dd><p>Property: delivery_delay,<br>Type: Number,<br>Description: The possible delay while starting and ending a "packet". A "packet" can arrive in multiple parts This value is the amount of time to wait for the next part of the "packet". By default 90(ms).</p></dd>
</dl>

### PlayerQuery
<dl>
    <dt><p>{guid?: String, name?: String, index?: Number}</p></dt>
    <dd><p>Property: ?guid,<br>Type: String,<br>Description: A player guid. This is a string id unique for each player, which never changes</p></dd>
    <dd><p>Property: ?name,<br>Type: String,<br>Description: The IP-address to connect to</p></dd>
    <dd><p>Property: ?index,<br>Type: Number,<br>Description: The player index (in the known players list)</p></dd>
</dl>

### PlayerCategory
<dl>
    <dt><p>"Unlisted" or "Blacklisted" or "Whitelisted" or "Admin" or "Pending" or "Owner"</p></dt>
    <dd><p>Definitions:<br>
     - Unlisted = No permissions, blocked by whitelist if enabled<br>
     - Blacklisted = Same as banned<br>
     - Whitelisted = No permissions, allowed by whitelist if enabled<br>
     - Admin = Max permissions possible for anyone but the owner<br>
     - Pending = Not yet set, will be automatically set to Unlisted on next connect if not changed by then<br>
     - Owner = The owner, all permissions</p></dd>
</dl>

### CreativeConfig
<dl>
    <dt><p>{fuel: Boolean, invincible: Boolean, hazards: Boolean, oxygen: Boolean, backpackpower: Boolean}</p></dt>
    <dd><p>Property: fuel,<br>Type: Boolean,<br>Description: Should fuel consumption be enabled?</p></dd>
    <dd><p>Property: invincible,<br>Type: Boolean,<br>Description: Should invincibility be enabled?</p></dd>
    <dd><p>Property: hazards,<br>Type: Boolean,<br>Description: Should hazards be enabled?</p></dd>
    <dd><p>Property: oxygen,<br>Type: Boolean,<br>Description: Should oxygen system be enabled?</p></dd>
    <dd><p>Property: backpackpower,<br>Type: Boolean,<br>Description: Should the backpack power limit be enabled?</p></dd>
</dl>


## Constructor
This is the constructor, which is in this case used to configure the client and to define internal variables
<br>

### Reference

```
/**
 * Create a new rcon client instance
 * @param {ClientOptions} options The client options
*/
constructor(options){...}
```

The options object is an instance of [ClientOptions](#clientoptions). Look in the Type definitions section for more details.
<br>

## Internal variables
<dt><p>Constructor parameters</p></dt>
<dd><dl><dt>ip</dt><dd>This is the IP used to connect to the server</dd></dl></dd>
<dd><dl><dt>port</dt><dd>This is the port used to connect to the server</dd></dl></dd>
<dd><dl><dt>password</dt><dd>This is the password to connect to the server with</dd></dl></dd>
<dd><dl><dt>timeout</dt><dd>This is the server timeout limit, which is by default 15 seconds</dd></dl></dd>
<dt><p>Libraries</p></dt>
<dd><dl><dt>net = require("net")</dt><dd>This is the only used library, which is native to Node.Js</dd></dl></dd>
<dt><p>Internal memory object</p></dt>
<dd>
<dl>
<dt><p>_</p></dt>
<dd><p>queue: [], | The request queue</p></dd>
<dd><p>handler: null | The current response callback handler</p></dd>
<dd><p>socket: null | The TCP socket</p></dd>
</dl>
</dd>
<dt><p>General constants</p></dt>
<dd>
<dl>
<dt><p>const</p></dt>
<dd><dl><dt>permissionCategories: ["Unlisted", "Blacklisted", "Whitelisted", "Admin", "Pending", "Owner"]</dt><dd>All the possible categories</dd></dl></dd>
<dd><dl><dt>commandPrefix: "DS"</dt><dd>Append this to start of every command</dd></dl></dd>
</dl>
</dd>
</dl>

## Events
This library also provides multiple events for things happening on the server. Here is a list of events and their meanings:
- "playerjoin", Emitted when a player joins the server. Arguments: Object<Player>
- "playerleft", Emitted when a player has left the server. Arguments: Object<Player>
- "newplayer", Emitted when a new player joins the server. Arguments: Object<Player>
- "save", Emitted when the game is saved. Arguments: Object<Save>
- "setsave", Emitted when the active save changes. Arguments: Object<Save>
This list does not include the "error" event. For more information see: [Errors and bugs](#Errors-and-bugs)

## Functions
List of functions in the Client class

### .connect()
<b>Use:</b> Connect to the server<br>
<b>Returns:</b> Promise<\void><br>
<b>Triggers events:</b> connecting, connected, disconnect<br>
<b>Usage:</b>

```
<instance>.connect()
```

### .listPlayers()
<b>Use:</b> Get the known players list<br>
<b>Returns:</b> Promise\<Array><br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
let list = await <instance>.listPlayers()
// "list" will be the known players list
```

### .getPlayer(player: [PlayerQuery](#playerquery))
<b>Use:</b> Get information about a specific player<br>
<b>Returns:</b> Promise<Object|Array><br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
let myPlayer = await <instance>.getPlayer({ guid: "<SomePlayerGuid>" })
// This function returns an object when data is queried with precise means
// If you query the known players list with a player name, it will return
// an array with all matches.
```

### .kick(player: [PlayerQuery](#playerquery))
<b>Use:</b> Kick a player from the server<br>
<b>Returns:</b> Promise\<void><br>
<b>Triggers events:</b> kick<br>
<b>Usage:</b>
```
<instance>.kick({ guid: "<SomePlayerGuid>"}).then(() => {
    console.log("Player kicked!)
}).catch(err => {
    console.log("Failed to kick:", err)
})
```

### .kickAll()
<b>Use:</b> Kick all the players from the server<br>
<b>Returns:</b> Promise\<void><br>
<b>Triggers events:</b> <br>
<b>Usage:</b>
```
<instance>.kickAll().then(() => {
    console.log("Players kicked!)
}).catch(err => {
    console.log("Failed to kickAll:", err)
})
```

### .setPlayerCategory(player: [PlayerQuery](#playerquery), category: [PlayerCategory](#playercategory))
<b>Use:</b> <br>
<b>Returns:</b> <br>
<b>Triggers events:</b> <br>
<b>Usage:</b>
```
<instance>.setPlayerCategory({guid: "<SomePlayerGuid>"}, "<SomePlayerCategory>).then(() => {
    console.log("Category set! It will be applied on next join.")
}).catch((err) => {
    console.log("Failed to apply category:", err)
})
```

### .listSaves()
<b>Use:</b> List the saves of the server<br>
<b>Returns:</b> Promise\<Object><br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
let savesList = await <instance>.listSaves()
console.log(savesList) // Will contain the active save and then a saves array as a property
```

### .save(?name)
<b>Use:</b> Save the game with an optional new name<br>
<b>Returns:</b> Promise\<void><br>
<b>Triggers events:</b> save<br>
<b>Usage:</b>
```
<instance>.save()
//or
//<instance>.save("My-New-Save-Name")
```

### .shutdown(force: Boolean)
<b>Use:</b> Shutdown the server while saving before complete shutdown<br>
<b>Returns:</b> Promise\<void><br>
<b>Triggers events:</b> save, disconnect<br>
<b>Usage:</b>
```
<instance>.shutdown()
//<instance>.shutdown(true)
// ^ That won't save!
```

### .renameSave(name, newname)
<b>This function is not yet implemented, due to the limitations of the server.</b><br>
<b>Use:</b> Rename a save<br>
<b>Returns:</b> none<br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
none
```

### .deleteSave(name)
<b>This function is not yet implemented, due to the limitations of the server.</b><br>
<b>Use:</b> Delete a save<br>
<b>Returns:</b> none<br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
none
```

### .setSaveInterval(ms)
<b>This function is not yet implemented, due to the limitations of the server.</b><br>
<b>Use:</b> Set the autosave interval<br>
<b>Returns:</b> none<br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
none
```

### .setPassword(password)
<b>This function is not yet implemented, due to the limitations of the server.</b><br>
<b>Use:</b> Set the server password<br>
<b>Returns:</b> none<br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
none
```

### .setActivityTimeout()
<b>This function is not yet implemented, due to the limitations of the server.</b><br>
<b>Use:</b> Set the player activity/idle timeout<br>
<b>Returns:</b> none<br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
none
```

### .setCreative(options: [CreativeConfig](#creativeconfig))
<b>This function is not yet implemented, due to the limitations of the server.</b><br>
<b>Use:</b> Make the active save a creative save (one time use).<br>
<b>Returns:</b> none<br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
none
```

### .createSave(name: String, ?activate: Boolean)
<b>Use:</b> Create a new save<br>
<b>Returns:</b> Promise\<void><br>
<b>Triggers events:</b> save, setsave, newsave<br>
<b>Usage:</b>
```
<instance>.createSave("MyNewSave", true)
// If you don't want the new save to become the active save, set the last parameter to false.
```

### .setWhitelist(boolean: Boolean)
<b>Use:</b> Enable/Disable the whitelist. The whitelist makes users with the Unlisted category unable to connect.<br>
<b>Returns:</b> Promise\<void><br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
<instance>.setWhitelist(true).then(() => {
    console.log("Whitelist activated")
}).catch(err => {
    console.log("Failed to enable whitelist:", err)
})
```

### .getInfo()
<b>Use:</b> Get general information about the server<br>
<b>Returns:</b> Promise\<Object><br>
<b>Triggers events:</b> none<br>
<b>Usage:</b>
```
let myServer = await <instance>.getInfo()
console.log("My server:\n", myserver)
```

# AstroLauncher-link-class
This is the second class exported by the library. It implements the same functionality as above, but instead connects to the AstroLauncher API to send commands to the server.
<br>The command reference for this class is the same instead the constructor is a bit different.
Instead of taking the server port, ip and console password. It want's the ip, port and password of your AstroLauncher web-panel.
<br>
Please note, that some features of rcon that are yet to be implemented in AstroLauncher's api, will of course not be usable.

# Errors-and-bugs
Error handling is very important. In this library all errors are handled with the "error" event. If this event has no listeners, the error will be thrown in to global scope.
<br>
If you encounter any bugs, or anything unexpected. Don't hesitate to create a <a href="https://github.com/Esinko/AstroneerRconClient/issues/new">new issue</a>.

# Copyright

```
 * By: @Esinko
 * 
 * Github: https://github.com/Esinko/
 * 
 * License: SEE "LICENSE" FILE
 * (Copyright 2020 Esinko. Licensed under the Apache License, Version 2.0)
```
