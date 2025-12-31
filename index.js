const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

const token = process.env.TOKEN;
const alliances = ['FKIT', 'ISL', 'DNT', 'TNT'];
const userData = new Map();

client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log('🚀 Bot is ready and running!');
    
    // Verificar canales disponibles
    const guild = client.guilds.cache.first();
    if (guild) {
        console.log('📋 Available channels:');
        guild.channels.cache.forEach(channel => {
            if (channel.type === 0) { // Solo canales de texto
                console.log(`   #${channel.name} (${channel.id})`);
            }
        });
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`👤 New member: ${member.user.tag}`);
        
        // BUSCAR CANAL DE BIENVENIDA - MÚLTIPLES OPCIONES
        const channel = member.guild.channels.cache.find(ch => 
            ch.type === 0 && ( // Solo canales de texto
                ch.name.toLowerCase().includes('welcome') ||
                ch.name.toLowerCase().includes('general') ||
                ch.name === '👋-welcome' ||
                ch.name === '💬-general-chat' ||
                ch.name === 'welcome' ||
                ch.name === 'general' ||
                ch.id === 'TU_ID_DEL_CANAL' // Reemplaza con ID si quieres
            )
        );
        
        if (!channel) {
            console.log('❌ No welcome channel found. Available text channels:');
            member.guild.channels.cache.forEach(ch => {
                if (ch.type === 0) console.log(`   - ${ch.name} (${ch.id})`);
            });
            return;
        }

        console.log(`✅ Using channel: #${channel.name}`);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎮 WELCOME TO THE SERVER!')
            .setDescription(`Hello <@${member.id}>! 👋\n\n**Please choose your alliance by reacting below:**`)
            .addFields(
                { name: '1️⃣ FKIT Alliance', value: 'React with 1️⃣', inline: true },
                { name: '2️⃣ ISL Alliance', value: 'React with 2️⃣', inline: true },
                { name: '3️⃣ DNT Alliance', value: 'React with 3️⃣', inline: true },
                { name: '4️⃣ TNT Alliance', value: 'React with 4️⃣', inline: true }
            )
            .setFooter({ text: 'You have 10 minutes to choose • React with the corresponding number' })
            .setTimestamp();

        const message = await channel.send({ 
            content: `<@${member.id}>`,
            embeds: [embed]
        });
        
        // Añadir reacciones
        await message.react('1️⃣');
        await message.react('2️⃣');
        await message.react('3️⃣');
        await message.react('4️⃣');

        // Guardar información
        userData.set(member.id, {
            messageId: message.id,
            channelId: channel.id,
            step: 'waiting_for_alliance',
            timestamp: Date.now()
        });

        console.log(`✅ Welcome message sent for ${member.user.tag}`);

        // Limpiar después de 10 minutos
        setTimeout(() => {
            if (userData.get(member.id)?.step === 'waiting_for_alliance') {
                userData.delete(member.id);
            }
        }, 600000);

    } catch (error) {
        console.error('❌ Error in guildMemberAdd:', error);
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    
    try {
        // Si la reacción está en caché parcial, la buscamos completa
        if (reaction.partial) {
            await reaction.fetch();
        }
        
        const member = reaction.message.guild?.members.cache.get(user.id);
        if (!member) {
            console.log(`❌ Member not found for user: ${user.tag}`);
            return;
        }

        const userInfo = userData.get(user.id);
        if (!userInfo) {
            console.log(`❌ No user info for: ${user.tag}`);
            return;
        }
        
        // Verificar que es el mensaje correcto
        if (userInfo.messageId !== reaction.message.id) {
            console.log(`ℹ️ Reaction on different message from ${user.tag}`);
            return;
        }

        console.log(`🔄 ${user.tag} reacted with: ${reaction.emoji.name}`);

        const emojiToAlliance = {
            '1️⃣': 'FKIT',
            '2️⃣': 'ISL',
            '3️⃣': 'DNT',
            '4️⃣': 'TNT'
        };

        const alliance = emojiToAlliance[reaction.emoji.name];
        if (!alliance) {
            console.log(`❌ Invalid emoji from ${user.tag}: ${reaction.emoji.name}`);
            return;
        }

        // Eliminar otras reacciones del usuario
        const message = reaction.message;
        const userReactions = message.reactions.cache.filter(r => r.users.cache.has(user.id));
        
        for (const userReaction of userReactions.values()) {
            try {
                await userReaction.users.remove(user.id);
            } catch (err) {
                console.error('Failed to remove reaction:', err);
            }
        }

        // Asignar rol
        const role = member.guild.roles.cache.find(r => r.name === alliance);
        if (role) {
            try {
                await member.roles.add(role);
                console.log(`✅ Role ${alliance} assigned to ${user.tag}`);
                
                // Enviar DM
                const dmChannel = await member.createDM();
                
                userData.set(user.id, {
                    ...userInfo,
                    step: 'asking_id',
                    alliance: alliance
                });

                await dmChannel.send('**What is your in-game ID?**\n*(Please respond with your game ID number)*');
                console.log(`📨 DM sent to ${user.tag} for game ID`);
                
            } catch (dmError) {
                console.error('❌ Could not send DM to:', user.tag, dmError);
                // Intentar enviar mensaje al canal
                try {
                    await message.channel.send(`<@${user.id}> I couldn't send you a DM. Please check your privacy settings and allow DMs from server members.`);
                } catch (channelError) {
                    console.error('Also failed to send channel message:', channelError);
                }
            }
        } else {
            console.log(`❌ Role not found: ${alliance}`);
            await message.channel.send(`<@${user.id}> Error: Alliance role "${alliance}" not found. Contact admin.`);
        }
    } catch (error) {
        console.error('❌ Error in messageReactionAdd:', error);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.guild) return; // Solo procesar DMs

    try {
        console.log(`📩 DM from ${message.author.tag}: ${message.content.substring(0, 50)}...`);

        const guild = client.guilds.cache.first();
        const member = guild?.members.cache.get(message.author.id);
        if (!member) {
            console.log(`❌ Member not in guild: ${message.author.tag}`);
            return;
        }

        const userInfo = userData.get(message.author.id);
        if (!userInfo) {
            console.log(`❌ No active registration for ${message.author.tag}`);
            await message.author.send('You need to start the registration process first by joining the server and reacting to the welcome message.');
            return;
        }

        if (userInfo.step === 'asking_id') {
            const gameId = message.content.trim();
            if (!gameId || gameId.length < 2) {
                await message.author.send('❌ Please provide a valid game ID (at least 2 characters).');
                return;
            }

            userData.set(message.author.id, {
                ...userInfo,
                step: 'asking_nickname',
                gameId: gameId
            });

            await message.author.send('**What is your in-game nickname?**\n*(Please respond with your exact in-game name)*');
            console.log(`✅ ${message.author.tag} provided game ID: ${gameId}`);
        } 
        else if (userInfo.step === 'asking_nickname') {
            const gameNickname = message.content.trim();
            if (!gameNickname || gameNickname.length < 2) {
                await message.author.send('❌ Please provide a valid in-game nickname (at least 2 characters).');
                return;
            }
            
            console.log(`📝 Registration completing for ${message.author.tag}`);
            
            // Registrar en canal "registers"
            const registerChannel = member.guild.channels.cache.find(ch => 
                ch.type === 0 && (
                    ch.name.toLowerCase() === 'registers' || 
                    ch.name.toLowerCase().includes('register') ||
                    ch.name === '📋-registers' ||
                    ch.name === '📝-registros'
                )
            );
            
            if (registerChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('📝 NEW PLAYER REGISTRATION')
                    .setThumbnail(message.author.displayAvatarURL())
                    .addFields(
                        { name: '👤 Discord User', value: `${message.author.tag}\nID: ${message.author.id}`, inline: true },
                        { name: '🛡️ Alliance', value: userInfo.alliance, inline: true },
                        { name: '🎮 Game ID', value: `\`${userInfo.gameId}\``, inline: true },
                        { name: '🏷️ Game Nickname', value: `\`${gameNickname}\``, inline: true },
                        { name: '📅 Registration Date', value: new Date().toLocaleString('en-US', { 
                            timeZone: 'UTC',
                            dateStyle: 'full',
                            timeStyle: 'short'
                        }), inline: false }
                    )
                    .setFooter({ text: 'Registration System • Alliance Bot' })
                    .setTimestamp();

                await registerChannel.send({ embeds: [embed] });
                console.log(`✅ Registration logged in #${registerChannel.name}`);
            } else {
                console.log('❌ No registers channel found');
                // Mostrar canales disponibles
                console.log('Available channels:');
                member.guild.channels.cache.forEach(ch => {
                    if (ch.type === 0) console.log(`   - ${ch.name} (${ch.id})`);
                });
            }

            // Mensaje final al usuario
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#7289DA')
                .setTitle('✅ REGISTRATION COMPLETE!')
                .setDescription(`
**Thank you for registering!** 🎉🎉

You have been assigned to the **${userInfo.alliance}** alliance.
You now have access to all alliance channels.

**🌍 Translation Feature:**
You can translate messages by reacting with flags:
🇺🇸 English | 🇪🇸 Spanish | 🇫🇷 French
🇩🇪 German | 🇮🇹 Italian | 🇵🇹 Portuguese

Enjoy your stay in the server! 👋
                `);

            await message.author.send({ embeds: [welcomeEmbed] });
            console.log(`🎉 Registration completed for ${message.author.tag}`);

            // Limpiar datos del usuario
            userData.delete(message.author.id);
            
        }
    } catch (error) {
        console.error('❌ Error in messageCreate:', error);
        try {
            await message.author.send('❌ An error occurred. Please contact an administrator.');
        } catch (err) {
            console.error('Could not send error message:', err);
        }
    }
});

// Comando de prueba
client.on('messageCreate', async (message) => {
    if (message.content === '!testbot' && message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply('🤖 Bot is working!');
        console.log('✅ Test command received');
    }
});

// Manejar errores
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Iniciar bot
if (!token) {
    console.error('❌ ERROR: No token found. Set TOKEN environment variable in Railway.');
    process.exit(1);
}

client.login(token).catch(console.error);
