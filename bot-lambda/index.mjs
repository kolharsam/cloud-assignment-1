import { v4 } from "uuid";
import AWS from "aws-sdk";
const { LexRuntimeV2 } = AWS;

/**
 * AWS Lambda handler function to process incoming messages and interact with AWS Lex.
 *
 * @param {Object} event - The event object containing the request data.
 * @returns {Promise<Object>} The response object containing the status code and body.
 *
 * @example
 * // Example event body
 * const event = {
 *   body: JSON.stringify({
 *     messages: [
 *       {
 *         unstructured: {
 *           id: "12345",
 *           text: "Hello",
 *           timestamp: "2023-10-01T12:00:00Z"
 *         }
 *       }
 *     ]
 *   })
 * };
 *
 * handler(event).then(response => {
 *   console.log(response);
 * });
 *
 * @throws {Error} If there is an error parsing the event body or communicating with Lex.
 */
export const handler = async (event) => {
  const lexruntimev2 = new LexRuntimeV2();
  console.log("Received event:", JSON.stringify(event, null, 2));

  if (
    !event.messages ||
    !Array.isArray(event.messages) ||
    event.messages.length === 0
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No messages provided" }),
    };
  }

  const latestMessage = event.messages[event.messages.length - 1];

  if (!latestMessage.unstructured || !latestMessage.unstructured.text) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid message format" }),
    };
  }

  const userText = latestMessage.unstructured.text || "";
  const sessionId = latestMessage.unstructured.id || v4();

  // Set up parameters for Lex
  const params = {
    botAliasId: process.env.AWS_BOT_ALIAS_ID,
    botId: process.env.AWS_BOT_ID,
    localeId: process.env.AWS_BOT_LOCALE,
    sessionId: sessionId,
    text: userText,
  };

  try {
    // Call Lex RecognizeText API
    const response = await lexruntimev2.recognizeText(params).promise();

    // Process Lex response to create BotResponse
    const lexMessages = response.messages || [];
    const botMessages = lexMessages.map((msg) => ({
      type: "unstructured",
      unstructured: {
        id: v4(), // Generate a new ID for each message
        text: msg.content,
        timestamp: new Date().toISOString(),
      },
    }));

    // If Lex didn't return any messages, provide a default response
    if (botMessages.length === 0) {
      botMessages.push({
        type: "unstructured",
        unstructured: {
          id: uuidv4(),
          text: "I did not understand that. Can you please rephrase?",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Construct the BotResponse
    const botResponse = {
      messages: botMessages,
    };

    // Return the response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: botResponse,
    };
  } catch (error) {
    console.error("Error communicating with Lex:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
