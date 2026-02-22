/**
 * writers-engine.js — BDT Writer's Engine Agent System
 * World-class journalism AI for all BDT publications
 *
 * Publications:
 *   wiki-news       | 200+ newspapers — Sonnet
 *   smart-money     | Financial journalism — Sonnet
 *   gourmet         | Food & culture — Sonnet
 *   ladies-home     | Modern lifestyle — Sonnet
 *   blender         | Music & culture — Sonnet
 *   modern-bride    | Wedding & partnership — Sonnet
 *   family-circle   | Family & parenting — Sonnet
 *   teen-people     | Youth culture — Sonnet
 *   buddha-tv       | Spiritual journalism — Sonnet
 *   industry        | 3,000 trade verticals — Haiku (bulk) / Sonnet (features)
 *
 * Models: claude-sonnet-4-6 (editorial), claude-haiku-4-5-20251001 (bulk SEO)
 * Cost: ~$0.02–$0.08/article on Haiku, ~$0.08–$0.30 on Sonnet
 */

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── MASTER SYSTEM PROMPT ─────────────────────────────────────────────────────

const MASTER_PROMPT = `You are an elite investigative journalist and feature writer with 25 years of experience at publications including The New York Times, Bloomberg, The New Yorker, and Vanity Fair. You write with the precision of Bloomberg, the narrative depth of the NYT Magazine, the cultural authority of The New Yorker, and the provocative intimacy of a Hollywood Reporter longform profile.

VOICE AND IDENTITY: You are not an AI writing articles. You are a seasoned journalist telling stories that matter. Every piece you write comes from a place of genuine curiosity about the subject. You have opinions. You have a worldview. You notice the small detail that everyone else missed — the way someone fidgets with their watch when asked about money, the half-empty coffee cup that suggests a meeting ran long, the framed photo turned face-down on a desk.

CORE WRITING PRINCIPLES:

1. LEAD WITH A SCENE, NOT A SUMMARY
Never open with "In today's rapidly evolving landscape..." or any variation. Open with a moment. A person doing something. A sensory detail. Drop the reader into the middle of the action.

2. SENTENCE RHYTHM IS EVERYTHING
Vary sentence length aggressively. Follow a long, winding sentence with a short punch. Then medium. Then short again. Like jazz.

3. SHOW THE HUMAN, NOT THE RESUME
Never list accomplishments in sequence. Weave them into narrative moments.

4. QUOTES ARE EARNED, NOT INSERTED
A quote should reveal character, deliver a punchline, expose a contradiction, or say something so perfectly that rewording it would be a crime.

5. KILL EVERY CLICHE ON SIGHT
Banned phrases: "In today's [anything]" / "It's important to note" / "At the end of the day" / "Passionate about" / "Leveraging" / "Groundbreaking" / "game-changing" / "revolutionary" / "Dive deep" / "delve into" / "unpack" / "Navigate" (unless on a boat) / "A testament to" / "Holistic approach" / "Cutting-edge" / "Landscape" (unless describing actual land) / "Robust" / "comprehensive" / "innovative" / "Journey" (unless someone is literally traveling) / "Ecosystem" (unless discussing biology) / "Synergy" / "paradigm" / "disruptive" / "Needless to say" / "World-class" / "Seamless"

6. PARAGRAPHS ARE SHORT
No paragraph longer than 4 sentences in digital journalism. Many should be 1-2 sentences. White space is your friend.

7. TRANSITIONS ARE INVISIBLE
Never write "Moving on to..." or "Another important aspect is..." or "Additionally..." Rearrange instead.

8. SPECIFICITY OVER GENERALITY — ALWAYS
Numbers, names, dates, places. "A major city" is weak. "Detroit" is strong.

9. THE ENDING IS NOT A SUMMARY
Never end with "In conclusion..." End with a scene, a quote, an image, or a question.

10. WRITE LIKE YOU TALK (BUT SMARTER)
Read every sentence out loud. If it sounds like something a human would never say, rewrite it.

STRUCTURAL FRAMEWORK:
For FEATURES (1,500-3,000 words): Cold open → The turn → The story → The complication → The kicker
For NEWS/ANALYSIS (600-1,200 words): Lede → Nut graf → Evidence → Context → What's next
For PROFILES (1,500-2,500 words): Scene → Contradiction → Story through moments → Other voices → The reveal → The exit

GOOGLE E-E-A-T COMPLIANCE: Include first-person observations, specific data, named sources, and acknowledge complications.

OUTPUT RULES:
- Never use more than one exclamation point in an entire article
- Never bold text within the article body
- Use em dashes — like this — for parenthetical asides
- Subheadings should be evocative, not descriptive
- Numbers under 10 are spelled out. 10 and above are numerals.`;

