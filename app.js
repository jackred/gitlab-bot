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
var server = http.createServer(function (request, response){
  let res = "";
  if ("x-gitlab-event" in request["headers"]){
    let body = "";
    request.on('data', function(chunk){
      body += chunk;
    });
    request.on('end', function(){
      try {
	createEmbedMessage(request, JSON.parse(body));
	res = "Hook ok\n";
	response.writeHead(200, {"Content-Type": "text/plain"}); 
	response.end(res);
      } catch (e){
	console.log("JSON invalid: ", e);
	response.writeHead(400, {"Content-Type": "text/plain"}); 
	response.end("NO\n");
      }
    });
  } else {
    res = "link to git\n";
    response.writeHead(200, {"Content-Type": "text/plain"}); 
    response.end(res);
  }

});
// Listen on port 3000, IP defaults to 127.0.0.1
server.listen(port);
// Put a friendly message on the terminal
console.log("Server running at http://127.0.0.1:3000/test");


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


function createEmbedMessage(request, body){
  let repoConfig = gitlabConfig[body["repository"]["url"]];
  if (request["headers"]["x-gitlab-token"] == repoConfig["secret"]){
    let commitsTitle = createCommitsTitle(body["commits"]);
    let embeds = [];
    embeds.push(buildEmbedPushMessage(repoConfig, body, commitsTitle));
    body["commits"].reduce(function(acc,d){
      acc.push(buildEmbedCommitMessage(repoConfig, d, body["repository"]["name"], commitsTitle[d["id"]]));
      return acc;
    }, embeds);
    embeds = {"embeds": embeds};
    let ref = body["ref"].split("/").pop();
    let hook = {};
    if (ref in repoConfig["branch"]){
      hook = repoConfig["branch"][ref];  
    } else {
      hook = repoConfig["branch"]["default"];
    }
    sendEmbedMessagesHook(embeds, hook);
  } else {
    console.log("Invalid token: ",
		request["headers"]["x-gitlab-token"],
		"expected: ",
		repoConfig["secret"]);
  }
}

function getChange(change, str){
  if(change.length != 0){
    let res = {name: change.length + " **file(s) "+ str +":**",
	       value: "-> " + change.join("\n-> ")};
    return res;
  } else {
    return {name: "0 **file** " + str + "\n",
	    value: "None"};
  }
}

function cutted(array){
  let length = array.reduce((acc, a) => acc + a["value"].length, 0);
  while ((length > 5000)){
    array.sort((a,b) => a.length < b.length);
    if (array[0].length < length - 5000){
      array[0] = array[0].split("\n")[0] + "... (too long)\n";
    } else {
      array[0] = array[0].substring(0, length - 5000) + "... (too long)\n";
    }
    length = array.reduce((acc, a) => acc + a.length, 0);
  }
  return array;
}

function createCommitFields(commit){
  let added = getChange(commit["added"], "added");
  let modified = getChange(commit["modified"], "modified");
  let removed = getChange(commit["removed"], "removed");
  let tmp = [added, modified, removed];
  cutted(tmp);
  return tmp;
}


function createAuthor(author){
  if ((author["name"].length + author["email"].length + 3) <= 256){
    return author["name"] + " <" + author["email"] + ">";
  } else if (author["name"].length <= 256){
    return author["name"];
  } else {
    return author["name"].substring(0, 253) + "...";
  }
}

function createCommitTitle(commit){
  let index = (commit["message"]+"\n").indexOf("\n");
  let msgOne = commit["message"].substring(0,index);
  let msgTwo = commit["message"].substring(index+1);
  let tmp = "**[Commit " + commit["id"].substring(0,8) + "]** ";
  if (msgOne.length > 230){
    msgOne = msgOne.substring(0,230) + "...";
  }
  if (msgTwo.length > 900){
    msgTwo = msgTwo.substring(0,900) + "...";
  }
    return [tmp + msgOne, msgTwo, commit["url"]];
  
}

function createCommitsTitle(commits){
  return commits.reduce(function(acc, a){
      acc[a["id"]] = createCommitTitle(a);
    return acc;
  }, {});
}


function createPushTitle(totalCommits, repoName){
  if (repoName.length > 200){
    return (totalCommits + "commits **PUSH** on __" +
	    repoName.substring(0,200) + "...__");
  } else {
    return totalCommits + " commits **PUSH** on __" + repoName + "__";
  }
}

function createFooterText(text){
  if (text > 150){
    text = text.substring(0,150) + "...";
  }
  return "GitLab - " + text;
}


function buildEmbedPushMessage(repoConfig, body, commitsTitle){
  let fields = Object.keys(commitsTitle).map(function(d){
    return {
      name: commitsTitle[d][0],
      value: "[link to commit]("+commitsTitle[d][2] + ")\n" + commitsTitle[d][1],
    };
  });
  return {
    color: repoConfig["color"],
    author: {
      name: createAuthor({name: body["user_name"],
			  email: body["user_email"]}),
      icon_url: body["user_avatar"]
    },
    title: createPushTitle(body["total_commits_count"],body["repository"]["name"]),
    url: body["repository"]["homepage"],
    timestamp: new Date(),
    footer: {
      icon_url: "https://i.imgur.com/ezC66kZ.png",
      text: createFooterText(body["repository"]["name"]) 
    },
    fields: fields
  };
}

function buildEmbedCommitMessage(repoConfig, commit, nameProject, title){
  let fields = createCommitFields(commit);
  return {
    color: repoConfig["color"],
    author: {
      name: createAuthor(commit["author"]),
      icon_url: config["avatar"]
    },
    title: title[0],
    description: title[1],
    url: commit["url"],
    timestamp: commit["timestamp"],
    footer: {
      icon_url: config["avatar"],
      text: createFooterText(nameProject)
    },
    fields: fields
  };
}


function sendEmbedMessageChannel(embed, channel){
  channel.sendEmbed(embed);
}

function sendEmbedMessagesHook(embedList, webHook){
  let hook = new Discord.WebhookClient(webHook.id, webHook.token);
  console.log("Message sent");
  console.log(embedList["embeds"].length + " message(s) sent");
  hook.send(embedList);
}
