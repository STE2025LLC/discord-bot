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

// CONFIGURACIÓN - VERIFICA ESTOS IDs
const CONFIG = {
    WELCOME_CHANNEL_ID: '1455691192502190120', // #👋-welcome
    REGISTERS_CHANNEL_ID: '1455738662615781411', // #registers - ¡VERIFICA ESTE ID!
    GUILD_ID: '1455659994232913986' // ID de tu servidor
};

// Depuración: mostrar info al iniciar
client.once('ready', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log(`🆔 Bot ID: ${client.user.id}`);
    console.log('🚀 Registration bot is ready!');
    console.log('\n📋 CONFIGURATION:');
    console.log(`   Welcome Channel ID: ${CONFIG.WELCOME_CHANNEL_ID}`);
    console.log(`   Registers Channel ID: ${CONFIG.REGISTERS_CHANNEL_ID}`);
    console.log(`   Guild ID: ${CONFIG.GUILD_ID}`);
    
    // Verificar que podemos encontrar los canales
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID) || client.guilds.cache.first();
    if (guild) {
        console.log(`\n🏰 Server: ${guild.name} (${guild.id})`);
        console.log('📚 Available text channels:');
        
        guild.channels.cache.forEach(channel => {
            if (channel.type === 0) { // Tipo 0 = texto
                console.log(`   #${channel.name} (${channel.id})`);
            }
        });
        
        // Verificar específicamente el canal de registros
        const registerChannel = guild.channels.cache.get(CONFIG.REGISTERS_CHANNEL_ID);
        if (registerChannel) {
            console.log(`\n✅ FOUND registers channel: #${registerChannel.name} (${registerChannel.id})`);
            
            // Verificar permisos del bot en ese canal
            const botMember = guild.members.cache.get(client.user.id);
            if (botMember) {
                const perms = registerChannel.permissionsFor(botMember);
                console.log(`🔐 Bot permissions in #${registerChannel.name}:`);
                console.log(`   - View Channel: ${perms.has('ViewChannel') ? '✅' : '❌'}`);
                console.log(`   - Send Messages: ${perms.has('SendMessages') ? '✅' : '❌'}`);
                console.log(`   - Read Message History: ${perms.has('ReadMessageHistory') ? '✅' : '❌'}`);
                
                if (!perms.has('ViewChannel') || !perms.has('SendMessages')) {
                    console.log('🚨 PROBLEM: Bot lacks permissions in registers channel!');
                }
            }
        } else {
            console.log(`\n❌ ERROR: Registers channel NOT FOUND with ID: ${CONFIG.REGISTERS_CHANNEL_ID}`);
            console.log('   Available channel IDs:');
            guild.channels.cache.forEach(ch => {
                if (ch.type === 0 && ch.name.toLowerCase().includes('register')) {
                    console.log(`   - #${ch.name}: ${ch.id}`);
                }
            });
        }
    }
    
    console.log('\n📊 Bot will:');
    console.log('   1. Welcome new members');
    console.log('   2. Process !register in DMs');
    console.log('   3. Save to #registers channel');
    console.log('   4. Assign alliance roles');
});

client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`\n👤 NEW MEMBER: ${member.user.tag} (${member.id})`);
        
        const welcomeChannel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
        if (!welcomeChannel) {
            console.log('❌ Welcome channel not found');
            return;
        }

        // Mensaje en canal de bienvenida
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('👋 WELCOME!')
            .setDescription(`Welcome <@${member.id}>!`)
            .addFields(
                { 
                    name: '📝 **CHECK YOUR DMs!**', 
                    value: 'I\'ve sent you registration instructions in Direct Messages.\n\nIf you don\'t see my message:' 
                },
                { 
                    name: '💡 **How to register:**', 
                    value: '1. Click my name "Alliance Bot"\n2. Click "Message"\n3. Type `!register`\n4. Answer 3 questions' 
                }
            )
            .setFooter({ text: 'Complete registration to get your alliance role' })
            .setTimestamp();

        await welcomeChannel.send({ 
            content: `<@${member.id}>`,
            embeds: [welcomeEmbed] 
        });
        
        console.log(`✅ Welcome message sent in #${welcomeChannel.name}`);
        
        // Enviar DM
        try {
            await member.send({
                content: '👋 **Welcome!**\n\nTo register and get your alliance role, please type:\n\n```!register```\n\nI will ask you 3 simple questions.'
            });
            console.log(`📨 Registration DM sent to ${member.user.tag}`);
        } catch (dmError) {
            console.log(`⚠️ Could not send DM to ${member.user.tag}`);
        }

    } catch (error) {
        console.error('❌ Error in guildMemberAdd:', error.message);
    }
});

