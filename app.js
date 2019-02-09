const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const gitlabConfig = require("./gitlab.json");

const http = require('http');
const port = 3000;

// Configure our HTTP server to respond with Hello World to all requests.
var server = http.createServer(function (request, response) {
  let body = "";
  request.on('readable', function() {
    body += request.read();
  });
  request.on('end', () => sendMessage(request, body));
  response.writeHead(200, {"Content-Type": "text/plain"}); 
  response.end("ok\n");
});
// Listen on port 3000, IP defaults to 127.0.0.1
server.listen(port);
// Put a friendly message on the terminal
console.log("Server running at http://127.0.0.1:3000/");


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

function sendMessage(request, body){
  let config = gitlabConfig[body["repository"]["url"]];
  let guild = config["guild"];
  let ref = body["ref"].split("/").pop();
  let channel = "";
  if (ref in config["branch"]){
    channel = config["branch"][ref];  
  } else {
    channel = config["branch"]["default"];
  }
  console.log("GIT Event:", body["object_kind"]);
  console.log("REF", ref);
  console.log("GUILD", guild);
  console.log("CHANNEL", channel);
  console.log("Message Sent");
  let fields = body["commits"].map(function(d){
    return {
      name: "**[Commit " + d["id"].substring(0,8) + "]** by *" + d["author"]["name"] + "*: __**" + d["message"] + "**__",
      value: d["url"]
    };
  });
  
  client.guilds.get(guild)["channels"].get(channel).send({
    embed:{
      color: config["color"],
      author: {
	name: body["user_name"] + " <" + body["user_email"]+ ">",
	icon_url: body["user_avatar"]
      },
      title: "**" + body["object_kind"].toUpperCase() + "** on __" + body["repository"]["name"]+"__",
      url: body["repository"]["homepage"],
      timestamp: new Date(),
      footer:{
	icon_url: "https://i.imgur.com/ezC66kZ.png",
	text: "GitLab"
      },
      fields: fields      
    }
  });
  //  client.guilds[guild]
  
}
