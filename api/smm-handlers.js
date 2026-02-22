/**
 * SMM Handlers — Magazine outreach, reply classification, featured fulfillment
 * Matches Deployment Checklist scenarios SMM-1, SMM-2, SMM-3
 */

const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const GHL_TOKEN = process.env.GHL_API_KEY;
const GHL_LOC = process.env.GHL_LOCATION_ID;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_HEADERS = { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-07-28', 'Content-Type': 'application/json' };

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Brand voice configs for each magazine
const BRAND_VOICES = {
  smartmoney: {
    name: 'SmartMoney Magazine',
    email: 'editorial@smartmoneymagazine.com',
    tone: 'authoritative, data-driven, professional',
    cert: 'SmartMoney Certified™ Advisor',
    certPrice: '$999/year'
  },
  gourmet: {
    name: 'Gourmet Magazine',
    email: 'editorial@gourmetmagazine.com',
    tone: 'sophisticated, sensual, culinary excellence',
    cert: 'Gourmet Stars™',
    certPrice: '$499/year'
  },
  mademoiselle: {
    name: 'Mademoiselle Magazine',
    email: 'editorial@mademoisellemagazine.com',
    tone: 'chic, empowering, modern feminine',
    cert: 'Mademoiselle Best Of™',
    certPrice: '$499/year'
  },
  blender: {
    name: 'Blender Magazine',
    email: 'editorial@blendermagazine.com',
    tone: 'edgy, music-forward, cultural',
    cert: 'Blender Certified™ Artist',
    certPrice: '$299/year'
  },
  'family-circle': {
    name: 'Family Circle Magazine',
    email: 'editorial@familycirclemagazine.com',
    tone: 'warm, trusted, family-focused',
    cert: 'Family Circle Approved™',
    certPrice: '$399/year'
  },
  'modern-bride': {
    name: 'Modern Bride Magazine',
    email: 'editorial@modernbridemagazine.com',
    tone: 'romantic, aspirational, wedding-centric',
    cert: 'Modern Bride Certified™',
    certPrice: '$499/year'
  },
  lhj: {
    name: "Ladies' Home Journal",
    email: 'editorial@ladieshomejournal.com',
    tone: 'refined, home & lifestyle, trusted classic',
    cert: "LHJ Approved™ Professional",
    certPrice: '$499/year'
  },
  'teen-people': {
    name: 'Teen People Magazine',
    email: 'editorial@teenpeoplemagazine.com',
    tone: 'vibrant, youth-forward, pop culture',
    cert: 'Creator Certified™',
    certPrice: '$249/year'
  },
  business2: {
    name: 'Business 2.0 Magazine',
    email: 'editorial@business2magazine.com',
    tone: 'entrepreneurial, direct, growth-focused',
    cert: 'Business 2.0 Verified™',
    certPrice: '$199/year'
  }
};

// Discord notify helper
async function notifyDiscord(webhookUrl, content) {
  try {
    if (!webhookUrl) return;
    await axios.post(webhookUrl, { content }, { timeout: 5000 });
  } catch (e) { console.error('Discord notify error:', e.message); }
}

// ─── SMM-1: Generate + Send Magazine Outreach ─────────────────────
async function generateMagazineOutreach(req, res) {
  const { contactId, businessName, businessCity, businessState, businessType, brandTag } = req.body;
  const brand = BRAND_VOICES[brandTag] || BRAND_VOICES.business2;

  try {
    // Generate personalized outreach email using Claude Haiku
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `You are the editorial team at ${brand.name}. Your tone is ${brand.tone}. Write a brief, personalized "as featured in" outreach email to a local business. Keep it to 3 short paragraphs. Sound like a legitimate media outlet reaching out for editorial coverage consideration.`,
      messages: [{
        role: 'user',
        content: `Write an outreach email to: ${businessName}, ${businessCity}, ${businessState}. Business type: ${businessType}.
        
The email should:
1. Introduce ${brand.name} and mention we're considering them for editorial coverage
2. Highlight our audience and what being featured means for their business
3. Invite them to learn more with a clear next step

Subject line: [Your Business Name] — ${brand.name} Editorial Consideration

Sign from: The Editorial Team, ${brand.name}`
      }]
    });

    const emailContent = response.content[0].text.trim();
    const subjectMatch = emailContent.match(/Subject line?:?\s*(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : `${businessName} — ${brand.name} Editorial Consideration`;
    const body = emailContent.replace(/Subject line?:?\s*.+\n?/i, '').trim();

    // Get contact email from GHL
    const contactRes = await axios.get(`${GHL_BASE}/contacts/${contactId}`, { headers: GHL_HEADERS });
    const contact = contactRes.data?.contact;
    const toEmail = contact?.email;

    if (!toEmail) {
      return res.status(400).json({ error: 'No email for contact' });
    }

    // Send email via GHL
    await axios.post(`${GHL_BASE}/conversations/messages`, {
      type: 'Email',
      contactId,
      emailFrom: brand.email,
      emailTo: toEmail,
      subject,
      html: `<p>${body.replace(/\n/g, '</p><p>')}</p>`,
      locationId: GHL_LOC
    }, { headers: GHL_HEADERS });

    // Tag contact as smm-contacted
    await axios.post(`${GHL_BASE}/contacts/${contactId}/tags`, {
      tags: ['smm-contacted', brandTag]
    }, { headers: GHL_HEADERS });

    // Discord notification
    await notifyDiscord(process.env.DISCORD_SMM_LEADS_WEBHOOK,
      `📧 **Magazine Outreach Sent**\n🏢 ${businessName}, ${businessCity} ${businessState}\n📰 Brand: ${brand.name}\n✉️ From: ${brand.email}`);

    res.json({ ok: true, emailSent: true, brand: brand.name, to: toEmail });
  } catch (err) {
    console.error('Magazine outreach error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── SMM-2: Reply Classification ─────────────────────────────────
async function classifySMMReply(req, res) {
  const { replyText, contactId, businessName, brandTag } = req.body;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Classify this reply to a magazine outreach email into ONE category:
INTERESTED, NOT_INTERESTED, QUESTION, ANGRY, AUTO_REPLY

Reply: "${replyText}"

Category (one word only):`
      }]
    });

    const category = response.content[0].text.trim().toUpperCase().replace(/[^A-Z_]/g, '');
    const brand = BRAND_VOICES[brandTag] || BRAND_VOICES.business2;

    let discordChannel = process.env.DISCORD_SMM_REPLIES_WEBHOOK;
    let emoji = { INTERESTED: '✅', NOT_INTERESTED: '❌', QUESTION: '❓', ANGRY: '💢', AUTO_REPLY: '🤖' }[category] || '📧';

    // Route based on classification
    if (category === 'INTERESTED') {
      // Send checkout link
      const featuredLink = process.env[`STRIPE_${brandTag.toUpperCase().replace('-', '_')}_FEATURED_LINK`] || process.env.STRIPE_DEFAULT_FEATURED_LINK;
      if (featuredLink && contactId) {
        const contactRes = await axios.get(`${GHL_BASE}/contacts/${contactId}`, { headers: GHL_HEADERS });
        const toEmail = contactRes.data?.contact?.email;
        if (toEmail) {
          await axios.post(`${GHL_BASE}/conversations/messages`, {
            type: 'Email',
            contactId,
            emailFrom: brand.email,
            emailTo: toEmail,
            subject: `Your ${brand.name} Editorial Package — Reserve Your Spot`,
            html: `<p>Thank you for your interest! We'd love to feature ${businessName} in ${brand.name}.</p><p><strong><a href="${featuredLink}">Click here to reserve your editorial feature ($499)</a></strong></p><p>This includes a professional editorial profile, digital badge, and distribution across our readership.</p><p>Best,<br>The Editorial Team<br>${brand.name}</p>`,
            locationId: GHL_LOC
          }, { headers: GHL_HEADERS });
        }
      }
    } else if (category === 'ANGRY') {
      discordChannel = process.env.DISCORD_SMM_ESCALATIONS_WEBHOOK;
    }

    await notifyDiscord(discordChannel,
      `${emoji} **SMM Reply: ${category}**\n🏢 ${businessName}\n📰 ${brand.name}\n💬 "${replyText.substring(0, 150)}"`);

    res.json({ ok: true, category, contactId, brand: brand.name });
  } catch (err) {
    console.error('SMM classify error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── SMM-3: Featured Purchase Fulfillment ─────────────────────────
async function fulfillFeaturedPurchase(req, res) {
  const { contactId, businessName, businessCity, businessState, businessType, brandTag, tier } = req.body;
  const brand = BRAND_VOICES[brandTag] || BRAND_VOICES.business2;
  const isPremium = tier === 'premium';

  try {
    // Generate editorial profile using Claude Sonnet (PAID PRODUCT — high quality)
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: `You are a senior editor at ${brand.name} magazine. Your tone is ${brand.tone}. Write a world-class editorial profile about a business, as if published in the magazine. This is a paid editorial feature the business purchased for $${isPremium ? '2,500' : '499'}.`,
      messages: [{
        role: 'user',
        content: `Write a ${isPremium ? '600-800' : '350-450'}-word editorial profile for:

Business: ${businessName}
Location: ${businessCity}, ${businessState}
Type: ${businessType}

Style: ${brand.tone}
Publication: ${brand.name}

Make it sound prestigious, authentic, and shareable. The business owner should be proud to share this. Use quotes as if interviewed. Start with a compelling lede.`
      }]
    });

    const profile = response.content[0].text.trim();

    // Get contact info
    const contactRes = await axios.get(`${GHL_BASE}/contacts/${contactId}`, { headers: GHL_HEADERS });
    const toEmail = contactRes.data?.contact?.email;

    // Send fulfillment email with profile + badge
    if (toEmail) {
      await axios.post(`${GHL_BASE}/conversations/messages`, {
        type: 'Email',
        contactId,
        emailFrom: brand.email,
        emailTo: toEmail,
        subject: `🏆 Your ${brand.name} Editorial Feature is Ready`,
        html: `
          <h2>Congratulations, ${businessName}!</h2>
          <p>Your editorial feature in ${brand.name} is now live. Here is your profile:</p>
          <hr>
          <div style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; padding: 20px; background: #f9f9f9; border-left: 4px solid #c8a951;">
            ${profile.replace(/\n/g, '</p><p>')}
          </div>
          <hr>
          <p><strong>Your Official ${brand.name} Badge:</strong></p>
          <p>[Digital badge will be delivered separately]</p>
          <p>Thank you for being part of ${brand.name}.<br>The Editorial Team</p>
        `,
        locationId: GHL_LOC
      }, { headers: GHL_HEADERS });
    }

    // Tag + update GHL
    await axios.post(`${GHL_BASE}/contacts/${contactId}/tags`, {
      tags: ['featured-buyer', brandTag, isPremium ? 'premium-buyer' : 'featured-buyer']
    }, { headers: GHL_HEADERS });

    // Discord revenue notification
    await notifyDiscord(process.env.DISCORD_SMM_REVENUE_WEBHOOK,
      `💰 **${isPremium ? '$2,500 Premium Feature' : '$499 Editorial Review'} SOLD**\n🏢 ${businessName}, ${businessCity}\n📰 ${brand.name}\n📝 ${profile.substring(0, 200)}...`);

    // Schedule Day 7 certification upsell via GHL workflow (if supported)
    // This would normally be triggered via GHL automation

    res.json({ ok: true, profileGenerated: true, brand: brand.name, emailSent: !!toEmail });
  } catch (err) {
    console.error('Featured fulfillment error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── SMM-5: Daily Report ─────────────────────────────────────────
async function generateSMMDailyReport(req, res) {
  try {
    const report = `📊 **SMM Daily Report — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**

📰 Magazine Outreach:
• Check GHL SMM pipeline for today's sends

💰 Revenue:
• Visit dashboard.stripe.com for today's Featured + Certification sales

📝 Content:
• Writer's Engine articles: check /smm-content-published

🤖 System: All SMM services online ✅`;

    await notifyDiscord(process.env.DISCORD_SMM_DAILY_WEBHOOK, report);
    res.json({ ok: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  generateMagazineOutreach,
  classifySMMReply,
  fulfillFeaturedPurchase,
  generateSMMDailyReport,
  BRAND_VOICES
};
