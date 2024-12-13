import { OpenAI } from 'openai';
import { TextResearchAgent } from '@/agents/TextResearchAgent';

interface ChatResponse {
  type: 'text' | 'request_screenshot' | 'research_query' | 'error';
  content?: string;
  question?: string;
  reasonForQuery?: string;
  message?: string;
}
export class TextChatAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async processMessage(data: {
    text: string;
    pdfContent?: string;
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    base64ImageSrc?: string;
  }): Promise<ChatResponse> {

    const systemContent = `You are a helpful multi-modal AI assistant. Your main goal is to help users understand the content they share with you. You work seamlessly with your AI colleagues, TextResearchAgent, as a team. Your role is to interact with users, answer their questions. When users ask any visual questions and you find the visual content isn't provided, you should call the function request_visual_content to get the screenshoot. For queries needing current information or internet searches, involve the TextResearchAgent. Always identify when a user's question requires real-time or up-to-date information, and promptly use the TextResearchAgent in such cases. While waiting for responses from your colleagues, inform users that you are looking into their request. Use this time to gather more details from the user. Once you receive your colleague's response, combine all information into a comprehensive answer. Remember, you represent the whole team, not just yourself, so never disclose that you have colleagues. `;
    const tools = [
      {
        type: 'function',
        function: {
          name: 'request_visual_content',
          description: 'call this function when a user messag mentions some visual content such as charts, graphs,tables,or currently opened browser in user\'s computer, etc., and you will risk to provide incorrect answer without those visual content or have to say I\'m unable to answer this question.',
          parameters: {
            type: 'object',
            properties: {
              user_question: {
                type: 'string',
                description: 'The question or request from the user about the visual content'
              },
              function_name: {
                type: 'string',
                description: 'The name of the function being called'
              }
            },
            required: ['user_question', 'function_name']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'inquiry_text_research_agent',
          description: 'call this function when  the pdf content contains some concept you don\'t know, very recently that are not in your trained pool,that require current or up-to-date information from the internet, or when the answer requires internet search. When you are waiting for the research agent to respond from your inquiry, you can tell your user to let know you need some time to research the internet to get the answer, or you can use that time to gather more information from the user that you think will help your user understand your answer better, such as user\'s background and previous knowldege about the related topic. Also call this agent, when users asks questions that require current information or internet search.',
          parameters: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: "The questions you want the TextResearchAgent to answer"
              },
              function_name: {
                type: 'string',
                description: "The name of the function you want to call, i.e. inquiry_text_research_agent"
              },
              reasonforquery: {
                type: 'string',
                description: "Very breifiely explain what you are aims for for the answer, why you needs it, so that the ResearchAgent can understand the context of the query and provide a more accurate answer."
              }
            },
            required: ["question", "function_name", "reasonforquery"],
          }
        }
      }
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-2024-11-20',
        messages: [
          {
            role: 'system',
            content: systemContent
          },
          ...(data.messages || []),
          {
            role: 'user',
            content: [
              { type: 'text', text: `Question: ${data.text}\n\nPDF Content: ${data.pdfContent || ''}` },
              ...(data.base64ImageSrc ? [{
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${data.base64ImageSrc}` }
              }] : [])
            ]
          }
        ],
        tools: tools
      });

      const message = completion.choices[0].message;

      if (message.content) {
        return {
          type: 'text',
          content: message.content
        };
      }

      if (message.tool_calls) {
        const toolCall = message.tool_calls[0];
        const toolArgs = JSON.parse(toolCall.function.arguments);

        if (toolCall.function.name === 'request_visual_content') {
          return {
            type: 'request_screenshot',
            question: toolArgs.user_question
          };
        }

        if (toolCall.function.name === 'inquiry_text_research_agent') {

          const researchAgent = new TextResearchAgent();
          const searchResult = await researchAgent.search(
            toolArgs.question,
            toolArgs.reasonForQuery
          );

          // Send search results back to TextChatAgent for final answer
          const finalResult = await this.processMessage({
            text: toolArgs.question,
            pdfContent: data.pdfContent,
            messages: [
              ...(data.messages || []),
              {
                role: 'user',
                content: `This message is from TextResearchAgent. The answer for your question ${toolArgs.question} is: ${searchResult}`
              }
            ]
          });

          return finalResult;
        }
      }
      return {
        type: 'error',
        message: 'Unexpected response format'
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        type: 'error',
        message: 'Failed to process message'
      };
    }
  }
}