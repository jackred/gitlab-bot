const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const gitlabConfig = require("./gitlab.json");

const http = require('http');
const port = 3000;

const days = ["Sunday","Monday", "Tuesday","Wednesday","Thursday","Friday","Saturday"];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// TODO: no ugly
function formatDate(date){
  return ('{date} {0} {1} {3} {4}:{5}:{6} UTC').replace('{date}', days[date.getDay()]).replace('{0}', date.getDate()).replace('{1}', months[date.getMonth()]).replace('{3}', date.getFullYear()).replace('{4}', date.getHours()).replace('{5}', date.getMinutes().toString().length == 1 ? '0'+date.getMinutes() : date.getMinutes()).replace('{6}', date.getSeconds().toString().length == 1 ? '0'+date.getSeconds() : date.getSeconds());
}

// Configure our HTTP server to respond with Hello World to all requests.
var server = http.createServer(function (request, response) {
  if ("x-gitlab-event" in request["headers"]){
    let body = "";
    request.on('data', function(chunk) {
      body += chunk;
    });
    request.on('end', () => sendMessage(request, JSON.parse(body)));
    response.writeHead(200, {"Content-Type": "text/plain"}); 
    response.end("Hook ok\n");
  } else {
    response.writeHead(200, {"Content-Type": "text/plain"}); 
    response.end("link to git\n");
  }
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
    message.channel.send('pong');
  }
}


function getChange(commit, str){
  if(commit.length != 0){
    let res = "**File "+ str +":**\n";
    res += "-> " + commit.join("\n-> ");
    res += "\n";
    return res;
  } else {
    return "";
  }
}

function createFields(body){
  let fields = body["commits"].map(function(commit){
    let index = commit["message"].indexOf("\n");
    let msgOne = commit["message"].substring(0,index);
    let msgTwo = commit["message"].substring(index+1);
    let added = getChange(commit["added"], "added");
    let modified = getChange(commit["modified"], "modified");
    let removed = getChange(commit["removed"], "removed");
    return {
      name: ("**[Commit " + commit["id"].substring(0,8) + "]** by *" +
	     commit["author"]["name"] + "*: __**" + msgOne + "**__"),
      value: (msgTwo + "\n" +
	      "[link to commit on gitlab]"+"(" + commit["url"] + ")\n" +
	      "**Timestamp:** " +
	      formatDate(new Date(commit["timestamp"])) + "\n" +
	      added +
	      modified +
	      removed	      
	     )
    };
  });
  return fields;
}

function sendMessage(request, body){
  let config = gitlabConfig[body["repository"]["url"]];
  if (request["headers"]["x-gitlab-token"] == config["secret"]){
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
    let fields = createFields(body);
    sendEmbedMessage(config, body, fields, guild, channel);
  } else {
    console.log("Invalid token: ",
		request["headers"]["x-gitlab-token"],
		"expected: ",
		config["secret"]);
  }
}

function sendEmbedMessage(config, body, fields, guild, channel){
  client.guilds.get(guild)["channels"].get(channel).send({
    embed:{
      color: config["color"],
      author: {
	name: body["user_name"] + " <" + body["user_email"]+ ">",
	icon_url: body["user_avatar"]
      },
      title: (body["total_commits_count"] + " commits **PUSH** on __" +
	      body["repository"]["name"]+"__"),
      url: body["repository"]["homepage"],
      timestamp: new Date(),
      footer:{
	icon_url: "https://i.imgur.com/ezC66kZ.png",
	text: "GitLab"
      },
      fields: fields      
    }
  });
}
