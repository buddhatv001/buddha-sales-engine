/**
 * Business 2.0 Self-Service Portal
 * $50 mass-market listing → Claude Haiku generates article → published → 6 ad positions live
 * 
 * Revenue per article:
 * - $50 flat listing fee (Base)
 * - $100 Featured upgrade (Day 3 upsell)
 * - $250 Premium upgrade (Day 7 upsell)
 * - $500 Sponsored (Day 14 upsell)
 * + Programmatic ad revenue on every pageview
 */

const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GHL_HEADERS = {
  Authorization: `Bearer ${process.env.GHL_API_KEY}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json'
};
const GHL_BASE = 'https://services.leadconnectorhq.com';

// Tier configurations
const TIERS = {
  listing:    { price: 50,  words: 300, label: 'Basic Listing',      days: [3, 7, 14] },
  featured:   { price: 100, words: 500, label: 'Featured',           days: [7, 14] },
  premium:    { price: 250, words: 800, label: 'Premium',            days: [14] },
  sponsored:  { price: 500, words: 1200, label: 'Sponsored Content', days: [] }
};

// 6 Ad Positions Template (Prebid + Flat-rate)
const AD_POSITIONS_HTML = `
<!-- Position 1: Top Leaderboard (Flat-rate OR Programmatic) -->
<div class="ad-unit ad-leaderboard" data-adunit="leaderboard-728x90">
  <div id="div-gpt-ad-leaderboard" style="min-width:728px;min-height:90px;">
    <script>googletag.cmd.push(function() { googletag.display('div-gpt-ad-leaderboard'); });</script>
  </div>
</div>

<!-- Position 2: In-Article 300x250 (after paragraph 3) -->
<div class="ad-unit ad-in-article" data-adunit="in-article-300x250">
  <div id="div-gpt-ad-in-article">
    <script>googletag.cmd.push(function() { googletag.display('div-gpt-ad-in-article'); });</script>
  </div>
</div>

<!-- Position 3: Sidebar Sticky 300x600 (Prebid) -->
<div class="ad-unit ad-sidebar" data-adunit="sidebar-300x600">
  <div id="div-gpt-ad-sidebar">
    <script>googletag.cmd.push(function() { googletag.display('div-gpt-ad-sidebar'); });</script>
  </div>
</div>

<!-- Position 4: Below-fold lazy-load (Programmatic) -->
<div class="ad-unit ad-below-fold lazy-ad" data-adunit="below-fold-300x250">
  <div id="div-gpt-ad-below-fold">
    <script>googletag.cmd.push(function() { googletag.display('div-gpt-ad-below-fold'); });</script>
  </div>
</div>

<!-- Position 5: End of Article -->
<div class="ad-unit ad-end-article" data-adunit="end-article-728x90">
  <div id="div-gpt-ad-end-article">
    <script>googletag.cmd.push(function() { googletag.display('div-gpt-ad-end-article'); });</script>
  </div>
</div>

<!-- Position 6: Mobile Anchor 320x50 -->
<div class="ad-unit ad-mobile-anchor" data-adunit="mobile-anchor-320x50">
  <div id="div-gpt-ad-mobile-anchor">
    <script>googletag.cmd.push(function() { googletag.display('div-gpt-ad-mobile-anchor'); });</script>
  </div>
</div>`;

// Prebid.js config for header bidding
const PREBID_CONFIG = `
<script>
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function() {
  pbjs.addAdUnits([
    { code: 'div-gpt-ad-in-article', mediaTypes: { banner: { sizes: [[300, 250]] } },
      bids: [
        { bidder: 'appnexus', params: { placementId: 'BDT_PLACEMENT_ID' } },
        { bidder: 'openx', params: { unit: 'BDT_OPENX_UNIT', delDomain: 'bdt-d.openx.net' } },
        { bidder: 'sovrn', params: { tagid: 'BDT_SOVRN_TAGID' } }
      ]
    },
    { code: 'div-gpt-ad-sidebar', mediaTypes: { banner: { sizes: [[300, 600]] } },
      bids: [
        { bidder: 'appnexus', params: { placementId: 'BDT_PLACEMENT_ID_SIDEBAR' } }
      ]
    }
  ]);
  
  pbjs.setConfig({
    priceGranularity: 'medium',
    enableSendAllBids: true,
    floors: {
      enforcement: { floorDeals: false },
      data: {
        currency: 'USD',
        schema: { fields: ['adUnitCode', 'mediaType'] },
        values: {
          'div-gpt-ad-leaderboard|banner': 2.0,
          'div-gpt-ad-in-article|banner': 3.0,
          'div-gpt-ad-sidebar|banner': 5.0
        }
      }
    }
  });
  
  pbjs.requestBids({ bidsBackHandler: sendAdServerRequest, timeout: 1500 });
});

