const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

const token = process.env.TOKEN;
const userData = new Map();
const registeredUsers = new Map();

const ALLOWED_GUILD_ID = '1455659993725407354';
const VALID_ALLIANCES = ['FKIT', 'ISL', 'DNT', 'TNT'];
const NOT_VERIFIED_ROLE = 'Not verified';

const IMPORTANT_CHANNELS = {
    RULES: '1455687620121198840',
    ANNOUNCEMENTS: '1455687691021848823'
};

const GAME_ID_GIF = 'https://github.com/STE2025LLC/discord-bot/blob/main/ID%20gif.gif?raw=true';

let BOT_ID = '';

client.once('ready', () => {
    console.log('Bot logged in as ' + client.user.tag);
    console.log('Bot ID: ' + client.user.id);
    console.log('Bot is ready!');
    
    BOT_ID = client.user.id;
    
    console.log('\nChecking servers:');
    client.guilds.cache.forEach(guild => {
        console.log('   - ' + guild.name + ' (ID: ' + guild.id + ')');
        
        if (guild.id !== ALLOWED_GUILD_ID) {
            console.log('   WARNING: Bot is in unauthorized server: ' + guild.name);
            guild.leave().catch(err => {
                console.log('   Could not leave server ' + guild.name + ': ' + err.message);
            });
        }
    });
    
    console.log('\nAvailable commands:');
    console.log('   - !register (in DM)');
    console.log('   - !changealliance (in DM)');
    console.log('Registered users in memory: ' + registeredUsers.size);
});

function isAllowedGuild(guild) {
    if (!guild) return false;
    return guild.id === ALLOWED_GUILD_ID;
}

client.on('guildMemberAdd', async (member) => {
    if (!isAllowedGuild(member.guild)) return;
    
    console.log('New member: ' + member.user.tag);
    
    try {
        const notVerifiedRole = member.guild.roles.cache.find(r => r.name === NOT_VERIFIED_ROLE);
        if (notVerifiedRole) {
            await member.roles.add(notVerifiedRole);
            console.log('Added Not verified role to ' + member.user.tag);
        }
        
        const welcomeChannel = member.guild.channels.cache.find(ch => ch.type === 0 && ch.name === '👋-welcome');
        if (welcomeChannel) {
            await welcomeChannel.send('**Hello!** 👋 <@' + member.id + '> Welcome to **' + member.guild.name + '**.\n\nPlease check your DMs to complete registration.');
        }
        
        await member.send('**Welcome!** 👋\n\nTo complete registration, type:\n\n`!register`\n\nI will ask you 3 simple questions.\n\n*You currently have the "Not verified" role.*\n\n*To change alliance later, type `!changealliance` in this chat.*');
    } catch (error) {
        console.log('Error in guildMemberAdd: ' + error.message);
    }
});

async function saveToRegistersChannel(guild, userInfo, action) {
    if (!isAllowedGuild(guild)) return false;
    
    const registerChannel = guild.channels.cache.find(ch => ch.type === 0 && ch.name === 'registers');
    if (!registerChannel) {
        console.log('No registers channel found');
        return false;
    }
    
    try {
        const now = new Date();
        const utcFormatted = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        
        const registerMessage = '📝 **' + action + '** 📝\n\n' +
                               '**User:** <@' + userInfo.discordId + '> (' + userInfo.discordTag + ')\n' +
                               '**Discord ID:** `' + userInfo.discordId + '`\n' +
                               '**Alliance:** **' + userInfo.alliance + '**\n' +
                               '**Game ID:** `' + userInfo.gameId + '`\n' +
                               '**In-Game Nickname:** `' + userInfo.nickname + '`\n' +
                               '**Date (UTC):** ' + utcFormatted + '\n' +
                               '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        
        await registerChannel.send(registerMessage);
        console.log(action + ' saved for ' + userInfo.discordTag);
        return true;
    } catch (error) {
        console.log('Error saving to register: ' + error.message);
        return false;
    }
}

