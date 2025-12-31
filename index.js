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

const token = process.env.TOKEN; // Token desde Railway
const alliances = ['FKIT', 'ISL', 'DNT', 'TNT'];
const userData = new Map();

client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log('🚀 Bot is ready and running!');
});

client.on('guildMemberAdd', async (member) => {
    try {
        const channel = member.guild.channels.cache.find(ch => 
            ch.name.toLowerCase().includes('welcome') || 
            ch.name.toLowerCase().includes('general') ||
            ch.name === '📢-welcome'
        );
        
        if (!channel) {
            console.log('❌ No welcome channel found');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎮 Welcome to the Server!')
            .setDescription(`Welcome <@${member.id}>! Please choose your alliance by reacting:`)
            .addFields(
                { name: '1️⃣ FKIT', value: 'React with 1️⃣', inline: true },
                { name: '2️⃣ ISL', value: 'React with 2️⃣', inline: true },
                { name: '3️⃣ DNT', value: 'React with 3️⃣', inline: true },
                { name: '4️⃣ TNT', value: 'React with 4️⃣', inline: true }
            )
            .setFooter({ text: 'You have 10 minutes to choose' });

        const message = await channel.send({ 
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
            step: 'waiting_for_alliance',
            timestamp: Date.now()
        });

        // Limpiar después de 10 minutos
        setTimeout(() => {
            if (userData.get(member.id)?.step === 'waiting_for_alliance') {
                userData.delete(member.id);
            }
        }, 600000);

    } catch (error) {
        console.error('Error in guildMemberAdd:', error);
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
        if (!member) return;

        const userInfo = userData.get(user.id);
        if (!userInfo || userInfo.messageId !== reaction.message.id) return;

        const emojiToAlliance = {
            '1️⃣': 'FKIT',
            '2️⃣': 'ISL',
            '3️⃣': 'DNT',
            '4️⃣': 'TNT'
        };

        const alliance = emojiToAlliance[reaction.emoji.name];
        if (!alliance) return;

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
            await member.roles.add(role);
            console.log(`✅ Role ${alliance} assigned to ${user.tag}`);
            
            try {
                const dmChannel = await member.createDM();
                
                userData.set(user.id, {
                    ...userInfo,
                    step: 'asking_id',
                    alliance: alliance
                });

                await dmChannel.send('**What is your in-game ID?**\n*(Please respond with your game ID number)*');
            } catch (dmError) {
                console.error('Could not send DM:', dmError);
                // Intentar enviar al canal general
                const generalChannel = member.guild.channels.cache.find(ch => 
                    ch.name.toLowerCase().includes('general')
                );
                if (generalChannel) {
                    await generalChannel.send(`<@${user.id}> I couldn't send you a DM. Please enable DMs from server members and try reacting again.`);
                }
            }
        }
    } catch (error) {
        console.error('Error in messageReactionAdd:', error);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.guild) return; // Solo procesar DMs

    try {
        const guild = client.guilds.cache.first();
        const member = guild?.members.cache.get(message.author.id);
        if (!member) return;

        const userInfo = userData.get(message.author.id);
        if (!userInfo) return;

        if (userInfo.step === 'asking_id') {
            const gameId = message.content.trim();
            if (!gameId || gameId.length < 2) {
                await message.author.send('Please provide a valid game ID.');
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
                await message.author.send('Please provide a valid in-game nickname.');
                return;
            }
            
            // Registrar en canal "registers"
            const registerChannel = member.guild.channels.cache.find(ch => 
                ch.name.toLowerCase() === 'registers' || 
                ch.name.toLowerCase().includes('register')
            );
            
            if (registerChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('📝 New Player Registration')
                    .setThumbnail(message.author.displayAvatarURL())
                    .addFields(
                        { name: 'Discord User', value: `${message.author.tag}\nID: ${message.author.id}`, inline: true },
                        { name: 'Alliance', value: userInfo.alliance, inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: 'Game ID', value: `\`${userInfo.gameId}\``, inline: true },
                        { name: 'Game Nickname', value: `\`${gameNickname}\``, inline: true },
                        { name: 'Registration Date', value: new Date().toLocaleString('en-US', { 
                            timeZone: 'UTC',
                            dateStyle: 'full',
                            timeStyle: 'short'
                        }), inline: false }
                    )
                    .setFooter({ text: 'Registration System' })
                    .setTimestamp();

                await registerChannel.send({ embeds: [embed] });
            }

            // Mensaje final al usuario
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#7289DA')
                .setTitle('✅ Registration Complete!')
                .setDescription(`
**Thank you for registering!** 🎉

You now have access to all channels in the server.

**🌍 Translation Feature:**
You can translate any message by reacting with the flag of your desired language:
🇺🇸 English | 🇪🇸 Spanish | 🇫🇷 French | 🇩🇪 German
🇮🇹 Italian | 🇵🇹 Portuguese | 🇷🇺 Russian | 🇨🇳 Chinese | 🇯🇵 Japanese

**Note:** This requires a translation bot to be installed. Ask an admin if translation isn't working.

Enjoy your stay in the server! 👋
                `);

            await message.author.send({ embeds: [welcomeEmbed] });

            // Limpiar datos del usuario
            userData.delete(message.author.id);
            
            console.log(`✅ Registration completed for ${message.author.tag}`);
        }
    } catch (error) {
        console.error('Error in messageCreate:', error);
        try {
            await message.author.send('An error occurred. Please contact an administrator.');
        } catch (err) {
            console.error('Could not send error message:', err);
        }
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