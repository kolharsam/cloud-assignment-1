import { SQS } from "@aws-sdk/client-sqs";

// Initialize the SQS service
const sqs = new SQS({ apiVersion: "2012-11-05" });

export const handler = async (event) => {
  const intentName = event.sessionState.intent.name || "";

  if (!intentName) {
    return {
      sessionState: {
        dialogAction: {
          type: "Close",
        },
        intent: {
          name: intentName,
          state: "Failed",
        },
      },
      messages: [
        {
          contentType: "PlainText",
          content: "Sorry, I didn’t quite get that. Can you try again?",
        },
      ],
    };
  }

  // Handle GreetingIntent
  if (intentName === "GreetingIntent") {
    return {
      sessionState: {
        dialogAction: {
          type: "Close", // We are closing the interaction after responding
        },
        intent: {
          name: "GreetingIntent",
          state: "Fulfilled", // Marking the intent as fulfilled
        },
      },
      messages: [
        {
          contentType: "PlainText",
          content: "Hi there! How can I assist you today?",
        },
      ],
    };
  }

  // Handle ThankYouIntent
  if (intentName === "ThankYouIntent") {
    return {
      sessionState: {
        dialogAction: {
          type: "Close",
        },
        intent: {
          name: "ThankYouIntent",
          state: "Fulfilled",
        },
      },
      messages: [
        {
          contentType: "PlainText",
          content: "You’re welcome! Have a great day!",
        },
      ],
    };
  }

  // Handle DiningSuggestionsIntent
  if (intentName === "DiningSuggestionsIntent") {
    const slots = event.sessionState.intent.slots;

    // console.log("slots", JSON.stringify(event.sessionState.intent.slots, null, 2));

    if (!slots.Location || !slots.Location.value) {
      // Elicit the "Location" slot if it's missing
      return {
        sessionState: {
          dialogAction: {
            type: "ElicitSlot",
            slotToElicit: "Location",
          },
          intent: {
            name: "DiningSuggestionsIntent",
            state: "InProgress",
            slots: slots,
          },
        },
        messages: [
          {
            contentType: "PlainText",
            content: "In what city would you like to dine?",
          },
        ],
      };
    }

    if (!slots.Cuisine || !slots.Cuisine.value) {
      // Elicit the "Cuisine" slot if it's missing
      return {
        sessionState: {
          dialogAction: {
            type: "ElicitSlot",
            slotToElicit: "Cuisine",
          },
          intent: {
            name: "DiningSuggestionsIntent",
            state: "InProgress",
            slots: slots,
          },
        },
        messages: [
          {
            contentType: "PlainText",
            content: "What type of cuisine are you interested in?",
          },
        ],
      };
    }

    if (!slots.DiningTime || !slots.DiningTime.value) {
      // Elicit the "Cuisine" slot if it's missing
      return {
        sessionState: {
          dialogAction: {
            type: "ElicitSlot",
            slotToElicit: "DiningTime",
          },
          intent: {
            name: "DiningSuggestionsIntent",
            state: "InProgress",
            slots: slots,
          },
        },
        messages: [
          {
            contentType: "PlainText",
            content: "At what time would you like to dine?",
          },
        ],
      };
    }

    if (!slots.NumberOfPeople || !slots.NumberOfPeople.value) {
      // Elicit the "Cuisine" slot if it's missing
      return {
        sessionState: {
          dialogAction: {
            type: "ElicitSlot",
            slotToElicit: "NumberOfPeople",
          },
          intent: {
            name: "DiningSuggestionsIntent",
            state: "InProgress",
            slots: slots,
          },
        },
        messages: [
          {
            contentType: "PlainText",
            content: "How many of you are there?",
          },
        ],
      };
    }

    if (!slots.Email || !slots.Email.value) {
      // Elicit the "Cuisine" slot if it's missing
      return {
        sessionState: {
          dialogAction: {
            type: "ElicitSlot",
            slotToElicit: "Email",
          },
          intent: {
            name: "DiningSuggestionsIntent",
            state: "InProgress",
            slots: slots,
          },
        },
        messages: [
          {
            contentType: "PlainText",
            content: "What is the email for the reservation?",
          },
        ],
      };
    }

    // Form the response

    const location =
      event.sessionState.intent.slots.Location.value.interpretedValue || null;
    const cuisine =
      event.sessionState.intent.slots.Cuisine.value.interpretedValue || null;
    const diningTime =
      event.sessionState.intent.slots.DiningTime.value.interpretedValue || null;
    const numberOfPeople =
      event.sessionState.intent.slots.NumberOfPeople.value.interpretedValue ||
      null;
    const email =
      event.sessionState.intent.slots.Email.value.interpretedValue || null;

    const messageBody = {
      location,
      cuisine,
      diningTime,
      numberOfPeople,
      email,
    };

    // Send the message to the SQS queue
    const params = {
      QueueUrl: process.env.AWS_SQS_URL, // Replace with your SQS Queue URL
      MessageBody: JSON.stringify(messageBody),
    };

    try {
      const data = await sqs.sendMessage(params);
      console.log("Message sent to SQS:", data.MessageId);

      // Respond to Lex that the intent was fulfilled
      return {
        sessionState: {
          dialogAction: {
            type: "Close",
          },
          intent: {
            name: "DiningSuggestionsIntent",
            state: "Fulfilled",
          },
        },
        messages: [
          {
            contentType: "PlainText",
            content: `Thanks! I’ll find some ${cuisine} restaurants in ${location} for ${numberOfPeople} people at ${diningTime}. I’ll email the suggestions to ${email}.`,
          },
        ],
      };
    } catch (err) {
      console.error("Error sending message to SQS:", err);
      // Respond with an error message
      return {
        sessionState: {
          dialogAction: {
            type: "Close",
          },
          intent: {
            name: "DiningSuggestionsIntent",
            state: "Failed",
          },
        },
        messages: [
          {
            contentType: "PlainText",
            content:
              "Sorry, there was an issue processing your request. Please try again later.",
          },
        ],
      };
    }
    // return {
    //     sessionState: {
    //         dialogAction: {
    //             type: 'Close',
    //         },
    //         intent: {
    //             name: 'DiningSuggestionsIntent',
    //             state: 'Fulfilled'
    //         }
    //     },
    //     messages: [{
    //         contentType: 'PlainText',
    //         content: `Thanks! I’ll find some ${cuisine} restaurants in ${location} for ${numberOfPeople} people at ${diningTime}. I’ll email the suggestions to ${email}.`
    //     }]
    // };
  }
};
