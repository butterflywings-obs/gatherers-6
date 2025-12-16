// stats.js
// Script 2: Vote + Message from Google Sheet (Option A - Safe & Stable)

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTEvXh5P_U89PiYbBh-yIB-jbFdBejWYEHTbLopxHo7yc4Gns77R4h4HkXMxUzFTOGaU9Jl5JimzB_A/pub?gid=0&single=true&output=csv';

module.exports = async function runStatsExtractor(page) {
  console.log('🚀 Starting Script 2: Vote + Message from Google Sheet');

  /* -------------------------------------------
     1️⃣ LOAD GOOGLE SHEET CSV
  ------------------------------------------- */
  console.log('📥 Fetching Google Sheet CSV...');
  const csvText = await page.evaluate(async (url) => {
    const res = await fetch(url);
    return await res.text();
  }, SHEET_CSV_URL);

  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i]));
    return obj;
  });

  console.log(`👭 Total ladies loaded: ${rows.length}`);
  if (rows.length > 0) console.log('📋 Sample row:', rows[0]);

  /* -------------------------------------------
     2️⃣ PROCESS EACH LADY
  ------------------------------------------- */
  for (let i = 0; i < rows.length; i++) {
    const { profileID, ladyID, ladyName } = rows[i];

    console.log(`\n📄 Processing ${i + 1}/${rows.length}`);
    console.log(`   👩 Name: ${ladyName}`);
    console.log(`   🆔 Profile ID: ${profileID}`);
    console.log(`   🎯 Lady ID: ${ladyID}`);

    try {
      /* -------------------------------------------
         3️⃣ OPEN PROFILE
      ------------------------------------------- */
      const profileUrl = `https://v3.g.ladypopular.com/profile.php?id=${profileID}`;
      console.log(`🌐 Opening profile: ${profileUrl}`);
      await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(4000);

      /* -------------------------------------------
         4️⃣ SEND PODIUM VOTE (SAFE JSON PARSE)
      ------------------------------------------- */
      console.log('🗳️ Sending vote...');
      const voteResult = await page.evaluate(async (ladyId) => {
        const res = await fetch('/ajax.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: new URLSearchParams({
            action: 'vote',
            podiumType: 4,
            ladyId: ladyId,
            rating: 3
          })
        });

        const text = await res.text();
        if (!text) return { status: 0, message: 'Empty response' };

        try {
          return JSON.parse(text);
        } catch {
          return { status: 0, message: 'Non-JSON response' };
        }
      }, ladyID);

      console.log(`🗳️ Vote response:`, voteResult);

      if (voteResult.status !== 1) {
        console.log('⚠️ Vote not accepted or already voted. Skipping message.');
        continue;
      }

      /* -------------------------------------------
         5️⃣ OPEN CHAT
      ------------------------------------------- */
      console.log('💬 Opening chat...');
      await page.click('button.message-btn', { timeout: 10000 });
      await page.waitForSelector('#msgArea', { timeout: 10000 });

      /* -------------------------------------------
         6️⃣ SEND MESSAGE
      ------------------------------------------- */
      const messageText = 'visited you, love the look';

      console.log('✍️ Sending message...');
      await page.fill('#msgArea', messageText);
      await page.waitForTimeout(500);
      await page.click('#_sendMessageButton');

      console.log(`✅ Message sent to ${ladyName}`);

      /* -------------------------------------------
         7️⃣ COOL-DOWN (ANTI-SPAM SAFETY)
      ------------------------------------------- */
      await page.waitForTimeout(5000);

    } catch (err) {
      console.log(`❌ Error processing ${ladyName}: ${err.message}`);
      await page.screenshot({
        path: `stats-error-${profileID}.png`,
        fullPage: true
      });
    }
  }

  console.log('🏁 Script 2 complete. All rows processed.');
};
