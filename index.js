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

client.once('ready', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log('🚀 Bot ready!');
    
    // LISTAR TODOS LOS CANALES para debug
    const guild = client.guilds.cache.first();
    if (guild) {
        console.log('\n📚 ALL TEXT CHANNELS in server:');
        let foundRegisters = false;
        
        guild.channels.cache.forEach(channel => {
            if (channel.type === 0) { // Canal de texto
                console.log(`   #${channel.name} - ID: ${channel.id}`);
                if (channel.name.toLowerCase().includes('register')) {
                    foundRegisters = true;
                    console.log(`   ⭐ FOUND REGISTERS-LIKE CHANNEL: #${channel.name} (${channel.id})`);
                }
            }
        });
        
        if (!foundRegisters) {
            console.log('\n⚠️ No channel found with "register" in name!');
        }
    }
});

// ---- FUNCIÓN PARA ENCONTRAR CANAL DE REGISTROS ----
async function findRegisterChannel(guild) {
    console.log(`\n🔍 Looking for register channel in ${guild.name}...`);
    
    // 1. Buscar por nombre exacto "registers"
    let channel = guild.channels.cache.find(ch => 
        ch.type === 0 && ch.name.toLowerCase() === 'registers'
    );
    
    if (channel) {
        console.log(`✅ Found by exact name: #${channel.name} (${channel.id})`);
        return channel;
    }
    
    // 2. Buscar por nombre que contenga "register"
    channel = guild.channels.cache.find(ch => 
        ch.type === 0 && ch.name.toLowerCase().includes('register')
    );
    
    if (channel) {
        console.log(`✅ Found by partial name: #${channel.name} (${channel.id})`);
        return channel;
    }
    
    // 3. Buscar por ID específico (si lo tenemos)
    const specificId = '1455738662615781411'; // ID que mencionaste
    channel = guild.channels.cache.get(specificId);
    
    if (channel) {
        console.log(`✅ Found by specific ID: #${channel.name} (${channel.id})`);
        return channel;
    }
    
    // 4. Si no encuentra, usar el primer canal que el bot pueda escribir
    console.log('⚠️ No register channel found, listing all channels with permissions:');
    
    const botMember = guild.members.cache.get(client.user.id);
    guild.channels.cache.forEach(ch => {
        if (ch.type === 0) {
            const perms = ch.permissionsFor(botMember);
            if (perms && perms.has('SendMessages') && perms.has('ViewChannel')) {
                console.log(`   Possible: #${ch.name} (${ch.id})`);
                if (!channel) channel = ch; // Tomar el primero
            }
        }
    });
    
    if (channel) {
        console.log(`✅ Will use: #${channel.name} (${channel.id})`);
        return channel;
    }
    
    console.log('❌ No suitable channel found!');
    return null;
}

