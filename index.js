const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const token = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; 
const GUILD_ID = process.env.GUILD_ID; 

let reports = [];
if (fs.existsSync("reports.json")) {
    reports = JSON.parse(fs.readFileSync("reports.json"));
}

// Définition des commandes
const commands = [
    new SlashCommandBuilder()
        .setName("rapport")
        .setDescription("Créer un rapport staff pour un joueur Roblox")
        .addStringOption(option =>
            option.setName("pseudo")
                .setDescription("Pseudo Roblox du joueur")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("raison")
                .setDescription("Raison du rapport")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("sanction")
                .setDescription("Sanction appliquée")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("durée")
                .setDescription("Durée de la sanction (ex: 7j, permanent)")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("rapportview")
        .setDescription("Voir tous les rapports pour un pseudo Roblox")
        .addStringOption(option =>
            option.setName("pseudo")
                .setDescription("Pseudo Roblox du joueur")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("rapportdelete")
        .setDescription("Supprimer un rapport par son ID")
        .addIntegerOption(option =>
            option.setName("id")
                .setDescription("ID du rapport à supprimer")
                .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
    try {
        console.log("Enregistrement des commandes slash...");
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("Commandes enregistrées.");
    } catch (error) {
        console.error(error);
    }
})();

client.on("ready", () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "rapport") {
        const pseudo = interaction.options.getString("pseudo");
        const raison = interaction.options.getString("raison");
        const sanction = interaction.options.getString("sanction");
        const durée = interaction.options.getString("durée");

        const report = {
            id: reports.length + 1,
            pseudo,
            raison,
            sanction,
            durée,
            staff: interaction.user.tag,
            date: new Date().toISOString()
        };
        reports.push(report);
        fs.writeFileSync("reports.json", JSON.stringify(reports, null, 2));

        const embed = new EmbedBuilder()
            .setTitle("📑 Nouveau Rapport")
            .setColor("Red")
            .addFields(
                { name: "👤 Joueur (Roblox)", value: pseudo, inline: true },
                { name: "📌 Raison", value: raison, inline: true },
                { name: "🚨 Sanction", value: sanction, inline: true },
                { name: "⏳ Durée", value: durée, inline: true }
            )
            .setFooter({ text: `Staff: ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === "rapportview") {
        const pseudo = interaction.options.getString("pseudo");
        const playerReports = reports.filter(r => r.pseudo.toLowerCase() === pseudo.toLowerCase());

        if (playerReports.length === 0) {
            await interaction.reply(`Aucun rapport trouvé pour **${pseudo}**.`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📂 Rapports pour ${pseudo}`)
            .setColor("Blue");

        playerReports.forEach(r => {
            embed.addFields({
                name: `🆔 Rapport #${r.id}`,
                value: `**Raison :** ${r.raison}
**Sanction :** ${r.sanction}
**Durée :** ${r.durée}
**Staff :** ${r.staff}
**Date :** ${r.date}`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === "rapportdelete") {
        const id = interaction.options.getInteger("id");
        const index = reports.findIndex(r => r.id === id);
        if (index === -1) {
            await interaction.reply(`⚠️ Aucun rapport avec l'ID ${id}.`);
            return;
        }
        reports.splice(index, 1);
        fs.writeFileSync("reports.json", JSON.stringify(reports, null, 2));
        await interaction.reply(`🗑️ Rapport #${id} supprimé.`);
    }
});

client.login(token);
