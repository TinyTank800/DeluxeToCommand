// Load Markdown parser
document.addEventListener("DOMContentLoaded", function () {
    fetch("https://raw.githubusercontent.com/TinyTank800/DeluxeToCommand/main/README.md")
        .then(response => response.text())
        .then(data => {
            let sponsorsSection = data.match(/<!-- sponsors -->([\s\S]*?)<!-- sponsors -->/);
            let sponsorListElement = document.getElementById("sponsor-list");

            if (sponsorsSection) {
                sponsorListElement.innerHTML = marked.parse(sponsorsSection[1]);
            } else {
                sponsorListElement.innerHTML = "No sponsors found.";
            }
        })
        .catch(error => console.error("Error fetching README:", error));
});
