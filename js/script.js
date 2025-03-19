//////////////////// Main Conversion ////////////////////

document.addEventListener("DOMContentLoaded", function () {
    function convertYAML() {
        let inputYAML = document.getElementById("yaml-input").value;

        try {
            let data = jsyaml.load(inputYAML);
            let tempData = data;
            let convertedYAML = { "panels": {} };

            // Panel Settings //
            let panel = {
                title: data.menu_title || "&8Converted Menu",
                rows: Math.ceil(data.size / 9) || 1,
                perm: "default",
                empty: data.empty || "BLACK_STAINED_GLASS_PANE",
                item: {}
            };

            if (data.open_command) {
                panel.commands = Array.isArray(data.open_command) ? data.open_command : [data.open_command];
            }
            if (data.open_commands) {
                panel["commands-on-open"] = checkTags(data.open_commands);
            }
            if (data.close_commands) {
                panel["commands-on-close"] = checkTags(data.close_commands);
            }
            if (data.update_interval) panel["refresh-delay"] = data.update_interval * 20;

            // Panel Settings //

            let allRequirementDetails = [];

            let items = {}

            // Item Settings //
            if (tempData.items) {
                for (let itemKey in tempData.items) {
                    let itemData = tempData.items[itemKey];
                    if (!("slot" in itemData)) continue;

                    let slot = itemData.slot;
                    let priority = itemData.priority || 0;

                    if (!items[slot]) {
                        items[slot] = {}
                    }

                    items[slot][priority] = {
                        material: itemData.material || "STONE",
                        stack: itemData.amount || itemData.dynamic_amount || 1,
                    };

                    if (itemData.display_name) items[slot][priority].name = itemData.display_name;
                    if (itemData.lore) items[slot][priority].lore = itemData.lore;
                    if (itemData.enchantments) items[slot][priority].enchanted = itemData.enchantments;
                    if (itemData.model_data) items[slot][priority].customdata = itemData.model_data;
                    if (itemData.click_commands) {
                        items[slot][priority].commands = checkTags(itemData.click_commands);
                    }

                    if (itemData.view_requirement) {
                        items[slot][priority].view_requirements = itemData.view_requirement.requirements;
                    }
                    if (itemData.click_requirement) {
                        items[slot][priority].click_requirements = itemData.click_requirement.requirements;
                    }
                }
            }

            // Loop through all slots in items
            for (let slot in items) {
                let priorities = Object.keys(items[slot]).map(Number).sort((a, b) => b - a);

                priorities.forEach((priority, index) => {
                    if (index === 0) {
                        // First priority should be the main item
                        panel.item[slot] = {
                            material: items[slot][priority].material || "STONE",
                            stack: items[slot][priority].stack || 1,
                        };

                        if (items[slot][priority].name) panel.item[slot].name = items[slot][priority].name;
                        if (items[slot][priority].lore) panel.item[slot].lore = items[slot][priority].lore;
                        if (items[slot][priority].enchanted) panel.item[slot].enchanted = items[slot][priority].enchanted;
                        if (items[slot][priority].customdata) panel.item[slot].customdata = items[slot][priority].customdata;
                        if (items[slot][priority].commands) panel.item[slot].commands = items[slot][priority].commands;
                    } else {
                        // Higher priorities go into hasX
                        let hasIndex = index - 1; // First "has0", then "has1", etc.
                        panel.item[slot][`has${hasIndex}`] = {
                            material: items[slot][priority].material || "STONE",
                            stack: items[slot][priority].stack || 1,
                        };

                        if (items[slot][priority].name) panel.item[slot][`has${hasIndex}`].name = items[slot][priority].name;
                        if (items[slot][priority].lore) panel.item[slot][`has${hasIndex}`].lore = items[slot][priority].lore;
                        if (items[slot][priority].enchanted) panel.item[slot][`has${hasIndex}`].enchanted = items[slot][priority].enchanted;
                        if (items[slot][priority].customdata) panel.item[slot][`has${hasIndex}`].customdata = items[slot][priority].customdata;
                        if (items[slot][priority].commands) panel.item[slot][`has${hasIndex}`].commands = items[slot][priority].commands;

                        // **Fixing Requirements Merging**
                        let mergedRequirements = [];

                        if (items[slot][priority].view_requirements) {
                            mergedRequirements = mergedRequirements.concat(items[slot][priority].view_requirements);
                        }
                        if (items[slot][priority].click_requirements) {
                            mergedRequirements = mergedRequirements.concat(items[slot][priority].click_requirements);
                        }

                        // If there are any requirements, process them
                        if (mergedRequirements.length > 0) {
                            convertRequirements(mergedRequirements, panel, slot, `has${hasIndex}`, allRequirementDetails);
                        }
                    }
                });
            }

            convertedYAML.panels["ConvertedPanel"] = panel;

            if (allRequirementDetails.length > 0) {
                showRequirementWarning(allRequirementDetails);
            }

            let outputText = jsyaml.dump(convertedYAML, { noRefs: true, indent: 2 });
            document.getElementById("output-box").innerText = outputText;
            document.getElementById("output-container").style.display = "block";
        } catch (error) {
            alert("Error parsing YAML: " + error);
        }
    }


    //////////////////// Main Conversion ////////////////////



    //////////////////// Requirement Conversion ////////////////////

    function convertRequirements(requirements, panel, slot, hasSection, allRequirementDetails) {
        console.log("Starting requirement conversion.")

        requirements.forEach(requirement => {
            var firstRequirement = Object.values(requirement)[0] //Have to use this as name of requirement is first then the type details.

            if (!firstRequirement || !firstRequirement.type) return;

            let condition = {};

            if (firstRequirement.type.includes("has permission")) {
                let permission = firstRequirement.permission;
                let not = firstRequirement.type.includes("!");
                condition.value0 = not ? 'NOT %cp-player-name% HASPERM' : '%cp-player-name% HASPERM';
                condition.compare0 = permission;
                allRequirementDetails.push(`Slot ${slot}: Requires permission '${permission}'`);
            }
            if (firstRequirement.type.includes("has money")) {
                let amount = firstRequirement.amount;
                let not = firstRequirement.type.includes("!");
                condition.value0 = not ? 'NOT %cp-player-balance% ISGREATER' : '%cp-player-balance% ISGREATER';
                condition.compare0 = amount;
                allRequirementDetails.push(`Slot ${slot}: Requires at least $${amount}`);
            }
            if (firstRequirement.type.includes("string equals")) {
                let input = firstRequirement.input;
                let output = firstRequirement.output;
                let not = firstRequirement.type.includes("!");
                condition.value0 = not ? "NOT " + input : input;
                condition.compare0 = output;
                allRequirementDetails.push(`Slot ${slot}: Requires '${input}' to equal '${output}'`);
            }

            panel.item[slot][hasSection].value0 = condition.value0;
            panel.item[slot][hasSection].compare0 = condition.compare0;

            // Debugging Output
            console.log(`Assigning ${hasSection} to slot ${slot}:`, condition);
        });
    }

    //////////////////// Requirement Conversion ////////////////////



    //////////////////// Show Warning ////////////////////

    function showRequirementWarning(requirementDetails) {
        let warningBox = document.getElementById("requirement-warning");
        let requirementList = document.getElementById("requirement-list");

        // Clear previous messages
        requirementList.innerHTML = "";

        // Add each requirement as a list item
        requirementDetails.forEach(detail => {
            let listItem = document.createElement("li");
            listItem.textContent = detail;
            requirementList.appendChild(listItem);
        });

        // Make the warning box visible
        warningBox.style.display = "block";
    }

    //////////////////// Show Warning ////////////////////



    //////////////////// Tag Conversion ////////////////////

    function checkTags(commands) {
        var newCommands = commands.map(command => {
            return command
                //command tags
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
                .replace("[chat]", "send=")
                //Placeholders
                .replace("%player_name%", "%cp-player-name%");
        });

        return newCommands;
    }

    //////////////////// Tag Conversion ////////////////////



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



//////////////////// Copy Button ////////////////////

document.getElementById("copy-button").addEventListener("click", function () {
    let outputBox = document.getElementById("output-box");

    if (!outputBox) {
        alert("Output box not found!");
        return;
    }

    let textToCopy = outputBox.innerText; // Use innerText to preserve formatting

    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy text:", err);
        alert("Copy failed. Please try again.");
    });
});

//////////////////// Copy Button ////////////////////
