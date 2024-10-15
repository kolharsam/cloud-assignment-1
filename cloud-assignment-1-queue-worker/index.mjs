import { Client } from "@opensearch-project/opensearch";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import sampleSize from "lodash.samplesize";

const openSearchClient = new Client({
  node: process.env.SEARCH_URL,
  auth: {
    username: process.env.SEARCH_USER_NAME,
    password: process.env.SEARCH_PASSWORD,
  },
});

function capitalize(s) {
  return s[0].toUpperCase() + s.slice(1);
}

function composeEmailData(itemData, restaurants) {
  const { cuisine, numberOfPeople, diningTime, location } = itemData;

  return `
    <html>
      <head></head>
      <body>
        <h4>Hello, I'm the Restaurant Recommendations Bot!</h4>
          <p>You mentioned that you're looking for places to dine in ${capitalize(
            location
          )} today.</p>
          <p>Here are some of the best recommendations for ${capitalize(
            cuisine
          )} cuisine for ${numberOfPeople}, for today at ${diningTime}</p>
          <ol>
            <li>${restaurants[0].name}, located at ${
    restaurants[0].address
  } with rating of (${restaurants[0].rating}/5) out of ${
    restaurants[0].review_count
  } reviews</li>
            <li>${restaurants[1].name}, located at ${
    restaurants[1].address
  } with rating of (${restaurants[1].rating}/5) out of ${
    restaurants[1].review_count
  } reviews</li>
            <li>${restaurants[2].name}, located at ${
    restaurants[2].address
  } with rating of (${restaurants[2].rating}/5) out of ${
    restaurants[2].review_count
  } reviews</li>
          </ol>
          <p>Hope that these recommendations come in handy.</p>
          <p>Enjoy your meal!</p>
      </body>
    </html>
  `;
}

const emailClient = new SESClient({ region: "us-east-1" });
function composeEmailParams(recipientEmail, emailData) {
  let command = new SendEmailCommand({
    Source: "sak9791@nyu.edu",
    Message: {
      Body: {
        Html: {
          Data: emailData,
        },
      },
      Subject: {
        Data: "Restaurant Recommendations",
      },
    },
    Destination: {
      ToAddresses: [recipientEmail],
    },
  });

  return command;
}

function getCuisine(cuisine) {
  switch (cuisine) {
    case "asian":
      return "chinese";
    default:
      return cuisine;
  }
}

export const handler = async (event) => {
  if (!event["Records"]) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "there was issue while processing event from queue",
      }),
    };
  }

  const records = event["Records"];

  for (let i = 0; i < records.length; i++) {
    const currentRecord = records[i];
    const recordData = JSON.parse(currentRecord.body) || "";

    if (!recordData) {
      console.error({
        error: `failed to parse record with id: ${currentRecord.messageId}`,
      });
      continue;
    }

    try {
      const results = await openSearchClient.search({
        index: "restaurants_index",
        body: {
          query: {
            term: {
              category: getCuisine(recordData.cuisine),
            },
          },
        },
      });

      if (!results.body.hits.hits.length) {
        console.error("no restaurants found for given cuisine", recordData);
        continue;
      }

      const restaurants = results.body.hits.hits.map((item) => item._source);
      const chosenRestaurants = sampleSize(restaurants, 3);
      const emailBody = composeEmailData(recordData, chosenRestaurants);
      const emailParams = composeEmailParams(recordData.email, emailBody);

      const sentAck = await emailClient.send(emailParams);
      sentAck.MessageId &&
        console.log(
          `email sent to ${recordData.email} with message id: ${sentAck.MessageId}`
        );
    } catch (err) {
      console.error(
        "failed to fetch data from opensearch and send email to user",
        err
      );
      continue;
    }
  }
};
