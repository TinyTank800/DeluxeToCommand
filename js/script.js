document.addEventListener("DOMContentLoaded", function () {
    // Element References
    const themeToggleButton = document.getElementById('theme-toggle');
    const helpToggleButton = document.getElementById('help-toggle-button');
    const helpSection = document.getElementById('help-section');
    const convertButton = document.getElementById("convert-button");
    const copyButton = document.getElementById("copy-button");
    const downloadButton = document.getElementById("download-button");
    const clearButton = document.getElementById("clear-button");
    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("file-upload");
    const yamlInput = document.getElementById("yaml-input");
    const outputContainer = document.getElementById("output-container");
    const outputBox = document.getElementById("output-box");
    const requirementWarning = document.getElementById("requirement-warning");
    const requirementList = document.getElementById("requirement-list");
    const bodyElement = document.body;
    const supportersListDiv = document.getElementById('supporters-list');

    // Conversion Logic
    function convertYAML() {
        if (!yamlInput || !outputBox || !outputContainer || !requirementWarning || !requirementList) {
            console.error("Missing elements required for conversion.");
            alert("Error: UI elements missing. Conversion cannot proceed.");
            return;
        }
        let inputYAML = yamlInput.value;

        try {
            let data = jsyaml.load(inputYAML);
            let convertedYAML = { "panels": {} };
            let allRequirementDetails = [];

            // Check if the input has a 'menus' key (multiple menus) or not (single menu)
            if (data.menus) {
                for (let menuName in data.menus) {
                    let menuData = data.menus[menuName];
                    let requirements = convertMenu(menuData, menuName, convertedYAML);
                    allRequirementDetails = allRequirementDetails.concat(requirements);
                }
            } else {
                let requirements = convertMenu(data, "ConvertedPanel", convertedYAML);
                allRequirementDetails = allRequirementDetails.concat(requirements);
            }

            if (allRequirementDetails.length > 0) {
                showRequirementWarning(allRequirementDetails);
            }

            let outputText = jsyaml.dump(convertedYAML, { noRefs: true, indent: 2 });
            outputBox.innerText = outputText;
            outputContainer.style.display = "block";
        } catch (error) {
            alert("Error parsing YAML: " + error);
        }
    }

    // Converts a single DeluxeMenus menu structure to CommandPanels format
    function convertMenu(data, panelName, convertedYAML) {
        let allRequirementDetails = [];

        try {
            // --- Panel Settings --- 
            let panel = {
                title: data.menu_title || `&8${panelName}`,
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

            // --- Item Settings --- 
            let items = {}
            if (data.items) {
                for (let itemKey in data.items) {
                    let itemData = data.items[itemKey];
                    if (!("slot" in itemData)) continue;

                    let slot = itemData.slot;
                    let priority = itemData.priority || 0;

                    if (!items[slot]) {
                        items[slot] = {}
                    }

                    // Store item data indexed by slot and priority
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

                    // Store requirements separately for later processing
                    if (itemData.view_requirement) {
                        items[slot][priority].view_requirements = itemData.view_requirement.requirements;
                    }
                    if (itemData.click_requirement) {
                        items[slot][priority].click_requirements = itemData.click_requirement.requirements;
                    }
                }
            }

            // Process items per slot, handling priorities for 'hasX' sections
            for (let slot in items) {
                let priorities = Object.keys(items[slot]).map(Number).sort((a, b) => b - a);

                priorities.forEach((priority, index) => {
                    let targetItem;
                    let targetSection = index === 0 ? null : `has${index - 1}`;

                    if (targetSection) {
                        // Create hasX section if it doesn't exist
                        if (!panel.item[slot]) panel.item[slot] = {}; // Ensure base slot exists
                        panel.item[slot][targetSection] = {};
                        targetItem = panel.item[slot][targetSection];
                    } else {
                        // Assign to the main item slot
                        panel.item[slot] = {};
                        targetItem = panel.item[slot];
                    }

                    // Assign common properties
                    targetItem.material = items[slot][priority].material || "STONE";
                    targetItem.stack = items[slot][priority].stack || 1;
                    if (items[slot][priority].name) targetItem.name = items[slot][priority].name;
                    if (items[slot][priority].lore) targetItem.lore = items[slot][priority].lore;
                    if (items[slot][priority].enchanted) targetItem.enchanted = items[slot][priority].enchanted;
                    if (items[slot][priority].customdata) targetItem.customdata = items[slot][priority].customdata;
                    if (items[slot][priority].commands) targetItem.commands = items[slot][priority].commands;

                    // Process requirements only for hasX sections
                    if (targetSection) {
                        let mergedRequirements = [];
                        if (items[slot][priority].view_requirements) {
                            mergedRequirements = mergedRequirements.concat(items[slot][priority].view_requirements);
                        }
                        if (items[slot][priority].click_requirements) {
                            mergedRequirements = mergedRequirements.concat(items[slot][priority].click_requirements);
                        }
                        if (mergedRequirements.length > 0) {
                            convertRequirements(mergedRequirements, panel, slot, targetSection, allRequirementDetails);
                        }
                    }
                });
            }

            convertedYAML.panels[panelName] = panel;

            return allRequirementDetails;
        } catch (error) {
            console.error(`Error converting menu ${panelName}:`, error);
            alert(`Error converting menu ${panelName}: ${error}`);
            return [];
        }
    }

    // Converts DeluxeMenus requirements to CommandPanels hasX conditions
    function convertRequirements(requirements, panel, slot, hasSection, allRequirementDetails) {
        requirements.forEach(requirement => {
            // Requirement name is the key, details are the value
            var firstRequirement = Object.values(requirement)[0];
            if (!firstRequirement || !firstRequirement.type) return;

            let condition = {};

            // Basic requirement type conversions
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

            // Assign converted conditions to the target hasX section
            panel.item[slot][hasSection].value0 = condition.value0;
            panel.item[slot][hasSection].compare0 = condition.compare0;
        });
    }

    // Displays requirement conversion warnings
    function showRequirementWarning(requirementDetails) {
        if (!requirementWarning || !requirementList) return;
        requirementList.innerHTML = ""; // Clear previous
        requirementDetails.forEach(detail => {
            let listItem = document.createElement("li");
            listItem.textContent = detail;
            requirementList.appendChild(listItem);
        });
        requirementWarning.style.display = "block"; // Make visible
    }

    // Converts DeluxeMenus command/placeholder tags to CommandPanels equivalents
    function checkTags(commands) {
        var newCommands = commands.map(command => {
            return command
                // Command tags
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
                // Placeholders
                .replace("%player%", "%cp-player-name%")
                .replace("%player_name%", "%cp-player-name%")
                .replace("%player_displayname%", "%cp-player-display-name%")
                .replace("%player_uuid%", "%cp-player-uuid%")
                .replace("%world%", "%cp-player-world%")
                .replace("%player_x%", "%cp-player-loc-x%")
                .replace("%player_y%", "%cp-player-loc-y%")
                .replace("%player_z%", "%cp-player-loc-z%")
                .replace("%server_name%", "%cp-server-name%")
                .replace("%online%", "%cp-server-online%")
                .replace("%max_players%", "%cp-server-max-players%")
                .replace("%tps%", "%cp-server-tps%")
                .replace("%motd%", "%cp-server-motd%")
                .replace("%player_ping%", "%cp-player-ping%")
                .replace("%player_level%", "%cp-player-level%")
                .replace("%player_exp%", "%cp-player-exp%")
                .replace("%player_saturation%", "%cp-player-saturation%")
                .replace("%player_hunger%", "%cp-player-hunger%")
                .replace("%player_gamemode%", "%cp-player-gamemode%")
                .replace("%player_health%", "%cp-player-health%")
                .replace("%player_max_health%", "%cp-player-max-health%")
                .replace("%vault_eco_balance%", "%cp-player-balance%")
                .replace("%vault_eco_balance_formatted%", "%cp-player-balance-formatted%")
                .replace("%time%", "%cp-server-time%");
        });
        return newCommands;
    }

    // Supporter Loading Logic
    async function loadSupporters() {
        if (!supportersListDiv) {
            console.error("Supporters list element (#supporters-list) not found.");
            return;
        }
        supportersListDiv.innerHTML = "<p>Loading supporters...</p>";

        try {
            const response = await fetch("members.json");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const supportersData = await response.json();
            supportersListDiv.innerHTML = ""; // Clear loading message

            if (Array.isArray(supportersData) && supportersData.length > 0) {
                 supportersData.forEach(supporter => {
                    const supporterElement = document.createElement('div');
                    supporterElement.classList.add('supporter-name');
                    supporterElement.textContent = supporter.name;
                    if (supporter.tier !== undefined) {
                        supporterElement.setAttribute('data-tier', supporter.tier);
                    }
                    supportersListDiv.appendChild(supporterElement);
                 });
            } else {
                supportersListDiv.innerHTML = "<p>Become the first supporter!</p>";
            }
        } catch (error) {
            console.error("Error loading or processing members.json:", error);
            supportersListDiv.innerHTML = "<p>Error loading supporters.</p>";
        }
    }

    // Theme Toggling Logic
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme(theme) {
        if (!bodyElement) return;
        bodyElement.setAttribute('data-theme', theme);
        if (themeToggleButton) {
            themeToggleButton.setAttribute('aria-checked', theme === 'light');
        }
        localStorage.setItem('theme', theme);
    }

    function toggleTheme() {
        if (!bodyElement) return;
        const currentTheme = bodyElement.getAttribute('data-theme') || (prefersDarkScheme.matches ? 'dark' : 'light');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            applyTheme(savedTheme);
        } else {
            applyTheme(prefersDarkScheme.matches ? 'dark' : 'light');
        }
    }

    // Help Section Toggle Logic
    function toggleHelpSection() {
        if (helpSection && helpToggleButton) {
            const isOpen = helpSection.classList.toggle('open');
            helpToggleButton.setAttribute('aria-expanded', isOpen);
        }
    }

    // File Handling Logic
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlightDropArea() {
        if (dropArea) dropArea.classList.add('dragover');
    }

    function unhighlightDropArea() {
        if (dropArea) dropArea.classList.remove('dragover');
    }

    function handleDrop(e) {
        unhighlightDropArea();
        let dt = e.dataTransfer;
        let files = dt.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    }

    function handleFileSelect(e) {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    }

    function handleFileUpload(file) {
        if (file && (file.name.endsWith('.yml') || file.name.endsWith('.yaml'))) {
            if (yamlInput) {
                let reader = new FileReader();
                reader.onload = function (e) {
                    yamlInput.value = e.target.result;
                };
                reader.onerror = function (e) {
                    alert("Error reading file: " + e.target.error);
                };
                reader.readAsText(file);
            } else {
                console.error("YAML input element not found for file upload.");
                alert("Error: Cannot load file content.");
            }
        } else {
            alert("Please upload a valid YAML file (.yml or .yaml).");
        }
    }

    // Event Listener Setup
    if (convertButton) {
        convertButton.addEventListener("click", convertYAML);
    } else {
        console.error("Convert button not found!");
    }

    if (copyButton && outputBox) {
        copyButton.addEventListener("click", function () {
            navigator.clipboard.writeText(outputBox.innerText).then(() => {
                alert("Copied to clipboard!");
            }, () => {
                alert("Failed to copy!");
            });
        });
    } else {
        if (!copyButton) console.error("Copy button not found!");
        if (!outputBox) console.error("Output box not found!");
    }

    if (downloadButton && outputBox) {
        downloadButton.addEventListener("click", function () {
            let outputText = outputBox.innerText;
            let blob = new Blob([outputText], { type: "text/yaml" });
            let url = URL.createObjectURL(blob);
            let a = document.createElement("a");
            a.href = url;
            let panelName = "converted_panel";
            try {
                let parsedOutput = jsyaml.load(outputText);
                if (parsedOutput && parsedOutput.panels) {
                    panelName = Object.keys(parsedOutput.panels)[0] || panelName;
                }
            } catch (e) {
                console.error("Could not parse output YAML for filename:", e);
            }
            a.download = `${panelName}.yml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    } else {
        if (!downloadButton) console.error("Download button not found!");
        if (!outputBox) console.error("Output box not found!");
    }

    if (clearButton && yamlInput && outputContainer && requirementWarning && requirementList) {
        clearButton.addEventListener("click", function () {
            yamlInput.value = "";
            outputContainer.style.display = "none";
            requirementWarning.style.display = "none";
            requirementList.innerHTML = "";
            if (fileInput) fileInput.value = null;
        });
    } else {
        if (!clearButton) console.error("Clear button not found!");
        if (!yamlInput) console.error("YAML input not found!");
        if (!outputContainer) console.error("Output container not found!");
        if (!requirementWarning) console.error("Requirement warning not found!");
        if (!requirementList) console.error("Requirement list not found!");
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    } else {
        console.error("Theme toggle button not found!");
    }

    if (helpToggleButton && helpSection) {
        helpToggleButton.addEventListener('click', toggleHelpSection);
    } else {
        if (!helpToggleButton) console.error("Help toggle button not found!");
        if (!helpSection) console.error("Help section container not found!");
    }

    if (dropArea && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlightDropArea, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlightDropArea, false);
        });
        dropArea.addEventListener('drop', handleDrop, false);
        fileInput.addEventListener('change', handleFileSelect, false);
    } else {
        if (!dropArea) console.error("Drop area not found!");
        if (!fileInput) console.error("File input not found!");
    }

    // Initial Setup Calls
    initializeTheme();
    loadSupporters();
});