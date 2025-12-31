const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const token = process.env.TOKEN;
const userData = new Map(); // {userId: {step, alliance, gameId, nickname, discordTag}}

// CONFIGURACIÓN - USA TUS IDs
const CONFIG = {
    WELCOME_CHANNEL_ID: '1455691192502190120', // #👋-welcome
    REGISTERS_CHANNEL_ID: '1455738662615781411' // #registers
};

client.once('ready', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log('🚀 Registration bot is ready!');
    console.log(`📌 Welcome Channel: ${CONFIG.WELCOME_CHANNEL_ID}`);
    console.log(`📌 Registers Channel: ${CONFIG.REGISTERS_CHANNEL_ID}`);
    console.log(`🤖 Bot ID: ${client.user.id}`);
});

client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`\n👤 NEW MEMBER: ${member.user.tag} (${member.id})`);
        
        const welcomeChannel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
        if (!welcomeChannel) {
            console.log('❌ Welcome channel not found by ID, searching by name...');
            const found = member.guild.channels.cache.find(ch => 
                ch.type === 0 && ch.name.includes('welcome')
            );
            if (found) {
                console.log(`✅ Found channel: #${found.name}`);
            }
            return;
        }

        console.log(`✅ Sending welcome to #${welcomeChannel.name}`);
        
        // ENVIAR MENSAJE DIRECTO AL USUARIO TAMBIÉN
        try {
            await member.send(`👋 **Welcome to the server!**\n\nTo complete your registration and access all channels, please reply to this message with:\n\n\`\`\`!register\`\`\`\n\nI will ask you 3 simple questions about your game account.`);
            console.log(`📨 DM sent to ${member.user.tag}`);
        } catch (dmError) {
            console.log(`⚠️ Could not send DM to ${member.user.tag}, will use channel only`);
        }
        
        // MENSAJE EN CANAL DE BIENVENIDA
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎮 WELCOME NEW PLAYER!')
            .setDescription(`Welcome <@${member.id}>! 👋`)
            .addFields(
                { 
                    name: '📝 **REGISTRATION REQUIRED**', 
                    value: 'To access all channels, please complete registration:\n\n**1.** Send me a **Direct Message (DM)**\n**2.** Type: `!register`\n**3.** Answer 3 simple questions' 
                },
                { 
                    name: '❓ **Need help?**', 
                    value: '1. Click my name "Alliance Bot"\n2. Click "Message"\n3. Type `!register`\n4. Follow instructions' 
                }
            )
            .setFooter({ text: 'Registration System • You have 24 hours to register' })
            .setTimestamp();

        await welcomeChannel.send({ 
            content: `<@${member.id}>`,
            embeds: [embed] 
        });
        
        console.log(`✅ Welcome message posted in #${welcomeChannel.name}`);

    } catch (error) {
        console.error('❌ Error in guildMemberAdd:', error.message);
    }
});

