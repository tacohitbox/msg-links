const express = require("express");
const app = express();
const discord = require("discord.js");
const bot = new discord.Client();
const fs = require("fs");
const cheerio = require("cheerio");

console.log("[ MSGLINKS SERVER ]")
console.log("");

if (!fs.existsSync(`${__dirname}/config.json`)) {
  console.log("ERR! The config file doesn't exist. Please configure your MsgLinks instance!");
  fs.copyFileSync(`${__dirname}/config.example.json`, `${__dirname}/config.json`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(`${__dirname}/config.json`));

if (config.token == "-- please set a token --") {
  console.log("[err] The config file isn't properly configured. Please configure your MsgLinks instance!");
  console.log("[nte] Starting instance anyway. There will be errors.");
  console.log("")
}

if (config.token !== "-- please set a token --") {bot.login(config.token);}

app.get("/invite", function(req, res) {
  res.redirect(`https://discord.com/oauth2/authorize?client_id=${config.id}&scope=bot&permissions=8`);
});

app.get("/channels/:guild/:channel/:message", function(req, res) {
  bot.channels.fetch(req.params.channel).then(function(channel) {
    channel.messages.fetch(req.params.message).then(async function(message) {
      if (message.deleted) {errorHandler("Message was deleted.", req, res); return;}
      var type = await (detectType(message));
      var $ = cheerio.load((await fs.promises.readFile(`${__dirname}/web/dynamic/discord-message/${type}.html`)));
      switch (type) {
        case "text-only":
          $(".avi").attr("src", message.author.avatarURL());
          $(".username-link").attr("href", `https://discord.com/users/${message.author.id}`);
          $(".username").text(message.author.username);
          $(".content").text(message.content);
          res.send($.html());
        return;

        default: 
          console.log(message);
          console.log(type)
      }
      
    }).catch(function(err) {
      res.send(err.stack || err.message || err);
    });
  }).catch(function(err) {
    res.send(err.stack || err.message || err);
  });
})

bot.on("ready", function() {
  console.log(`[discord] Bot has logged in!`);
});

app.use(express.static("web/static/"));
app.listen(config.port, function() {
  console.log(`[server] Listening on port ${config.port}`);
});

async function detectType(object) {
  if (typeof object.content == "string" && object.content !== "") {
    if (object.embeds.length == 0) {
      return "text-only";
    } else {
      return "text-with-embed"
    }
  } else {
    console.log(toArray(object.attachments));
    if (await (toArray(object.attachments).length == 0)) {return "attachment-only";}
    return "embed-only";
  }
}

function toArray(map) {
  return Array.from(map, ([name, value]) => ({ name, value }));
}