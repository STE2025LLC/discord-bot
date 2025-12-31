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

// Lista de alianzas válidas
const VALID_ALLIANCES = ['FKIT', 'ISL', 'DNT', 'TNT'];
const NOT_VERIFIED_ROLE = 'Not verified'; // Nombre del rol no verificado

client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log('🚀 Bot is ready!');
    console.log(`📋 Available commands:`);
    console.log(`   - !register (in DM)`);
    console.log(`   - !changealliance (in DM)`);
    console.log(`📌 Not verified role: "${NOT_VERIFIED_ROLE}"`);
});

client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`👤 New member: ${member.user.tag}`);
        
        // ASIGNAR ROL "Not verified" automáticamente
        try {
            const notVerifiedRole = member.guild.roles.cache.find(r => 
                r.name === NOT_VERIFIED_ROLE
            );
            
            if (notVerifiedRole) {
                await member.roles.add(notVerifiedRole);
                console.log(`🔒 Added "${NOT_VERIFIED_ROLE}" role to ${member.user.tag}`);
            } else {
                console.log(`❌ Role "${NOT_VERIFIED_ROLE}" not found in server!`);
                console.log(`   Available roles:`);
                member.guild.roles.cache.forEach(role => {
                    console.log(`   - ${role.name}`);
                });
            }
        } catch (roleError) {
            console.error(`❌ Error assigning "${NOT_VERIFIED_ROLE}" role:`, roleError.message);
        }
        
        // Mensaje en canal de bienvenida
        const welcomeChannel = member.guild.channels.cache.find(ch => 
            ch.type === 0 && ch.name === '👋-welcome'
        );
        
        if (welcomeChannel) {
            await welcomeChannel.send({
                content: `**Hello!** 👋 <@${member.id}> Welcome to **${member.guild.name}**.\n\nPlease check your DMs to complete registration and be able to see all channels.`
            });
        }
        
        // Enviar DM
        try {
            await member.send({
                content: '**Welcome!** 👋\n\nTo complete your registration and get access to all channels, type:\n\n```!register```\n\nI will ask you 3 simple questions about your game account.\n\n*You currently have the "Not verified" role until you complete registration.*'
            });
        } catch (error) {
            console.log(`⚠️ Could not DM ${member.user.tag}`);
        }
        
    } catch (error) {
        console.error('Error in guildMemberAdd:', error.message);
    }
});

// FUNCIÓN para guardar en "registers"
async function saveToRegistersChannel(guild, userInfo, action = 'NEW REGISTRATION') {
    console.log(`\n💾 Saving to registers channel (${action})...`);
    
    const registerChannel = guild.channels.cache.find(ch => 
        ch.type === 0 && ch.name === 'registers'
    );
    
    if (!registerChannel) {
        console.log('❌ No "registers" channel found');
        return false;
    }
    
    console.log(`✅ Found: #${registerChannel.name}`);
    
    const botMember = guild.members.cache.get(client.user.id);
    const permissions = registerChannel.permissionsFor(botMember);
    
    if (!permissions.has('ViewChannel') || !permissions.has('SendMessages')) {
        console.log('❌ Bot cannot write to this channel');
        return false;
    }
    
    try {
        // Obtener fecha actual en UTC
        const now = new Date();
        const utcFormatted = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        
        // Mensaje de texto formateado
        const registerMessage = `
📝 **${action}** 📝

👤 **Discord User:** ${userInfo.discordTag}
🆔 **Discord ID:** ${userInfo.discordId}
🛡️ **Alliance:** ${userInfo.alliance}
🎮 **Game ID:** ${userInfo.gameId}
🏷️ **In-Game Nickname:** ${userInfo.nickname}
📅 **Date (UTC):** ${utcFormatted}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();
        
        console.log(`📤 Sending to #${registerChannel.name}...`);
        await registerChannel.send(registerMessage);
        
        console.log(`✅ ${action} saved successfully`);
        return true;
        
    } catch (error) {
        console.error('❌ Error saving to register channel:', error.message);
        return false;
    }
}

// FUNCIÓN para cambiar alianza de un usuario
async function changeUserAlliance(userId, newAlliance, guild) {
    try {
        const member = guild.members.cache.get(userId);
        if (!member) {
            console.log(`❌ Member ${userId} not found in guild`);
            return false;
        }
        
        console.log(`🔄 Changing alliance for ${member.user.tag}`);
        
        // 1. ELIMINAR roles de alianzas anteriores
        let removedRoles = [];
        for (const alliance of VALID_ALLIANCES) {
            const role = guild.roles.cache.find(r => r.name === alliance);
            if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                removedRoles.push(alliance);
                console.log(`   ➖ Removed role: ${alliance}`);
            }
        }
        
        // 2. ASIGNAR nuevo rol
        const newRole = guild.roles.cache.find(r => r.name === newAlliance);
        if (!newRole) {
            console.log(`❌ Role ${newAlliance} not found`);
            return false;
        }
        
        await member.roles.add(newRole);
        console.log(`   ➕ Added role: ${newAlliance}`);
        
        return {
            success: true,
            removedRoles: removedRoles,
            addedRole: newAlliance,
            memberTag: member.user.tag
        };
        
    } catch (error) {
        console.error(`❌ Error changing alliance:`, error.message);
        return false;
    }
}