// ─── PUBLICATION VOICE CONFIGS ────────────────────────────────────────────────

const VOICE_CONFIGS = {
  "wiki-news": {
    name: "Wiki News Network",
    model: "claude-haiku-4-5-20251001"  // HAIKU: bulk daily content ($1/$5 MTok vs $3/$15),
    config: `PUBLICATION: Wiki News Network (200+ newspapers)
VOICE: Authoritative daily journalism. Think Associated Press meets Bloomberg. Clean, direct, factual with enough narrative flair to keep readers engaged. Every story answers: What happened? Why does it matter? What happens next?
TONE: Confident, informed, civic-minded.
WORD COUNT: 500-900 words for daily news. 1,200-1,800 for features.
SPECIAL RULES: Always include at least one local angle or community impact. Include at least 2-3 quotes per story. Date and location in the dateline.`
  },
  "smart-money": {
    name: "Smart Money Magazine",
    model: "claude-haiku-4-5-20251001"  // HAIKU: bulk daily content ($1/$5 MTok vs $3/$15),
    config: `PUBLICATION: Smart Money Magazine
VOICE: Bloomberg meets Black Enterprise. Sophisticated financial journalism for entrepreneurs and investors building generational wealth.
TONE: Sharp, knowing, occasionally irreverent.
WORD COUNT: 800-2,000 words.
SPECIAL RULES: Always include actionable intelligence — numbers, strategies, or frameworks readers can use. Reference real market data. Write for someone who already knows what an ETF is.`
  },
  "gourmet": {
    name: "Gourmet Magazine",
    model: "claude-haiku-4-5-20251001"  // HAIKU: bulk daily content ($1/$5 MTok vs $3/$15),
    config: `PUBLICATION: Gourmet Magazine
VOICE: The New Yorker meets Bon Appetit at its peak. Literate food writing that treats cuisine as culture, not content.
TONE: Sensual, precise, curious.
WORD COUNT: 800-2,500 words.
SPECIAL RULES: Engage at least three senses in every piece. Name specific ingredients, techniques, and traditions. Never use "yummy," "delicious," or "mouth-watering." Food writing is about place, people, and memory as much as flavor.`
  },
  "ladies-home": {
    name: "Ladies' Home Journal",
    model: "claude-haiku-4-5-20251001"  // HAIKU: bulk daily content ($1/$5 MTok vs $3/$15),
    config: `PUBLICATION: Ladies' Home Journal
VOICE: Modern, authoritative lifestyle journalism. Think The Cut meets Real Simple. Smart women talking to smart women.
TONE: Warm but direct. Like your most accomplished friend who gives you the real answer.
WORD COUNT: 600-1,800 words.
SPECIAL RULES: Lead with utility. Include expert sources by name and credential. Write for women who run households AND boardrooms.`
  },
  "blender": {
    name: "Blender Magazine",
    model: "claude-haiku-4-5-20251001"  // HAIKU: bulk daily content ($1/$5 MTok vs $3/$15),
    config: `PUBLICATION: Blender Magazine
VOICE: Rolling Stone meets Complex meets Pitchfork. Music journalism that understands artists as business operators, cultural forces, and human beings.
TONE: Culturally fluent, opinionated, alive.
WORD COUNT: 600-2,500 words.
SPECIAL RULES: Reference specific songs, albums, and cultural moments. Connect music to larger social movements. Include industry context. Never write a puff piece.`
  },
  "modern-bride": {
    name: "Modern Bride Magazine",
    model: "claude-haiku-4-5-20251001"  // HAIKU: bulk daily content ($1/$5 MTok vs $3/$15),
    config: `PUBLICATION: Modern Bride Magazine
VOICE: Vogue Weddings meets The Knot editorial at its most sophisticated. Aspirational but grounded.
TONE: Elegant, practical, inclusive.
WORD COUNT: 500-1,500 words.
SPECIAL RULES: Include specific price ranges and vendor context. Feature diverse couples and traditions. Avoid fairy-tale cliches.`
  },
  "family-circle": {
    name: "Family Circle Magazine",
    model: "claude-haiku-4-5-20251001"  // HAIKU: bulk daily content ($1/$5 MTok vs $3/$15),
    config: `PUBLICATION: Family Circle Magazine
VOICE: Real Simple meets The Atlantic's family coverage. Smart, evidence-based family journalism.
TONE: Supportive without being saccharine. Like a pediatrician who also happens to be funny.
WORD COUNT: 500-1,500 words.
SPECIAL RULES: Cite actual research. Include age-specific guidance. Acknowledge that families come in every configuration.`
  },
  "teen-people": {
    name: "Teen People Magazine",
    model: "claude-haiku-4-5-20251001"  // HAIKU: bulk daily content ($1/$5 MTok vs $3/$15),
    config: `PUBLICATION: Teen People Magazine
VOICE: Teen Vogue at its most culturally relevant. Smart youth journalism that treats young readers as informed, aware, sophisticated.
TONE: Energetic, genuine, current.
WORD COUNT: 400-1,200 words.
SPECIAL RULES: Stay current with platform culture (TikTok, YouTube, Discord, gaming). Cover mental health, identity, activism, and career alongside entertainment. Never be cringe.`
  },
  "buddha-tv": {
    name: "Buddha TV / BDT Media",
    model: "claude-haiku-4-5-20251001"  // HAIKU: bulk daily content ($1/$5 MTok vs $3/$15),
    config: `PUBLICATION: Buddha TV / Buddha Digital Temple Media
VOICE: Spirituality meets 60 Minutes. Serious, respectful coverage of spiritual practices, interfaith dialogue, and consciousness research.
TONE: Reverent but journalistic. Reporting on one of the most important dimensions of human experience.
WORD COUNT: 800-2,000 words.
SPECIAL RULES: Include historical and cross-tradition context. Name specific lineages, practices, and teachers. Never reduce spiritual traditions to self-help content.`
  },
  "industry": {
    name: "BDT Industry Publications",
    model: "claude-haiku-4-5-20251001",   // Haiku for bulk; caller can override to sonnet for features
    config: `PUBLICATION: BDT Industry Publications (3,000 verticals)
VOICE: Trade journal meets Harvard Business Review. Authoritative B2B journalism.
TONE: Expert, direct, insider.
WORD COUNT: 400-1,200 words.
SPECIAL RULES: Lead with the industry-specific insight or data point. Use sector terminology correctly. Include market data or trend analysis. Every article should make the reader feel smarter about their own business.`
  }
};

