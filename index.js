const express = require("express");
const app = express();
const discord = require("discord.js");
const bot = new discord.Client();
const fs = require("fs");
const dm = require("discord-markdown");
const translate = require("@vitalets/google-translate-api");
const tlang = require("@vitalets/google-translate-api/languages");
const formidable = require("formidable");
const cheerio = require("cheerio");
const u = require("url");

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

app.get("/invite/:platfrom", function(req, res) {
  switch(req.params.platfrom) {
    case "discord":
      res.redirect(`https://discord.com/oauth2/authorize?client_id=${config.id}&scope=bot&permissions=8`);
    return;

    default: 
      res.redirect(`/`);
    return;
  }
});

app.get("/disc/:guild/:channel/:message", function(req, res) {
  if (!bot.readyTimestamp) {
    res.sendFile(`${__dirname}/web/dynamic/discord-message/not-ready.html`);
    return; 
  }
  bot.channels.fetch(req.params.channel).then(function(channel) {
    channel.messages.fetch(req.params.message).then(async function(message) {
      if (message.deleted) {errorHandler("Message was deleted.", req, res); return;}
      var $ = cheerio.load((await fs.promises.readFile(`${__dirname}/web/dynamic/discord-message/message.html`)));
        $(".avatar").attr("src", message.author.avatarURL());
        $(".username-link").attr("href", `https://discord.com/users/${message.author.id}`);
        $(".username").text(message.author.username);
        $(".content").html(dm.toHTML(message.content, {escapeHTML: true}));
        $(".guild-name").text(message.guild.name);
        $(".channel-name").text(message.channel.name);
        $(".timestamp").text(formatTime(message.createdTimestamp));
        $("title").text(`Message from ${message.author.username} in ${message.guild.name} - MsgLinks`);
        if (toArray(message.attachments).length > 0) {
          for (var c in toArray(message.attachments)) {
            if (determineAttachmentType(toArray(message.attachments)[c].value.proxyURL) == "audio") {
              var elem = `
                <div class="attached-audio-player">
                  <audio src="${toArray(message.attachments)[c].value.proxyURL}" controls></audio>
                </div>
              `;
              $(".attachments").append(elem);
            } else if (determineAttachmentType(toArray(message.attachments)[c].value.proxyURL) == "image") {
              var elem = `
                <div class="attached-image">
                  <img src="${toArray(message.attachments)[c].value.proxyURL}">
                </div>
              `;
              $(".attachments").append(elem); 
            } else if (determineAttachmentType(toArray(message.attachments)[c].value.proxyURL) == "video") {
              var elem = `
                <div class="attached-video-player">
                  <video src="${toArray(message.attachments)[c].value.proxyURL}" controls></video>
                </div>
              `;
              $(".attachments").append(elem);
            } else {
              var elem = `
                <div class="attached-downloadable">
                  <p>${toArray(message.attachments)[c].value.name}</p>
                  <a href="${toArray(message.attachments)[c].value.proxyURL}"><button>Download file</button></a>
                </div>
              `;
              $(".attachments").append(elem);
            }
          }
        }
        console.log(message)
        for (var c in message.embeds) {
          // embed types: rich, image, video, gifv, article, link
          console.log(message.embeds[c])
          switch (message.embeds[c].type) {
            case "gifv":
              var elem = `
                <div class="attached-video-player">
                  <video src="${message.embeds[c].video.proxyURL}" controls></video>
                </div>
              `;
              $(".attachments").append(elem);
            continue;

            case "link":
              var elem = `<div class="link-embed"><div class="meta">`
              if (message.embeds[c].provider.name) {elem = elem + `<span class="link-provider">${message.embeds[c].provider.name}</span>`;}
              if (message.embeds[c].title) {
                if (message.embeds[c].url) {elem = elem + `<a href="${message.embeds[c].url}">`}
                elem = elem + `<h2 class="link-title">${message.embeds[c].title}</h2>`;
                if (message.embeds[c].url) {elem = elem + `</a>`}
              }
              if (message.embeds[c].thumbnail && message.embeds[c].thumbnail.proxyURL) {
                elem = elem + `</div><img class="thumbnail" src="${message.embeds[c].thumbnail.proxyURL}">`;
              }
              $(".attachments").append(elem);
            continue;
          }
        }
        res.send($.html());
    }).catch(function(err) {
      res.send(err.stack || err.message || err);
    });
  }).catch(function(err) {
    res.send(err.stack || err.message || err);
  });
});

app.post("/translate", function(req, res) {
  var f = formidable();
  f.parse(req, function(err, fields) {
    if (err) {res.send(err.stack || err.message || err); return;}
    if (!fields.text || !fields.to) {res.send("Must specify all fields"); return;}
    translate(fields.text, {to: fields.to}).then(function(resp) {
      res.send(resp);
    }).catch(function(err) {
      res.send(err.stack || err.message || err);
    })
  });
});

app.get("/translate/languages", function(req, res) {
  res.send(tlang);
});

app.get("/http*", function(req, res) {
  res.redirect(determineUrlDest(req.url.substr(1)))
});

bot.on("ready", function() {
  console.log(`[discord] Bot has logged in`);
});

app.use(express.static("web/static/"));
app.listen(config.port, function() {
  console.log(`[server] Listening on port ${config.port}`);
});

function determineUrlDest(url) {
  var host = u.parse(url, true).hostname;
  switch(host) {
    case "discord.com":
    case "canary.discord.com":
    case "discordapp.com":
    case "canary.discordapp.com":
      var p = u.parse(url).pathname.split("/").slice(1);
      if (p[0] == "channels" && p[1] !== "@me") {
        return `/disc/${p[1]}/${p[2]}/${p[3]}`;
      } else {
        return null;
      }
    

  }
}

function determineAttachmentType(url) {
  var ft = url.split(".")[url.split(".").length - 1];
  switch(ft) {
    case "mp4":
    case "webm":
      return "video";
    case "mp3":
    case "wma":
    case "flac":
    case "alac":
      return "audio";
    case "jpg":
    case "jpeg":
    case "png":
    case "apng":
    case "gif":
    case "webp":
      return "image";
    default: 
      return "downloadable";
  }
}

function toArray(map) {
  return Array.from(map, ([name, value]) => ({ name, value }));
}

function formatTime(time) {
  let msgDate = new Date(time);
  return `on ${msgDate.getMonth() + 1}/${msgDate.getDate() + 1}/${msgDate.getFullYear()}`
}