/**
 * content-generator.js — Generates all content via Claude API
 */
require("dotenv").config({ path: require("path").join(__dirname, "../config/.env") });
const Anthropic = require("@anthropic-ai/sdk");
const { SALES_SYSTEM_PROMPT } = require("./system-prompt");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateEmail({ contactName, emailType, product, prayerRequest, healthTags, daysSincePrayer, context }) {
  const voiceGuide = getVoiceRatio(emailType, product);
  const prompt = `Generate a personalized email.
Contact: ${contactName}
Type: ${emailType}
Product: ${product || "none"}
Prayer request: ${prayerRequest || "none"}
Health tags: ${(healthTags || []).join(", ") || "none"}
Days since prayer: ${daysSincePrayer || 0}
Context: ${context || "none"}
Voice calibration: ${voiceGuide}

Return JSON: { subject, body, cta_text, cta_link, voice_ratio: { cardone, hormozi, buddhist } }`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SALES_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }]
  });

  return parseJSON(response.content[0].text);
}

async function generateSocialPost({ pillar, platform, topic, product }) {
  const prompt = `Generate a ${platform} post.
Pillar: ${pillar} — ${pillarGuide(pillar)}
Topic: ${topic || "auto-select based on pillar"}
Product to mention: ${product || "none"}
Platform notes: ${platformNotes(platform)}

Return JSON: { post_text, hashtags, best_time, visual_brief, cta }`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: SALES_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }]
  });

  return parseJSON(response.content[0].text);
}

async function generateAdCopy({ campaign, audience, offer, angle }) {
  const prompt = `Generate 3 Meta ad variations.
Campaign: ${campaign}
Audience: ${audience}
Offer: ${offer}
Angle: ${angle} — ${angleGuide(angle)}

Return JSON array of 3 ads: [{ headline, primary_text, description, cta_button, visual_brief }]`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SALES_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }]
  });

  return parseJSON(response.content[0].text);
}

async function generateWeeklyCalendar({ weekStart }) {
  const prompt = `Generate a full 7-day content calendar starting ${weekStart}.

7-DAY PILLAR SYSTEM:
Monday: MOTIVATION (Cardone fire — stop being average, your calling is bigger than your comfort)
Tuesday: TEACHING (Hormozi frameworks — value stacking, offer creation, ROI math)
Wednesday: TESTIMONY (Real transformation stories from BDT students and patients)
Thursday: BEHIND SCENES (Authentic look inside temple, meditation hall, tree planting)
Friday: DIRECT OFFER (Full value stack with price anchoring and clear CTA)
Saturday: SPIRITUAL (Buddhist depth — sutras, meditation, the Buddha's example)
Sunday: PRAYER (Community prayer — invite people to share, respond with compassion)

For each day, generate posts for Facebook AND Instagram.
Return JSON: { days: [{ day, pillar, facebook: { post, hashtags, visual_brief, best_time }, instagram: { post, hashtags, visual_brief, best_time } }] }`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SALES_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }]
  });

  return parseJSON(response.content[0].text);
}

async function generateVideoScript({ topic, duration, platform }) {
  const prompt = `Generate a ${duration || "60s"} video script for ${platform || "reels"}.
Topic: ${topic}

Return JSON: { hook, body_sections: [{ timestamp, script, visual_note }], cta, hashtags }`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SALES_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }]
  });

  return parseJSON(response.content[0].text);
}

async function generateCanvaBrief({ contentType, text, colors, templateId }) {
  const prompt = `Generate a Canva design brief.
Content type: ${contentType}
Text: ${text}
Brand colors: ${colors || "gold (#D4AF37), deep purple (#4A0E8F), white"}
Template ID: ${templateId || "auto-suggest"}

Return JSON: { design_dimensions, background_suggestion, text_hierarchy: [], color_palette: [], image_suggestions: [], mood }`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: SALES_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }]
  });

  return parseJSON(response.content[0].text);
}

// Helpers
function pillarGuide(pillar) {
  const guides = {
    motivation: "Cardone energy — stop being average, your calling is bigger than your comfort",
    teaching: "Hormozi frameworks — value stacking, offer creation, ROI math",
    testimony: "Real stories of transformation through BDT programs and prayers",
    "behind-scenes": "Authentic look inside temple, meditation hall, tree planting ceremony",
    offer: "Full value stack with price anchoring and clear CTA",
    spiritual: "Buddhist depth — sutras, meditation, the Buddha's example",
    prayer: "Community prayer — invite people to share their request, respond with compassion"
  };
  return guides[pillar] || "General BDT content";
}

function platformNotes(platform) {
  const notes = {
    facebook: "3-5 sentences, conversational, ends with question or CTA",
    instagram: "Hook in first line, emojis OK, max 30 hashtags",
    tiktok: "Conversational, trending sounds reference, 15-30 sec read time",
    linkedin: "Professional tone, longer form OK, thought leadership angle"
  };
  return notes[platform] || "Standard social format";
}

function angleGuide(angle) {
  const guides = {
    pain: "Lead with the problem — what they're suffering without this",
    aspiration: "Lead with the dream — what life looks like after",
    curiosity: "Lead with a surprising fact or question",
    "social-proof": "Lead with results from others like them",
    urgency: "Lead with scarcity or deadline"
  };
  return guides[angle] || "Mixed approach";
}

function getVoiceRatio(emailType, product) {
  if (emailType === "prayer") return "10% Cardone / 20% Hormozi / 70% Buddhist — very compassionate, minimal selling";
  if (emailType === "offer" && product?.includes("MBA")) return "60% Cardone / 30% Hormozi / 10% Buddhist — high urgency";
  if (emailType === "offer") return "40% Cardone / 40% Hormozi / 20% Buddhist — balanced";
  if (emailType === "nurture") return "20% Cardone / 30% Hormozi / 50% Buddhist — warm, building trust";
  return "30% Cardone / 40% Hormozi / 30% Buddhist — standard";
}

function parseJSON(text) {
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e) {
    return { raw: text, parseError: true };
  }
}

module.exports = {
  generateEmail,
  generateSocialPost,
  generateAdCopy,
  generateWeeklyCalendar,
  generateVideoScript,
  generateCanvaBrief
};