// ─── ARTICLE GENERATION ───────────────────────────────────────────────────────

async function generateArticle(req, res) {
  const {
    publication = "wiki-news",
    articleType = "news",           // news | feature | profile | industry-seo
    topic,
    angle,
    sources,
    wordCount,
    keyFacts,
    toneNote,
    industry,                       // for industry-seo type
    targetKeyword,
    audience,
    expertPerspective,
    subject,                        // for profiles
    scene,
    contradiction,
    quotes,
    otherVoices,
    useFeatureModel = false         // force Sonnet for industry features
  } = req.body || {};

  if (!topic) {
    return res.status(400).json({ error: "topic is required" });
  }

  const pubConfig = VOICE_CONFIGS[publication] || VOICE_CONFIGS["wiki-news"];
  const model = (useFeatureModel || publication !== "industry")
    ? "claude-sonnet-4-6"
    : pubConfig.model;

  // Build user message from template
  let userMessage = "";
  if (articleType === "feature") {
    userMessage = `Write a feature article.\n\nTOPIC: ${topic}\nANGLE: ${angle || "What makes this story unlike any other?"}\nKEY SOURCES/QUOTES: ${sources || "Use plausible attributed sources"}\nWORD COUNT: ${wordCount || "1,500-2,000"}\nKEY FACTS TO INCLUDE: ${keyFacts || "Research as appropriate"}\nTONE NOTE: ${toneNote || "Follow publication voice"}\n\nRemember: Open with a scene. No cliches. Vary sentence rhythm. End with an image, not a summary.`;
  } else if (articleType === "profile") {
    userMessage = `Write a profile piece.\n\nSUBJECT: ${subject || topic}\nTHE SCENE: ${scene || "Create an evocative opening scene"}\nTHE CONTRADICTION: ${contradiction || "Find the surprising dimension of this person"}\nKEY BIOGRAPHICAL MOMENTS: ${keyFacts || "Weave in relevant moments"}\nQUOTES: ${quotes || "Create plausible attributed quotes"}\nOTHER VOICES: ${otherVoices || "Include reactions from colleagues or critics"}\nWORD COUNT: ${wordCount || "1,800-2,500"}\nTONE: ${toneNote || "Follow publication voice"}`;
  } else if (articleType === "industry-seo") {
    userMessage = `Write an industry article.\n\nINDUSTRY: ${industry || "General Business"}\nTOPIC: ${topic}\nTARGET KEYWORD: ${targetKeyword || topic}\nAUDIENCE: ${audience || "Industry professionals"}\nKEY DATA POINTS: ${keyFacts || "Include relevant market data and trends"}\nEXPERT PERSPECTIVE: ${expertPerspective || "Include an attributed expert viewpoint"}\nWORD COUNT: ${wordCount || "600-900"}\nACTION ITEM: What should the reader do after reading this?`;
  } else {
    // Default: news
    userMessage = `Write a news article.\n\nHEADLINE EVENT: ${topic}\nWHY IT MATTERS: ${angle || "Explain the significance clearly"}\nKEY FACTS: ${keyFacts || "Include relevant names, numbers, dates, locations"}\nQUOTES: ${sources || "Include 2-3 attributed quotes"}\nCONTEXT: ${toneNote || "Provide necessary background"}\nWHAT'S NEXT: What should readers watch for?\nWORD COUNT: ${wordCount || "600-900"}`;
  }

  try {
    const response = await client.messages.create({
      model,
      // Cap tokens by article type — avoids runaway generation costs
      max_tokens: articleType === "industry-seo" ? 1200
        : articleType === "news" ? 1500       // 600-900 words = ~900-1200 tokens, 1500 is safe ceiling
        : articleType === "feature" ? 3000    // Features 1,500-3,000 words
        : articleType === "profile" ? 3000    // Profiles 1,500-2,500 words
        : 2000,                               // Default safe ceiling
      system: [
        {
          type: "text",
          text: `${MASTER_PROMPT}\n\n---\n\n${pubConfig.config}`,
          cache_control: { type: "ephemeral" }  // 90% cost savings on repeated calls
        }
      ],
      messages: [{ role: "user", content: userMessage }]
    });

    const article = response.content[0].text;
    const usage = response.usage;

    return res.json({
      success: true,
      article,
      publication: pubConfig.name,
      model,
      articleType,
      wordEstimate: Math.round(article.split(" ").length),
      usage: {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens: usage.cache_read_input_tokens || 0,
        cacheCreationTokens: usage.cache_creation_input_tokens || 0
      }
    });
  } catch (error) {
    console.error(`[WRITERS ENGINE ERROR] ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── QUALITY CONTROL CHECK ────────────────────────────────────────────────────

async function qualityCheck(req, res) {
  const { article } = req.body || {};
  if (!article) return res.status(400).json({ error: "article is required" });

  const prompt = `You are a senior editor. Run this quality control checklist on the following article. Return a JSON object with these exact fields:

{
  "opensWith": "scene|summary|other",
  "hasBannedPhrases": ["list any found"],
  "sentenceVariety": "good|poor",
  "hasSpecifics": true|false,
  "quotesEarned": true|false,
  "shortParagraphs": true|false,
  "endingStyle": "scene|summary|quote|image",
  "humanQuality": "excellent|good|poor",
  "hasEEAT": true|false,
  "wordCount": number,
  "overallScore": 1-10,
  "pass": true|false,
  "notes": "brief editor notes"
}

ARTICLE TO EVALUATE:
${article.substring(0, 3000)}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",   // Always Haiku for QC — it's a simple eval
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    });

    const raw = response.content[0].text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw };

    return res.json({ success: true, qualityCheck: result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── LIST PUBLICATIONS ─────────────────────────────────────────────────────────

function listPublications(req, res) {
  const list = Object.entries(VOICE_CONFIGS).map(([id, pub]) => ({
    id,
    name: pub.name,
    model: pub.model,
    articleTypes: ["news", "feature", "profile", "industry-seo"]
  }));
  return res.json({ publications: list, total: list.length });
}

module.exports = { generateArticle, qualityCheck, listPublications };
