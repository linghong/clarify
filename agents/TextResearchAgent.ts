export class TextResearchAgent {

  constructor() {

  }

  async search(query: string, reasonforquery: string) {
    const systemPrompt = `You are a helpful AI assistant with access to current information through internet search. Your task is to provide accurate and up-to-date information in response to the queries FrontlineAgent sends you.`;

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `query: ${query}
            reasonforquery: ${reasonforquery}`
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        return_citations: true,
        search_recency_filter: "month",
        stream: false
      })
    };

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', options);
      const result = await response.json();

      const message = result.choices[0].message.content;
      return message;

    } catch (error) {
      console.error('Error processing text input:', error);
      return error;
    }
  }
}