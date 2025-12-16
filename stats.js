// stats.js
module.exports = async function runStatsExtractor(page) {
  console.log("🚀 Starting Script 2: Vote + Message from Google Sheet");

  // 🔗 Your published CSV
  const CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTEvXh5P_U89PiYbBh-yIB-jbFdBejWYEHTbLopxHo7yc4Gns77R4h4HkXMxUzFTOGaU9Jl5JimzB_A/pub?gid=0&single=true&output=csv';

  // --------------------------------------------------
  // STEP 1: LOAD CSV
  // --------------------------------------------------
  console.log("📥 Fetching Google Sheet CSV...");
  const csvText = await fetch(CSV_URL).then(r => r.text());

  const lines = csvText.trim().split('\n');
  const rows = lines.slice(1).map(line => {
    const [profileID, ladyID, ladyName] = line.split(',');
    return {
      profileID: profileID?.trim(),
      ladyID: ladyID?.trim(),
      ladyName: ladyName?.trim(),
    };
  });

  console.log(`👭 Total ladies loaded: ${rows.length}`);
  console.log("📋 Sample row:", rows[0]);

  if (rows.length === 0) {
    console.log("❌ No data found in CSV. Exiting.");
    return;
  }

  // --------------------------------------------------
  // STEP 2: PROCESS EACH LADY
  // --------------------------------------------------
  for (let i = 0; i < rows.length; i++) {
    const { profileID, ladyID, ladyName } = rows[i];

    console.log(`\n📄 Processing ${i + 1}/${rows.length}`);
    console.log(`   👩 Name: ${ladyName}`);
    console.log(`   🆔 Profile ID: ${profileID}`);
    console.log(`   🎯 Lady ID: ${ladyID}`);

    try {
      // ----------------------------------------------
      // OPEN PROFILE (USING profileID)
      // ----------------------------------------------
      const profileUrl = `https://v3.g.ladypopular.com/profile.php?id=${profileID}`;
      console.log(`🌐 Opening profile: ${profileUrl}`);

      await page.goto(profileUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      await page.waitForTimeout(3000);

      // ----------------------------------------------
      // SEND VOTE (NETWORK REQUEST)
      // ----------------------------------------------
      console.log("🗳️ Sending vote...");

      const voteResponse = await page.evaluate(async ({ ladyID }) => {
        const res = await fetch('/ajax/ranking/players.php', {
          method: 'POST',
          body: new URLSearchParams({
            action: 'vote',
            podiumType: '4',
            ladyId: ladyID,
            rating: '3',
          }),
          credentials: 'same-origin',
        });
        return res.json();
      }, { ladyID });

      console.log("📝 Vote response:", voteResponse);

      if (voteResponse.status !== 1) {
        console.log(`⚠️ Vote failed for ${ladyName}. Skipping message.`);
        continue;
      }

      console.log("✅ Vote successful.");

      // ----------------------------------------------
      // OPEN CHAT (UI ACTION)
      // ----------------------------------------------
      console.log("💬 Opening chat...");
      await page.waitForSelector('.message-btn', { timeout: 15000 });
      await page.click('.message-btn');

      // ----------------------------------------------
      // SEND MESSAGE
      // ----------------------------------------------
      await page.waitForSelector('#msgArea', { timeout: 15000 });
      await page.fill('#msgArea', 'visited you, love the look');

      await page.waitForSelector('#_sendMessageButton', { timeout: 15000 });
      await page.click('#_sendMessageButton');

      console.log("📨 Message sent successfully.");

    } catch (err) {
      console.log(`❌ Error processing ${ladyName}: ${err.message}`);
      await page.screenshot({
        path: `stats-error-${profileID}.png`,
        fullPage: true,
      });
    }

    // ⏳ Small delay to stay safe
    await page.waitForTimeout(5000);
  }

  console.log("\n🏁 Script 2 complete. All rows processed.");
};