// FUNCIÓN para completar verificación
async function completeVerification(userId, userInfo, guild) {
    try {
        const member = guild.members.cache.get(userId);
        if (!member) {
            console.log(`❌ Member ${userId} not found in guild`);
            return false;
        }
        
        console.log(`✅ Completing verification for ${member.user.tag}`);
        
        // 1. ELIMINAR rol "Not verified"
        const notVerifiedRole = guild.roles.cache.find(r => r.name === NOT_VERIFIED_ROLE);
        if (notVerifiedRole && member.roles.cache.has(notVerifiedRole.id)) {
            await member.roles.remove(notVerifiedRole);
            console.log(`   ➖ Removed "${NOT_VERIFIED_ROLE}" role`);
        }
        
        // 2. ELIMINAR otros roles de alianza
        for (const alliance of VALID_ALLIANCES) {
            const role = guild.roles.cache.find(r => r.name === alliance);
            if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`   ➖ Removed old alliance role: ${alliance}`);
            }
        }
        
        // 3. ASIGNAR nuevo rol de alianza
        const newRole = guild.roles.cache.find(r => r.name === userInfo.alliance);
        if (!newRole) {
            console.log(`❌ Role ${userInfo.alliance} not found`);
            return false;
        }
        
        await member.roles.add(newRole);
        console.log(`   ➕ Added alliance role: ${userInfo.alliance}`);
        
        return {
            success: true,
            removedNotVerified: notVerifiedRole ? true : false,
            addedRole: userInfo.alliance,
            memberTag: member.user.tag
        };
        
    } catch (error) {
        console.error(`❌ Error completing verification:`, error.message);
        return false;
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
            
            // COMANDO !changealliance
            if (content.toLowerCase() === '!changealliance') {
                console.log(`🔄 ${userTag} requested alliance change`);
                
                await message.author.send({
                    content: '**🔄 ALLIANCE CHANGE REQUESTED**\n\nTo change your alliance, please type your **new alliance**:\n\nType: **FKIT**, **ISL**, **DNT**, or **TNT**\n\n*Note: Your previous alliance role will be automatically removed.*'
                });
                
                userData.set(userId, {
                    step: 'changing_alliance',
                    discordTag: userTag,
                    discordId: userId
                });
                
                return;
            }
            
            // SI YA ESTÁ EN PROCESO
            if (userData.has(userId)) {
                const userInfo = userData.get(userId);
                
                // PROCESO DE REGISTRO NORMAL
                if (userInfo.step === 1) {
                    const answer = content.toUpperCase();
                    
                    if (!VALID_ALLIANCES.includes(answer)) {
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
                    // **VALIDACIÓN EXACTA: DEBE SER 16 CARACTERES**
                    
                    // Primero verificar si está vacío
                    if (!content) {
                        await message.author.send('❌ **Please provide your in-game ID.**');
                        return;
                    }
                    
                    // **DEBE SER EXACTAMENTE 16 CARACTERES**
                    if (content.length !== 16) {
                        await message.author.send(`❌ **Invalid Game ID length!**\n\n**Your ID has ${content.length} characters.**\n**Required: EXACTLY 16 characters.**\n\nPlease provide a valid 16-character Game ID.`);
                        return;
                    }
                    
                    // Validar que solo contenga caracteres válidos (números y letras)
                    if (!/^[a-zA-Z0-9]+$/.test(content)) {
                        await message.author.send('❌ **Invalid characters!**\nGame ID can only contain letters and numbers (no spaces or special characters).');
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
                        await message.author.send('❌ **Invalid nickname!**\nPlease provide a valid in-game nickname (minimum 2 characters)');
                        return;
                    }
                    
                    if (content.length > 32) {
                        await message.author.send(`❌ **Nickname too long!**\nMaximum 32 characters allowed.\n\nYour nickname has **${content.length}** characters.`);
                        return;
                    }
                    
                    userInfo.nickname = content;
                    
                    console.log(`\n📋 ${userTag} completed registration!`);
                    console.log(`   Alliance: ${userInfo.alliance}`);
                    console.log(`   Game ID: ${userInfo.gameId}`);
                    console.log(`   Nickname: ${userInfo.nickname}`);
                    
                    // COMPLETAR VERIFICACIÓN (quitar "Not verified", añadir alianza)
                    let verificationResult = false;
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            const result = await completeVerification(userId, userInfo, guild);
                            verificationResult = result && result.success;
                        }
                    } catch (verifyError) {
                        console.error('Verification error:', verifyError.message);
                    }
                    
                    // GUARDAR EN REGISTROS
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            await saveToRegistersChannel(guild, userInfo, 'NEW REGISTRATION');
                        }
                    } catch (saveError) {
                        console.error('Save error:', saveError.message);
                    }
                    
                    // CONFIRMACIÓN AL USUARIO
                    let confirmationMessage = `✅ **REGISTRATION COMPLETE!** 🎉\n\n`;
                    confirmationMessage += `**Your information has been registered:**\n`;
                    confirmationMessage += `• Alliance: **${userInfo.alliance}**\n`;
                    confirmationMessage += `• Game ID: **${userInfo.gameId}**\n`;
                    confirmationMessage += `• Nickname: **${userInfo.nickname}**\n\n`;
                    
                    if (verificationResult) {
                        confirmationMessage += `🔓 **Verification completed!**\n`;
                        confirmationMessage += `• Removed: **"${NOT_VERIFIED_ROLE}"** role\n`;
                        confirmationMessage += `• Added: **${userInfo.alliance}** role\n\n`;
                        confirmationMessage += `You now have full access to all channels.\n\n`;
                    } else {
                        confirmationMessage += `⚠️ **Role assignment may have failed.**\n`;
                        confirmationMessage += `Please contact an administrator if you don't have access.\n\n`;
                    }
                    
                    confirmationMessage += `🌍 **Translation Feature:**\nYou can translate any message by reacting with flag emojis.\n\n`;
                    confirmationMessage += `🔄 **To change alliance later:** Type \`!changealliance\` in our DMs.\n\n`;
                    confirmationMessage += `Enjoy your stay in the server! 👋`;
                    
                    await message.author.send({
                        content: confirmationMessage
                    });
                    
                    // LIMPIAR DATOS
                    userData.delete(userId);
                    
                    // ANUNCIAR EN BIENVENIDA
                    if (verificationResult) {
                        try {
                            const guild = client.guilds.cache.first();
                            const welcomeChannel = guild.channels.cache.find(ch => 
                                ch.type === 0 && ch.name === '👋-welcome'
                            );
                            if (welcomeChannel) {
                                await welcomeChannel.send({
                                    content: `🎉 <@${userId}> has completed verification and joined the **${userInfo.alliance}** alliance! Welcome! 👏`
                                });
                            }
                        } catch (e) {
                            // Ignorar
                        }
                    }
                }
                
                // PROCESO DE CAMBIO DE ALIANZA
                else if (userInfo.step === 'changing_alliance') {
                    const newAlliance = content.toUpperCase();
                    
                    if (!VALID_ALLIANCES.includes(newAlliance)) {
                        await message.author.send('❌ **Invalid alliance!**\nType: FKIT, ISL, DNT, or TNT');
                        return;
                    }
                    
                    console.log(`\n🔄 ${userTag} changing alliance to: ${newAlliance}`);
                    
                    // CAMBIAR ALIANZA
                    try {
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            const result = await changeUserAlliance(userId, newAlliance, guild);
                            
                            if (result && result.success) {
                                // Actualizar información del usuario
                                userInfo.alliance = newAlliance;
                                userInfo.step = 'changing_alliance_success';
                                userData.set(userId, userInfo);
                                
                                // Guardar en registros
                                await saveToRegistersChannel(guild, {
                                    discordTag: userTag,
                                    discordId: userId,
                                    alliance: newAlliance,
                                    gameId: userInfo.gameId || 'Not provided',
                                    nickname: userInfo.nickname || 'Not provided'
                                }, 'ALLIANCE CHANGE');
                                
                                // Enviar confirmación
                                let changeMessage = `✅ **ALLIANCE CHANGED SUCCESSFULLY!**\n\n`;
                                changeMessage += `**Your new alliance:** **${newAlliance}**\n\n`;
                                
                                if (result.removedRoles.length > 0) {
                                    changeMessage += `**Removed previous roles:** ${result.removedRoles.join(', ')}\n`;
                                }
                                
                                changeMessage += `**Added new role:** ${newAlliance}\n\n`;
                                changeMessage += `The change has been recorded in the server logs.\n\n`;
                                changeMessage += `You now have access to the ${newAlliance} alliance channels.`;
                                
                                await message.author.send({
                                    content: changeMessage
                                });
                                
                                console.log(`✅ Alliance changed for ${userTag}: ${result.removedRoles.join(', ')} ➔ ${newAlliance}`);
                                
                                // Anunciar en bienvenida (opcional)
                                try {
                                    const welcomeChannel = guild.channels.cache.find(ch => 
                                        ch.type === 0 && ch.name === '👋-welcome'
                                    );
                                    if (welcomeChannel) {
                                        await welcomeChannel.send({
                                            content: `🔄 <@${userId}> has changed alliance to **${newAlliance}**!`
                                        });
                                    }
                                } catch (e) {
                                    // Ignorar
                                }
                                
                            } else {
                                await message.author.send('❌ **Error changing alliance!**\nPlease contact an administrator.');
                            }
                        }
                    } catch (error) {
                        console.error('Error in alliance change:', error.message);
                        await message.author.send('❌ **An error occurred!**\nPlease try again or contact an administrator.');
                    }
                    
                    // Limpiar datos
                    userData.delete(userId);
                }
                
                return;
            }
            
            // MENSAJE NORMAL EN DM
            await message.author.send({
                content: 'Available commands:\n\n' +
                        '• `!register` - Start registration\n' +
                        '• `!changealliance` - Change your alliance\n\n' +
                        'Type one of the commands above to continue.'
            });
            
        } catch (error) {
            console.error('DM error:', error.message);
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
