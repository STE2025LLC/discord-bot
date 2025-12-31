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
            await welcomeChannel.send({
                content: `👋 Welcome <@${member.id}>! Check your DMs for registration.`
            });
        }
        
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

// FUNCIÓN MEJORADA para guardar en "registers" - USANDO TEXTO SIMPLE
async function saveToRegistersChannel(guild, userInfo) {
    console.log(`\n💾 Saving to registers channel...`);
    
    // Buscar canal "registers"
    const registerChannel = guild.channels.cache.find(ch => 
        ch.type === 0 && ch.name === 'registers'
    );
    
    if (!registerChannel) {
        console.log('❌ No "registers" channel found');
        return false;
    }
    
    console.log(`✅ Found: #${registerChannel.name}`);
    
    // Verificar permisos MÍNIMOS
    const botMember = guild.members.cache.get(client.user.id);
    const permissions = registerChannel.permissionsFor(botMember);
    
    if (!permissions.has('ViewChannel') || !permissions.has('SendMessages')) {
        console.log('❌ Bot cannot write to this channel');
        return false;
    }
    
    try {
        // **ENVIAR MENSAJE DE TEXTO SIMPLE** (no embed)
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
        
        console.log(`📤 Sending text message to #${registerChannel.name}...`);
        await registerChannel.send(registerMessage);
        
        console.log(`✅ SUCCESS! Registration saved as TEXT message`);
        return true;
        
    } catch (error) {
        console.error('❌ Error saving to register channel:', error.message);
        
        // Intentar método alternativo: mensaje aún más simple
        try {
            console.log('🔄 Trying alternative method...');
            const simpleMessage = `📝 REGISTRATION: ${userInfo.discordTag} | Alliance: ${userInfo.alliance} | Game ID: ${userInfo.gameId} | Nickname: ${userInfo.nickname} | Date: ${new Date().toLocaleDateString()}`;
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
                    
                    // 2. GUARDAR EN REGISTROS (TEXTO SIMPLE)
                    let savedToChannel = false;
                    
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            savedToChannel = await saveToRegistersChannel(guild, userInfo);
                        }
                    } catch (saveError) {
                        console.error('Save error:', saveError.message);
                    }
                    
                    // 3. CONFIRMACIÓN AL USUARIO
                    let confirmationMessage = `✅ **REGISTRATION COMPLETE!** 🎉\n\n`;
                    confirmationMessage += `**Your information:**\n`;
                    confirmationMessage += `• Alliance: **${userInfo.alliance}** ${roleAssigned ? '✅' : '❌'}\n`;
                    confirmationMessage += `• Game ID: **${userInfo.gameId}**\n`;
                    confirmationMessage += `• Nickname: **${userInfo.nickname}**\n\n`;
                    
                    if (roleAssigned) {
                        confirmationMessage += `🎖️ You received the **${userInfo.alliance}** role!\n`;
                    }
                    
                    if (savedToChannel) {
                        confirmationMessage += `✅ Your registration was saved to server records.\n`;
                    } else {
                        confirmationMessage += `⚠️ Registration NOT saved to records (contact admin).\n`;
                    }
                    
                    confirmationMessage += `\n🌍 **Translation:** React with flags to translate messages.`;
                    
                    await message.author.send({
                        content: confirmationMessage
                    });
                    
                    // 4. LIMPIAR
                    userData.delete(userId);
                    
                    // 5. ANUNCIAR
                    if (roleAssigned) {
                        try {
                            const guild = client.guilds.cache.first();
                            const welcomeChannel = guild.channels.cache.find(ch => 
                                ch.type === 0 && ch.name === '👋-welcome'
                            );
                            if (welcomeChannel) {
                                await welcomeChannel.send({
                                    content: `🎉 <@${userId}> has joined the **${userInfo.alliance}** alliance! Welcome aboard!`
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
                content: 'Type `!register` to start registration.'
            });
            
        } catch (error) {
            console.error('DM error:', error.message);
        }
    }
});

// COMANDO PARA DAR PERMISO "Embed Links" AL BOT
client.on('messageCreate', async (message) => {
    if (message.content === '!fixperms' && message.member?.permissions.has('Administrator')) {
        const guild = message.guild;
        const registerChannel = guild.channels.cache.find(ch => 
            ch.type === 0 && ch.name === 'registers'
        );
        
        if (registerChannel) {
            await message.reply({
                content: `**To fix permissions for #${registerChannel.name}:**\n\n` +
                        `1. Right-click #${registerChannel.name}\n` +
                        `2. Select "Edit Channel"\n` +
                        `3. Go to "Permissions" tab\n` +
                        `4. Add role "Alliance Bot" if not present\n` +
                        `5. Enable these permissions:\n` +
                        `   • ✅ View Channel\n` +
                        `   • ✅ Send Messages\n` +
                        `   • ✅ Embed Links (IMPORTANT!)\n` +
                        `   • ✅ Read Message History\n\n` +
                        `After fixing, test with \`!testregister\``
            });
        }
    }
    
    // COMANDO DE PRUEBA
    if (message.content === '!testregister' && message.member?.permissions.has('Administrator')) {
        const guild = message.guild;
        const registerChannel = guild.channels.cache.find(ch => 
            ch.type === 0 && ch.name === 'registers'
        );
        
        if (registerChannel) {
            try {
                // Probar mensaje de texto simple
                await registerChannel.send('🧪 **TEST MESSAGE** - If you see this, bot can write to this channel.');
                await message.reply('✅ Test message sent to #registers!');
            } catch (error) {
                await message.reply(`❌ Error: ${error.message}`);
            }
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
