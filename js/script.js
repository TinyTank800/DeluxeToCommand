document.addEventListener("DOMContentLoaded", function () {
    function convertYAML() {
        let inputYAML = document.getElementById("yaml-input").value;

        try {
            let data = jsyaml.load(inputYAML);
            let convertedYAML = { "panels": {} };

            if (data.menus) {
                for (let menuName in data.menus) {
                    let menuData = data.menus[menuName];

                    let panel = {
                        title: menuData.title || "&8Converted Menu",
                        rows: Math.ceil(menuData.size / 9) || 1,
                        perm: "default",
                        empty: menuData.empty || "STAINED_GLASS_PANE",
                        items: {}
                    };

                    if (menuData.items) {
                        for (let itemKey in menuData.items) {
                            let itemData = menuData.items[itemKey];
                            if (!("slot" in itemData)) continue;

                            let slot = String(itemData.slot);
                            panel.items[slot] = {
                                material: itemData.material || "STONE",
                                name: itemData.display_name || "&aUnnamed Item",
                                lore: itemData.lore || [],
                                enchanted: itemData.enchanted ? itemData.enchanted : [],
                            };
                        }
                    }

                    convertedYAML.panels[menuName] = panel;
                }
            }

            let outputText = jsyaml.dump(convertedYAML, { noRefs: true, indent: 2 });
            document.getElementById("output-box").innerText = outputText;
            document.getElementById("output-container").style.display = "block";
        } catch (error) {
            alert("Error parsing YAML: " + error);
        }
    }

    function toggleTheme() {
        let currentTheme = document.body.getAttribute("data-theme");
        let newTheme = currentTheme === "dark" ? "light" : "dark";

        // Apply new theme
        document.body.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);

        // Update toggle button styling
        updateToggleUI(newTheme);
    }

    function applyStoredTheme() {
        let savedTheme = localStorage.getItem("theme") || "dark"; // Default to dark mode
        document.body.setAttribute("data-theme", savedTheme);

        // Update the toggle switch UI on load
        updateToggleUI(savedTheme);
    }

    function updateToggleUI(theme) {
        let toggleSwitch = document.getElementById("theme-toggle");
        if (theme === "light") {
            toggleSwitch.classList.add("light-mode");
        } else {
            toggleSwitch.classList.remove("light-mode");
        }
    }

    function fetchVersion() {
        fetch("https://raw.githubusercontent.com/TinyTank800/DeluxeToCommand/main/version.json")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to fetch version.json");
                }
                return response.json();
            })
            .then(data => {
                document.getElementById("version-number").textContent = `Version: ${data.version}`;
            })
            .catch(error => {
                console.error("Error fetching version:", error);
                document.getElementById("version-number").textContent = "Version: Error";
            });
    }
    
    // Run the function when the page loads
    document.addEventListener("DOMContentLoaded", fetchVersion);

    // Apply theme on page load
    applyStoredTheme();

    // Attach event listeners
    document.getElementById("convert-button").addEventListener("click", convertYAML);
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
});
