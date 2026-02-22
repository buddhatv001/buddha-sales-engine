/**
 * server.js — Buddha Sales Engine (Port 3001)
 * Microservice called by the AI CEO to generate content
 */
require("dotenv").config({ path: require("path").join(__dirname, "config/.env") });
const express = require("express");
const {
  generateEmail,
  generateSocialPost,
  generateAdCopy,
  generateWeeklyCalendar,
  generateVideoScript,
  generateCanvaBrief
} = require("./communication/content-generator");
const { generateArticle, qualityCheck, listPublications } = require("./api/writers-engine");

const app = express();
app.use(express.json({ limit: "5mb" }));

const SWIPE_FILE = {
  prayer_spiritual_hooks: [
    "Your prayer has been spoken aloud in our meditation hall",
    "The Buddha didn't pray to a god. He did something better.",
    "What happens when 1,000 people pray for you at once?",
    "I stopped praying for things and started praying for THIS",
    "The prayer that changed everything for me",
    "You asked for help. We heard you.",
    "A sacred tree was planted in your name today",
    "The Medicine Buddha spoke your name this morning"
  ],
  sales_cardone_hooks: [
    "Stop meditating 5 minutes and complaining it doesn't work",
    "Your spiritual practice is broke and you know it",
    "Everyone wants enlightenment. Nobody wants the work.",
    "I lost everything — $500M, my reputation, my family. Then I found THIS.",
    "The difference between a healer and a broke healer? A credential.",
    "Your calling is too important to stay amateur",
    "You didn't come this far to only come this far",
    "Stop being a spiritual dabbler and become a practitioner"
  ],
  value_stack_hormozi_hooks: [
    "Here's what $7,500 actually gets you (hint: it's worth $150K)",
    "The real cost of NOT getting your Spiritual MBA",
    "3 years of therapy = $15,000. This program = $5,000. The difference = everything.",
    "$54 book. $5,400 worth of healing protocols inside.",
    "$27 plants a tree. But here's what else happens...",
    "Free consultation worth $500. Why? Because we know what happens next.",
    "Your MBA pays for itself when you land ONE consulting client",
    "Price anchor: what you've already spent searching for this answer"
  ],
  subject_lines_prayer: [
    "Your prayer has been received 🙏",
    "A Buddhist prayer written just for you",
    "Something sacred happened today",
    "We spoke your name in meditation this morning",
    "Your 30-day renewal blessing is ready"
  ],
  subject_lines_offer: [
    "Your sacred tree is waiting 🌳",
    "Plant a tree for someone you love",
    "3 trees. 3 prayers. One sacred bundle.",
    "The Medicine Buddha's prescription for you",
    "Your calling deserves a credential, not just a feeling",
    "The Spiritual MBA: what $7,500 really buys"
  ],
  subject_lines_followup: [
    "Did our prayer reach you?",
    "You were in our meditation this morning",
    "One more thing about your prayer request",
    "Your tree is still waiting",
    "A story about someone just like you"
  ]
};

app.get("/", (req, res) => {
  res.json({
    name: "Buddha Sales Engine",
    version: "1.0.0",
    status: "RUNNING",
    port: process.env.PORT || 3001,
    endpoints: [
      "POST /generate/email",
      "POST /generate/social",
      "POST /generate/ad-copy",
      "POST /generate/video-script",
      "POST /generate/canva-brief",
      "POST /calendar/weekly",
      "POST /calendar/monthly",
      "GET  /swipe-file",
      "POST /writers-engine/article  — generate NYT-quality article for any BDT publication",
      "POST /writers-engine/quality-check  — AI editor QC pass/fail check",
      "GET  /writers-engine/publications  — list all 10 publications + model config"
    ]
  });
});

app.get("/swipe-file", (req, res) => {
  res.json({ swipeFile: SWIPE_FILE });
});

app.post("/generate/email", async (req, res) => {
  try {
    const result = await generateEmail(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/generate/social", async (req, res) => {
  try {
    const result = await generateSocialPost(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/generate/ad-copy", async (req, res) => {
  try {
    const result = await generateAdCopy(req.body);
    res.json({ success: true, ads: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/generate/video-script", async (req, res) => {
  try {
    const result = await generateVideoScript(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/generate/canva-brief", async (req, res) => {
  try {
    const result = await generateCanvaBrief(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/calendar/weekly", async (req, res) => {
  try {
    const weekStart = req.body.weekStart || new Date().toISOString().split("T")[0];
    const result = await generateWeeklyCalendar({ weekStart });
    res.json({ success: true, weekStart, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/calendar/monthly", async (req, res) => {
  try {
    const month = req.body.month || new Date().toISOString().slice(0, 7);
    // Generate 4 weekly calendars
    const weeks = [];
    const startDate = new Date(month + "-01");
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(startDate.getTime() + i * 7 * 86400000).toISOString().split("T")[0];
      const cal = await generateWeeklyCalendar({ weekStart });
      weeks.push({ week: i + 1, weekStart, ...cal });
    }
    res.json({ success: true, month, weeks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── WRITER'S ENGINE — 10 BDT Publications ────────────────────────────────────
// NYT/Bloomberg-quality journalism AI for the full BDT media empire
// Publications: wiki-news, smart-money, gourmet, ladies-home, blender,
//               modern-bride, family-circle, teen-people, buddha-tv, industry
// Article types: news, feature, profile, industry-seo
// Models: Sonnet (editorial), Haiku (bulk SEO/industry)

app.get("/writers-engine/publications", listPublications);

app.post("/writers-engine/article", async (req, res) => {
  try {
    await generateArticle(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/writers-engine/quality-check", async (req, res) => {
  try {
    await qualityCheck(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✍️  Buddha Sales Engine running on port ${PORT}`);
  console.log(`📰 Writer's Engine: 10 publications ready (Sonnet + Haiku)`);
});
