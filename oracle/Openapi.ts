import axios from "axios";
import { websearch } from "./websearch";
import dotenv from "dotenv";

dotenv.config();

export async function getOpenAIResponse(prompt: string): Promise<string> {
  try {
    console.log("Input prompt:", prompt);

    // Initial call to OpenAI using Axios
    const initialResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",

      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Use the tools provided if necessary",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 150,
        tools: [
          {
            type: "function",
            function: {
              name: "websearch",
              description: "Search the web for current information",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query",
                  },
                },
                required: ["query"],
              },
            },
          },
        ],
        tool_choice: "auto",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const initialMessage = initialResponse.data.choices[0].message;
    console.log(initialMessage);

    if (initialMessage.tool_calls) {
      const toolCall = initialMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      if (functionName === "websearch") {
        const searchResult = await websearch(functionArgs.query);
        console.log("Web searched");
        // Call OpenAI again with the search results using Axios

        const finalResponse = await axios.post(
          "https://api.openai.com/v1/chat/completions",

          {
            model: "gpt-3.5-turbo",

            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant. Use the tools provided if necessary",
              },
              { role: "user", content: prompt },
              initialMessage,
              {
                role: "tool",
                content: JSON.stringify(searchResult),
                tool_call_id: toolCall.id,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log(finalResponse.data.choices[0].message.content);
        const finalContent =
          finalResponse.data.choices[0].message.content ||
          "No response generated.";
        return finalContent;
      }
    }

    return initialMessage.content || "No response generated.";
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return "An error occurred while processing your request.";
  }
}

getOpenAIResponse("who was the president of the united states in 1990");