// ---- PROCESAR TODOS LOS MENSAJES ----
client.on('messageCreate', async (message) => {
    // IGNORAR MENSAJES DE BOTS
    if (message.author.bot) return;
    
    const userId = message.author.id;
    const userTag = message.author.tag;
    const content = message.content.trim();
    
    console.log(`\n📩 Message from ${userTag}: "${content.substring(0, 50)}..."`);
    console.log(`   Channel: ${message.guild ? `#${message.channel.name}` : 'DM'}`);
    
    // ---- PROCESAR DMs ----
    if (!message.guild) {
        console.log(`   📨 This is a DM from ${userTag}`);
        
        try {
            // COMANDO !register
            if (content.toLowerCase() === '!register') {
                console.log(`   🚀 ${userTag} started registration`);
                
                // Verificar si ya está en proceso
                if (userData.has(userId)) {
                    const data = userData.get(userId);
                    await message.author.send(`You're already registering! Please answer:\n\n**${data.currentQuestion}**`);
                    return;
                }
                
                // INICIAR NUEVO REGISTRO
                userData.set(userId, {
                    step: 1,
                    currentQuestion: 'What is your alliance? (Type: FKIT, ISL, DNT, or TNT)',
                    alliance: '',
                    gameId: '',
                    nickname: '',
                    discordTag: userTag,
                    discordId: userId,
                    startTime: new Date().toISOString()
                });
                
                await message.author.send({
                    content: `**✅ REGISTRATION STARTED!**\n\n**Question 1 of 3:**\n**What is your alliance?**\n\nPlease type exactly one of these:\n\`FKIT\` • \`ISL\` • \`DNT\` • \`TNT\``
                });
                
                console.log(`   ✅ Sent question 1 to ${userTag}`);
                return;
            }
            
            // SI YA ESTÁ REGISTRANDO
            if (userData.has(userId)) {
                const userInfo = userData.get(userId);
                console.log(`   📝 ${userTag} is at step ${userInfo.step}`);
                
                // PASO 1: PREGUNTAR ALIANZA
                if (userInfo.step === 1) {
                    const answer = content.toUpperCase();
                    const validAlliances = ['FKIT', 'ISL', 'DNT', 'TNT'];
                    
                    if (!validAlliances.includes(answer)) {
                        await message.author.send(`❌ **Invalid alliance!**\n\nPlease type exactly one of these:\n\`FKIT\` • \`ISL\` • \`DNT\` • \`TNT\`\n\n**Your answer:** ${content}`);
                        return;
                    }
                    
                    // GUARDAR ALIANZA
                    userInfo.alliance = answer;
                    userInfo.step = 2;
                    userInfo.currentQuestion = 'What is your in-game ID?';
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `✅ **Alliance registered: ${answer}**\n\n**Question 2 of 3:**\n**What is your in-game ID?**\n\n(Your game account ID/number)`
                    });
                    
                    console.log(`   ✅ ${userTag} - Alliance: ${answer}`);
                }
                
                // PASO 2: PREGUNTAR GAME ID
                else if (userInfo.step === 2) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ **Invalid ID!**\n\nPlease provide a valid in-game ID (at least 2 characters)');
                        return;
                    }
                    
                    userInfo.gameId = content;
                    userInfo.step = 3;
                    userInfo.currentQuestion = 'What is your in-game nickname?';
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `✅ **Game ID registered**\n\n**Question 3 of 3:**\n**What is your in-game nickname?**\n\n(Your exact in-game name)`
                    });
                    
                    console.log(`   ✅ ${userTag} - Game ID: ${content}`);
                }
                
                // PASO 3: PREGUNTAR NICKNAME (FINAL)
                else if (userInfo.step === 3) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ **Invalid nickname!**\n\nPlease provide a valid in-game nickname (at least 2 characters)');
                        return;
                    }
                    
                    userInfo.nickname = content;
                    userInfo.endTime = new Date().toISOString();
                    
                    console.log(`   📋 ${userTag} completed registration!`);
                    
                    // ---- GUARDAR EN CANAL #registers ----
                    try {
                        const guilds = client.guilds.cache;
                        for (const guild of guilds.values()) {
                            const registerChannel = guild.channels.cache.get(CONFIG.REGISTERS_CHANNEL_ID);
                            
                            if (registerChannel) {
                                console.log(`   💾 Saving to #${registerChannel.name}`);
                                
                                const registerEmbed = new EmbedBuilder()
                                    .setColor('#00ff00')
                                    .setTitle('📝 NEW REGISTRATION')
                                    .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
                                    .addFields(
                                        { name: '👤 Discord User', value: `\`${userInfo.discordTag}\`\nID: ${userInfo.discordId}`, inline: false },
                                        { name: '🛡️ Alliance', value: `**${userInfo.alliance}**`, inline: true },
                                        { name: '🎮 Game ID', value: `\`${userInfo.gameId}\``, inline: true },
                                        { name: '🏷️ Nickname', value: `\`${userInfo.nickname}\``, inline: true }
                                    )
                                    .addFields(
                                        { name: '📅 Registration Date', value: new Date(userInfo.endTime).toLocaleString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        }), inline: false }
                                    )
                                    .setFooter({ text: `Registered via Alliance Bot • ${guild.name}` })
                                    .setTimestamp();
                                
                                await registerChannel.send({ embeds: [registerEmbed] });
                                console.log(`   ✅ Registration saved to #${registerChannel.name}`);
                                break; // Salir del loop
                            }
                        }
                    } catch (saveError) {
                        console.error('   ❌ Error saving registration:', saveError.message);
                    }
                    
                    // ---- ENVIAR CONFIRMACIÓN AL USUARIO ----
                    try {
                        const completionEmbed = new EmbedBuilder()
                            .setColor('#7289DA')
                            .setTitle('✅ REGISTRATION COMPLETE!')
                            .setDescription(`**Thank you for registering, ${message.author.username}!** 🎉`)
                            .addFields(
                                { name: '📋 Your Information', value: `• **Alliance:** ${userInfo.alliance}\n• **Game ID:** ${userInfo.gameId}\n• **Nickname:** ${userInfo.nickname}`, inline: false },
                                { name: '🌍 Translation Feature', value: 'You can translate any message by reacting with flag emojis:\n🇺🇸 English | 🇪🇸 Spanish | 🇫🇷 French | 🇩🇪 German\n🇮🇹 Italian | 🇵🇹 Portuguese | 🇷🇺 Russian | 🇨🇳 Chinese' }
                            )
                            .setFooter({ text: 'You now have access to all channels • Enjoy your stay!' })
                            .setTimestamp();
                        
                        await message.author.send({ embeds: [completionEmbed] });
                        console.log(`   🎉 Confirmation sent to ${userTag}`);
                        
                    } catch (dmError) {
                        console.error('   ❌ Could not send completion DM:', dmError.message);
                    }
                    
                    // LIMPIAR DATOS TEMPORALES
                    userData.delete(userId);
                    console.log(`   🧹 Cleared data for ${userTag}`);
                }
                
                return; // Salir después de procesar registro
            }
            
            // SI ESCRIBE EN DM PERO NO HA INICIADO
            console.log(`   ℹ️ ${userTag} wrote in DM but didn't start registration`);
            await message.author.send({
                content: '👋 **Hello!**\n\nTo start registration, please type:\n\n\`\`\`!register\`\`\`\n\nI will guide you through 3 simple questions about your game account.'
            });
            
        } catch (error) {
            console.error(`   ❌ Error processing DM from ${userTag}:`, error.message);
            try {
                await message.author.send('❌ An error occurred. Please try typing **!register** again.');
            } catch (e) {
                // Ignorar error de DM
            }
        }
        return; // Salir después de procesar DM
    }
    
    // ---- PROCESAR MENSAJES EN SERVIDOR ----
    // Comando de ayuda en servidor
    if (content.toLowerCase() === '!register' && message.guild) {
        await message.reply({
            content: `👋 **Registration Instructions:**\n\n1. **Send me a Direct Message** (click my name → "Message")\n2. **Type:** \`!register\`\n3. **Answer** 3 simple questions\n\nI will DM you the questions!`,
            allowedMentions: { repliedUser: false }
        });
        console.log(`   ℹ️ Sent register instructions to ${userTag} in server`);
    }
    
    // Comando de admin para ver estado
    if (content === '!regstatus' && message.member?.permissions.has('Administrator')) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🤖 REGISTRATION BOT STATUS')
            .addFields(
                { name: 'Active Registrations', value: `${userData.size} user(s) in process`, inline: true },
                { name: 'Bot Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true },
                { name: 'Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
            );
        
        if (userData.size > 0) {
            let usersList = '';
            userData.forEach((data, id) => {
                const timeAgo = Math.floor((Date.now() - new Date(data.startTime).getTime()) / 60000);
                usersList += `• <@${id}> - Step ${data.step} (${timeAgo}m ago)\n`;
            });
            embed.addFields({ name: 'Currently Registering:', value: usersList || 'None' });
        }
        
        await message.reply({ embeds: [embed] });
        console.log(`   📊 Admin ${userTag} checked status`);
    }
});

// ---- MANEJO DE ERRORES ----
client.on('error', error => {
    console.error('❌ Discord.js Client Error:', error.message);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled Promise Rejection:', error.message);
});

// ---- INICIAR BOT ----
if (!token) {
    console.error('❌ CRITICAL: No TOKEN environment variable found!');
    console.error('   Add TOKEN="your-bot-token" in Railway Variables');
    process.exit(1);
}

console.log('\n🚀 Starting bot...');
client.login(token)
    .then(() => {
        console.log('✅ Bot login successful!');
        console.log('📋 Bot is now listening for:');
        console.log('   • New members (sends welcome)');
        console.log('   • DMs with "!register"');
        console.log('   • Admin command "!regstatus"');
    })
    .catch(error => {
        console.error('❌ Bot login FAILED:', error.message);
        console.error('   Possible causes:');
        console.error('   1. Invalid token');
        console.error('   2. Missing intents in Discord Developer Portal');
        console.error('   3. Network issues');
        process.exit(1);
    });