async function changeUserAlliance(userId, newAlliance, guild) {
    if (!isAllowedGuild(guild)) return false;
    
    try {
        const member = guild.members.cache.get(userId);
        if (!member) return false;
        
        let removedRoles = [];
        for (const alliance of VALID_ALLIANCES) {
            const role = guild.roles.cache.find(r => r.name === alliance);
            if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                removedRoles.push(alliance);
            }
        }
        
        const newRole = guild.roles.cache.find(r => r.name === newAlliance);
        if (!newRole) return false;
        
        await member.roles.add(newRole);
        
        return {
            success: true,
            removedRoles: removedRoles,
            addedRole: newAlliance,
            memberTag: member.user.tag
        };
    } catch (error) {
        console.log('Error changing alliance: ' + error.message);
        return false;
    }
}

async function completeVerification(userId, userInfo, guild) {
    if (!isAllowedGuild(guild)) return false;
    
    try {
        const member = guild.members.cache.get(userId);
        if (!member) return false;
        
        const notVerifiedRole = guild.roles.cache.find(r => r.name === NOT_VERIFIED_ROLE);
        if (notVerifiedRole && member.roles.cache.has(notVerifiedRole.id)) {
            await member.roles.remove(notVerifiedRole);
        }
        
        for (const alliance of VALID_ALLIANCES) {
            const role = guild.roles.cache.find(r => r.name === alliance);
            if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
            }
        }
        
        const newRole = guild.roles.cache.find(r => r.name === userInfo.alliance);
        if (!newRole) return false;
        
        await member.roles.add(newRole);
        
        return {
            success: true,
            removedNotVerified: true,
            addedRole: userInfo.alliance,
            memberTag: member.user.tag
        };
    } catch (error) {
        console.log('Error completing verification: ' + error.message);
        return false;
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.guild) {
        if (!isAllowedGuild(message.guild)) {
            try {
                await message.reply('This bot is restricted to a specific server.');
            } catch (e) {}
            return;
        }
    }
    
    if (!message.guild) {
        const userId = message.author.id;
        const userTag = message.author.tag;
        const content = message.content.trim();
        
        console.log('DM from ' + userTag + ': "' + content + '"');
        
        try {
            if (content.toLowerCase() === '!register') {
                if (userData.has(userId)) {
                    const data = userData.get(userId);
                    await message.author.send('Please answer: **' + data.currentQuestion + '**');
                    return;
                }
                
                userData.set(userId, {
                    step: 1,
                    currentQuestion: 'What is your alliance?',
                    alliance: '',
                    gameId: '',
                    nickname: '',
                    discordTag: userTag,
                    discordId: userId
                });
                
                await message.author.send('**REGISTRATION STARTED!**\n\n**Question 1/3:**\n**What is your alliance?**\n\nType: **FKIT**, **ISL**, **DNT**, or **TNT**');
                return;
            }
            
            if (content.toLowerCase() === '!changealliance') {
                console.log(userTag + ' requested alliance change');
                
                const existingUserData = registeredUsers.get(userId);
                
                let messageContent = '**ALLIANCE CHANGE REQUESTED**\n\nType your new alliance:\n\nType: **FKIT**, **ISL**, **DNT**, or **TNT**';
                
                if (existingUserData) {
                    messageContent += '\n\n**Your current data:**\n';
                    messageContent += '• Game ID: `' + existingUserData.gameId + '`\n';
                    messageContent += '• Nickname: `' + existingUserData.nickname + '`\n';
                    messageContent += '• Current Alliance: `' + (existingUserData.alliance || 'None') + '`';
                }
                
                await message.author.send(messageContent);
                
                userData.set(userId, {
                    step: 'changing_alliance',
                    discordTag: userTag,
                    discordId: userId,
                    gameId: existingUserData ? existingUserData.gameId : '',
                    nickname: existingUserData ? existingUserData.nickname : '',
                    alliance: existingUserData ? existingUserData.alliance : ''
                });
                
                return;
            }
            
            if (userData.has(userId)) {
                const userInfo = userData.get(userId);
                
                if (userInfo.step === 1) {
                    const answer = content.toUpperCase();
                    
                    if (!VALID_ALLIANCES.includes(answer)) {
                        await message.author.send('**Invalid alliance!**\nType: FKIT, ISL, DNT, or TNT');
                        return;
                    }
                    
                    userInfo.alliance = answer;
                    userInfo.step = 2;
                    userData.set(userId, userInfo);
                    
                    const gameIdEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('GAME ID')
                        .setDescription('**Your in-game ID must be EXACTLY 16 characters long.**\nOnly letters and numbers are allowed.')
                        .setImage(GAME_ID_GIF)
                        .setFooter({ text: 'Enter your 16-character Game ID below' });
                    
                    await message.author.send({
                        content: '**Alliance: ' + answer + '**\n\n**Question 2/3:**\n**What is your in-game ID?**',
                        embeds: [gameIdEmbed]
                    });
                }
                
                else if (userInfo.step === 2) {
                    if (!content) {
                        await message.author.send('**Please provide your in-game ID.**');
                        return;
                    }
                    
                    if (content.length !== 16) {
                        await message.author.send('**Invalid Game ID length!**\n\nYour ID has ' + content.length + ' characters.\n**Required: EXACTLY 16 characters.**');
                        return;
                    }
                    
                    if (!/^[a-zA-Z0-9]+$/.test(content)) {
                        await message.author.send('**Invalid characters!**\nGame ID can only contain letters and numbers.');
                        return;
                    }
                    
                    userInfo.gameId = content;
                    userInfo.step = 3;
                    userData.set(userId, userInfo);
                    
                    await message.author.send('**Game ID registered**\n\n**Question 3/3:**\n**What is your in-game nickname?**');
                }
                
                else if (userInfo.step === 3) {
                    if (!content || content.length < 2) {
                        await message.author.send('**Invalid nickname!**\nMinimum 2 characters');
                        return;
                    }
                    
                    if (content.length > 32) {
                        await message.author.send('**Nickname too long!**\nMaximum 32 characters allowed.');
                        return;
                    }
                    
                    userInfo.nickname = content;
                    
                    console.log(userTag + ' completed registration!');
                    
                    registeredUsers.set(userId, {
                        alliance: userInfo.alliance,
                        gameId: userInfo.gameId,
                        nickname: userInfo.nickname,
                        discordTag: userInfo.discordTag,
                        discordId: userInfo.discordId,
                        registeredAt: new Date().toISOString()
                    });
                    
                    console.log('User data saved for ' + userTag);
                    
                    let verificationResult = false;
                    try {
                        const guild = client.guilds.cache.get(ALLOWED_GUILD_ID);
                        if (guild) {
                            const result = await completeVerification(userId, userInfo, guild);
                            verificationResult = result && result.success;
                        }
                    } catch (verifyError) {
                        console.log('Verification error: ' + verifyError.message);
                    }
                    
                    try {
                        const guild = client.guilds.cache.get(ALLOWED_GUILD_ID);
                        if (guild) {
                            await saveToRegistersChannel(guild, userInfo, 'NEW REGISTRATION');
                        }
                    } catch (saveError) {
                        console.log('Save error: ' + saveError.message);
                    }
                    
                    let confirmationMessage = '**REGISTRATION COMPLETE!**\n\n';
                    confirmationMessage += '**Your information:**\n';
                    confirmationMessage += '• Alliance: **' + userInfo.alliance + '**\n';
                    confirmationMessage += '• Game ID: **' + userInfo.gameId + '**\n';
                    confirmationMessage += '• Nickname: **' + userInfo.nickname + '**\n\n';
                    
                    if (verificationResult) {
                        confirmationMessage += '**Verification completed!**\n';
                        confirmationMessage += 'You now have full access.\n\n';
                    }
                    
                    confirmationMessage += '**Important:**\n';
                    confirmationMessage += 'Read <#' + IMPORTANT_CHANNELS.RULES + '> and <#' + IMPORTANT_CHANNELS.ANNOUNCEMENTS + '>\n\n';
                    
                    confirmationMessage += '**To change your alliance later:**\n';
                    confirmationMessage += 'Write `!changealliance` in this chat with <@' + BOT_ID + '>\n\n';
                    
                    confirmationMessage += 'Enjoy your stay!';
                    
                    await message.author.send(confirmationMessage);
                    
                    userData.delete(userId);
                    
                    if (verificationResult) {
                        try {
                            const guild = client.guilds.cache.get(ALLOWED_GUILD_ID);
                            const welcomeChannel = guild.channels.cache.find(ch => ch.type === 0 && ch.name === '👋-welcome');
                            if (welcomeChannel) {
                                await welcomeChannel.send('<@' + userId + '> has joined the **' + userInfo.alliance + '** alliance! Welcome!');
                            }
                        } catch (e) {}
                    }
                }
                
                else if (userInfo.step === 'changing_alliance') {
                    const newAlliance = content.toUpperCase();
                    
                    if (!VALID_ALLIANCES.includes(newAlliance)) {
                        await message.author.send('**Invalid alliance!**\nType: FKIT, ISL, DNT, or TNT');
                        return;
                    }
                    
                    console.log(userTag + ' changing alliance to: ' + newAlliance);
                    
                    const storedData = registeredUsers.get(userId);
                    const userFullInfo = {
                        discordTag: userTag,
                        discordId: userId,
                        alliance: newAlliance,
                        gameId: storedData ? storedData.gameId : 'Not provided',
                        nickname: storedData ? storedData.nickname : 'Not provided'
                    };
                    
                    try {
                        const guild = client.guilds.cache.get(ALLOWED_GUILD_ID);
                        if (guild) {
                            const result = await changeUserAlliance(userId, newAlliance, guild);
                            
                            if (result && result.success) {
                                if (storedData) {
                                    storedData.alliance = newAlliance;
                                    storedData.updatedAt = new Date().toISOString();
                                    registeredUsers.set(userId, storedData);
                                }
                                
                                await saveToRegistersChannel(guild, userFullInfo, 'ALLIANCE CHANGE');
                                
                                let changeMessage = '**ALLIANCE CHANGED!**\n\n';
                                changeMessage += '**New alliance:** **' + newAlliance + '**\n\n';
                                
                                if (result.removedRoles.length > 0) {
                                    changeMessage += '**Removed:** ' + result.removedRoles.join(', ') + '\n';
                                }
                                
                                changeMessage += '**Added:** ' + newAlliance + '\n\n';
                                
                                if (userFullInfo.gameId !== 'Not provided') {
                                    changeMessage += '**Your game data:**\n';
                                    changeMessage += '• Game ID: `' + userFullInfo.gameId + '`\n';
                                    changeMessage += '• Nickname: `' + userFullInfo.nickname + '`\n\n';
                                }
                                
                                changeMessage += 'Change recorded in server logs.\n\n';
                                changeMessage += 'Read <#' + IMPORTANT_CHANNELS.ANNOUNCEMENTS + '> for updates.';
                                
                                await message.author.send(changeMessage);
                                
                                console.log('Alliance changed for ' + userTag);
                                
                                try {
                                    const welcomeChannel = guild.channels.cache.find(ch => ch.type === 0 && ch.name === '👋-welcome');
                                    if (welcomeChannel) {
                                        await welcomeChannel.send('<@' + userId + '> changed alliance to **' + newAlliance + '**!');
                                    }
                                } catch (e) {}
                                
                            } else {
                                await message.author.send('**Error changing alliance!**\nContact an administrator.');
                            }
                        }
                    } catch (error) {
                        console.log('Error in alliance change: ' + error.message);
                        await message.author.send('**An error occurred!**\nTry again or contact admin.');
                    }
                    
                    userData.delete(userId);
                }
                
                return;
            }
            
            await message.author.send('Available commands:\n\n• `!register` - Start registration\n• `!changealliance` - Change alliance\n\nType one command to continue.');
            
        } catch (error) {
            console.log('DM error: ' + error.message);
        }
    }
});

client.on('guildCreate', async (guild) => {
    console.log('Bot added to new server: ' + guild.name);
    
    if (guild.id !== ALLOWED_GUILD_ID) {
        console.log('Unauthorized server, leaving...');
        try {
            await guild.leave();
            console.log('Left unauthorized server: ' + guild.name);
        } catch (error) {
            console.log('Failed to leave: ' + error.message);
        }
    }
});

client.on('error', error => console.log('Client error: ' + error));
process.on('unhandledRejection', error => console.log('Unhandled rejection: ' + error));

if (!token) {
    console.log('No token found!');
    process.exit(1);
}

client.login(token)
    .then(() => console.log('Bot started'))
    .catch(error => {
        console.log('Login failed: ' + error.message);
        process.exit(1);
    });
