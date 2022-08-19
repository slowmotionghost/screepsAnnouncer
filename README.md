SCREEPS ANNOUNCER

This node application will listen to the Screeps World console for a user, and stream custom information over to a discord bot. It is set up in a way that it can be run on a heroku server.

Set-up:
1) Head over to the discord developer portal, create a new application. Customize your bot in the bot tab, and copy the token to use later.
2) Switch over to your Screeps account, click on manage account, then on auth tokens. This needs to be full access token, as the bots binds to both the websocket but also needs to retrieve user id. Save this token for later.
3) Customise any announcement types you want - each one will show in its own channel
4) Create a .env file in a similar format to the example (remove the //) and put in the data found in the earlier steps
5) Run npm install if you haven't already (not needed if you are deploying to heroku)
6) In your screeps code base, add logs in the following format: `console.log(announcementType/shard name/desired message)`
The command should be a single string, include the / between each section as this is used to split the input.
