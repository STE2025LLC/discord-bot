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

// CONFIGURACIÓN - USA TUS IDs
const CONFIG = {
    WELCOME_CHANNEL_ID: '1455691192502190120', // #👋-welcome
    REGISTERS_CHANNEL_ID: '1455738662615781411' // #registers
};

client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log('🚀 Registration bot is ready!');
    console.log(`📌 Welcome Channel ID: ${CONFIG.WELCOME_CHANNEL_ID}`);
    console.log(`📌 Registers Channel ID: ${CONFIG.REGISTERS_CHANNEL_ID}`);
});

client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`👤 New member: ${member.user.tag}`);
        
        const welcomeChannel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
        if (!welcomeChannel) {
            console.log('❌ Welcome channel not found');
            return;
        }

        // MENSAJE DE BIENVENIDA SIMPLE
        await welcomeChannel.send({
            content: `Welcome <@${member.id}>! 👋\n\n**To access all channels, please send me a Direct Message (DM) with:**\n\`\`\`!register\`\`\`\nI will ask you 3 questions.`
        });
        
        console.log(`✅ Welcome instructions sent to ${member.user.tag}`);

    } catch (error) {
        console.error('❌ Error in welcome:', error.message);
    }
});

// PROCESAR DMs
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // SOLO PROCESAR DMs
    if (!message.guild) {
        const userId = message.author.id;
        const userTag = message.author.tag;
        
        try {
            // COMANDO PARA INICIAR REGISTRO
            if (message.content.toLowerCase() === '!register') {
                
                // Verificar si ya está registrado
                if (userData.has(userId)) {
                    const data = userData.get(userId);
                    await message.author.send(`You already started registration. Please answer: **${data.question}**`);
                    return;
                }
                
                // Iniciar registro - Pregunta 1: Alianza
                userData.set(userId, {
                    step: 1,
                    question: 'What is your alliance? (FKIT, ISL, DNT, or TNT)',
                    alliance: '',
                    gameId: '',
                    nickname: '',
                    discordTag: userTag,
                    discordId: userId,
                    startTime: new Date()
                });
                
                await message.author.send({
                    content: '**REGISTRATION STARTED**\n\n**Question 1/3:** What is your alliance?\nPlease type: **FKIT**, **ISL**, **DNT**, or **TNT**'
                });
                
                console.log(`📝 Registration started for ${userTag}`);
                return;
            }
            
            // SI YA ESTÁ EN PROCESO DE REGISTRO
            if (userData.has(userId)) {
                const userInfo = userData.get(userId);
                const answer = message.content.trim().toUpperCase();
                
                // PASO 1: ALIANZA
                if (userInfo.step === 1) {
                    const validAlliances = ['FKIT', 'ISL', 'DNT', 'TNT'];
                    
                    if (!validAlliances.includes(answer)) {
                        await message.author.send('❌ **Invalid alliance!**\nPlease type exactly: **FKIT**, **ISL**, **DNT**, or **TNT**');
                        return;
                    }
                    
                    // Guardar alianza
                    userInfo.alliance = answer;
                    userInfo.step = 2;
                    userInfo.question = 'What is your in-game ID?';
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `✅ **Alliance registered: ${answer}**\n\n**Question 2/3:** What is your in-game ID?\n(Your game identification number)`
                    });
                    
                    console.log(`✅ ${userTag} - Alliance: ${answer}`);
                }
                
                // PASO 2: GAME ID
                else if (userInfo.step === 2) {
                    if (!answer || answer.length < 2) {
                        await message.author.send('❌ **Invalid ID!**\nPlease provide your in-game ID (at least 2 characters)');
                        return;
                    }
                    
                    userInfo.gameId = answer;
                    userInfo.step = 3;
                    userInfo.question = 'What is your in-game nickname?';
                    userData.set(userId, userInfo);
                    
                    await message.author.send({
                        content: `✅ **Game ID registered**\n\n**Question 3/3:** What is your in-game nickname?\n(Your exact in-game name)`
                    });
                    
                    console.log(`✅ ${userTag} - Game ID: ${answer}`);
                }
                
                // PASO 3: NICKNAME (FINAL)
                else if (userInfo.step === 3) {
                    if (!answer || answer.length < 2) {
                        await message.author.send('❌ **Invalid nickname!**\nPlease provide your in-game nickname (at least 2 characters)');
                        return;
                    }
                    
                    userInfo.nickname = answer;
                    userInfo.endTime = new Date();
                    
                    // REGISTRAR EN CANAL #registers
                    const guild = client.guilds.cache.first();
                    if (guild) {
                        const registerChannel = guild.channels.cache.get(CONFIG.REGISTERS_CHANNEL_ID);
                        
                        if (registerChannel) {
                            const registerEmbed = new EmbedBuilder()
                                .setColor('#00ff00')
                                .setTitle('📝 NEW REGISTRATION')
                                .setThumbnail(message.author.displayAvatarURL())
                                .addFields(
                                    { name: '👤 Discord User', value: `${userInfo.discordTag}\nID: ${userInfo.discordId}`, inline: false },
                                    { name: '🛡️ Alliance', value: `**${userInfo.alliance}**`, inline: true },
                                    { name: '🎮 Game ID', value: `\`${userInfo.gameId}\``, inline: true },
                                    { name: '🏷️ Nickname', value: `\`${userInfo.nickname}\``, inline: true }
                                )
                                .addFields(
                                    { name: '📅 Date', value: userInfo.endTime.toLocaleString('en-US', {
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
                                .setFooter({ text: 'Registration System' })
                                .setTimestamp();
                            
                            await registerChannel.send({ embeds: [registerEmbed] });
                            console.log(`📋 Registration saved to #registers for ${userTag}`);
                        } else {
                            console.log('❌ Register channel not found');
                        }
                    }
                    
                    // MENSAJE FINAL AL USUARIO
                    const completionEmbed = new EmbedBuilder()
                        .setColor('#7289DA')
                        .setTitle('✅ REGISTRATION COMPLETE!')
                        .setDescription(`**Thank you for registering!** 🎉\n\n**Your information:**\n• Alliance: **${userInfo.alliance}**\n• Game ID: **${userInfo.gameId}**\n• Nickname: **${userInfo.nickname}**`)
                        .addFields(
                            { name: '🌍 Translation Feature', value: 'You can translate any message by reacting with flag emojis:\n🇺🇸 English | 🇪🇸 Spanish | 🇫🇷 French\n🇩🇪 German | 🇮🇹 Italian | 🇵🇹 Portuguese' }
                        )
                        .setFooter({ text: 'You now have access to all channels' })
                        .setTimestamp();
                    
                    await message.author.send({ embeds: [completionEmbed] });
                    
                    // LIMPIAR DATOS TEMPORALES
                    userData.delete(userId);
                    
                    console.log(`🎉 Registration completed for ${userTag}`);
                    
                    // OPCIONAL: Asignar rol automáticamente (si lo quieres)
                    // const member = guild.members.cache.get(userId);
                    // if (member) {
                    //     const role = guild.roles.cache.find(r => r.name === userInfo.alliance);
                    //     if (role) {
                    //         await member.roles.add(role);
                    //         console.log(`✅ Role ${userInfo.alliance} assigned to ${userTag}`);
                    //     }
                    // }
                }
            }
            // SI ESCRIBE EN DM PERO NO HA INICIADO REGISTRO
            else {
                await message.author.send({
                    content: 'To register, please type:\n\n**!register**\n\nI will guide you through 3 simple questions.'
                });
            }
            
        } catch (error) {
            console.error(`❌ Error processing DM from ${userTag}:`, error.message);
            try {
                await message.author.send('❌ An error occurred. Please try typing **!register** again.');
            } catch (e) {
                // Ignorar si no se puede enviar DM
            }
        }
    }
});

// COMANDO DE ADMIN PARA VER REGISTROS
client.on('messageCreate', async (message) => {
    if (message.content === '!regstatus' && message.member?.permissions.has('Administrator')) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🤖 BOT STATUS')
            .addFields(
                { name: 'Active Registrations', value: `${userData.size} users in process`, inline: true },
                { name: 'Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true }
            );
        
        if (userData.size > 0) {
            let usersList = '';
            userData.forEach((data, userId) => {
                usersList += `• <@${userId}> - Step ${data.step}: ${data.question}\n`;
            });
            embed.addFields({ name: 'Currently Registering:', value: usersList });
        }
        
        await message.reply({ embeds: [embed] });
    }
});

// MANEJO DE ERRORES
client.on('error', error => console.error('Discord.js error:', error));
process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));

// INICIAR BOT
if (!token) {
    console.error('❌ ERROR: No TOKEN found in environment variables');
    process.exit(1);
}

client.login(token)
    .then(() => console.log('✅ Bot login successful'))
    .catch(error => {
        console.error('❌ Login failed:', error.message);
        process.exit(1);
    });
