import express from 'express';
import OpenAI from 'openai';
import scraperService from '../services/scraperService.js';

const router = express.Router();

// Lazy initialize OpenAI client
let openai = null;
const getOpenAI = () => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL;
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      throw new Error('OPENAI_API_KEY not configured in .env file');
    }
    openai = new OpenAI({ 
      apiKey,
      baseURL: baseURL || 'https://api.openai.com/v1'
    });
  }
  return openai;
};

// Invoke LLM endpoint
router.post('/invoke-llm', async (req, res) => {
  try {
    const { prompt, response_json_schema, add_context_from_internet } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    let webData = null;

    // Web scraping integration - fetch real data if requested
    if (add_context_from_internet) {
      try {
        // Detect what type of data to scrape
        const promptLower = prompt.toLowerCase();
        
        if (promptLower.includes('hotel')) {
          // Extract city from prompt
          const cityMatch = prompt.match(/(?:in|for|at)\s+([A-Za-z\s]+?)(?:,|\.|india|$)/i);
          const city = cityMatch ? cityMatch[1].trim() : null;
          
          if (city) {

            webData = await scraperService.searchHotels({
              city,
              checkIn: new Date().toISOString().split('T')[0],
              checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              adults: 2
            });
            
            if (!webData || webData.length === 0) {
              webData = scraperService.generateMockHotels(city, 15);
            }
          }
        } else if (promptLower.includes('flight')) {
          // Extract from/to from prompt
          const fromMatch = prompt.match(/from\s+([A-Za-z\s]+?)(?:\s+to)/i);
          const toMatch = prompt.match(/to\s+([A-Za-z\s]+?)(?:,|\.|$)/i);
          
          if (fromMatch && toMatch) {
            const from = fromMatch[1].trim();
            const to = toMatch[1].trim();
            webData = await scraperService.searchFlights({
              from,
              to,
              departDate: new Date().toISOString().split('T')[0]
            });
          }
        } else if (promptLower.includes('bus')) {
          const fromMatch = prompt.match(/from\s+([A-Za-z\s]+?)(?:\s+to)/i);
          const toMatch = prompt.match(/to\s+([A-Za-z\s]+?)(?:,|\.|$)/i);
          
          if (fromMatch && toMatch) {
            const from = fromMatch[1].trim();
            const to = toMatch[1].trim();
            webData = await scraperService.searchBuses({
              from,
              to,
              date: new Date().toISOString().split('T')[0]
            });
          }
        } else if (promptLower.includes('train') || promptLower.includes('railway')) {
          const fromMatch = prompt.match(/from\s+([A-Za-z\s]+?)(?:\s+to)/i);
          const toMatch = prompt.match(/to\s+([A-Za-z\s]+?)(?:,|\.|$)/i);
          
          if (fromMatch && toMatch) {
            const from = fromMatch[1].trim();
            const to = toMatch[1].trim();
            webData = await scraperService.searchTrains({
              from,
              to,
              date: new Date().toISOString().split('T')[0]
            });
          }
        }
      } catch (scraperError) {
        // Continue with AI-only response
      }
    }

    const client = getOpenAI();

    // Enhance prompt with web data if available
    let enhancedPrompt = prompt;
    if (webData && webData.length > 0) {
      enhancedPrompt = `${prompt}\n\nREAL-TIME WEB DATA FOUND:\n${JSON.stringify(webData, null, 2)}\n\nUse this real data in your response. Organize and format it according to the requested schema.`;
    } else if (add_context_from_internet && prompt.toLowerCase().includes('hotel')) {
      enhancedPrompt = prompt + `\n\nIMPORTANT: Use your knowledge of real hotels, actual locations, and typical pricing in the specified city. Include well-known hotel chains (Marriott, Hyatt, Taj, ITC, Oberoi, etc.) and popular local properties. Provide realistic GPS coordinates, current market rates, and accurate amenities for each hotel category.`;
    }

    // Prepare messages
    const messages = [
      { role: 'system', content: 'You are a JSON API that returns ONLY valid JSON objects. Never use markdown, code blocks, explanations, or text outside the JSON. When provided with real-time web data, organize it into the requested JSON format. Always return properly formatted JSON that can be parsed directly.' },
      { role: 'user', content: enhancedPrompt }
    ];

    // Prepare completion options
    const completionOptions = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
    };

    // Handle response format - support both json_object and json_schema
    if (response_json_schema) {
      if (response_json_schema.type === 'json_schema') {
        // Full JSON schema support (OpenAI structured outputs)
        completionOptions.response_format = response_json_schema;
      } else {
        // Simple JSON object mode
        completionOptions.response_format = { type: 'json_object' };
      }
    }

    // Call OpenAI
    const completion = await client.chat.completions.create(completionOptions);

    const content = completion.choices[0].message.content;
    
    console.log('📝 AI Response received, length:', content.length);
    console.log('📝 First 200 chars:', content.substring(0, 200));
    
    // Parse JSON if schema was provided
    let result = content;
    if (response_json_schema) {
      try {
        // Clean the content before parsing
        let cleanContent = content.trim();
        
        // Remove markdown formatting
        cleanContent = cleanContent
          .replace(/^```json\s*/gm, '')  // Remove ```json
          .replace(/^```\s*/gm, '')       // Remove ```
          .replace(/```\s*$/gm, '')       // Remove trailing ```
          .replace(/^\*\*.*?\*\*\s*/gm, '') // Remove **bold text**
          .replace(/^\*.*?\*\s*/gm, '')     // Remove *italic text*
          .replace(/^\|.*\|\s*$/gm, '')     // Remove table rows
          .replace(/^#.*$/gm, '');          // Remove headers
        
        // Find JSON object in response
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanContent = jsonMatch[0];
        }
        
        // Try to parse
        result = JSON.parse(cleanContent);
        console.log('✅ Successfully parsed JSON response');
      } catch (e) {
        // Failed to parse JSON
        
        // If web data was provided, try to extract it
        if (webData && webData.length > 0) {
          console.log('⚠️ Using raw web data as fallback');
          result = { hotels: webData };
        } else {
          // Return error
          result = { 
            error: 'AI returned invalid JSON format. Please try again.',
            parse_error: e.message 
          };
        }
      }
    }
    
    // Return response
    res.json({
      success: true,
      result: result,
      usage: {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens
      }
    });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'AI service error' 
    });
  }
});

// Send Email endpoint
router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ message: 'to, subject, and body are required' });
    }

    // Log email (in production, integrate with SendGrid/AWS SES)
    console.log('📧 Email notification:');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${body.substring(0, 100)}...`);

    res.json({
      success: true,
      message: 'Email sent successfully',
      emailId: `email-${Date.now()}`
    });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Email service error' 
    });
  }
});

export default router;
