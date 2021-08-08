require('dotenv').config()
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const dot = require('dot-object')
const SockJS = require('sockjs-client')
const socks = [new SockJS('https://screeps.com/socket/'),new SockJS('https://screeps.com/season/socket/')]
const typesOfAnnouncement = ['announcement','report','defence alert']
const messageInterval = 1
client.login(process.env.DISCORD_BOT_TOKEN).then(socks.forEach((sock)=>runSocket(sock)))

function runSocket(sock){
	sock.onopen = function() {
		console.log('open');
		console.log('authorising, token:',process.env.SCREEPS_TOKEN != undefined)
		sock.send('auth '+process.env.SCREEPS_TOKEN)
	};
	sock.onmessage = function(e) {
		if (e.data){
			let split = e.data.split(' ')
			if (split[0] == 'auth' && split[1] == 'ok'){
				sock.send(`subscribe user:${process.env.USER}/console`)
			}
			if (e.data[0]=='['){
				let obj = JSON.parse(e.data)
				if (obj && obj[1] && obj[1].messages && obj[1].messages.log){
					let logs = obj[1].messages.log
					for (let i in logs){
						let log = logs[i]
						if (log){
							let split = log.split('/')
							for (let t in typesOfAnnouncement){
								if (split && split[0] == typesOfAnnouncement[t]){
									writeAnnouncement(split,typesOfAnnouncement[t])
								}
							}
						}
					}
				}
			}
		}
	};
}
function writeAnnouncement(data,type){
	if (data && Array.isArray(data) && data.length === 3){
		//announcement,shard,message
		let dataSection = data.slice(2)
		let dataStr = dataSection.join()
		let message = `\` ${type} from ${data[1]}: ${dataStr} \``
		sendMessage(message,type)
	}
}
async function sendMessage(toSendText,type){
	let guilds = await client.guilds.fetch();
	let channelName = type+'s'
	guilds.each(guild => processGuild(guild.id))
	async function processGuild(guildid){
		let guild = await client.guilds.fetch(guildid)
		if (!guild){
			return
		}
		if (!guild.available){
			console.log(guild.name,'unavailable')
			return
		}
		//ensure this type of channel exists
		let channels = await guild.channels.fetch();
		let channel = channels.find((c)=>c.name === channelName)
		if (!channel){
			channel = await guild.channels.create(channelName)
			console.log('creating channel')
		}
		if (!channel){
			return
		}
		//check we dont have any similar messages in message interval
		let messageManager = channel.messages
		let messages = await messageManager.fetch(undefined,{limit:50})
		let canPost = true
		messages.each((message)=>{
			if (message.content && message.content === toSendText){
				let time = Date.now()
				let difference = time - message.createdTimestamp
				let hours = difference/3600000
				//to prevent spam - only sends a duplicate message after x hours
				if (hours < 3){
					canPost = false
				}
			}
		})
		if (canPost){
			channel.send(toSendText)
		}
	}
}
