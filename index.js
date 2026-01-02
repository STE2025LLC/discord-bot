[file name]: index.js
[file content begin]
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
    console.log(`Bot logged in as ${client.user.tag}`);
    console.log(`Bot ID: ${client.user.id}`);
    console.log('Bot is ready!');
    console.log(`Game ID GIF: ${GAME_ID_GIF}`);
    console.log(`Allowed server ID: ${ALLOWED_GUILD_ID}`);
    
    BOT_ID = client.user.id;
    
    console.log('\nChecking servers where bot is present:');
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (ID: ${guild.id})`);
        
        if (guild.id !== ALLOWED_GUILD_ID) {
            console.log(`   WARNING: Bot is in unauthorized server: ${guild.name}`);
            console.log(`   This server is NOT allowed. Bot will leave automatically.`);
            
            guild.leave().then(() => {
                console.log(`   Left unauthorized server: ${guild.name}`);
            }).catch(err => {
                console.log(`   Could not leave server ${guild.name}:`, err.message);
            });
        } else {
            console.log(`   Authorized server: ${guild.name}`);
        }
    });
    
    console.log(`\nAvailable commands:`);
    console.log(`   - !register (in DM)`);
    console.log(`   - !changealliance (in DM)`);
    console.log(`Not verified role: "${NOT_VERIFIED_ROLE}"`);
    console.log(`Registered users in memory: ${registeredUsers.size}`);
});

function isAllowedGuild(guild) {
    if (!guild) return false;
    
    if (guild.id !== ALLOWED_GUILD_ID) {
        console.log(`ACCESS DENIED: Bot used in unauthorized server: ${guild.name} (ID: ${guild.id})`);
        console.log(`   Allowed server ID: ${ALLOWED_GUILD_ID}`);
        return false;
    }
    
    return true;
}

client.on('guildMemberAdd', async (member) => {
    if (!isAllowedGuild(member.guild)) {
        console.log(`Blocked guildMemberAdd in unauthorized server: ${member.guild.name}`);
        return;
    }
    
    try {
        console.log(`New member in ${member.guild.name}: ${member.user.tag}`);
        
        try {
            const notVerifiedRole = member.guild.roles.cache.find(r => 
                r.name === NOT_VERIFIED_ROLE
            );
            
            if (notVerifiedRole) {
                await member.roles.add(notVerifiedRole);
                console.log(`Added "${NOT_VERIFIED_ROLE}" role to ${member.user.tag}`);
            } else {
                console.log(`Role "${NOT_VERIFIED_ROLE}" not found in server!`);
            }
        } catch (roleError) {
            console.error(`Error assigning "${NOT_VERIFIED_ROLE}" role:`, roleError.message);
        }
        
        const welcomeChannel = member.guild.channels.cache.find(ch => 
            ch.type === 0 && ch.name === '👋-welcome'
        );
        
        if (welcomeChannel) {
            await welcomeChannel.send({
                content: `**Hello!** 👋 <@${member.id}> Welcome to **${member.guild.name}**.\n\nPlease check your DMs to complete registration and be able to see all channels.`
            });
        }
        
        try {
            await member.send({
                content: '**Welcome!** 👋\n\nTo complete your registration and get access to all channels, type:\n\n```!register```\n\nI will ask you 3 simple questions about your game account.\n\n*You currently have the "Not verified" role until you complete registration.*'
            });
        } catch (error) {
            console.log(`Could not DM ${member.user.tag}`);
        }
        
    } catch (error) {
        console.error('Error in guildMemberAdd:', error.message);
    }
});

async function saveToRegistersChannel(guild, userInfo, action = 'NEW REGISTRATION') {
    if (!isAllowedGuild(guild)) {
        console.log(`Blocked saveToRegistersChannel in unauthorized server`);
        return false;
    }
    
    console.log(`\nSaving to registers channel (${action})...`);
    console.log(`   User: ${userInfo.discordTag} | Game ID: ${userInfo.gameId} | Nickname: ${userInfo.nickname}`);
    
    const registerChannel = guild.channels.cache.find(ch => 
        ch.type === 0 && ch.name === 'registers'
    );
    
    if (!registerChannel) {
        console.log('No "registers" channel found');
        return false;
    }
    
    console.log(`Found: #${registerChannel.name}`);
    
    const botMember = guild.members.cache.get(client.user.id);
    const permissions = registerChannel.permissionsFor(botMember);
    
    if (!permissions.has('ViewChannel') || !permissions.has('SendMessages')) {
        console.log('Bot cannot write to this channel');
        return false;
    }
    
    try {
        const now = new Date();
        const utcFormatted = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        
        const registerMessage = `
📝 **${action}** 📝

**User:** <@${userInfo.discordId}> (${userInfo.discordTag})
**Discord ID:** \`${userInfo.discordId}\`
**Alliance:** **${userInfo.alliance}**
**Game ID:** \`${userInfo.gameId}\`
**In-Game Nickname:** \`${userInfo.nickname}\`
**Date (UTC):** ${utcFormatted}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();
        
        console.log(`Sending to #${registerChannel.name}...`);
        await registerChannel.send(registerMessage);
        
        console.log(`${action} saved successfully with user mention`);
        return true;
        
    } catch (error) {
        console.error('Error saving to register channel:', error.message);
        return false;
    }
}

