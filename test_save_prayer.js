
const fetch = require('node-fetch');

const GAS_URL = "https://script.google.com/macros/s/AKfycbzxeKZ-3ibGFZf3r8T91KNPuvl8Kr5pFDxPPnddODhizSuYzY_LkkzTCFvMgEbSGfxF/exec";

async function testSavePrayer() {
    console.log("Testing savePrayer...");
    const payload = {
        mode: "savePrayer",
        groupId: "TEST_GROUP_ID", // Dummy group
        groupName: "Test Group",
        member: "Test Member",
        prayers: ["Test Prayer 1", "Test Prayer 2"],
        responses: ["기대중", "기대중"],
        comments: ["", ""],
        visibilities: ["Show", "Show"]
    };

    try {
        const response = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log("Response status:", response.status);
        console.log("Response body:", text);

        try {
            const json = JSON.parse(text);
            if (json.success) {
                console.log("✅ Save Prayer Success!");
            } else {
                console.error("❌ Save Prayer Failed:", json.message);
            }
        } catch (e) {
            console.error("❌ Invalid JSON response");
        }

    } catch (error) {
        console.error("❌ Network Error:", error);
    }
}

testSavePrayer();
