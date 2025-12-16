// collectRewards.js

module.exports = async function runStatsExtractor(page) {
  console.log("🚀 Starting reward collection sub-code");

  const request = page.request;

  /* -------------------------------------------------------
     CONSTANTS
  ------------------------------------------------------- */
  const QUESTS_ENDPOINT =
    "https://v3.g.ladypopular.com/ajax/battlepass/quests.php";
  const CHEST_ENDPOINT =
    "https://v3.g.ladypopular.com/ajax/battlepass/chest.php";

  const EXCLUDED_SEASON_ITEMS = new Set([25, 29]);

  /* -------------------------------------------------------
     PHASE 1 – FETCH POPUP DATA
  ------------------------------------------------------- */
  console.log("📡 Phase 1: Fetching daily quests popup");

  let popupResponse;
  try {
    popupResponse = await request.get(
      `${QUESTS_ENDPOINT}?type=getDailyQuestsPopup&page=myprofile`,
      { headers: { "x-requested-with": "XMLHttpRequest" } }
    );
  } catch (err) {
    console.error("❌ Failed to fetch popup:", err);
    return;
  }

  const rawText = await popupResponse.text();
  console.log("📥 Popup response received");

  /* -------------------------------------------------------
     PHASE 1A – TYPE 1 COLLECTION
  ------------------------------------------------------- */
  const reward_collections_1 = [];

  try {
    const json = JSON.parse(rawText);

    if (Array.isArray(json?.quests)) {
      for (const q of json.quests) {
        if (String(q.status) === "4") {
          reward_collections_1.push(q.id);
        }
      }
    }
  } catch {
    console.log("⚠️ Type 1 parsing: JSON section not found or malformed");
  }

  console.log(
    `🎯 Type 1 rewards found: ${reward_collections_1.join(", ") || "none"}`
  );

  /* -------------------------------------------------------
     PHASE 1B – TYPE 2 COLLECTION
  ------------------------------------------------------- */
  const reward_collections_2 = [];

  const chestRegex =
    /<div class="daily-chest semi-opened"[\s\S]*?data-quest="(\d+)"[\s\S]*?data-chest-index="(\d+)"/g;

  let chestMatch;
  while ((chestMatch = chestRegex.exec(rawText)) !== null) {
    const quest_id = chestMatch[1];
    const chest_id = Number(chestMatch[2]) + 1;

    reward_collections_2.push({ quest_id, chest_id });
  }

  console.log(
    `🎯 Type 2 rewards found: ${
      reward_collections_2.length
        ? reward_collections_2
            .map(r => `${r.quest_id}:${r.chest_id}`)
            .join(", ")
        : "none"
    }`
  );

  /* -------------------------------------------------------
     PHASE 1C – TYPE 3 COLLECTION
  ------------------------------------------------------- */
  const reward_collections_3 = [];

  const liRegex =
    /<li class="(level-reached last-reached|level-reached)[\s\S]*?data-active-chest-type="(\d+)"[\s\S]*?<\/li>/g;

  let liMatch;
  while ((liMatch = liRegex.exec(rawText)) !== null) {
    const itemNumber = Number(liMatch[2]);

    if (EXCLUDED_SEASON_ITEMS.has(itemNumber)) {
      console.log(`⏭️ Skipping season item ${itemNumber}`);
      continue;
    }

    const liBlock = liMatch[0];

    const rightChestRegex =
      /right-col reward-chest[\s\S]*?claimSeasonChest\(this, '(\d+)', 0, '([^']+)'\)/;

    const rightMatch = rightChestRegex.exec(liBlock);
    if (!rightMatch) continue;

    reward_collections_3.push({
      chest_id: rightMatch[1],
      chest_css_class: rightMatch[2],
      item: itemNumber
    });
  }

  console.log(
    `🎯 Type 3 rewards found: ${
      reward_collections_3.length
        ? reward_collections_3
            .map(r => `${r.chest_id}:${r.chest_css_class}`)
            .join(", ")
        : "none"
    }`
  );

  /* -------------------------------------------------------
     PHASE 2 – COLLECT REWARDS
  ------------------------------------------------------- */
  console.log("⚡ Phase 2: Collecting rewards");

  // TYPE 1
  for (const quest_id of reward_collections_1) {
    console.log(`🎁 Collecting Type 1 quest ${quest_id}`);
    request.post(QUESTS_ENDPOINT, {
      headers: { "x-requested-with": "XMLHttpRequest" },
      form: {
        type: "giveDailyQuestReward",
        quest_id,
        chest_id: "-1"
      }
    }).catch(() => {});
  }

  // TYPE 2
  for (const { quest_id, chest_id } of reward_collections_2) {
    console.log(`🎁 Collecting Type 2 quest ${quest_id}, chest ${chest_id}`);
    request.post(QUESTS_ENDPOINT, {
      headers: { "x-requested-with": "XMLHttpRequest" },
      form: {
        type: "giveDailyQuestReward",
        quest_id,
        chest_id
      }
    }).catch(() => {});
  }

  // TYPE 3
  for (const { chest_id, chest_css_class, item } of reward_collections_3) {
    console.log(
      `🎁 Collecting Type 3 chest ${chest_id} (${chest_css_class}) [item ${item}]`
    );
    request.post(CHEST_ENDPOINT, {
      headers: { "x-requested-with": "XMLHttpRequest" },
      form: {
        action: "chestClaim",
        chest_id,
        previousSeason: "0",
        chest_css_class
      }
    }).catch(() => {});
  }

  console.log("✅ Reward collection sub-code finished");
};
