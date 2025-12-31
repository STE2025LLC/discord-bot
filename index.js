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
    
    // Mostrar información del servidor
    const guild = client.guilds.cache.first();
    if (guild) {
        console.log(`🏰 Server: ${guild.name}`);
        console.log('📚 Canales disponibles:');
        
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
        
        // Canal de bienvenida
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

// FUNCIÓN PARA ENCONTRAR Y GUARDAR EN EL CANAL "registers"
async function saveToRegistersChannel(guild, userInfo) {
    console.log(`\n💾 Looking for "registers" channel in ${guild.name}...`);
    
    // 1. Buscar por nombre EXACTO "registers"
    let registerChannel = guild.channels.cache.find(ch => 
        ch.type === 0 && ch.name === 'registers'
    );
    
    // 2. Si no encuentra, buscar por ID específico (el que tienes)
    if (!registerChannel) {
        registerChannel = guild.channels.cache.get('1455738662615781411');
        if (registerChannel) {
            console.log(`✅ Found registers channel by ID: #${registerChannel.name}`);
        }
    }
    
    // 3. Si aún no, buscar cualquier canal con "register" en el nombre
    if (!registerChannel) {
        registerChannel = guild.channels.cache.find(ch => 
            ch.type === 0 && ch.name.toLowerCase().includes('register')
        );
        if (registerChannel) {
            console.log(`✅ Found similar channel: #${registerChannel.name}`);
        }
    }
    
    // 4. Si NO encuentra ningún canal de registros
    if (!registerChannel) {
        console.log('❌ No "registers" channel found! Available channels:');
        guild.channels.cache.forEach(ch => {
            if (ch.type === 0) {
                console.log(`   - #${ch.name} (${ch.id})`);
            }
        });
        return false;
    }
    
    console.log(`✅ Using channel: #${registerChannel.name} (${registerChannel.id})`);
    
    // Verificar permisos del bot
    const botMember = guild.members.cache.get(client.user.id);
    if (!botMember) {
        console.log('❌ Bot member not found in guild');
        return false;
    }
    
    const permissions = registerChannel.permissionsFor(botMember);
    console.log(`🔐 Bot permissions in #${registerChannel.name}:`);
    console.log(`   - View Channel: ${permissions.has('ViewChannel') ? '✅' : '❌'}`);
    console.log(`   - Send Messages: ${permissions.has('SendMessages') ? '✅' : '❌'}`);
    console.log(`   - Embed Links: ${permissions.has('EmbedLinks') ? '✅' : '❌'}`);
    
    if (!permissions.has('ViewChannel') || !permissions.has('SendMessages')) {
        console.log('❌ Bot lacks permissions to write to this channel!');
        return false;
    }
    
    try {
        // Crear embed para el registro
        const registerEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('📝 NEW REGISTRATION')
            .setDescription(`A new player has completed registration.`)
            .addFields(
                { name: '👤 Discord User', value: `${userInfo.discordTag}`, inline: true },
                { name: '🆔 Discord ID', value: `\`${userInfo.discordId}\``, inline: true },
                { name: '🛡️ Alliance', value: `**${userInfo.alliance}**`, inline: true },
                { name: '🎮 Game ID', value: `\`${userInfo.gameId}\``, inline: true },
                { name: '🏷️ In-Game Nickname', value: `\`${userInfo.nickname}\``, inline: true },
                { name: '📅 Registration Date', value: new Date().toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                }), inline: false }
            )
            .setFooter({ text: 'Alliance Registration System' })
            .setTimestamp();
        
        console.log(`📤 Sending registration to #${registerChannel.name}...`);
        await registerChannel.send({ embeds: [registerEmbed] });
        
        console.log(`✅ SUCCESS! Registration saved to #${registerChannel.name}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error saving to register channel:', error.message);
        return false;
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // SOLO PROCESAR DMs
    if (!message.guild) {
        const userId = message.author.id;
        const userTag = message.author.tag;
        const content = message.content.trim();
        
        console.log(`\n📩 DM from ${userTag}: "${content}"`);
        
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
                    console.log(`   Alliance: ${userInfo.alliance}`);
                    console.log(`   Game ID: ${userInfo.gameId}`);
                    console.log(`   Nickname: ${userInfo.nickname}`);
                    
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
                                } else {
                                    console.log(`❌ Role ${userInfo.alliance} not found in server`);
                                }
                            }
                        }
                    } catch (roleError) {
                        console.error('Role error:', roleError.message);
                    }
                    
                    // ---- 2. GUARDAR EN CANAL "registers" ----
                    let savedToChannel = false;
                    
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            savedToChannel = await saveToRegistersChannel(guild, userInfo);
                        }
                    } catch (saveError) {
                        console.error('Save error:', saveError.message);
                    }
                    
                    // ---- 3. ENVIAR CONFIRMACIÓN AL USUARIO ----
                    let confirmationMessage = `✅ **REGISTRATION COMPLETE!** 🎉\n\n`;
                    confirmationMessage += `**Your information:**\n`;
                    confirmationMessage += `• Alliance: **${userInfo.alliance}** ${roleAssigned ? '✅' : '❌'}\n`;
                    confirmationMessage += `• Game ID: **${userInfo.gameId}**\n`;
                    confirmationMessage += `• Nickname: **${userInfo.nickname}**\n\n`;
                    
                    if (roleAssigned) {
                        confirmationMessage += `🎖️ You received the **${userInfo.alliance}** role!\n`;
                    }
                    
                    if (savedToChannel) {
                        confirmationMessage += `✅ Your registration was saved to the server records.\n`;
                    } else {
                        confirmationMessage += `⚠️ Registration NOT saved to records (contact admin).\n`;
                    }
                    
                    confirmationMessage += `\n🌍 **Translation:** React with flags to translate messages.`;
                    
                    await message.author.send({
                        content: confirmationMessage
                    });
                    
                    // ---- 4. LIMPIAR DATOS ----
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
            
            // OTRO MENSAJE EN DM
            await message.author.send({
                content: 'Type `!register` to start registration.'
            });
            
        } catch (error) {
            console.error('DM error:', error.message);
        }
    }
});

// COMANDO PARA VERIFICAR EL CANAL "registers"
client.on('messageCreate', async (message) => {
    if (message.content === '!checkregisters' && message.guild) {
        console.log('\n🔍 Checking registers channel...');
        
        const guild = message.guild;
        const registerChannel = guild.channels.cache.find(ch => 
            ch.type === 0 && ch.name === 'registers'
        );
        
        if (registerChannel) {
            const botMember = guild.members.cache.get(client.user.id);
            const permissions = registerChannel.permissionsFor(botMember);
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('✅ REGISTERS CHANNEL FOUND')
                .setDescription(`Channel: #${registerChannel.name}\nID: ${registerChannel.id}`)
                .addFields(
                    { name: '📝 Bot Permissions', value: 
                        `• View Channel: ${permissions.has('ViewChannel') ? '✅' : '❌'}\n` +
                        `• Send Messages: ${permissions.has('SendMessages') ? '✅' : '❌'}\n` +
                        `• Embed Links: ${permissions.has('EmbedLinks') ? '✅' : '❌'}`, 
                      inline: false }
                );
            
            await message.reply({ embeds: [embed] });
            console.log(`✅ Channel found: #${registerChannel.name}`);
        } else {
            await message.reply('❌ No channel named "registers" found!');
            console.log('❌ No registers channel found');
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