async function changeUserAlliance(userId, newAlliance, guild) {
    if (!isAllowedGuild(guild)) {
        console.log(`Blocked changeUserAlliance in unauthorized server`);
        return false;
    }
    
    try {
        const member = guild.members.cache.get(userId);
        if (!member) {
            console.log(`Member ${userId} not found in guild`);
            return false;
        }
        
        console.log(`Changing alliance for ${member.user.tag}`);
        
        let removedRoles = [];
        for (const alliance of VALID_ALLIANCES) {
            const role = guild.roles.cache.find(r => r.name === alliance);
            if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                removedRoles.push(alliance);
                console.log(`   Removed role: ${alliance}`);
            }
        }
        
        const newRole = guild.roles.cache.find(r => r.name === newAlliance);
        if (!newRole) {
            console.log(`Role ${newAlliance} not found`);
            return false;
        }
        
        await member.roles.add(newRole);
        console.log(`   Added role: ${newAlliance}`);
        
        return {
            success: true,
            removedRoles: removedRoles,
            addedRole: newAlliance,
            memberTag: member.user.tag
        };
        
    } catch (error) {
        console.error(`Error changing alliance:`, error.message);
        return false;
    }
}

async function completeVerification(userId, userInfo, guild) {
    if (!isAllowedGuild(guild)) {
        console.log(`Blocked completeVerification in unauthorized server`);
        return false;
    }
    
    try {
        const member = guild.members.cache.get(userId);
        if (!member) {
            console.log(`Member ${userId} not found in guild`);
            return false;
        }
        
        console.log(`Completing verification for ${member.user.tag}`);
        
        const notVerifiedRole = guild.roles.cache.find(r => r.name === NOT_VERIFIED_ROLE);
        if (notVerifiedRole && member.roles.cache.has(notVerifiedRole.id)) {
            await member.roles.remove(notVerifiedRole);
            console.log(`   Removed "${NOT_VERIFIED_ROLE}" role`);
        }
        
        for (const alliance of VALID_ALLIANCES) {
            const role = guild.roles.cache.find(r => r.name === alliance);
            if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`   Removed old alliance role: ${alliance}`);
            }
        }
        
        const newRole = guild.roles.cache.find(r => r.name === userInfo.alliance);
        if (!newRole) {
            console.log(`Role ${userInfo.alliance} not found`);
            return false;
        }
        
        await member.roles.add(newRole);
        console.log(`   Added alliance role: ${userInfo.alliance}`);
        
        return {
            success: true,
            removedNotVerified: notVerifiedRole ? true : false,
            addedRole: userInfo.alliance,
            memberTag: member.user.tag
        };
        
    } catch (error) {
        console.error(`Error completing verification:`, error.message);
        return false;
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.guild) {
        if (!isAllowedGuild(message.guild)) {
            console.log(`Blocked command in unauthorized server: ${message.guild.name}`);
            
            try {
                await message.reply({
                    content: 'This bot is restricted to a specific server and cannot be used here.',
                    allowedMentions: { repliedUser: false }
                });
            } catch (e) {
            }
            return;
        }
    }
    
    if (!message.guild) {
        const userId = message.author.id;
        const userTag = message.author.tag;
        const content = message.content.trim();
        
        console.log(`DM from ${userTag}: "${content}"`);
        
        try {
            if (content.toLowerCase() === '!register') {
                
                if (userData.has(userId)) {
                    const data = userData.get(userId);
                    await message.author.send(`Please answer: **${data.currentQuestion}**`);
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
                
                await message.author.send({
                    content: '**REGISTRATION STARTED!**\n\n**Question 1/3:**\n**What is your alliance?**\n\nType: **FKIT**, **ISL**, **DNT**, or **TNT**'
                });
                
                return;
            }
            
            if (content.toLowerCase() === '!changealliance') {
                console.log(`${userTag} requested alliance change`);
                
                const existingUserData = registeredUsers.get(userId);
                
                let messageContent = '**ALLIANCE CHANGE REQUESTED**\n\nTo change your alliance, please type your **new alliance**:\n\nType: **FKIT**, **ISL**, **DNT**, or **TNT**\n\n*Note: Your previous alliance role will be automatically removed.*';
                
                if (existingUserData) {
                    messageContent += '\n\n**Your current registration data:**\n';
                    messageContent += `• Game ID: \`${existingUserData.gameId}\`\n`;
                    messageContent += `• Nickname: \`${existingUserData.nickname}\`\n`;
                    messageContent += `• Current Alliance: \`${existingUserData.alliance || 'None'}\``;
                }
                
                await message.author.send({
                    content: messageContent
                });
                
                userData.set(userId, {
                    step: 'changing_alliance',
                    discordTag: userTag,
                    discordId: userId,
                    gameId: existingUserData?.gameId || '',
                    nickname: existingUserData?.nickname || '',
                    alliance: existingUserData?.alliance || ''
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
                    
                    const gameIdMessage = `**Alliance: ${answer}**\n\n**Question 2/3:**\n**What is your in-game ID?**\n\n`;
                    
                    const gameIdEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('GAME ID')
                        .setDescription('**Your in-game ID must be EXACTLY 16 characters long.**\nOnly letters (A-Z) and numbers (0-9) are allowed.\nNo spaces or special characters.')
                        .setImage(GAME_ID_GIF)
                        .setFooter({ text: 'Enter your 16-character Game ID below' });
                    
                    await message.author.send({
                        content: gameIdMessage,
                        embeds: [gameIdEmbed]
                    });
                }
                
                else if (userInfo.step === 2) {
                    if (!content) {
                        await message.author.send('**Please provide your in-game ID.**');
                        return;
                    }
                    
                    if (content.length !== 16) {
                        await message.author.send(`**Invalid Game ID length!**\n\n**Your ID has ${content.length} characters.**\n**Required: EXACTLY 16 characters.**\n\nPlease provide a valid 16-character Game ID.`);
                        return;
                    }
                    
                    if (!/^[a-zA-Z0-9]+$/.test(content)) {
                        await message.author.send('**Invalid characters!**\nGame ID can only contain letters and numbers (no spaces or special characters).');
                        return;
                    }
                    
                    userInfo.gameId = content;
                    userInfo.step = 3;
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `**Game ID registered**\n\n**Question 3/3:**\n**What is your in-game nickname?**`
                    });
                }
                
                else if (userInfo.step === 3) {
                    if (!content || content.length < 2) {
                        await message.author.send('**Invalid nickname!**\nPlease provide a valid in-game nickname (minimum 2 characters)');
                        return;
                    }
                    
                    if (content.length > 32) {
                        await message.author.send(`**Nickname too long!**\nMaximum 32 characters allowed.\n\nYour nickname has **${content.length}** characters.`);
                        return;
                    }
                    
                    userInfo.nickname = content;
                    
                    console.log(`\n${userTag} completed registration!`);
                    console.log(`   Alliance: ${userInfo.alliance}`);
                    console.log(`   Game ID: ${userInfo.gameId}`);
                    console.log(`   Nickname: ${userInfo.nickname}`);
                    
                    registeredUsers.set(userId, {
                        alliance: userInfo.alliance,
                        gameId: userInfo.gameId,
                        nickname: userInfo.nickname,
                        discordTag: userInfo.discordTag,
                        discordId: userInfo.discordId,
                        registeredAt: new Date().toISOString()
                    });
                    
                    console.log(`User data saved permanently for ${userTag}`);
                    
                    let verificationResult = false;
                    try {
                        const guild = client.guilds.cache.get(ALLOWED_GUILD_ID);
                        if (guild) {
                            const result = await completeVerification(userId, userInfo, guild);
                            verificationResult = result && result.success;
                        } else {
                            console.log(`Allowed guild not found: ${ALLOWED_GUILD_ID}`);
                            await message.author.send('**Error:** Cannot find the server. Please contact an administrator.');
                        }
                    } catch (verifyError) {
                        console.error('Verification error:', verifyError.message);
                    }
                    
                    try {
                        const guild = client.guilds.cache.get(ALLOWED_GUILD_ID);
                        if (guild) {
                            await saveToRegistersChannel(guild, userInfo, 'NEW REGISTRATION');
                        }
                    } catch (saveError) {
                        console.error('Save error:', saveError.message);
                    }
                    
                    let confirmationMessage = `**REGISTRATION COMPLETE!**\n\n`;
                    confirmationMessage += `**Your information has been registered:**\n`;
                    confirmationMessage += `• Alliance: **${userInfo.alliance}**\n`;
                    confirmationMessage += `• Game ID: **${userInfo.gameId}**\n`;
                    confirmationMessage += `• Nickname: **${userInfo.nickname}**\n\n`;
                    
                    if (verificationResult) {
                        confirmationMessage += `**Verification completed!**\n`;
                        confirmationMessage += `• Removed: **"${NOT_VERIFIED_ROLE}"** role\n`;
                        confirmationMessage += `• Added: **${userInfo.alliance}** role\n\n`;
                        confirmationMessage += `You now have full access to all channels.\n\n`;
                    } else {
                        confirmationMessage += `**Role assignment may have failed.**\n`;
                        confirmationMessage += `Please contact an administrator if you don't have access.\n\n`;
                    }
                    
                    confirmationMessage += `**Translation Feature:**\nYou can translate any message by reacting with flag emojis.\n\n`;
                    
                    confirmationMessage += `**Important:**\n`;
                    confirmationMessage += `It's very important that you read <#${IMPORTANT_CHANNELS.RULES}> and <#${IMPORTANT_CHANNELS.ANNOUNCEMENTS}>\n\n`;
                    
                    confirmationMessage += `**To change your alliance later:**\n`;
                    if (BOT_ID) {
                        confirmationMessage += `Write \`!changealliance\` to <@${BOT_ID}> in a Direct Message.\n\n`;
                    } else {
                        confirmationMessage += `Write \`!changealliance\` to the bot in a Direct Message.\n\n`;
                    }
                    
                    confirmationMessage += `Enjoy your stay in the server!`;
                    
                    await message.author.send({
                        content: confirmationMessage
                    });
                    
                    userData.delete(userId);
                    
                    if (verificationResult) {
                        try {
                            const guild = client.guilds.cache.get(ALLOWED_GUILD_ID);
                            const welcomeChannel = guild.channels.cache.find(ch => 
                                ch.type === 0 && ch.name === '👋-welcome'
                            );
                            if (welcomeChannel) {
                                await welcomeChannel.send({
                                    content: `<@${userId}> has completed verification and joined the **${userInfo.alliance}** alliance! Welcome!`
                                });
                            }
                        } catch (e) {
                        }
                    }
                }
                
                else if (userInfo.step === 'changing_alliance') {
                    const newAlliance = content.toUpperCase();
                    
                    if (!VALID_ALLIANCES.includes(newAlliance)) {
                        await message.author.send('**Invalid alliance!**\nType: FKIT, ISL, DNT, or TNT');
                        return;
                    }
                    
                    console.log(`\n${userTag} changing alliance to: ${newAlliance}`);
                    
                    const userFullInfo = {
                        discordTag: userTag,
                        discordId: userId,
                        alliance: newAlliance,
                        gameId: userInfo.gameId || 'Not provided',
                        nickname: userInfo.nickname || 'Not provided'
                    };
                    
                    const storedData = registeredUsers.get(userId);
                    if (storedData) {
                        userFullInfo.gameId = storedData.gameId;
                        userFullInfo.nickname = storedData.nickname;
                        console.log(`   Using stored data: Game ID: ${storedData.gameId}, Nickname: ${storedData.nickname}`);
                    }
                    
                    try {
                        const guild = client.guilds.cache.get(ALLOWED_GUILD_ID);
                        if (guild) {
                            const result = await changeUserAlliance(userId, newAlliance, guild);
                            
                            if (result && result.success) {
                                if (storedData) {
                                    storedData.alliance = newAlliance;
                                    storedData.updatedAt = new Date().toISOString();
                                    registeredUsers.set(userId, storedData);
                                    console.log(`Updated permanent storage for ${userTag}`);
                                }
                                
                                await saveToRegistersChannel(guild, userFullInfo, 'ALLIANCE CHANGE');
                                
                                let changeMessage = `**ALLIANCE CHANGED SUCCESSFULLY!**\n\n`;
                                changeMessage += `**Your new alliance:** **${newAlliance}**\n\n`;
                                
                                if (result.removedRoles.length > 0) {
                                    changeMessage += `**Removed previous roles:** ${result.removedRoles.join(', ')}\n`;
                                }
                                
                                changeMessage += `**Added new role:** ${newAlliance}\n\n`;
                                
                                if (userFullInfo.gameId !== 'Not provided') {
                                    changeMessage += `**Your game data:**\n`;
                                    changeMessage += `• Game ID: \`${userFullInfo.gameId}\`\n`;
                                    changeMessage += `• Nickname: \`${userFullInfo.nickname}\`\n\n`;
                                }
                                
                                changeMessage += `The change has been recorded in the server logs.\n\n`;
                                changeMessage += `You now have access to the ${newAlliance} alliance channels.\n\n`;
                                changeMessage += `**Remember:**\nRead <#${IMPORTANT_CHANNELS.ANNOUNCEMENTS}> for server updates.`;
                                
                                await message.author.send({
                                    content: changeMessage
                                });
                                
                                console.log(`Alliance changed for ${userTag}: ${result.removedRoles.join(', ')} -> ${newAlliance}`);
                                
                                try {
                                    const welcomeChannel = guild.channels.cache.find(ch => 
                                        ch.type === 0 && ch.name === '👋-welcome'
                                    );
                                    if (welcomeChannel) {
                                        await welcomeChannel.send({
                                            content: `<@${userId}> has changed alliance to **${newAlliance}**!`
                                        });
                                    }
                                } catch (e) {
                                }
                                
                            } else {
                                await message.author.send('**Error changing alliance!**\nPlease contact an administrator.');
                            }
                        } else {
                            await message.author.send('**Error:** Cannot find the server. Please contact an administrator.');
                        }
                    } catch (error) {
                        console.error('Error in alliance change:', error.message);
                        await message.author.send('**An error occurred!**\nPlease try again or contact an administrator.');
                    }
                    
                    userData.delete(userId);
                }
                
                return;
            }
            
            if (BOT_ID) {
                await message.author.send({
                    content: `Available commands:\n\n` +
                            `• \`!register\` - Start registration\n` +
                            `• \`!changealliance\` - Change your alliance\n\n` +
                            `Type one of the commands above to continue.\n\n` +
                            `*To change alliance, write \`!changealliance\` to <@${BOT_ID}> in DM.*`
                });
            } else {
                await message.author.send({
                    content: 'Available commands:\n\n' +
                            '• `!register` - Start registration\n' +
                            '• `!changealliance` - Change your alliance\n\n' +
                            'Type one of the commands above to continue.'
                });
            }
            
        } catch (error) {
            console.error('DM error:', error.message);
        }
    }
});

