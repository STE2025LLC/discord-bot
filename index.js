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

// CONFIGURACIÓN - PON TUS IDs AQUÍ
const CONFIG = {
    WELCOME_CHANNEL_ID: '1455691192502190120', // #👋-welcome
    REGISTERS_CHANNEL_ID: '1455738662615781411', // #registers
    GUILD_ID: '1455659994232913986' // ID de tu servidor (opcional)
};

// Roles que se asignarán (deben existir en tu servidor)
const ALLIANCE_ROLES = {
    'FKIT': 'FKIT',
    'ISL': 'ISL', 
    'DNT': 'DNT',
    'TNT': 'TNT'
};

client.once('ready', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log('🚀 Registration bot is ready!');
    console.log('📋 Bot will:');
    console.log('   1. Welcome new members in #👋-welcome');
    console.log('   2. Process !register in DMs');
    console.log('   3. Save responses to #registers');
    console.log('   4. Assign alliance roles');
});

client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`👤 New member: ${member.user.tag}`);
        
        const welcomeChannel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
        if (!welcomeChannel) {
            console.log('❌ Welcome channel not found');
            return;
        }

        // ENVIAR MENSAJE EN CANAL DE BIENVENIDA
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('👋 WELCOME TO THE SERVER!')
            .setDescription(`Welcome <@${member.id}>!`)
            .addFields(
                { 
                    name: '📝 **REGISTRATION REQUIRED**', 
                    value: '**Please check your Direct Messages (DMs)!**\n\nI\'ve sent you a DM with registration instructions.\n\nIf you don\'t see my message:' 
                },
                { 
                    name: '💡 **How to register:**', 
                    value: '1. Click my name "Alliance Bot"\n2. Click "Message"\n3. Type `!register`\n4. Follow the instructions' 
                },
                { 
                    name: '✅ **After registration:**', 
                    value: '• Your alliance role will be assigned\n• You\'ll get access to all channels\n• Your info will be recorded' 
                }
            )
            .setFooter({ text: 'Complete registration within 24 hours' })
            .setTimestamp();

        await welcomeChannel.send({ 
            content: `<@${member.id}>`,
            embeds: [welcomeEmbed] 
        });
        
        console.log(`✅ Welcome message posted for ${member.user.tag}`);
        
        // ENVIAR DM AL USUARIO
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#7289DA')
                .setTitle('📋 REGISTRATION REQUIRED')
                .setDescription('Hello! To complete your registration and get access to all channels, please type:')
                .addFields(
                    { name: '🎮 **Start Registration**', value: '```!register```' },
                    { name: '📝 **You will be asked:**', value: '1. Your Alliance (FKIT/ISL/DNT/TNT)\n2. Your in-game ID\n3. Your in-game nickname' },
                    { name: '✅ **Benefits:**', value: '• Get your alliance role\n• Access all channels\n• Translation feature enabled' }
                )
                .setFooter({ text: 'Reply to this message with !register' });
            
            await member.send({ embeds: [dmEmbed] });
            console.log(`📨 Registration DM sent to ${member.user.tag}`);
            
        } catch (dmError) {
            console.log(`⚠️ Could not send DM to ${member.user.tag}, they may have DMs disabled`);
            await welcomeChannel.send(`<@${member.id}> I couldn't send you a DM. Please enable DMs from server members and type \`!register\` in our DMs.`);
        }

    } catch (error) {
        console.error('❌ Error in guildMemberAdd:', error.message);
    }
});