function sendAdServerRequest() {
  googletag.cmd.push(function() { pbjs.setTargetingForGPTAsync(); googletag.pubads().refresh(); });
}
</script>`;

// Main: Create Business 2.0 listing
async function createBusiness2Listing(req, res) {
  const {
    businessName, businessCity, businessState, businessType,
    website, ownerName, phone, email, tier = 'listing',
    contactId, stripePaymentId
  } = req.body;

  const tierConfig = TIERS[tier] || TIERS.listing;

  try {
    // Generate article with Claude Haiku (bulk content, cost-efficient)
    const articleRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: tierConfig.words * 2,
      messages: [{
        role: 'user',
        content: `Write a ${tierConfig.words}-word business profile article for Business 2.0 Magazine about:

Business: ${businessName}
Location: ${businessCity}, ${businessState}
Type: ${businessType}
${website ? 'Website: ' + website : ''}
${ownerName ? 'Owner/Contact: ' + ownerName : ''}

Style: Professional, entrepreneurial, growth-focused. Suitable for a business magazine.
Include a compelling headline, 3-4 substantive paragraphs, and end with a business spotlight quote.
This is a ${tierConfig.label} placement ($${tierConfig.price}).`
      }]
    });

    const article = articleRes.content[0].text.trim();
    const headline = article.split('\n')[0].replace(/^#+\s*/, '').trim();

    // Build article HTML with all 6 ad positions
    const articleHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline} | Business 2.0 Magazine</title>
  <meta name="description" content="${businessName} featured in Business 2.0 Magazine">
  ${PREBID_CONFIG}
</head>
<body>
  <article class="b2-article">
    ${AD_POSITIONS_HTML.split('<!-- Position 1')[0]}
    <!-- Position 1: Top Leaderboard -->
    ${AD_POSITIONS_HTML.match(/<!-- Position 1.*?<\/div>\s*<\/div>/s)?.[0] || ''}
    
    <div class="article-content">
      ${article.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>')}
    </div>
    
    ${AD_POSITIONS_HTML}
  </article>
  
  <!-- ads.txt reference -->
  <!-- google.com, pub-9653282249123193, DIRECT, f08c47fec0942fa0 -->
</body>
</html>`;

    // Create/update GHL contact
    if (!contactId && email) {
      const contactData = {
        firstName: ownerName?.split(' ')[0] || businessName,
        lastName: ownerName?.split(' ').slice(1).join(' ') || '',
        email,
        phone,
        companyName: businessName,
        city: businessCity,
        state: businessState,
        tags: ['business2', 'smm-lead', 'featured-buyer'],
        locationId: process.env.GHL_LOCATION_ID,
        customFields: [
          { key: 'contact.business_name', field_value: businessName },
          { key: 'contact.brand_tag', field_value: 'business2' },
          { key: 'contact.featured_brand', field_value: 'Business 2.0 Magazine' },
          { key: 'contact.stripe_customer_id', field_value: stripePaymentId || '' }
        ]
      };
      await axios.post(`${GHL_BASE}/contacts/`, contactData, { headers: GHL_HEADERS });
    }

    // Discord notification
    if (process.env.DISCORD_SMM_REVENUE_WEBHOOK) {
      await axios.post(process.env.DISCORD_SMM_REVENUE_WEBHOOK, {
        content: `💰 **Business 2.0 ${tierConfig.label} — $${tierConfig.price}**\n🏢 ${businessName}, ${businessCity} ${businessState}\n📝 ${headline}`
      });
    }

    res.json({
      ok: true,
      tier,
      price: tierConfig.price,
      headline,
      articleLength: article.length,
      articleHtml: articleHtml.substring(0, 500) + '... [full HTML generated]',
      adPositions: 6,
      upsellDays: tierConfig.days,
      message: `Business 2.0 ${tierConfig.label} created for ${businessName}`
    });

  } catch (err) {
    console.error('Business 2.0 error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createBusiness2Listing, TIERS, AD_POSITIONS_HTML };
