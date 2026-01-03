
const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in in Node 18+

// The NEW Deployment URL provided by the user
const GAS_URL = "https://script.google.com/macros/s/AKfycbzxjl8ZO8sCMGY7WNXGT0H4VxlTHYYqd-HVPEVOEGMg9fvdmaF1fRH4amG_9CnY2DP5/exec";

async function request(mode, method = 'GET', data = {}) {
    let url = `${GAS_URL}?mode=${mode}`;
    let options = { method };

    if (method === 'POST') {
        // GAS doPost expects payload in the body (or parameter for simple ones, but code.gs parse e.postData.contents)
        // We added data.mode in the body in code.gs checks
        data.mode = mode;
        options.body = JSON.stringify(data);
        options.headers = { 'Content-Type': 'application/json' };
    } else {
        // GET params
        const params = new URLSearchParams(data);
        url += `&${params.toString()}`;
    }

    try {
        const res = await fetch(url, options);
        // GAS setups redirects sometimes, fetch handles them.
        const json = await res.json();
        return json;
    } catch (e) {
        console.error(`Request Failed [${mode}]:`, e.message);
        return null; // Return null on failure
    }
}

async function runTest() {
    console.log("🚀 Starting Automated Backend Test...");
    const timestamp = Date.now();
    const adminId = `AutoTestAdmin_${timestamp}`;
    const pwd = "1234";
    const groupName = `AutoTestGroup_${timestamp}`;
    const memberName = "Tester1";

    // 1. Signup
    console.log(`\n1. Signing up as ${adminId}...`);
    const signupRes = await request('signup', 'GET', { id: adminId, pwd, email: 'test@example.com' }); // Signup is handled in doGet? No, code.gs handleSignup called from doGet? 
    // Wait, let's check code.gs doGet switch.
    // case "signup": output = handleSignup(e); -> It is in doGet.
    console.log("   Result:", signupRes);
    if (!signupRes || !signupRes.success) {
        console.error("❌ Signup failed. Aborting.");
        return;
    }

    // 2. Login (Verify)
    console.log(`\n2. Logging in...`);
    const loginRes = await request('login', 'GET', { id: adminId, pwd });
    console.log("   Result:", loginRes);
    if (!loginRes || !loginRes.success) {
        console.error("❌ Login failed.");
        return;
    }

    // 3. Create Group
    console.log(`\n3. Creating Group '${groupName}'...`);
    // handleAddGroup is doPost
    const createGroupRes = await request('addGroup', 'POST', {
        adminId,
        groupName,
        members: [memberName]
    });
    console.log("   Result:", createGroupRes);
    if (!createGroupRes || !createGroupRes.success) {
        console.error("❌ Group creation failed.");
        return;
    }
    const groupId = createGroupRes.groupId;
    console.log(`   ✅ Group Created: ID=${groupId}`);

    // 4. Initial Save Prayer (Prayer A)
    console.log(`\n4. Saving Prayer 'Prayer A' for ${memberName}...`);
    // handleSavePrayer is doPost
    const save1Res = await request('savePrayer', 'POST', {
        groupName,
        groupId,
        member: memberName,
        prayers: ["Prayer A"],
        responses: ["기대중"],
        comments: [""]
    });
    console.log("   Result:", save1Res);

    // Verify Save 1 (Check Date)
    const get1Res = await request('getPrayers', 'GET', { groupId, member: memberName });
    console.log("   ▶ Verification Fetch:", get1Res);
    if (get1Res.prayers[0] !== "Prayer A" || !get1Res.dates[0]) {
        console.error("❌ Prayer A save failed or date missing.");
    } else {
        console.log(`   ✅ Prayer A saved with date: ${get1Res.dates[0]}`);
    }

    // 5. Shift Test (Insert 'Prayer B' at front, 'Prayer A' moves to index 1)
    console.log(`\n5. Shift Test: Adding 'Prayer B' at top...`);
    const save2Res = await request('savePrayer', 'POST', {
        groupName,
        groupId,
        member: memberName,
        prayers: ["Prayer B", "Prayer A"], // Shifted
        responses: ["기대중", "기대중"],
        comments: ["", ""]
    });
    console.log("   Result:", save2Res);

    // Verify Shift
    const get2Res = await request('getPrayers', 'GET', { groupId, member: memberName });
    console.log("   ▶ Verification Fetch:", get2Res);

    const p1 = get2Res.prayers[0]; // B
    const p2 = get2Res.prayers[1]; // A
    const d1 = get2Res.dates[0];
    const d2 = get2Res.dates[1];

    if (p1 === "Prayer B" && p2 === "Prayer A") {
        console.log("   ✅ Order is correct (B, A).");
        if (d2 === get1Res.dates[0]) {
            console.log("   ✅ SUCCESS: 'Prayer A' preserved its original date after shifting!");
        } else {
            console.warn(`   ⚠️ Date changed for Prayer A? Original: ${get1Res.dates[0]}, New: ${d2}`);
        }
    } else {
        console.error("❌ Order mismatch.");
    }

    // 6. Visibility Test (Hide Prayer B)
    console.log(`\n6. Visibility Test: Hiding 'Prayer B'...`);
    // Frontend sends 'visibilities' if updated, OR 'responses'='숨김' for legacy/fallback.
    // Let's test the NEW way: sending 'visibilities' array? 
    // Actually handleSavePrayer logic checks: if (visibilities[i]) saveV = visibilities[i].

    const save3Res = await request('savePrayer', 'POST', {
        groupName,
        groupId,
        member: memberName,
        prayers: ["Prayer B", "Prayer A"],
        responses: ["기대중", "기대중"],
        comments: ["", ""],
        visibilities: ["Hidden", "Show"] // New Feature Test
    });
    console.log("   Result:", save3Res);

    const get3Res = await request('getPrayers', 'GET', { groupId, member: memberName });
    console.log("   ▶ Verification Fetch:", get3Res);

    if (get3Res.visibilities[0] === "Hidden") {
        console.log("   ✅ SUCCESS: 'Prayer B' is now Hidden.");
    } else {
        console.error(`   ❌ Failed to hide Prayer B. Got: ${get3Res.visibilities[0]}`);
    }

    // 7. Cleanup (Optional, but good practice)
    console.log(`\n7. Cleaning up (Deleting Group)...`);
    // handleDeleteGroup requires doPost
    const deleteRes = await request('deleteGroup', 'POST', { groupId });
    console.log("   Result:", deleteRes);

    console.log("\n🎉 Test Suite Completed.");
}

runTest();