// PROCESAR DMs
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // SOLO DMs
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
                    await message.author.send(`You're already registering! Please answer:\n\n**${data.currentQuestion}**`);
                    return;
                }
                
                // INICIAR REGISTRO
                userData.set(userId, {
                    step: 1,
                    currentQuestion: 'What is your alliance?',
                    alliance: '',
                    gameId: '',
                    nickname: '',
                    discordTag: userTag,
                    discordId: userId,
                    startTime: new Date()
                });
                
                await message.author.send({
                    content: '**✅ REGISTRATION STARTED!**\n\n**Question 1/3:**\n**What is your alliance?**\n\nType: **FKIT**, **ISL**, **DNT**, or **TNT**'
                });
                
                console.log(`📝 Registration started for ${userTag}`);
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
                    
                    console.log(`✅ ${userTag} - Alliance: ${answer}`);
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
                    
                    console.log(`✅ ${userTag} - Game ID: ${content}`);
                }
                
                // PASO 3: NICKNAME (FINAL)
                else if (userInfo.step === 3) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ **Invalid nickname!**');
                        return;
                    }
                    
                    userInfo.nickname = content;
                    userInfo.endTime = new Date();
                    
                    console.log(`📋 ${userTag} completed registration`);
                    console.log(`   Alliance: ${userInfo.alliance}`);
                    console.log(`   Game ID: ${userInfo.gameId}`);
                    console.log(`   Nickname: ${userInfo.nickname}`);
                    
                    // ---- 1. ASIGNAR ROL ----
                    let roleAssigned = false;
                    try {
                        const guild = client.guilds.cache.get(CONFIG.GUILD_ID) || client.guilds.cache.first();
                        if (guild) {
                            const member = guild.members.cache.get(userId);
                            if (member) {
                                const role = guild.roles.cache.find(r => r.name === userInfo.alliance);
                                
                                if (role) {
                                    await member.roles.add(role);
                                    roleAssigned = true;
                                    console.log(`🎖️ Role ${userInfo.alliance} assigned to ${userTag}`);
                                } else {
                                    console.log(`❌ Role ${userInfo.alliance} not found in server`);
                                }
                            } else {
                                console.log(`❌ Member ${userTag} not found in guild`);
                            }
                        }
                    } catch (roleError) {
                        console.error('❌ Error assigning role:', roleError.message);
                    }
                    
                    // ---- 2. GUARDAR EN #registers ----
                    let registerSaved = false;
                    let registerError = null;
                    
                    try {
                        const guild = client.guilds.cache.get(CONFIG.GUILD_ID) || client.guilds.cache.first();
                        if (guild) {
                            console.log(`🔍 Looking for registers channel with ID: ${CONFIG.REGISTERS_CHANNEL_ID}`);
                            
                            const registerChannel = guild.channels.cache.get(CONFIG.REGISTERS_CHANNEL_ID);
                            
                            if (registerChannel) {
                                console.log(`✅ Found channel: #${registerChannel.name} (${registerChannel.id})`);
                                
                                // Verificar permisos
                                const botMember = guild.members.cache.get(client.user.id);
                                if (botMember) {
                                    const perms = registerChannel.permissionsFor(botMember);
                                    console.log(`🔐 Permissions check:`);
                                    console.log(`   - View Channel: ${perms.has('ViewChannel') ? '✅' : '❌'}`);
                                    console.log(`   - Send Messages: ${perms.has('SendMessages') ? '✅' : '❌'}`);
                                    
                                    if (!perms.has('ViewChannel') || !perms.has('SendMessages')) {
                                        console.log('🚨 Bot cannot write to registers channel!');
                                    }
                                }
                                
                                // Crear embed
                                const registerEmbed = new EmbedBuilder()
                                    .setColor('#00ff00')
                                    .setTitle('📝 NEW REGISTRATION')
                                    .setThumbnail(message.author.displayAvatarURL())
                                    .addFields(
                                        { name: '👤 Discord User', value: `${userInfo.discordTag}\n\`${userInfo.discordId}\``, inline: false },
                                        { name: '🛡️ Alliance', value: `**${userInfo.alliance}**`, inline: true },
                                        { name: '🎮 Game ID', value: `\`${userInfo.gameId}\``, inline: true },
                                        { name: '🏷️ Nickname', value: `\`${userInfo.nickname}\``, inline: true }
                                    )
                                    .addFields(
                                        { name: '📅 Date', value: userInfo.endTime.toLocaleString('en-US'), inline: false },
                                        { name: '🎖️ Role Assigned', value: roleAssigned ? '✅ Yes' : '❌ No', inline: true }
                                    )
                                    .setFooter({ text: 'Registration System' })
                                    .setTimestamp();
                                
                                // Intentar enviar
                                console.log(`💾 Attempting to save to #${registerChannel.name}...`);
                                const sentMessage = await registerChannel.send({ embeds: [registerEmbed] });
                                registerSaved = true;
                                console.log(`✅ SUCCESS: Registration saved to #${registerChannel.name}`);
                                console.log(`   Message ID: ${sentMessage.id}`);
                                
                            } else {
                                registerError = 'Channel not found';
                                console.log(`❌ ERROR: Register channel not found with ID: ${CONFIG.REGISTERS_CHANNEL_ID}`);
                                console.log('   Available channels:');
                                guild.channels.cache.forEach(ch => {
                                    if (ch.type === 0) console.log(`   - #${ch.name}: ${ch.id}`);
                                });
                            }
                        } else {
                            registerError = 'Guild not found';
                            console.log('❌ ERROR: Guild not found');
                        }
                    } catch (saveError) {
                        registerError = saveError.message;
                        console.error('❌ ERROR saving to register channel:', saveError.message);
                        console.error('   Error details:', saveError);
                    }
                    
                    // ---- 3. ENVIAR CONFIRMACIÓN AL USUARIO ----
                    const completionEmbed = new EmbedBuilder()
                        .setColor('#7289DA')
                        .setTitle('✅ REGISTRATION COMPLETE!')
                        .setDescription(`**Thank you for registering!** 🎉`)
                        .addFields(
                            { name: '📋 Your Information', value: `• Alliance: **${userInfo.alliance}**\n• Game ID: **${userInfo.gameId}**\n• Nickname: **${userInfo.nickname}**`, inline: false }
                        );
                    
                    if (roleAssigned) {
                        completionEmbed.addFields({
                            name: '🎖️ Role Assigned',
                            value: `You received the **${userInfo.alliance}** role!`,
                            inline: false
                        });
                    }
                    
                    if (registerSaved) {
                        completionEmbed.addFields({
                            name: '💾 Registration Saved',
                            value: 'Your information has been recorded.',
                            inline: false
                        });
                    } else {
                        completionEmbed.addFields({
                            name: '⚠️ Registration Not Saved',
                            value: `Could not save to records: ${registerError || 'Unknown error'}`,
                            inline: false
                        });
                    }
                    
                    completionEmbed.addFields({
                        name: '🌍 Translation',
                        value: 'React to messages with flags to translate.',
                        inline: false
                    });
                    
                    await message.author.send({ embeds: [completionEmbed] });
                    console.log(`🎉 Final confirmation sent to ${userTag}`);
                    
                    // ---- 4. LIMPIAR DATOS ----
                    userData.delete(userId);
                    
                    // ---- 5. ANUNCIAR EN BIENVENIDA SI SE ASIGNÓ ROL ----
                    if (roleAssigned) {
                        try {
                            const guild = client.guilds.cache.get(CONFIG.GUILD_ID) || client.guilds.cache.first();
                            if (guild) {
                                const welcomeChannel = guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
                                if (welcomeChannel) {
                                    await welcomeChannel.send({
                                        content: `🎉 <@${userId}> has joined the **${userInfo.alliance}** alliance! Welcome!`
                                    });
                                }
                            }
                        } catch (e) {
                            // Ignorar
                        }
                    }
                }
                return;
            }
            
            // MENSAJE EN DM SIN REGISTRO
            await message.author.send({
                content: 'Type `!register` to start registration.'
            });
            
        } catch (error) {
            console.error(`❌ Error in DM from ${userTag}:`, error.message);
        }
    }
});

