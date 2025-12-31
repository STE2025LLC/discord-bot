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

// CONFIGURACIÓN - PON AQUÍ LOS IDs DE TUS CANALES
const CHANNEL_IDS = {
    WELCOME: '1455691192502190120', // #👋-welcome
    REGISTERS: '1455738662615781411', // #registers
    GENERAL: '1455659994232913987' // #💬-general-chat (backup)
};

client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log('🚀 Bot is ready and running!');
    console.log(`📌 Welcome Channel ID: ${CHANNEL_IDS.WELCOME}`);
    console.log(`📌 Registers Channel ID: ${CHANNEL_IDS.REGISTERS}`);
});

client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`👤 New member: ${member.user.tag} (${member.id})`);
        
        // INTENTAR PRIMERO EL CANAL #👋-welcome POR SU ID
        let channel = member.guild.channels.cache.get(CHANNEL_IDS.WELCOME);
        
        // Si no encuentra por ID, buscar por nombre
        if (!channel) {
            channel = member.guild.channels.cache.find(ch => 
                ch.type === 0 && ch.name === '👋-welcome'
            );
        }
        
        // Si aún no encuentra, usar #💬-general-chat
        if (!channel) {
            channel = member.guild.channels.cache.get(CHANNEL_IDS.GENERAL);
            console.log(`⚠️ Using backup channel: #${channel?.name}`);
        }
        
        if (!channel) {
            console.log('❌ No channel found! Available channels:');
            member.guild.channels.cache.forEach(ch => {
                if (ch.type === 0) console.log(`   - ${ch.name} (${ch.id})`);
            });
            return;
        }

        console.log(`✅ Selected channel: #${channel.name} (${channel.id})`);
        
        // VERIFICAR PERMISOS DEL BOT EN EL CANAL
        const botMember = member.guild.members.cache.get(client.user.id);
        const permissions = channel.permissionsFor(botMember);
        
        if (!permissions) {
            console.log('❌ Cannot check bot permissions');
            return;
        }
        
        console.log(`🔍 Bot permissions in #${channel.name}:`);
        console.log(`   - Send Messages: ${permissions.has('SendMessages') ? '✅' : '❌'}`);
        console.log(`   - View Channel: ${permissions.has('ViewChannel') ? '✅' : '❌'}`);
        console.log(`   - Add Reactions: ${permissions.has('AddReactions') ? '✅' : '❌'}`);
        
        if (!permissions.has('SendMessages') || !permissions.has('ViewChannel')) {
            console.log('❌ Bot lacks permissions in this channel!');
            
            // Intentar enviar mensaje a #💬-general-chat como error
            const generalChannel = member.guild.channels.cache.get(CHANNEL_IDS.GENERAL);
            if (generalChannel && generalChannel.permissionsFor(botMember)?.has('SendMessages')) {
                await generalChannel.send(
                    `⚠️ **ERROR**: Bot needs permissions in #👋-welcome channel!\n` +
                    `Please give me:\n` +
                    `• View Channel\n` +
                    `• Send Messages\n` +
                    `• Add Reactions\n` +
                    `• Manage Messages`
                );
            }
            return;
        }

        // CREAR Y ENVIAR MENSAJE DE BIENVENIDA
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
        
        // AÑADIR REACCIONES
        await message.react('1️⃣');
        await message.react('2️⃣');
        await message.react('3️⃣');
        await message.react('4️⃣');

        // GUARDAR INFORMACIÓN
        userData.set(member.id, {
            messageId: message.id,
            channelId: channel.id,
            step: 'waiting_for_alliance',
            timestamp: Date.now(),
            guildId: member.guild.id
        });

        console.log(`✅ Welcome message sent for ${member.user.tag} in #${channel.name}`);
        console.log(`📝 Message ID: ${message.id}`);

        // LIMPIAR DESPUÉS DE 10 MINUTOS
        setTimeout(() => {
            if (userData.get(member.id)?.step === 'waiting_for_alliance') {
                userData.delete(member.id);
                console.log(`⏰ Cleared registration for ${member.user.tag} (timeout)`);
            }
        }, 600000);

    } catch (error) {
        console.error('❌ Error in guildMemberAdd:', error.message);
        console.error('Error details:', error.code, error.status);
        
        // Mostrar información útil del error
        if (error.code === 50001) {
            console.error('🚫 ERROR: Bot MISSING ACCESS to channel!');
            console.error('🔧 Solution:');
            console.error('   1. Right-click #👋-welcome channel');
            console.error('   2. Edit Channel → Permissions');
            console.error('   3. Add role "Alliance Bot"');
            console.error('   4. Enable: View Channel, Send Messages, Add Reactions');
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    
    try {
        if (reaction.partial) {
            await reaction.fetch();
        }
        
        const member = reaction.message.guild?.members.cache.get(user.id);
        if (!member) return;

        const userInfo = userData.get(user.id);
        if (!userInfo) return;
        
        if (userInfo.messageId !== reaction.message.id) return;

        const emojiToAlliance = {
            '1️⃣': 'FKIT',
            '2️⃣': 'ISL',
            '3️⃣': 'DNT',
            '4️⃣': 'TNT'
        };

        const alliance = emojiToAlliance[reaction.emoji.name];
        if (!alliance) return;

        // ELIMINAR OTRAS REACCIONES
        const message = reaction.message;
        const userReactions = message.reactions.cache.filter(r => r.users.cache.has(user.id));
        
        for (const userReaction of userReactions.values()) {
            try {
                await userReaction.users.remove(user.id);
            } catch (err) {
                // Ignorar errores al eliminar reacciones
            }
        }

        // ASIGNAR ROL
        const role = member.guild.roles.cache.find(r => r.name === alliance);
        if (role) {
            try {
                await member.roles.add(role);
                console.log(`✅ Role ${alliance} assigned to ${user.tag}`);
                
                // ENVIAR DM
                const dmChannel = await member.createDM();
                
                userData.set(user.id, {
                    ...userInfo,
                    step: 'asking_id',
                    alliance: alliance
                });

                await dmChannel.send('**What is your in-game ID?**\n*(Please respond with your game ID number)*');
                console.log(`📨 DM sent to ${user.tag}`);
                
            } catch (dmError) {
                console.error('❌ Could not send DM:', dmError.message);
                try {
                    await message.channel.send(`<@${user.id}> Please enable DMs and try reacting again.`);
                } catch (e) {
                    // Ignorar
                }
            }
        }
    } catch (error) {
        console.error('❌ Error in messageReactionAdd:', error.message);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.guild) return;

    try {
        const guild = client.guilds.cache.first();
        const member = guild?.members.cache.get(message.author.id);
        if (!member) return;

        const userInfo = userData.get(message.author.id);
        if (!userInfo) return;

        if (userInfo.step === 'asking_id') {
            const gameId = message.content.trim();
            if (!gameId || gameId.length < 2) {
                await message.author.send('❌ Please provide a valid game ID.');
                return;
            }

            userData.set(message.author.id, {
                ...userInfo,
                step: 'asking_nickname',
                gameId: gameId
            });

            await message.author.send('**What is your in-game nickname?**\n*(Please respond with your exact in-game name)*');
        } 
        else if (userInfo.step === 'asking_nickname') {
            const gameNickname = message.content.trim();
            if (!gameNickname || gameNickname.length < 2) {
                await message.author.send('❌ Please provide a valid in-game nickname.');
                return;
            }
            
            // REGISTRAR EN CANAL #registers
            const registerChannel = guild.channels.cache.get(CHANNEL_IDS.REGISTERS);
            
            if (registerChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('📝 NEW PLAYER REGISTRATION')
                    .setThumbnail(message.author.displayAvatarURL())
                    .addFields(
                        { name: '👤 Discord User', value: `${message.author.tag}`, inline: true },
                        { name: '🛡️ Alliance', value: userInfo.alliance, inline: true },
                        { name: '🎮 Game ID', value: `\`${userInfo.gameId}\``, inline: true },
                        { name: '🏷️ Game Nickname', value: `\`${gameNickname}\``, inline: true },
                        { name: '📅 Date', value: new Date().toLocaleString(), inline: false }
                    )
                    .setFooter({ text: 'Alliance Registration System' })
                    .setTimestamp();

                await registerChannel.send({ embeds: [embed] });
                console.log(`✅ Registration logged for ${message.author.tag}`);
            }

            // MENSAJE FINAL
            await message.author.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#7289DA')
                        .setTitle('✅ REGISTRATION COMPLETE!')
                        .setDescription(`**Thank you for registering!** 🎉\n\nYou are now part of the **${userInfo.alliance}** alliance.\nYou have access to all channels.\n\n**Translation:** React to messages with flags to translate.\n\nEnjoy! 👋`)
                ]
            });

            userData.delete(message.author.id);
            console.log(`🎉 Registration completed for ${message.author.tag}`);
        }
    } catch (error) {
        console.error('❌ Error processing DM:', error.message);
    }
});

