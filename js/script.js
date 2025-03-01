//////////////////// Main Conversion ////////////////////

document.addEventListener("DOMContentLoaded", function () {
    function convertYAML() {
        let inputYAML = document.getElementById("yaml-input").value;

        try {
            let data = jsyaml.load(inputYAML);
            let convertedYAML = { "panels": {} };


            // Panel Settings //
            let panel = {
                title: data.menu_title || "&8Converted Menu",
                rows: Math.ceil(data.size / 9) || 1,
                perm: "default",
                empty: data.empty || "BLACK_STAINED_GLASS_PANE",
                items: {}
            };

            if (data.open_command) panel.commands = data.open_command;
            if (data.open_commands) {
                data.open_commands = data.open_commands.map(command => {
                    return command
                        .replace("[player]", "")
                        .replace("[console]", "console=")
                        .replace("[commandevent]", "sudo=")
                        .replace("[message]", "msg=")
                        .replace("[broadcast]", "broadcast=")
                        .replace("[openguimenu]", "open=")
                        .replace("[connect]", "server=")
                        .replace("[close]", "cpc")
                        .replace("[refresh]", "refresh")
                        .replace("[sound]", "sound=")
                        .replace("[takemoney]", "paywall=")
                        .replace("[takeexp]", "xp-paywall=")
                        .replace("[chat]", "send=");
                });

                panel["commands-on-open"] = data.open_commands;
            }
            if (data.close_commands) {
                data.close_commands = data.close_commands.map(command => {
                    return command
                        .replace("[player]", "")
                        .replace("[console]", "console=")
                        .replace("[commandevent]", "sudo=")
                        .replace("[message]", "msg=")
                        .replace("[broadcast]", "broadcast=")
                        .replace("[openguimenu]", "open=")
                        .replace("[connect]", "server=")
                        .replace("[close]", "cpc")
                        .replace("[refresh]", "refresh")
                        .replace("[sound]", "sound=")
                        .replace("[takemoney]", "paywall=")
                        .replace("[takeexp]", "xp-paywall=")
                        .replace("[chat]", "send=");
                });
            
                panel["commands-on-close"] = data.close_commands;
            }
            if (data.update_interval) panel["refresh-delay"] = data.update_interval * 20;

            
            // Panel Settings //

            // Item Settings //
            if (data.items) {
                for (let itemKey in data.items) {
                    let itemData = data.items[itemKey];
                    if (!("slot" in itemData)) continue;

                    let slot = itemData.slot;
                    panel.items[slot] = {
                        material: itemData.material || "STONE",
                        stack: itemData.amount || itemData.dynamic_amount || 1,
                    };

                    if(itemData.display_name) panel.items[slot].name = itemData.display_name;
                    if(itemData.lore) panel.items[slot].lore = itemData.lore;
                    if(itemData.enchantments) panel.items[slot].enchanted = itemData.enchantments;
                    if(itemData.model_data) panel.items[slot].customdata = itemData.model_data;
                }
            }
            // Item Settings //

            convertedYAML.panels["ConvertedPanel"] = panel;

            let outputText = jsyaml.dump(convertedYAML, { noRefs: true, indent: 2 });
            document.getElementById("output-box").innerText = outputText;
            document.getElementById("output-container").style.display = "block";
        } catch (error) {
            alert("Error parsing YAML: " + error);
        }
    }

    //////////////////// Main Conversion ////////////////////



    //////////////////// Themes ////////////////////

    function toggleTheme() {
        let currentTheme = document.body.getAttribute("data-theme");
        let newTheme = currentTheme === "dark" ? "light" : "dark";

        document.body.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    }

    function applyStoredTheme() {
        let savedTheme = localStorage.getItem("theme") || "dark";
        document.body.setAttribute("data-theme", savedTheme);
    }

    applyStoredTheme();

    // Attach event listeners
    document.getElementById("convert-button").addEventListener("click", convertYAML);
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

    //////////////////// Themes ////////////////////



    //////////////////// Help Tooltip ////////////////////

    // Get references to elements
    const helpIcon = document.getElementById("help-icon");
    const helpSection = document.getElementById("help-section");

    // Toggle Help Section on Click
    helpIcon.addEventListener("click", function () {
        helpSection.classList.toggle("open");
    });

    //////////////////// Help Tooltip ////////////////////



    //////////////////// Clear button ////////////////////

    document.getElementById("clear-button").addEventListener("click", () => {
        document.getElementById("yaml-input").value = "";
        document.getElementById("output-box").innerText = "";
        document.getElementById("output-container").style.display = "none";
    });

    //////////////////// Clear button ////////////////////



    //////////////////// Drag and drop upload ////////////////////

    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("file-upload");

    dropArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        dropArea.style.background = "rgba(255, 255, 255, 0.1)";
    });

    dropArea.addEventListener("dragleave", () => {
        dropArea.style.background = "transparent";
    });

    dropArea.addEventListener("drop", (event) => {
        event.preventDefault();
        dropArea.style.background = "transparent";

        let file = event.dataTransfer.files[0];
        handleFileUpload(file);
    });

    fileInput.addEventListener("change", () => {
        let file = fileInput.files[0];
        handleFileUpload(file);
    });

    function handleFileUpload(file) {
        if (file && file.name.endsWith(".yml") || file.name.endsWith(".yaml") || file.name.endsWith(".txt")) {
            let reader = new FileReader();
            reader.onload = function (event) {
                document.getElementById("yaml-input").value = event.target.result;
            };
            reader.readAsText(file);
        } else {
            alert("Please upload a valid YAML file.");
        }
    }

    //////////////////// Drag and drop upload ////////////////////
});
