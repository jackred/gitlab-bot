const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");

console.log("Gitlab bots is starting");

// client action
client.on("ready", setGitlabActivity);
client.on("message", respondToMessage);

client.login(config.token);


function setGitlabActivity(){
  client.user.setActivity("Watching over update");
}

function respondToMessage(message){
  if (message.content == "ping"){
    message.channel.send("pong");
  }
}
