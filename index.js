require('dotenv').config()
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const dot = require('dot-object')
const SockJS = require('sockjs-client')
const axios = require('axios')
const socks = [new SockJS('https://screeps.com/socket/'),new SockJS('https://screeps.com/season/socket/')]
const baseUrl = 'https://screeps.com'
//change the type of annoncement here, these key words will trigger from the console in screeps
const typesOfAnnouncement = ['announcement','report','defence alert']
let user = process.env.SCREEPS_USER
let userId = undefined
let screepsToken = process.env.SCREEPS_TOKEN
const messageInterval = 1
main()
async function main(){
		await getUserId()
		if (userId){
				client.login(process.env.DISCORD_BOT_TOKEN).then(socks.forEach((sock)=>runSocket(sock)))
		}
}
async function getUserId(){
		let url = `${baseUrl}/api/auth/me`
		await axios.get(url,
				{headers:{
								'X-Token': screepsToken,
								'X-Username': user
						}}
		).then((res)=> {
						if (res.data && res.data._id){
								userId = res.data._id
						}
				}
		)
}
async function runSocket(sock){
	sock.onopen = function() {
		//connecting to screeps websocket
		console.log('open');
		console.log('authorising, token:',screepsToken != undefined)
		sock.send('auth '+screepsToken)
	};
	sock.onmessage = function(e) {
		//listening to screeps console
		if (e.data){
			let split = e.data.split(' ')
			if (split[0] == 'auth' && split[1] == 'ok'){
				sock.send(`subscribe user:${userId}/console`)
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
		//each console log should be in the format announcementType/Game.shard.name/message
		let dataSection = data.slice(2)
		let dataStr = dataSection.join()
		let message = `\` ${type} from ${data[1]}: ${dataStr} \``
			console.log(message)
		sendMessage(message,type)
	} else {
			console.log(JSON.stringify(data))
	}
}
async function sendMessage(toSendText,type){
	//send the message to discord on a specific channel for that announcement type
	let guilds = await client.guilds.fetch();
	let channelName = type+'s'
	let split = channelName.split(' ')
	if (split.length>0){
		//channel names can't have spaces -> convert to hyphens
		channelName = split.join('-')
	}
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
			console.log('creating channel',channelName)
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
			console.log(`posting ${toSendText}`)
			channel.send(toSendText)
		} else {
			console.log(`duplicate ${toSendText}`)
		}
	}
}