// COMANDO DE DEBUG
client.on('messageCreate', async (message) => {
    if (message.content === '!debug' && message.member?.permissions.has('Administrator')) {
        const guild = message.guild;
        const registerChannel = guild.channels.cache.get(CONFIG.REGISTERS_CHANNEL_ID);
        
        const debugEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🔧 DEBUG INFO')
            .addFields(
                { name: 'Registers Channel', value: registerChannel ? `✅ #${registerChannel.name} (${registerChannel.id})` : '❌ Not found', inline: false },
                { name: 'Config ID', value: CONFIG.REGISTERS_CHANNEL_ID, inline: true },
                { name: 'Active Registrations', value: `${userData.size}`, inline: true }
            );
        
        if (registerChannel) {
            const perms = registerChannel.permissionsFor(guild.members.me);
            debugEmbed.addFields(
                { name: 'Bot Permissions', value: `View: ${perms.has('ViewChannel') ? '✅' : '❌'}\nSend: ${perms.has('SendMessages') ? '✅' : '❌'}`, inline: true }
            );
        }
        
        await message.reply({ embeds: [debugEmbed] });
    }
});

// MANEJO DE ERRORES
client.on('error', error => console.error('Client error:', error));
process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));

// INICIAR BOT
if (!token) {
    console.error('❌ ERROR: No TOKEN found');
    process.exit(1);
}

client.login(token)
    .then(() => console.log('✅ Bot login successful'))
    .catch(error => {
        console.error('❌ Login failed:', error.message);
        process.exit(1);
    });