client.on('guildCreate', async (guild) => {
    console.log(`\nBot added to new server: ${guild.name} (ID: ${guild.id})`);
    
    if (guild.id !== ALLOWED_GUILD_ID) {
        console.log(`UNAUTHORIZED SERVER: ${guild.name}`);
        console.log(`   Allowed server ID: ${ALLOWED_GUILD_ID}`);
        console.log(`   Attempting to leave unauthorized server...`);
        
        try {
            const owner = await guild.fetchOwner();
            if (owner) {
                try {
                    await owner.send(`**Bot Restricted**\n\nThis bot (${client.user.tag}) is restricted to a specific server and cannot be used in other servers.\n\nThe bot will now leave your server automatically.\n\nIf you believe this is an error, contact the bot owner.`);
                } catch (dmError) {
                }
            }
            
            await guild.leave();
            console.log(`Successfully left unauthorized server: ${guild.name}`);
            
        } catch (error) {
            console.error(`Failed to leave server ${guild.name}:`, error.message);
        }
    } else {
        console.log(`Authorized server: ${guild.name}`);
        console.log(`Bot will now work in: ${guild.name}`);
    }
});

client.on('error', error => console.error('Client error:', error));
process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));

if (!token) {
    console.error('No token found!');
    process.exit(1);
}

client.login(token)
    .then(() => console.log('Bot started successfully'))
    .catch(error => {
        console.error('Login failed:', error.message);
        process.exit(1);
    });
[file content end]
