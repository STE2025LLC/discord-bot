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

client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log('🚀 Bot is ready!');
});

client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`👤 New member: ${member.user.tag}`);
        
        const welcomeChannel = member.guild.channels.cache.find(ch => 
            ch.type === 0 && ch.name === '👋-welcome'
        );
        
        if (welcomeChannel) {
            // MENSAJE ACTUALIZADO según lo solicitado
            await welcomeChannel.send({
                content: `**Hello!** 👋 <@${member.id}> Welcome to **${member.guild.name}**.\n\nPlease check your DMs to complete registration and be able to see all channels.`
            });
        }
        
        try {
            await member.send({
                content: '**Welcome!** 👋\n\nTo register and get access to all channels, type:\n\n```!register```\n\nI will ask you 3 simple questions about your game account.'
            });
        } catch (error) {
            console.log(`⚠️ Could not DM ${member.user.tag}`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
});

// FUNCIÓN para guardar en "registers"
async function saveToRegistersChannel(guild, userInfo) {
    console.log(`\n💾 Saving to registers channel...`);
    
    const registerChannel = guild.channels.cache.find(ch => 
        ch.type === 0 && ch.name === 'registers'
    );
    
    if (!registerChannel) {
        console.log('❌ No "registers" channel found');
        return false;
    }
    
    console.log(`✅ Found: #${registerChannel.name}`);
    
    const botMember = guild.members.cache.get(client.user.id);
    const permissions = registerChannel.permissionsFor(botMember);
    
    if (!permissions.has('ViewChannel') || !permissions.has('SendMessages')) {
        console.log('❌ Bot cannot write to this channel');
        return false;
    }
    
    try {
        // Mensaje de texto formateado para el canal de registros
        const registerMessage = `
📝 **NEW REGISTRATION** 📝

👤 **Discord User:** ${userInfo.discordTag}
🆔 **Discord ID:** ${userInfo.discordId}
🛡️ **Alliance:** ${userInfo.alliance}
🎮 **Game ID:** ${userInfo.gameId}
🏷️ **In-Game Nickname:** ${userInfo.nickname}
📅 **Registration Date:** ${new Date().toLocaleString('en-US')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();
        
        console.log(`📤 Sending to #${registerChannel.name}...`);
        await registerChannel.send(registerMessage);
        
        console.log(`✅ Registration saved successfully`);
        return true;
        
    } catch (error) {
        console.error('❌ Error saving to register channel:', error.message);
        
        // Método alternativo más simple
        try {
            const simpleMessage = `📝 REGISTRATION: ${userInfo.discordTag} | Alliance: ${userInfo.alliance} | Game ID: ${userInfo.gameId} | Nickname: ${userInfo.nickname} | ${new Date().toLocaleDateString()}`;
            await registerChannel.send(simpleMessage);
            console.log('✅ Saved with alternative method');
            return true;
        } catch (secondError) {
            console.error('❌ Alternative method also failed:', secondError.message);
            return false;
        }
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (!message.guild) {
        const userId = message.author.id;
        const userTag = message.author.tag;
        const content = message.content.trim();
        
        console.log(`📩 DM from ${userTag}: "${content}"`);
        
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
                    content: '**✅ REGISTRATION STARTED!**\n\n**Question 1/3:**\n**What is your alliance?**\n\nType: **FKIT**, **ISL**, **DNT**, or **TNT**'
                });
                
                return;
            }
            
            if (userData.has(userId)) {
                const userInfo = userData.get(userId);
                
                if (userInfo.step === 1) {
                    const answer = content.toUpperCase();
                    const validAlliances = ['FKIT', 'ISL', 'DNT', 'TNT'];
                    
                    if (!validAlliances.includes(answer)) {
                        await message.author.send('❌ **Invalid alliance!**\nType: FKIT, ISL, DNT, or TNT');
                        return;
                    }
                    
                    userInfo.alliance = answer;
                    userInfo.step = 2;
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `✅ **Alliance: ${answer}**\n\n**Question 2/3:**\n**What is your in-game ID?**`
                    });
                }
                
                else if (userInfo.step === 2) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ **Invalid ID!**');
                        return;
                    }
                    
                    userInfo.gameId = content;
                    userInfo.step = 3;
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `✅ **Game ID registered**\n\n**Question 3/3:**\n**What is your in-game nickname?**`
                    });
                }
                
                else if (userInfo.step === 3) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ **Invalid nickname!**');
                        return;
                    }
                    
                    userInfo.nickname = content;
                    
                    console.log(`\n📋 ${userTag} completed registration!`);
                    console.log(`   Alliance: ${userInfo.alliance}`);
                    console.log(`   Game ID: ${userInfo.gameId}`);
                    console.log(`   Nickname: ${userInfo.nickname}`);
                    
                    // 1. ASIGNAR ROL
                    let roleAssigned = false;
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            const member = guild.members.cache.get(userId);
                            if (member) {
                                const role = guild.roles.cache.find(r => r.name === userInfo.alliance);
                                if (role) {
                                    await member.roles.add(role);
                                    roleAssigned = true;
                                    console.log(`🎖️ Role ${userInfo.alliance} assigned`);
                                }
                            }
                        }
                    } catch (roleError) {
                        console.error('Role error:', roleError.message);
                    }
                    
                    // 2. GUARDAR EN REGISTROS (silenciosamente)
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            await saveToRegistersChannel(guild, userInfo);
                            // NO le decimos al usuario que se guardó (solicitado)
                        }
                    } catch (saveError) {
                        console.error('Save error:', saveError.message);
                    }
                    
                    // 3. CONFIRMACIÓN AL USUARIO (SIN mencionar el guardado)
                    let confirmationMessage = `✅ **REGISTRATION COMPLETE!** 🎉\n\n`;
                    confirmationMessage += `**Your information has been registered:**\n`;
                    confirmationMessage += `• Alliance: **${userInfo.alliance}**\n`;
                    confirmationMessage += `• Game ID: **${userInfo.gameId}**\n`;
                    confirmationMessage += `• Nickname: **${userInfo.nickname}**\n\n`;
                    
                    if (roleAssigned) {
                        confirmationMessage += `🎖️ **You have received the ${userInfo.alliance} role!**\n`;
                        confirmationMessage += `You now have access to all channels.\n\n`;
                    }
                    
                    confirmationMessage += `🌍 **Translation Feature:**\nYou can translate any message by reacting with flag emojis:\n🇺🇸 English | 🇪🇸 Spanish | 🇫🇷 French | 🇩🇪 German\n🇮🇹 Italian | 🇵🇹 Portuguese\n\n`;
                    confirmationMessage += `Enjoy your stay in the server! 👋`;
                    
                    await message.author.send({
                        content: confirmationMessage
                    });
                    
                    // 4. LIMPIAR DATOS
                    userData.delete(userId);
                    
                    // 5. ANUNCIAR EN BIENVENIDA
                    if (roleAssigned) {
                        try {
                            const guild = client.guilds.cache.first();
                            const welcomeChannel = guild.channels.cache.find(ch => 
                                ch.type === 0 && ch.name === '👋-welcome'
                            );
                            if (welcomeChannel) {
                                await welcomeChannel.send({
                                    content: `🎉 <@${userId}> has joined the **${userInfo.alliance}** alliance and completed registration! Welcome! 👏`
                                });
                            }
                        } catch (e) {
                            // Ignorar
                        }
                    }
                }
                return;
            }
            
            await message.author.send({
                content: 'Type `!register` to start registration and get access to all channels.'
            });
            
        } catch (error) {
            console.error('DM error:', error.message);
        }
    }
});

// ERROR HANDLING
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// START BOT
if (!token) {
    console.error('❌ No token found!');
    process.exit(1);
}

client.login(token)
    .then(() => console.log('✅ Bot started successfully'))
    .catch(error => {
        console.error('❌ Login failed:', error.message);
        process.exit(1);
    });