// PROCESAR DMs
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // SOLO PROCESAR DMs
    if (!message.guild) {
        const userId = message.author.id;
        const userTag = message.author.tag;
        const content = message.content.trim();
        
        console.log(`📩 DM from ${userTag}: "${content.substring(0, 50)}"`);
        
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
                    currentQuestion: 'What is your alliance? (FKIT, ISL, DNT, or TNT)',
                    alliance: '',
                    gameId: '',
                    nickname: '',
                    discordTag: userTag,
                    discordId: userId,
                    startTime: new Date()
                });
                
                await message.author.send({
                    content: '**✅ REGISTRATION STARTED!**\n\n**Question 1/3:**\n**What is your alliance?**\n\nPlease type exactly: **FKIT**, **ISL**, **DNT**, or **TNT**'
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
                        await message.author.send('❌ **Invalid alliance!**\nPlease type exactly: **FKIT**, **ISL**, **DNT**, or **TNT**');
                        return;
                    }
                    
                    userInfo.alliance = answer;
                    userInfo.step = 2;
                    userInfo.currentQuestion = 'What is your in-game ID?';
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `✅ **Alliance registered: ${answer}**\n\n**Question 2/3:**\n**What is your in-game ID?**\n\n(Your game account ID/number)`
                    });
                    
                    console.log(`✅ ${userTag} - Alliance: ${answer}`);
                }
                
                // PASO 2: GAME ID
                else if (userInfo.step === 2) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ **Invalid ID!**\nPlease provide a valid in-game ID');
                        return;
                    }
                    
                    userInfo.gameId = content;
                    userInfo.step = 3;
                    userInfo.currentQuestion = 'What is your in-game nickname?';
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `✅ **Game ID registered**\n\n**Question 3/3:**\n**What is your in-game nickname?**\n\n(Your exact in-game name)`
                    });
                    
                    console.log(`✅ ${userTag} - Game ID: ${content}`);
                }
                
                // PASO 3: NICKNAME (FINAL)
                else if (userInfo.step === 3) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ **Invalid nickname!**\nPlease provide a valid in-game nickname');
                        return;
                    }
                    
                    userInfo.nickname = content;
                    userInfo.endTime = new Date();
                    
                    console.log(`📋 ${userTag} completed registration`);
                    
                    // ---- ASIGNAR ROL ----
                    let roleAssigned = false;
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            const member = guild.members.cache.get(userId);
                            if (member) {
                                const roleName = ALLIANCE_ROLES[userInfo.alliance];
                                const role = guild.roles.cache.find(r => r.name === roleName);
                                
                                if (role) {
                                    await member.roles.add(role);
                                    roleAssigned = true;
                                    console.log(`🎖️ Role ${roleName} assigned to ${userTag}`);
                                } else {
                                    console.log(`❌ Role ${roleName} not found in server`);
                                }
                            }
                        }
                    } catch (roleError) {
                        console.error('❌ Error assigning role:', roleError.message);
                    }
                    
                    // ---- GUARDAR EN #registers ----
                    let registerSaved = false;
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            const registerChannel = guild.channels.cache.get(CONFIG.REGISTERS_CHANNEL_ID);
                            
                            if (registerChannel) {
                                const registerEmbed = new EmbedBuilder()
                                    .setColor('#00ff00')
                                    .setTitle('📝 NEW REGISTRATION')
                                    .setThumbnail(message.author.displayAvatarURL())
                                    .addFields(
                                        { name: '👤 Discord User', value: `**${userInfo.discordTag}**\n\`${userInfo.discordId}\``, inline: false },
                                        { name: '🛡️ Alliance', value: `**${userInfo.alliance}** ${roleAssigned ? '✅' : '❌'}`, inline: true },
                                        { name: '🎮 Game ID', value: `\`${userInfo.gameId}\``, inline: true },
                                        { name: '🏷️ Nickname', value: `\`${userInfo.nickname}\``, inline: true }
                                    )
                                    .addFields(
                                        { name: '📅 Registration Date', value: userInfo.endTime.toLocaleString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }), inline: false }
                                    )
                                    .setFooter({ text: `Registration System • ${roleAssigned ? 'Role assigned' : 'Role assignment failed'}` })
                                    .setTimestamp();
                                
                                await registerChannel.send({ embeds: [registerEmbed] });
                                registerSaved = true;
                                console.log(`💾 Registration saved to #${registerChannel.name}`);
                            } else {
                                console.log('❌ Register channel not found');
                            }
                        }
                    } catch (saveError) {
                        console.error('❌ Error saving to register channel:', saveError.message);
                    }
                    
                    // ---- ENVIAR CONFIRMACIÓN FINAL ----
                    const completionEmbed = new EmbedBuilder()
                        .setColor('#7289DA')
                        .setTitle('✅ REGISTRATION COMPLETE!')
                        .setDescription(`**Thank you for registering, ${message.author.username}!** 🎉`)
                        .addFields(
                            { 
                                name: '📋 Your Information', 
                                value: `• **Alliance:** ${userInfo.alliance} ${roleAssigned ? '✅' : '❌'}\n• **Game ID:** ${userInfo.gameId}\n• **Nickname:** ${userInfo.nickname}`,
                                inline: false 
                            }
                        );
                    
                    if (roleAssigned) {
                        completionEmbed.addFields({
                            name: '🎖️ Role Assigned',
                            value: `You've been given the **${userInfo.alliance}** role!\nYou now have access to all channels.`,
                            inline: false
                        });
                    } else {
                        completionEmbed.addFields({
                            name: '⚠️ Role Assignment',
                            value: 'Your alliance role could not be assigned automatically.\nPlease contact an administrator.',
                            inline: false
                        });
                    }
                    
                    completionEmbed.addFields({
                        name: '🌍 Translation Feature',
                        value: 'You can translate any message by reacting with flag emojis:\n🇺🇸 English | 🇪🇸 Spanish | 🇫🇷 French | 🇩🇪 German\n🇮🇹 Italian | 🇵🇹 Portuguese',
                        inline: false
                    });
                    
                    completionEmbed.setFooter({ text: 'Registration saved to server records' })
                        .setTimestamp();
                    
                    await message.author.send({ embeds: [completionEmbed] });
                    console.log(`🎉 Final confirmation sent to ${userTag}`);
                    
                    // LIMPIAR DATOS
                    userData.delete(userId);
                    
                    // ENVIAR MENSAJE EN CANAL DE BIENVENIDA SI SE ASIGNÓ ROL
                    if (roleAssigned) {
                        try {
                            const guild = client.guilds.cache.first();
                            if (guild) {
                                const welcomeChannel = guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
                                if (welcomeChannel) {
                                    await welcomeChannel.send({
                                        content: `🎉 <@${userId}> has completed registration and joined the **${userInfo.alliance}** alliance! Welcome aboard!`
                                    });
                                }
                            }
                        } catch (channelError) {
                            // Ignorar error de canal
                        }
                    }
                }
                return;
            }
            
            // MENSAJE EN DM PERO NO HA INICIADO
            await message.author.send({
                content: '👋 **Hello!**\n\nTo start registration, please type:\n\n```!register```\n\nI will guide you through 3 simple questions.'
            });
            
        } catch (error) {
            console.error(`❌ Error in DM from ${userTag}:`, error.message);
            try {
                await message.author.send('❌ An error occurred. Please try again or contact an administrator.');
            } catch (e) {
                // Ignorar
            }
        }
    }
});

// COMANDO DE ADMIN EN SERVIDOR
client.on('messageCreate', async (message) => {
    if (message.content === '!regstatus' && message.member?.permissions.has('Administrator')) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🤖 BOT STATUS')
            .addFields(
                { name: 'Active Registrations', value: `${userData.size} users`, inline: true },
                { name: 'Uptime', value: `${Math.floor(process.uptime() / 60)} min`, inline: true }
            );
        
        await message.reply({ embeds: [embed] });
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
    .then(() => console.log('✅ Bot started successfully'))
    .catch(error => {
        console.error('❌ Login failed:', error.message);
        process.exit(1);
    });