// COMANDO PARA VER ESTADO DEL BOT
client.on('messageCreate', async (message) => {
    if (message.content === '!botstatus' && message.member.permissions.has('Administrator')) {
        const guild = message.guild;
        const botMember = guild.members.cache.get(client.user.id);
        
        const statusEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🤖 BOT STATUS')
            .addFields(
                { name: 'Bot Name', value: client.user.tag, inline: true },
                { name: 'Status', value: client.user.presence?.status || 'unknown', inline: true },
                { name: 'Uptime', value: `${process.uptime().toFixed(0)}s`, inline: true },
                { name: 'Active Registrations', value: `${userData.size} users`, inline: true }
            );
        
        // Verificar permisos en canales
        const welcomeChannel = guild.channels.cache.get(CHANNEL_IDS.WELCOME);
        if (welcomeChannel) {
            const perms = welcomeChannel.permissionsFor(botMember);
            statusEmbed.addFields(
                { name: `#${welcomeChannel.name} Permissions`, 
                  value: `View: ${perms?.has('ViewChannel') ? '✅' : '❌'}\nSend: ${perms?.has('SendMessages') ? '✅' : '❌'}\nReact: ${perms?.has('AddReactions') ? '✅' : '❌'}` }
            );
        }
        
        await message.reply({ embeds: [statusEmbed] });
    }
});

// MANEJAR ERRORES
client.on('error', error => console.error('Client error:', error));
process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));

// INICIAR BOT
if (!token) {
    console.error('❌ ERROR: No TOKEN environment variable');
    process.exit(1);
}

client.login(token).then(() => {
    console.log('✅ Bot login successful');
}).catch(error => {
    console.error('❌ Login failed:', error.message);
});
