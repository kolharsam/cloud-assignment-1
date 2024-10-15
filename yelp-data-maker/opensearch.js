var fs = require("fs");
const { Client } = require("@opensearch-project/opensearch");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const opensearchURL =
  "https://search-restaurants-domain-e25t6jchvwjzs53ywov4c5mh4e.us-east-1.es.amazonaws.com";

// Initialize OpenSearch client
const openSearchClient = new Client({
  node: opensearchURL, // Replace with your OpenSearch domain URL
  auth: {
    username: "admin", // Replace if using fine-grained access control
    password: process.env.OPENSEARCH_PASSWORD, // Replace if using fine-grained access control
  },
});

const emailClient = new SESClient({ region: "us-east-1" });
const command = new SendEmailCommand({
  Source: "sak9791@nyu.edu",
  Message: {
    Body: {
      Text: {
        Data: "Hello from OpenSearch",
      },
    },
    Subject: {
      Data: "OpenSearch Email",
    },
  },
  Destination: {
    ToAddresses: [""],
  },
});
emailClient.send(command);

openSearchClient.search({
  index: "restaurants_index",
  body: {
    query: {
      term: {
        category: "chinese",
      },
    },
  },
});

const lineReader = require("readline").createInterface({
  input: fs.createReadStream("data.json"),
});

let indexObjectCount = {
  total: 0,
  success: 0,
  err: 0,
};

function transformItem(item) {
  for (const key in item) {
    if (item.hasOwnProperty(key)) {
      // If the value is a number, convert it to a float
      if (typeof item[key] === "number") {
        item[key] = parseFloat(item[key]); // Convert all numbers to float
      }
    }
  }
  return item;
}

lineReader.on("line", (line) => {
  const parsedLine = JSON.parse(line);
  parsedLine.forEach(async (item) => {
    indexObjectCount.total++;

    const indexObject = {
      index: "restaurants_index",
      id: item.business_id,
      body: transformItem(item),
    };

    try {
      await openSearchClient.index(indexObject);
      indexObjectCount.success++;
    } catch (e) {
      indexObjectCount.err++;
      console.error(e);
    }
  });
});

lineReader.on("close", () => {
  console.log(
    `report: success: ${indexObjectCount.success}, error: ${indexObjectCount.err} of total: ${indexObjectCount.total}`
  );
});
