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
    
    // Mostrar canales disponibles
    const guild = client.guilds.cache.first();
    if (guild) {
        console.log('\n📚 Available channels:');
        guild.channels.cache.forEach(channel => {
            if (channel.type === 0) {
                console.log(`   #${channel.name} (${channel.id})`);
            }
        });
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`👤 New member: ${member.user.tag}`);
        
        // Buscar canal de bienvenida
        const welcomeChannel = member.guild.channels.cache.find(ch => 
            ch.type === 0 && ch.name === '👋-welcome'
        );
        
        if (welcomeChannel) {
            await welcomeChannel.send({
                content: `👋 Welcome <@${member.id}>! Check your DMs for registration.`
            });
        }
        
        // Enviar DM
        try {
            await member.send({
                content: '**Welcome!** 👋\n\nTo register, type:\n\n```!register```\n\nI will ask 3 questions.'
            });
        } catch (error) {
            console.log(`⚠️ Could not DM ${member.user.tag}`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // SOLO PROCESAR DMs
    if (!message.guild) {
        const userId = message.author.id;
        const userTag = message.author.tag;
        const content = message.content.trim();
        
        console.log(`📩 DM from ${userTag}: "${content}"`);
        
        try {
            // COMANDO !register
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
            
            // SI YA ESTÁ REGISTRANDO
            if (userData.has(userId)) {
                const userInfo = userData.get(userId);
                
                // PASO 1: ALIANZA
                if (userInfo.step === 1) {
                    const answer = content.toUpperCase();
                    const validAlliances = ['FKIT', 'ISL', 'DNT', 'TNT'];
                    
                    if (!validAlliances.includes(answer)) {
                        await message.author.send('❌ **Invalid alliance!**\nType: FKIT, ISL, DNT, or TNT');
                        return;
                    }
                    
                    userInfo.alliance = answer;
                    userInfo.step = 2;
                    userInfo.currentQuestion = 'What is your in-game ID?';
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `✅ **Alliance: ${answer}**\n\n**Question 2/3:**\n**What is your in-game ID?**`
                    });
                }
                
                // PASO 2: GAME ID
                else if (userInfo.step === 2) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ **Invalid ID!**');
                        return;
                    }
                    
                    userInfo.gameId = content;
                    userInfo.step = 3;
                    userInfo.currentQuestion = 'What is your in-game nickname?';
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `✅ **Game ID registered**\n\n**Question 3/3:**\n**What is your in-game nickname?**`
                    });
                }
                
                // PASO 3: NICKNAME (FINAL)
                else if (userInfo.step === 3) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ **Invalid nickname!**');
                        return;
                    }
                    
                    userInfo.nickname = content;
                    
                    console.log(`\n📋 ${userTag} completed registration!`);
                    
                    // ---- 1. ASIGNAR ROL ----
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
                    
                    // ---- 2. INTENTAR GUARDAR EN REGISTROS ----
                    let savedToChannel = false;
                    
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            // Buscar canal de registros - VARIAS OPCIONES
                            let registerChannel = guild.channels.cache.find(ch => 
                                ch.type === 0 && ch.name === 'registers'
                            );
                            
                            if (!registerChannel) {
                                registerChannel = guild.channels.cache.find(ch => 
                                    ch.type === 0 && ch.name.toLowerCase().includes('register')
                                );
                            }
                            
                            if (!registerChannel) {
                                // Si no encuentra, usar el primer canal donde pueda escribir
                                registerChannel = guild.channels.cache.find(ch => 
                                    ch.type === 0 && 
                                    ch.permissionsFor(guild.members.me)?.has('SendMessages')
                                );
                            }
                            
                            if (registerChannel) {
                                console.log(`💾 Attempting to save to #${registerChannel.name}`);
                                
                                // Crear embed SIMPLE
                                const embed = new EmbedBuilder()
                                    .setColor('#00ff00')
                                    .setTitle('📝 NEW REGISTRATION')
                                    .setDescription(`**User:** ${userInfo.discordTag}\n**Alliance:** ${userInfo.alliance}\n**Game ID:** ${userInfo.gameId}\n**Nickname:** ${userInfo.nickname}`)
                                    .setTimestamp();
                                
                                await registerChannel.send({ embeds: [embed] });
                                savedToChannel = true;
                                console.log(`✅ Saved to #${registerChannel.name}`);
                            } else {
                                console.log('❌ No suitable channel found for saving');
                            }
                        }
                    } catch (saveError) {
                        console.error('Save error:', saveError.message);
                    }
                    
                    // ---- 3. ENVIAR CONFIRMACIÓN ----
                    let confirmationMessage = `✅ **REGISTRATION COMPLETE!**\n\n`;
                    confirmationMessage += `**Your information:**\n`;
                    confirmationMessage += `• Alliance: **${userInfo.alliance}** ${roleAssigned ? '✅' : '❌'}\n`;
                    confirmationMessage += `• Game ID: **${userInfo.gameId}**\n`;
                    confirmationMessage += `• Nickname: **${userInfo.nickname}**\n\n`;
                    
                    if (roleAssigned) {
                        confirmationMessage += `🎖️ You received the **${userInfo.alliance}** role!\n`;
                    }
                    
                    if (savedToChannel) {
                        confirmationMessage += `💾 Your registration was saved.\n`;
                    } else {
                        confirmationMessage += `⚠️ Registration NOT saved to channel (contact admin).\n`;
                    }
                    
                    confirmationMessage += `\n🌍 **Translation:** React with flags to translate messages.`;
                    
                    await message.author.send({
                        content: confirmationMessage
                    });
                    
                    // ---- 4. LIMPIAR ----
                    userData.delete(userId);
                    
                    // ---- 5. ANUNCIAR EN BIENVENIDA ----
                    if (roleAssigned) {
                        try {
                            const guild = client.guilds.cache.first();
                            const welcomeChannel = guild.channels.cache.find(ch => 
                                ch.type === 0 && ch.name === '👋-welcome'
                            );
                            if (welcomeChannel) {
                                await welcomeChannel.send({
                                    content: `🎉 <@${userId}> joined the **${userInfo.alliance}** alliance!`
                                });
                            }
                        } catch (e) {
                            // Ignorar
                        }
                    }
                }
                return;
            }
            
            // OTRO MENSAJE EN DM
            await message.author.send({
                content: 'Type `!register` to start registration.'
            });
            
        } catch (error) {
            console.error('DM error:', error.message);
        }
    }
});

// ---- COMANDO SIMPLE PARA PROBAR ----
client.on('messageCreate', async (message) => {
    if (message.content === '!test' && message.guild) {
        await message.reply('Bot is working!');
    }
});

// ---- ERROR HANDLING ----
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// ---- START ----
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