// ---- FUNCIÓN PARA GUARDAR REGISTRO ----
async function saveRegistration(userInfo, guild) {
    console.log(`\n💾 Attempting to save registration for ${userInfo.discordTag}...`);
    
    try {
        const registerChannel = await findRegisterChannel(guild);
        
        if (!registerChannel) {
            console.log('❌ Cannot save: No register channel available');
            return false;
        }
        
        console.log(`✅ Using channel: #${registerChannel.name}`);
        
        // Verificar permisos
        const botMember = guild.members.cache.get(client.user.id);
        const perms = registerChannel.permissionsFor(botMember);
        
        if (!perms.has('ViewChannel') || !perms.has('SendMessages')) {
            console.log('❌ Bot cannot write to this channel!');
            console.log(`   View Channel: ${perms.has('ViewChannel')}`);
            console.log(`   Send Messages: ${perms.has('SendMessages')}`);
            return false;
        }
        
        // Crear mensaje de registro
        const registerEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('📝 NEW REGISTRATION')
            .setThumbnail(`https://cdn.discordapp.com/avatars/${userInfo.discordId}/${userInfo.avatar}.png`)
            .addFields(
                { name: '👤 Discord User', value: `${userInfo.discordTag}\nID: ${userInfo.discordId}`, inline: false },
                { name: '🛡️ Alliance', value: `**${userInfo.alliance}**`, inline: true },
                { name: '🎮 Game ID', value: `\`${userInfo.gameId}\``, inline: true },
                { name: '🏷️ Nickname', value: `\`${userInfo.nickname}\``, inline: true },
                { name: '📅 Date', value: new Date().toLocaleString('en-US'), inline: false }
            )
            .setFooter({ text: 'Alliance Registration System' })
            .setTimestamp();
        
        console.log(`📤 Sending embed to #${registerChannel.name}...`);
        const sentMessage = await registerChannel.send({ embeds: [registerEmbed] });
        
        console.log(`✅ SUCCESS! Registration saved to #${registerChannel.name}`);
        console.log(`   Message ID: ${sentMessage.id}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ ERROR saving registration:', error.message);
        console.error('   Full error:', error);
        return false;
    }
}

// ---- WELCOME MESSAGE ----
client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`\n👤 New member: ${member.user.tag}`);
        
        // Buscar canal de bienvenida
        const welcomeChannel = member.guild.channels.cache.find(ch => 
            ch.type === 0 && (ch.name.includes('welcome') || ch.name.includes('general'))
        ) || member.guild.systemChannel;
        
        if (welcomeChannel) {
            await welcomeChannel.send({
                content: `👋 Welcome <@${member.id}>! Please check your DMs for registration instructions.`
            });
        }
        
        // Enviar DM
        try {
            await member.send({
                content: '**Welcome!** 👋\n\nTo register, please type:\n\n```!register```\n\nI will ask you 3 questions about your game account.'
            });
            console.log(`📨 DM sent to ${member.user.tag}`);
        } catch (dmError) {
            console.log(`⚠️ Could not DM ${member.user.tag}`);
        }
        
    } catch (error) {
        console.error('Error in welcome:', error.message);
    }
});

// ---- PROCESS DMs ----
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (!message.guild) { // Es un DM
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
                    currentQuestion: 'What is your alliance? (FKIT, ISL, DNT, TNT)',
                    alliance: '',
                    gameId: '',
                    nickname: '',
                    discordTag: userTag,
                    discordId: userId,
                    avatar: message.author.avatar
                });
                
                await message.author.send({
                    content: '**✅ REGISTRATION STARTED!**\n\n**Question 1/3:**\n**What is your alliance?**\n\nType: FKIT, ISL, DNT, or TNT'
                });
                return;
            }
            
            // SI YA ESTÁ REGISTRANDO
            if (userData.has(userId)) {
                const userInfo = userData.get(userId);
                
                if (userInfo.step === 1) {
                    const answer = content.toUpperCase();
                    const valid = ['FKIT', 'ISL', 'DNT', 'TNT'];
                    
                    if (!valid.includes(answer)) {
                        await message.author.send('❌ Invalid alliance! Type: FKIT, ISL, DNT, or TNT');
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
                
                else if (userInfo.step === 2) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ Invalid ID!');
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
                
                else if (userInfo.step === 3) {
                    if (!content || content.length < 2) {
                        await message.author.send('❌ Invalid nickname!');
                        return;
                    }
                    
                    userInfo.nickname = content;
                    
                    console.log(`\n📋 ${userTag} completed registration:`);
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
                    
                    // 2. GUARDAR EN REGISTROS
                    let saved = false;
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            saved = await saveRegistration(userInfo, guild);
                        }
                    } catch (saveError) {
                        console.error('Save error:', saveError.message);
                    }
                    
                    // 3. ENVIAR CONFIRMACIÓN
                    const completionEmbed = new EmbedBuilder()
                        .setColor('#7289DA')
                        .setTitle('✅ REGISTRATION COMPLETE!')
                        .setDescription(`**Thank you ${message.author.username}!** 🎉`)
                        .addFields(
                            { name: '📋 Your Information', value: `• Alliance: **${userInfo.alliance}**\n• Game ID: **${userInfo.gameId}**\n• Nickname: **${userInfo.nickname}**`, inline: false },
                            { name: '🎖️ Role', value: roleAssigned ? '✅ Assigned' : '❌ Not assigned', inline: true },
                            { name: '💾 Saved', value: saved ? '✅ Yes' : '❌ No', inline: true }
                        )
                        .setFooter({ text: 'Registration System' });
                    
                    await message.author.send({ embeds: [completionEmbed] });
                    
                    // 4. LIMPIAR
                    userData.delete(userId);
                    
                    // 5. ANUNCIAR
                    if (roleAssigned) {
                        try {
                            const guild = client.guilds.cache.first();
                            const welcomeChannel = guild.channels.cache.find(ch => 
                                ch.name.includes('welcome') || ch.name.includes('general')
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
            
            // MENSAJE NORMAL EN DM
            await message.author.send({
                content: 'Type `!register` to start registration.'
            });
            
        } catch (error) {
            console.error('DM error:', error.message);
        }
    }
});

// ---- COMANDO DE TEST ----
client.on('messageCreate', async (message) => {
    if (message.content === '!testregister' && message.member?.permissions.has('Administrator')) {
        console.log('\n🧪 TEST REGISTRATION requested by admin');
        
        const testInfo = {
            discordTag: 'TestUser#1234',
            discordId: '123456789',
            alliance: 'FKIT',
            gameId: 'TEST123',
            nickname: 'TestPlayer',
            avatar: 'test'
        };
        
        const saved = await saveRegistration(testInfo, message.guild);
        
        await message.reply({
            content: saved ? '✅ Test registration saved!' : '❌ Test registration failed! Check logs.'
        });
    }
});

// ---- START BOT ----
if (!token) {
    console.error('❌ No token!');
    process.exit(1);
}

client.login(token)
    .then(() => console.log('\n✅ Bot running!'))
    .catch(error => {
        console.error('Login failed:', error);
        process.exit(1);
    });
